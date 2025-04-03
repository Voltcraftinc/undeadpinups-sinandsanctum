// src/scenes/Game.js
import { Scene } from 'phaser'

export class Game extends Scene {
  constructor() {
    super('Game')
  }

  preload() {
    // Preloader.js handles loading
  }

  create(data) {
    console.log('[Game.create] START')

    ///////////////////////////////////////////////////////////////////////////
    // 0) CAPTURE ANY DATA PASSED IN (e.g. from MainMenu)
    ///////////////////////////////////////////////////////////////////////////
    this.waxAccount = data?.waxAccount || null
    console.log('WaxAccount in Game =>', this.waxAccount)

    ///////////////////////////////////////////////////////////////////////////
    // FLAGS & ARRAYS
    ///////////////////////////////////////////////////////////////////////////
    this.playerDead = false
    this.drops = []
    this.sireCollected = 0 // track how many SIRE tokens the player picks up

    ///////////////////////////////////////////////////////////////////////////
    // AUDIO
    ///////////////////////////////////////////////////////////////////////////
    this.zombieHurtSounds = [
      this.sound.add('zombiehurt1'),
      this.sound.add('zombiehurt2'),
      this.sound.add('zombiehurt3'),
    ]
    this.bloodChargeSound = this.sound.add('bloodchargefire')

    ///////////////////////////////////////////////////////////////////////////
    // GO SIGN
    ///////////////////////////////////////////////////////////////////////////
    this.goSign = this.add
      .image(this.scale.width - 150, this.scale.height / 2, 'goSign')
      .setDepth(9999)
      .setVisible(false)

    this.goSignTween = this.tweens.add({
      targets: this.goSign,
      alpha: 0.2,
      duration: 500,
      ease: 'Linear',
      yoyo: true,
      repeat: -1,
      paused: true,
    })

    ///////////////////////////////////////////////////////////////////////////
    // BACKGROUND
    ///////////////////////////////////////////////////////////////////////////
    this.background1 = this.add
      .image(0, 0, 'background')
      .setOrigin(0, 0)
      .setDepth(-9999)
    this.background2 = this.add
      .image(7335, 0, 'background')
      .setOrigin(0, 0)
      .setDepth(-9999)

    this.gameWidth = 7335
    this.totalSections = 5
    this.sectionWidth = 1024
    this.currentSection = 0

    ///////////////////////////////////////////////////////////////////////////
    // ROAD & PLAYER
    ///////////////////////////////////////////////////////////////////////////
    this.roadTop = this.scale.height - 275
    this.roadBottom = this.scale.height - 100

    this.player = this.add
      .sprite(50, this.roadBottom, 'Idle')
      .setScale(1.5)
      .setDepth(9999)
    this.isJumping = false
    this.isAttacking = false

    ///////////////////////////////////////////////////////////////////////////
    // KEYBOARD
    ///////////////////////////////////////////////////////////////////////////
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
      attack: Phaser.Input.Keyboard.KeyCodes.PERIOD,
    })

    ///////////////////////////////////////////////////////////////////////////
    // PROJECTILES
    ///////////////////////////////////////////////////////////////////////////
    this.bloodProjectiles = []

    ///////////////////////////////////////////////////////////////////////////
    // CREATE ANIMATIONS
    ///////////////////////////////////////////////////////////////////////////
    this.createAnimations()
    this.player.play('Idle')

    // Attack => spawn projectile after Attack_1
    this.player.on('animationcomplete-Attack_1', () => {
      if (this.isAttacking) {
        console.log('[Attack_1 complete] => spawn projectile')
        this.bloodChargeSound.play()

        const offsetX = this.player.flipX ? -30 : 30
        const offsetY = -30
        const proj = this.add.sprite(
          this.player.x + offsetX,
          this.player.y + offsetY,
          'Blood_Charge'
        )
        proj.flipX = this.player.flipX
        proj.speed = this.player.flipX ? -300 : 300
        proj.setDepth(9999)

        proj.play('Blood_Charge_Anim')
        this.bloodProjectiles.push(proj)
      }
    })

    // Crisp
    this.cameras.main.roundPixels = true

    ///////////////////////////////////////////////////////////////////////////
    // UI & WAVES
    ///////////////////////////////////////////////////////////////////////////
    this.createHUD()
    this.initWaveSystem()
  }

  update(time, delta) {
    const dt = delta / 1000
    const speed = this.cursors.shift.isDown ? 200 : 120

    if (this.playerDead) {
      this.handleSectionTransition()
      return
    }

    // Horizontal movement
    let movingHoriz = false
    if ((this.cursors.left.isDown || this.cursors.A.isDown) && !this.isAttacking) {
      movingHoriz = true
      this.player.x -= speed * dt
      this.player.flipX = true
    } else if (
      (this.cursors.right.isDown || this.cursors.D.isDown) &&
      !this.isAttacking
    ) {
      movingHoriz = true
      this.player.x += speed * dt
      this.player.flipX = false
    }
    if (this.player.x < 0) {
      this.player.x = 0
    }

    // Vertical
    let movingVert = false
    if ((this.cursors.up.isDown || this.cursors.W.isDown) && !this.isAttacking) {
      movingVert = true
      this.player.y -= speed * dt
    } else if (
      (this.cursors.down.isDown || this.cursors.S.isDown) &&
      !this.isAttacking
    ) {
      movingVert = true
      this.player.y += speed * dt
    }

    // Clamp Y if not jumping
    if (!this.isJumping) {
      if (this.player.y < this.roadTop) {
        this.player.y = this.roadTop
      }
      if (this.player.y > this.roadBottom) {
        this.player.y = this.roadBottom
      }
    }

    // Movement anim
    if (!this.isAttacking && !this.isJumping) {
      if (movingHoriz || movingVert) {
        this.player.play(this.cursors.shift.isDown ? 'Run' : 'Walk', true)
      } else {
        this.player.play('Idle', true)
      }
    }

    // Jump
    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.space) &&
      !this.isJumping &&
      !this.isAttacking
    ) {
      this.isJumping = true
      this.player.play('Jump', true)
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
              this.isJumping = false
              if (!this.isAttacking) {
                if (movingHoriz || movingVert) {
                  this.player.play(
                    this.cursors.shift.isDown ? 'Run' : 'Walk',
                    true
                  )
                } else {
                  this.player.play('Idle', true)
                }
              }
            },
          })
        },
      })
    }

    // Attack
    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.attack) &&
      !this.isAttacking &&
      !this.isJumping
    ) {
      this.isAttacking = true
      this.player.play('Attack_1', true)

      this.time.delayedCall(500, () => {
        if (this.isAttacking) {
          this.isAttacking = false
          if (movingHoriz || movingVert) {
            this.player.play(
              this.cursors.shift.isDown ? 'Run' : 'Walk',
              true
            )
          } else {
            this.player.play('Idle', true)
          }
        }
      })
    }

    // Move projectiles
    const totalWidth = this.totalSections * this.sectionWidth
    for (let i = this.bloodProjectiles.length - 1; i >= 0; i--) {
      const p = this.bloodProjectiles[i]
      p.x += p.speed * dt
      if (p.x < 0 || p.x > totalWidth) {
        p.destroy()
        this.bloodProjectiles.splice(i, 1)
      }
    }

    // DROPS
    this.updateDrops(dt)

    // WAVES
    this.updateZombies(dt)
    this.checkProjectileHits()
    this.handleSectionTransition()
    
    // Update HUD pulse effect
    this.updateHUDEffects(time)
  }

  ///////////////////////////////////////////////////////////////////////////
  // DROPS
  ///////////////////////////////////////////////////////////////////////////
  updateDrops(dt) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i]
      d.shadow.x = d.x
      d.shadow.y = d.y + 12

      const dist = Phaser.Math.Distance.Between(d.x, d.y, this.player.x, this.player.y)
      if (dist < 40) {
        // Soul => +25
        if (d.isSoul) {
          console.log('Picked up Soul => +25')
          this.playerSoul = Math.min(this.playerSoul + 25, 100)
          this.updateHUD()
          
          // Flash the soul meter when collected
          this.flashSoulMeter()
        }
        // SIRE => increment
        else if (d.isSire) {
          console.log('Picked up SIRE => +1')
          this.sireCollected++
          
          // Flash the sire counter
          this.flashSireCounter()
        }
        // Destroy
        d.shadow.destroy()
        d.destroy()
        this.drops.splice(i, 1)
      }
    }
  }

  makeDropFloat(drop) {
    drop.shadow = this.add
      .ellipse(drop.x, drop.y + 12, 30, 12, 0x000000, 0.3)
      .setDepth(drop.depth - 1)

    this.tweens.add({
      targets: drop,
      angle: 360,
      duration: 1500,
      repeat: -1,
    })

    this.tweens.add({
      targets: drop,
      y: '-=5',
      yoyo: true,
      repeat: -1,
      duration: 800,
      ease: 'Sine.easeInOut',
    })

    this.drops.push(drop)
  }

  ///////////////////////////////////////////////////////////////////////////
  // ANIMATIONS
  ///////////////////////////////////////////////////////////////////////////
  createAnimations() {
    if (this.anims.get('Idle')) {
      return
    }
    // Player
    this.anims.create({
      key: 'Idle',
      frames: this.anims.generateFrameNumbers('Idle'),
      frameRate: 6,
      repeat: -1,
    })
    this.anims.create({
      key: 'Walk',
      frames: this.anims.generateFrameNumbers('Walk'),
      frameRate: 10,
      repeat: -1,
    })
    this.anims.create({
      key: 'Run',
      frames: this.anims.generateFrameNumbers('Run'),
      frameRate: 14,
      repeat: -1,
    })
    this.anims.create({
      key: 'Jump',
      frames: this.anims.generateFrameNumbers('Jump'),
      frameRate: 10,
      repeat: 0,
    })
    this.anims.create({
      key: 'Attack_1',
      frames: this.anims.generateFrameNumbers('Attack_1'),
      frameRate: 12,
      repeat: 0,
    })
    this.anims.create({
      key: 'Player_Dead',
      frames: this.anims.generateFrameNumbers('Dead'),
      frameRate: 6,
      repeat: 0,
    })

    // Zombies
    for (let i = 1; i <= 4; i++) {
      this.anims.create({
        key: `Zombie${i}_Idle`,
        frames: this.anims.generateFrameNumbers(`Zombie${i}_Idle`),
        frameRate: 6,
        repeat: -1,
      })
      this.anims.create({
        key: `Zombie${i}_Walk`,
        frames: this.anims.generateFrameNumbers(`Zombie${i}_Walk`),
        frameRate: 8,
        repeat: -1,
      })
      this.anims.create({
        key: `Zombie${i}_Attack`,
        frames: this.anims.generateFrameNumbers(`Zombie${i}_Attack`),
        frameRate: 8,
        repeat: 0,
      })
      this.anims.create({
        key: `Zombie${i}_Hurt`,
        frames: this.anims.generateFrameNumbers(`Zombie${i}_Hurt`),
        frameRate: 8,
        repeat: 0,
      })
      this.anims.create({
        key: `Zombie${i}_Dead`,
        frames: this.anims.generateFrameNumbers(`Zombie${i}_Dead`),
        frameRate: 6,
        repeat: 0,
      })
    }

    // Projectile
    this.anims.create({
      key: 'Blood_Charge_Anim',
      frames: this.anims.generateFrameNumbers('Blood_Charge', { start: 0, end: 2 }),
      frameRate: 10,
      repeat: -1,
    })
  }

  ///////////////////////////////////////////////////////////////////////////
  // UI (SEGA-STYLE HUD)
  ///////////////////////////////////////////////////////////////////////////
  playerSoul = 100
  kills = 0

  ///////////////////////////////////////////////////////////////////////////
