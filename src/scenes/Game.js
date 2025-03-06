import { Scene } from 'phaser';

export class Game extends Scene {
    constructor() {
        super('Game');
    }

    preload() {
        // Preloader.js handles everything (including 'goSign' and audio).
    }

    create() {
        console.log('[Game.create] START');

        // 1) AUDIO REFERENCES
        // Arrays of hurt sounds for random playback:
        this.zombieHurtSounds = [
            this.sound.add("zombiehurt1"),
            this.sound.add("zombiehurt2"),
            this.sound.add("zombiehurt3")
        ];

        // Single sound for blood-charge fire:
        this.bloodChargeSound = this.sound.add("bloodchargefire");

        // 2) CREATE THE GO SIGN
        this.goSign = this.add.image(
            this.scale.width - 100,
            this.scale.height / 2,
            'goSign'
        ).setDepth(9999);
        this.goSign.setVisible(false);

        // Flash tween for GO sign
        this.goSignTween = this.tweens.add({
            targets: this.goSign,
            alpha: 0.2,
            duration: 500,
            ease: 'Linear',
            yoyo: true,
            repeat: -1,
            paused: true
        });

        // The background is 7392 wide
        this.gameWidth = 7392;
        this.totalSections = 5;
        this.sectionWidth = 1024;
        this.currentSection = 0;

        // Add your 7392×766 background at (0,0)
        this.background = this.add.image(0, 0, 'background').setOrigin(0, 0);
        this.background.setDepth(-9999);

        // Road area => clamp Y
        this.roadTop = this.scale.height - 275;
        this.roadBottom = this.scale.height - 100;

        // Player
        this.player = this.add.sprite(50, this.roadBottom, 'Idle').setScale(1.5);
        this.player.setDepth(9999);

        this.isJumping = false;
        this.isAttacking = false;

        // Keyboard
        this.cursors = this.input.keyboard.addKeys({
            left: Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            up: Phaser.Input.Keyboard.KeyCodes.UP,
            down: Phaser.Input.Keyboard.KeyCodes.DOWN,
            W: Phaser.Input.Keyboard.KeyCodes.W,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            D: Phaser.Input.Keyboard.KeyCodes.D,
            shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            attack: Phaser.Input.Keyboard.KeyCodes.PERIOD
        });

        // Projectiles array
        this.bloodProjectiles = [];

        // Create animations
        this.createAnimations();
        this.player.play('Idle');

        // Attack => spawn projectile after Attack_1
        this.player.on('animationcomplete-Attack_1', () => {
            if (this.isAttacking) {
                console.log('[Attack_1 complete] => spawn projectile');

                // Play blood-charge-fire sound:
                this.bloodChargeSound.play();

                const offsetX = this.player.flipX ? -30 : 30;
                const offsetY = -30;
                const proj = this.add.sprite(this.player.x + offsetX, this.player.y + offsetY, 'Blood_Charge');
                proj.flipX = this.player.flipX;
                proj.speed = this.player.flipX ? -300 : 300;
                proj.setDepth(9999);

                proj.play('Blood_Charge_Anim');
                this.bloodProjectiles.push(proj);
            }
        });

        // Crisp
        this.cameras.main.roundPixels = true;

        // Wave system & UI
        this.createPlayerSoulUI();
        this.createKillsUI();
        this.initWaveSystem();
    }