// HUD - CLEANER TOP BAR
///////////////////////////////////////////////////////////////////////////
playerSoul = 100;
kills = 0;

createHUD() {
  // Create a container so we can manage all HUD elements together
  this.hudContainer = this.add.container(0, 0).setDepth(10000);

  // Use the "top-hud-bar" image as the background bar, scaled to full width
  const hudImage = this.textures.get('top-hud-bar').getSourceImage();
  const scaleFactor = this.scale.width / hudImage.width;
  this.hudPanel = this.add.image(0, 0, 'top-hud-bar')
    .setOrigin(0, 0)
    .setScale(scaleFactor);

  // No border drawn, or keep it at zero thickness
  this.hudBorder = this.add.graphics();
  // this.hudBorder.lineStyle(0, 0x000000, 0); // effectively invisible

  // 1) SOUL label + bar
  // Position label slightly higher than the bar so it doesn't overlap
  this.soulLabel = this.add.text(100, 30, "SOUL", {
    fontFamily: "Arial Black",
    fontSize: "16px",
    color: "#ff0000",
    stroke: "#000000",
    strokeThickness: 3,
  });
  this.soulBg = this.add
    .rectangle(160, 41, 150, 15, 0x330000)
    .setOrigin(0, 0.5)
    .setStrokeStyle(1, 0x550000);
  this.soulFill = this.add
    .rectangle(160, 41, 150, 15, 0xff0000)
    .setOrigin(0, 0.5);

  // 2) KILLS label + value
  this.killsLabel = this.add.text(350, 30, "SLAYS", {
    fontFamily: "Arial Black",
    fontSize: "16px",
    color: "#00ff00",
    stroke: "#000000",
    strokeThickness: 3,
  });
  this.killsValue = this.add.text(420, 30, "0", {
    fontFamily: "Arial Black",
    fontSize: "18px",
    color: "#00ff00",
    stroke: "#000000",
    strokeThickness: 3,
  });

  // 3) SIRE icon + counter (centered-ish)
  this.sireIcon = this.add.sprite(this.scale.width / 2 - 20, 40, "sire-token")
    .setScale(0.6);
  this.sireValue = this.add.text(this.scale.width / 2 + 10, 30, "× 0", {
    fontFamily: "Arial Black",
    fontSize: "16px",
    color: "#33ccff",
    stroke: "#000000",
    strokeThickness: 3,
  }).setOrigin(0, 0);

  // 4) WAVE label + value (far right)
  this.waveLabel = this.add.text(this.scale.width - 200, 30, "WAVE", {
    fontFamily: "Arial Black",
    fontSize: "16px",
    color: "#ffff00",
    stroke: "#000000",
    strokeThickness: 3,
  });
  this.waveValue = this.add.text(this.scale.width - 140, 27, "1", {
    fontFamily: "Arial Black",
    fontSize: "25px",
    color: "#ffff66",
    stroke: "#000000",
    strokeThickness: 3,
  });

  // 5) Add everything to the container
  this.hudContainer.add([
    this.hudPanel,
    this.soulLabel,
    this.soulBg,
    this.soulFill,
    this.killsLabel,
    this.killsValue,
    this.sireIcon,
    this.sireValue,
    this.waveLabel,
    this.waveValue,
  ]);

  // Initial update of HUD values
  this.updateHUD();
}




updateHUD() {
  // Clamp playerSoul
  if (this.playerSoul < 0) this.playerSoul = 0;
  if (this.playerSoul > 100) this.playerSoul = 100;

  // Update soul bar fill width
  const ratio = this.playerSoul / 100;
  this.soulFill.displayWidth = 150 * ratio;

  // Color changes for low soul
  if (this.playerSoul < 25) {
    this.soulFill.fillColor = 0xff0000; // bright red
    this.pulseRate = 200;
  } else if (this.playerSoul < 50) {
    this.soulFill.fillColor = 0xdd3300;
    this.pulseRate = 400;
  } else {
    this.soulFill.fillColor = 0xbb0000;
    this.pulseRate = 600;
  }

  // Update kills
  this.killsValue.setText(this.kills.toString());

  // Update wave
  this.waveValue.setText(this.waveNumber.toString());

  // Update SIRE
  this.sireValue.setText(`× ${this.sireCollected}`);
}

updateHUDEffects(time) {
  // Pulse soul bar if low
  if (this.playerSoul < 25) {
    const pulse = Math.sin(time / this.pulseRate) * 0.2 + 0.8;
    this.soulFill.setAlpha(pulse);
    this.soulLabel.setAlpha(pulse);
  } else {
    this.soulFill.setAlpha(1);
    this.soulLabel.setAlpha(1);
  }
}