    update(time, delta) {
        const dt = delta / 1000;
        const speed = this.cursors.shift.isDown ? 200 : 120;

        // Horizontal movement
        let movingHoriz = false;
        if ((this.cursors.left.isDown || this.cursors.A.isDown) && !this.isAttacking) {
            movingHoriz = true;
            this.player.x -= speed * dt;
            this.player.flipX = true;
        }
        else if ((this.cursors.right.isDown || this.cursors.D.isDown) && !this.isAttacking) {
            movingHoriz = true;
            this.player.x += speed * dt;
            this.player.flipX = false;
        }

        // (A) Prevent walking off the left edge:
        if (this.player.x < 0) {
            this.player.x = 0;
        }

        // Vertical
        let movingVert = false;
        if ((this.cursors.up.isDown || this.cursors.W.isDown) && !this.isAttacking) {
            movingVert = true;
            this.player.y -= speed * dt;
        }
        else if ((this.cursors.down.isDown || this.cursors.S.isDown) && !this.isAttacking) {
            movingVert = true;
            this.player.y += speed * dt;
        }

        // Clamp Y if not jumping
        if (!this.isJumping) {
            if (this.player.y < this.roadTop) {
                this.player.y = this.roadTop;
            }
            if (this.player.y > this.roadBottom) {
                this.player.y = this.roadBottom;
            }
        }

        // Movement anim
        if (!this.isAttacking && !this.isJumping) {
            if (movingHoriz || movingVert) {
                this.player.play(this.cursors.shift.isDown ? 'Run' : 'Walk', true);
            } else {
                this.player.play('Idle', true);
            }
        }

        // Jump
        if (Phaser.Input.Keyboard.JustDown(this.cursors.space) && !this.isJumping && !this.isAttacking) {
            this.isJumping = true;
            this.player.play('Jump', true);
            this.tweens.add({
                targets: this.player,
                y: this.player.y - 80,
                duration: 300,
                ease: 'Sine.easeOut',
                onComplete: () => {
                    this.tweens.add({
                        targets: this.player,
                        y: this.player.y + 80,
                        duration: 300,
                        ease: 'Sine.easeIn',
                        onComplete: () => {
                            this.isJumping = false;
                            if (!this.isAttacking) {
                                if (movingHoriz || movingVert) {
                                    this.player.play(this.cursors.shift.isDown ? 'Run' : 'Walk', true);
                                } else {
                                    this.player.play('Idle', true);
                                }
                            }
                        }
                    });
                }
            });
        }

        // Attack => single image projectile
        if (Phaser.Input.Keyboard.JustDown(this.cursors.attack) && !this.isAttacking && !this.isJumping) {
            this.isAttacking = true;
            this.player.play('Attack_1', true);

            // revert after 500ms
            this.time.delayedCall(500, () => {
                if (this.isAttacking) {
                    this.isAttacking = false;
                    if (movingHoriz || movingVert) {
                        this.player.play(this.cursors.shift.isDown ? 'Run' : 'Walk', true);
                    } else {
                        this.player.play('Idle', true);
                    }
                }
            });
        }

        // Move projectiles
        const totalWidth = this.totalSections * this.sectionWidth; // 5120
        for (let i = this.bloodProjectiles.length - 1; i >= 0; i--) {
            const p = this.bloodProjectiles[i];
            p.x += p.speed * dt;
            if (p.x < 0 || p.x > totalWidth) {
                p.destroy();
                this.bloodProjectiles.splice(i, 1);
            }
        }

        // Waves & zombies
        this.updateZombies(dt);
        this.checkProjectileHits();
        this.handleSectionTransition();
    }