flashSoulMeter() {
  this.tweens.add({
    targets: [this.soulFill],
    alpha: { from: 1, to: 0.2 },
    duration: 100,
    yoyo: true,
    repeat: 3,
  });
  this.tweens.add({
    targets: this.soulLabel,
    scale: { from: 1, to: 1.2 },
    duration: 100,
    yoyo: true,
    repeat: 3,
  });
}

flashWynxCounter() {
  this.tweens.add({
    targets: [this.sireIcon, this.sireValue],
    scale: { from: 1, to: 1.3 },
    duration: 150,
    yoyo: true,
    repeat: 2,
  });
}


  ///////////////////////////////////////////////////////////////////////////
  // WAVES
  ///////////////////////////////////////////////////////////////////////////
  waveNumber = 1
  waveZombiesLeft = 0
  waveDone = false
  stageTransitioning = false

  zombies = []

  initWaveSystem() {
    console.log('[initWaveSystem] called ONCE')
    this.playerSoul = 100
    this.updateHUD()
    this.kills = 0
    this.updateHUD()
    this.waveNumber = 1
    this.startWave()
  }

  startWave() {
    const waveIndex = ((this.waveNumber - 1) % 10) + 1
    const waveCycle = Math.floor((this.waveNumber - 1) / 10)

    const baseBars = 2,
      baseSpeed = 40,
      baseDamage = 10
    const healthMult = 2 ** waveCycle
    const speedMult = 1 + 0.25 * waveCycle
    const damageMult = 2 ** waveCycle

    const waveBars = baseBars * healthMult
    const waveSpeed = baseSpeed * speedMult
    const waveDamage = baseDamage * damageMult

    this.waveZombiesLeft = waveIndex
    this.waveDone = false

    console.log(
      `Spawning wave #${this.waveNumber} => waveIndex=${waveIndex}, waveCycle=${waveCycle}, bars=${waveBars}, speed=${waveSpeed}`
    )
    
    // Flash the wave indicator when a new wave starts
    this.tweens.add({
      targets: [this.waveLabel, this.waveValue],
      alpha: { from: 1, to: 0.2 },
      duration: 100,
      yoyo: true,
      repeat: 5
    });

    for (let i = 0; i < waveIndex; i++) {
      this.time.delayedCall(2000 * i, () => {
        this.spawnOneZombie(waveBars, waveSpeed, waveDamage)
      })
    }
  }

  spawnOneZombie(bars, speed, damage) {
    const type = Phaser.Math.Between(1, 4)

    const spawnX = this.sectionWidth - 50
    const spawnY = Phaser.Math.Between(this.roadTop, this.roadBottom)

    const z = this.add
      .sprite(spawnX, spawnY, `Zombie${type}_Idle`)
      .setScale(1.4)
      .setDepth(9999)

    z.play(`Zombie${type}_Idle`)

    // Movement sound => loop
    z.movementSound = this.sound.add('zombiemovementsound', {
      loop: true,
      volume: 0.7,
    })
    z.movementSound.play()

    z.type = type
    z.bars = bars
    z.damage = damage
    z.speed = speed
    z.isDead = false
    z.isAttacking = false

    // HP bar - styled
    z.healthBg = this.add
      .rectangle(z.x - 20, z.y - 45, 40, 6, 0x000000)
      .setStrokeStyle(1, 0x333333)
      .setDepth(9999);
      
    z.healthFill = this.add
      .rectangle(z.x - 20, z.y - 45, 40, 6, 0xaa0000)
      .setDepth(9999);
      
    // Add shine effect to zombie's health bar
    z.healthShine = this.add
      .rectangle(z.x - 20, z.y - 47, 40, 2, 0xff3333)
      .setAlpha(0.4)
      .setDepth(9999);

    this.time.delayedCall(1000, () => {
      if (!z.isDead) {
        z.play(`Zombie${z.type}_Walk`)
      }
    })

    this.zombies.push(z)
  }

  updateZombies(dt) {
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i]
      if (!z || !z.anims) continue

      if (z.isDead) {
        if (
          z.anims.currentAnim &&
          z.anims.currentAnim.key.includes('Dead') &&
          !z.anims.isPlaying
        ) {
          if (z.movementSound) {
            z.movementSound.stop()
            z.movementSound.destroy()
          }
          z.healthBg.destroy()
          z.healthFill.destroy()
          z.healthShine.destroy()
          z.destroy()
          this.zombies.splice(i, 1)

          this.waveZombiesLeft--
          this.kills++
          this.updateHUD()
          
          // Flash the kills counter when a zombie is killed
          this.tweens.add({
            targets: this.killsValue,
            scale: { from: 1, to: 1.3 },
            duration: 100,
            yoyo: true,
            repeat: 1
          });

          // Drops
          const dropChance = Phaser.Math.Between(1, 1000)
          if (dropChance <= 5) {
            // SIRE
            const sire = this.add.sprite(z.x, z.y, 'sire-token').setDepth(9999)
            sire.isSire = true
            this.makeDropFloat(sire)
          } else if (dropChance <= 55) {
            // soul
            const soul = this.add
              .sprite(z.x, z.y, 'soul-restore')
              .setDepth(9999)
            soul.isSoul = true
            this.makeDropFloat(soul)
          }

          if (this.waveZombiesLeft <= 0) {
            this.waveDone = true
            console.log(
              '[updateZombies] wave done => waveZombiesLeft=0 => waveDone=true'
            )
            this.goSign.setVisible(true)
            this.goSignTween.play()
          }
        }
        continue
      }

      if (this.playerSoul <= 0 || this.playerDead) {
        continue
      }

      // HP bar - updated with better positioning and styling
      const maxBars = 8
      const ratio = z.bars / maxBars
      
      z.healthBg.x = z.x
      z.healthBg.y = z.y - 45
      
      z.healthFill.width = 40 * ratio
      z.healthFill.x = z.x - (40 - z.healthFill.width) / 2
      z.healthFill.y = z.y - 45
      
      z.healthShine.width = 40 * ratio
      z.healthShine.x = z.healthFill.x
      z.healthShine.y = z.y - 47

      // chase
      if (!z.isAttacking) {
        const angle = Math.atan2(this.player.y - z.y, this.player.x - z.x)
        const vx = Math.cos(angle) * z.speed * dt
        const vy = Math.sin(angle) * z.speed * dt
        z.x += vx
        z.y += vy

        z.flipX = z.x > this.player.x
      }

    // if close => attack
    const dist = Phaser.Math.Distance.Between(z.x, z.y, this.player.x, this.player.y)
    if (dist < 40 && !z.isAttacking) {
      if (!z.scene || !z.anims) continue

      z.isAttacking = true
      z.play(`Zombie${z.type}_Attack`)
      z.once('animationcomplete', () => {
        if (!z.isDead && !this.playerDead && this.playerSoul > 0) {
          this.playerSoul -= z.damage
          if (this.playerSoul < 0) this.playerSoul = 0
          this.updateHUD()
          
          // Camera shake when taking damage
          this.cameras.main.shake(200, 0.005);
          
          // Flash the soul bar red when taking damage
          this.tweens.add({
            targets: [this.soulFill],
            alpha: { from: 1, to: 0.2 },
            duration: 100,
            yoyo: true,
            repeat: 2
          });

          z.isAttacking = false
          if (!z.isDead) {
            z.play(`Zombie${z.type}_Walk`)
          }

          // If soul=0 => player dead anim
          if (this.playerSoul <= 0 && !this.playerDead) {
            console.log('Player soul=0 => play Player_Dead anim...')
            this.playerDead = true
            this.player.play('Player_Dead')
            
            // Darken the screen when player dies
            this.add.rectangle(
              this.scale.width/2, 
              this.scale.height/2, 
              this.scale.width, 
              this.scale.height, 
              0x000000
            ).setAlpha(0).setDepth(9998)
            .setAlpha(0)
            .setDepth(9998);
            
            this.tweens.add({
              targets: this.cameras.main,
              zoom: 1.2,
              duration: 1000,
              ease: 'Sine.easeInOut'
            });

            // Once anim done => fade out => pass data to GameOver
            this.player.once('animationcomplete', () => {
              this.cameras.main.fadeOut(1000, 0, 0, 0)
              this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('GameOver', {
                  waxAccount: this.waxAccount,
                  kills: this.kills,
                  waveReached: this.waveNumber,
                  sireEarned: this.sireCollected,
                  // you can pass more fields if you want
                })
              })
            })
          }
        }
      })
    }
  }
}