    ///////////////////////////////////////////////////////////////////////////
    // ANIMATIONS
    ///////////////////////////////////////////////////////////////////////////
    createAnimations() {
        // Player
        this.anims.create({ key: 'Idle',     frames: this.anims.generateFrameNumbers('Idle'),     frameRate: 6,  repeat: -1 });
        this.anims.create({ key: 'Walk',     frames: this.anims.generateFrameNumbers('Walk'),     frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'Run',      frames: this.anims.generateFrameNumbers('Run'),      frameRate: 14, repeat: -1 });
        this.anims.create({ key: 'Jump',     frames: this.anims.generateFrameNumbers('Jump'),     frameRate: 10, repeat: 0  });
        this.anims.create({ key: 'Attack_1', frames: this.anims.generateFrameNumbers('Attack_1'), frameRate: 12, repeat: 0  });

        // Zombie1
        this.anims.create({ key: "Zombie1_Idle",   frames: this.anims.generateFrameNumbers("Zombie1_Idle"),   frameRate:6, repeat:-1 });
        this.anims.create({ key: "Zombie1_Walk",   frames: this.anims.generateFrameNumbers("Zombie1_Walk"),   frameRate:8, repeat:-1 });
        this.anims.create({ key: "Zombie1_Attack", frames: this.anims.generateFrameNumbers("Zombie1_Attack"), frameRate:8, repeat:0 });
        this.anims.create({ key: "Zombie1_Hurt",   frames: this.anims.generateFrameNumbers("Zombie1_Hurt"),   frameRate:8, repeat:0 });
        this.anims.create({ key: "Zombie1_Dead",   frames: this.anims.generateFrameNumbers("Zombie1_Dead"),   frameRate:6, repeat:0 });

        // Zombie2
        this.anims.create({ key: "Zombie2_Idle",   frames: this.anims.generateFrameNumbers("Zombie2_Idle"),   frameRate:6, repeat:-1 });
        this.anims.create({ key: "Zombie2_Walk",   frames: this.anims.generateFrameNumbers("Zombie2_Walk"),   frameRate:8, repeat:-1 });
        this.anims.create({ key: "Zombie2_Attack", frames: this.anims.generateFrameNumbers("Zombie2_Attack"), frameRate:8, repeat:0 });
        this.anims.create({ key: "Zombie2_Hurt",   frames: this.anims.generateFrameNumbers("Zombie2_Hurt"),   frameRate:8, repeat:0 });
        this.anims.create({ key: "Zombie2_Dead",   frames: this.anims.generateFrameNumbers("Zombie2_Dead"),   frameRate:6, repeat:0 });

        // Zombie3
        this.anims.create({ key: "Zombie3_Idle",   frames: this.anims.generateFrameNumbers("Zombie3_Idle"),   frameRate:6, repeat:-1 });
        this.anims.create({ key: "Zombie3_Walk",   frames: this.anims.generateFrameNumbers("Zombie3_Walk"),   frameRate:8, repeat:-1 });
        this.anims.create({ key: "Zombie3_Attack", frames: this.anims.generateFrameNumbers("Zombie3_Attack"), frameRate:8, repeat:0 });
        this.anims.create({ key: "Zombie3_Hurt",   frames: this.anims.generateFrameNumbers("Zombie3_Hurt"),   frameRate:8, repeat:0 });
        this.anims.create({ key: "Zombie3_Dead",   frames: this.anims.generateFrameNumbers("Zombie3_Dead"),   frameRate:6, repeat:0 });

        // Zombie4
        this.anims.create({ key: "Zombie4_Idle",   frames: this.anims.generateFrameNumbers("Zombie4_Idle"),   frameRate:6, repeat:-1 });
        this.anims.create({ key: "Zombie4_Walk",   frames: this.anims.generateFrameNumbers("Zombie4_Walk"),   frameRate:8, repeat:-1 });
        this.anims.create({ key: "Zombie4_Attack", frames: this.anims.generateFrameNumbers("Zombie4_Attack"), frameRate:8, repeat:0 });
        this.anims.create({ key: "Zombie4_Hurt",   frames: this.anims.generateFrameNumbers("Zombie4_Hurt"),   frameRate:8, repeat:0 });
        this.anims.create({ key: "Zombie4_Dead",   frames: this.anims.generateFrameNumbers("Zombie4_Dead"),   frameRate:6, repeat:0 });

        // Projectile animation
        this.anims.create({
            key: 'Blood_Charge_Anim',
            frames: this.anims.generateFrameNumbers('Blood_Charge', { start: 0, end: 2 }),
            frameRate: 10,
            repeat: -1
        });
    }

    ///////////////////////////////////////////////////////////////////////////
    // UI
    ///////////////////////////////////////////////////////////////////////////
    playerSoul= 100;
    kills= 0;

    createPlayerSoulUI() {
        this.soulBg = this.add.rectangle(10, 10, 200, 20, 0x000000).setOrigin(0).setDepth(9999);
        this.soulFill = this.add.rectangle(10, 10, 200, 20, 0xff0000).setOrigin(0).setDepth(9999);
        this.soulText = this.add.text(12, 12, "Soul: 100%", { fontSize:"14px", color:"#ffffff" }).setDepth(9999);
    }
    updatePlayerSoulUI() {
        if (this.playerSoul < 0) this.playerSoul = 0;
        if (this.playerSoul > 100) this.playerSoul = 100;
        const ratio = this.playerSoul / 100;
        this.soulFill.width = 200 * ratio;
        this.soulText.setText(`Soul: ${this.playerSoul}%`);
    }

    createKillsUI() {
        this.killsText = this.add.text(12, 34, "Kills: 0", { fontSize:"14px", color:"#00ff00" }).setDepth(9999);
    }
    updateKillsUI() {
        this.killsText.setText(`Kills: ${this.kills}`);
    }

    ///////////////////////////////////////////////////////////////////////////
    // WAVE SYSTEM
    ///////////////////////////////////////////////////////////////////////////
    waveNumber=1;
    waveZombiesLeft=0;
    waveDone= false;
    stageTransitioning= false;

    zombies= [];

    initWaveSystem() {
        console.log('[initWaveSystem] called ONCE');
        this.playerSoul= 100;
        this.updatePlayerSoulUI();
        this.kills= 0;
        this.updateKillsUI();
        this.waveNumber=1;
        this.startWave();
    }

    startWave() {
        const waveIndex = ((this.waveNumber -1) % 10)+1; // 1..10
        const waveCycle = Math.floor((this.waveNumber -1)/10);

        const baseBars=2, baseSpeed=40, baseDamage=10;
        const healthMult= 2** waveCycle;    // 1,2,4,...
        const speedMult= 1 + 0.25* waveCycle; // waveCycle=1 => 1.25
        const damageMult= 2** waveCycle;    // 1,2,4,...

        const waveBars= baseBars* healthMult;
        const waveSpeed= baseSpeed* speedMult;
        const waveDamage= baseDamage* damageMult;

        this.waveZombiesLeft= waveIndex;
        this.waveDone= false;

        console.log(`Spawning wave #${this.waveNumber} => waveIndex=${waveIndex}, waveCycle=${waveCycle}, bars=${waveBars}, speed=${waveSpeed}`);

        for(let i=0; i< waveIndex; i++){
            this.time.delayedCall(2000*i, ()=>{
                this.spawnOneZombie(waveBars, waveSpeed, waveDamage);
            });
        }
    }

    spawnOneZombie(bars, speed, damage) {
        const type= Phaser.Math.Between(1,4);

        // spawn at right edge of the *current* stage
        const spawnX = this.sectionWidth - 50;

        const spawnY= Phaser.Math.Between(this.roadTop, this.roadBottom);

        const z= this.add.sprite(spawnX, spawnY, `Zombie${type}_Idle`).setDepth(9999);
        z.play(`Zombie${type}_Idle`);

        // Movement sound => loop
        z.movementSound = this.sound.add("zombiemovementsound", {
            loop: true,
            volume: 0.7
        });
        z.movementSound.play();

        z.type= type;
        z.bars= bars;
        z.damage= damage;
        z.speed= speed;
        z.isDead= false;
        z.isAttacking= false;

        // small HP bar
        z.healthBg= this.add.rectangle(z.x-20,z.y-40,40,5,0x000000).setDepth(9999);
        z.healthFill= this.add.rectangle(z.x-20,z.y-40,40,5,0xff0000).setDepth(9999);

        // after 1s => walk
        this.time.delayedCall(1000, ()=> {
            if(!z.isDead){
                z.play(`Zombie${z.type}_Walk`);
            }
        });

        this.zombies.push(z);
    }