checkProjectileHits() {
  if (!this.scene.isActive()) return

  for (let i = this.bloodProjectiles.length - 1; i >= 0; i--) {
    const p = this.bloodProjectiles[i]
    for (let z of this.zombies) {
      if (!z || !z.anims || z.isDead) continue

      const dist = Phaser.Math.Distance.Between(p.x, p.y, z.x, z.y)
      if (dist < 30) {
        // Add hit effect
        const hitEffect = this.add.sprite(p.x, p.y, 'Blood_Charge')
          .setScale(1.5)
          .setAlpha(0.7)
          .setDepth(9998);
          
        this.tweens.add({
          targets: hitEffect,
          scale: 0.1,
          alpha: 0,
          duration: 300,
          onComplete: () => hitEffect.destroy()
        });
        
        p.destroy()
        this.bloodProjectiles.splice(i, 1)

        z.bars--
        z.play(`Zombie${z.type}_Hurt`)
        Phaser.Utils.Array.GetRandom(this.zombieHurtSounds).play()
        
        // Flash zombie when hit
        this.tweens.add({
          targets: z,
          alpha: 0.5,
          duration: 50,
          yoyo: true,
          repeat: 2
        });

        if (z.bars <= 0) {
          z.isDead = true
          z.play(`Zombie${z.type}_Dead`)
        } else {
          this.time.delayedCall(300, () => {
            if (!z.isDead && !z.isAttacking && z.anims) {
              z.play(`Zombie${z.type}_Walk`)
            }
          })
        }
        break
      }
    }
  }
}

stageTransitioning = false

handleSectionTransition() {
  if (!this.waveDone) {
    if (this.player.x >= 1000) {
      this.player.x = 1000
    }
    return
  }

  if (this.player.x >= 1000 && !this.stageTransitioning) {
    this.goSign.setVisible(false)
    this.goSignTween.pause()
    this.goSign.setAlpha(1)

    this.stageTransitioning = true
    console.log(
      `[handleSectionTransition] wave #${this.waveNumber} done => shifting left => waveNumber++ => ${
        this.waveNumber + 1
      }`
    )
    this.player.x = 1000

    const shift = this.sectionWidth
    this.currentSection = (this.currentSection + 1) % this.totalSections

    // keep them on top
    this.background1.setDepth(-9999)
    this.background2.setDepth(-9999)
    this.player.setDepth(9999)
    this.bloodProjectiles.forEach((b) => b.setDepth(9999))
    this.zombies.forEach((z) => z.setDepth(9999))
    this.drops.forEach((d) => d.setDepth(9999))
    if (this.goSign) this.goSign.setDepth(9999)
    
    // Add a transition effect - screen flash
    const flash = this.add.rectangle(
      this.scale.width/2, 
      this.scale.height/2, 
      this.scale.width, 
      this.scale.height, 
      0xffffff
    ).setAlpha(0).setDepth(10001);
    
    this.tweens.add({
      targets: flash,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      onComplete: () => flash.destroy()
    });

    this.tweens.add({
      targets: [
        this.background1,
        this.background2,
        this.player,
        ...this.bloodProjectiles,
        ...this.zombies,
        ...this.drops,
      ],
      x: (target) => target.x - shift,
      duration: 1000,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        if (this.background1.x <= -7335) {
          this.background1.x = this.background2.x + 7335
        }
        if (this.background2.x <= -7335) {
          this.background2.x = this.background1.x + 7335
        }
      },
      onComplete: () => {
        this.waveNumber++
        this.updateHUD(); // Update the wave counter in the HUD
        this.waveDone = false
        this.startWave()
        this.stageTransitioning = false
      },
    })
  }
}
}