    updateZombies(dt) {
        for(let i=this.zombies.length-1; i>=0; i--){
            const z= this.zombies[i];
            if(z.isDead){
                // remove if dead anim done
                if(z.anims.currentAnim && z.anims.currentAnim.key.includes("Dead") && !z.anims.isPlaying){
                    // Stop & destroy movement sound
                    if (z.movementSound) {
                        z.movementSound.stop();
                        z.movementSound.destroy();
                    }

                    z.healthBg.destroy();
                    z.healthFill.destroy();
                    z.destroy();
                    this.zombies.splice(i,1);

                    this.waveZombiesLeft--;
                    this.kills++;
                    this.updateKillsUI();
                    if(this.waveZombiesLeft<=0){
                        this.waveDone= true;
                        console.log('[updateZombies] wave done => waveZombiesLeft=0 => waveDone=true');

                        // Show the GO! sign & flash
                        this.goSign.setVisible(true);
                        this.goSignTween.play();
                    }
                }
                continue;
            }

            // update HP bar
            z.healthBg.x= z.x-20; 
            z.healthBg.y= z.y-40;
            z.healthFill.x= z.x-20; 
            z.healthFill.y= z.y-40;
            const maxBars= 8;
            const ratio= z.bars/ maxBars;
            z.healthFill.width= 40* ratio;

            // chase player if not attacking
            if(!z.isAttacking){
                const angle= Math.atan2(this.player.y- z.y, this.player.x- z.x);
                const vx= Math.cos(angle)* z.speed* dt;
                const vy= Math.sin(angle)* z.speed* dt;
                z.x += vx;
                z.y += vy;

                // face the player
                z.flipX= (z.x> this.player.x);
            }

            // if close => attack
            const dist= Phaser.Math.Distance.Between(z.x,z.y, this.player.x,this.player.y);
            if(dist<40 && !z.isAttacking){
                z.isAttacking= true;
                z.play(`Zombie${z.type}_Attack`);
                z.once('animationcomplete', ()=> {
                    if(!z.isDead){
                        this.playerSoul-= z.damage;
                        if(this.playerSoul<0) this.playerSoul=0;
                        this.updatePlayerSoulUI();

                        z.isAttacking= false;
                        if(!z.isDead){
                            z.play(`Zombie${z.type}_Walk`);
                        }

                        // if soul=0 => game over
                        if(this.playerSoul<=0){
                            console.log('Game Over => fade => scene start');
                            this.cameras.main.fadeOut(1000,0,0,0);
                            this.cameras.main.once('camerafadeoutcomplete', ()=>{
                                this.scene.start('GameOver');
                            });
                        }
                    }
                });
            }
        }
    }

    // <------------------ MAKE SURE THIS FUNCTION EXISTS ------------------>
    checkProjectileHits() {
        // If the scene is no longer active (e.g. game over), skip
        if(!this.scene.isActive()) return;

        for(let i=this.bloodProjectiles.length-1; i>=0; i--){
            const p= this.bloodProjectiles[i];
            for(let z of this.zombies){
                if(z.isDead) continue;
                const dist= Phaser.Math.Distance.Between(p.x,p.y, z.x,z.y);
                if(dist<30){
                    // hit
                    p.destroy();
                    this.bloodProjectiles.splice(i,1);

                    z.bars--;
                    z.play(`Zombie${z.type}_Hurt`);

                    // PLAY RANDOM HURT SOUND
                    Phaser.Utils.Array.GetRandom(this.zombieHurtSounds).play();

                    if(z.bars<=0){
                        z.isDead= true;
                        z.play(`Zombie${z.type}_Dead`);
                    } else {
                        // after short delay => walk
                        this.time.delayedCall(300, ()=>{
                            if(!z.isDead && !z.isAttacking){
                                z.play(`Zombie${z.type}_Walk`);
                            }
                        });
                    }
                    break;
                }
            }
        }
    }

    stageTransitioning= false;

    handleSectionTransition() {
        // If wave not done => clamp x=1000
        if(!this.waveDone){
            if(this.player.x>=1000){
                this.player.x=1000;
            }
            return;
        }

        // wave done => if x≥1000 => shift once
        if(this.player.x>=1000 && !this.stageTransitioning){
            // Hide the GO! sign & stop flashing
            this.goSign.setVisible(false);
            this.goSignTween.pause();
            this.goSign.setAlpha(1);

            this.stageTransitioning= true;
            console.log(`[handleSectionTransition] wave #${this.waveNumber} done => shifting left => waveNumber++ => ${this.waveNumber+1}`);
            this.player.x=1000;

            const shift= this.sectionWidth;
            this.currentSection= (this.currentSection+1)% this.totalSections;

            // keep them on top
            this.background.setDepth(-9999);
            this.player.setDepth(9999);
            this.bloodProjectiles.forEach(b=> b.setDepth(9999));
            this.zombies.forEach(z=> z.setDepth(9999));

            this.tweens.add({
                targets:[this.background, this.player, ...this.bloodProjectiles, ...this.zombies],
                x:(target)=> target.x- shift,
                duration:1000,
                ease:'Sine.easeInOut',
                onComplete:()=>{
                    this.waveNumber++;
                    this.waveDone= false;
                    this.startWave();
                    this.stageTransitioning= false;
                }
            });
        }
    }
}
