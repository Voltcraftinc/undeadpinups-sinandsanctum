import { Scene } from 'phaser';

export class Freelance extends Scene {
    constructor() {
        super('Freelance');
    }

    preload() {
        this.load.image('background', 'assets/streetdesign.png');
        this.load.image('character', 'assets/charactersprite.png');
        this.load.image('muteButton', 'assets/mute.png');
        this.load.image('industryWork', 'assets/industrywork.png');
        this.load.image('backToMenu', 'assets/backToMenu.png');
    
        // Load all freelance JPG and PNG images
        for (let i = 1; i <= 150; i++) {
            this.load.image(`freelance${i}`, `assets/freelance(${i}).jpg`);
            this.load.image(`freelancePNG${i}`, `assets/freelance(${i}).png`); // PNG version
        }
    }

    create() {
        // Add a scrolling background
        this.background = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'background')
            .setOrigin(0)
            .setScrollFactor(0);

        // Add back to menu button
        if (this.textures.exists('backToMenu')) {
            this.backToMenuButton = this.add.image(120, this.scale.height - 60, 'backToMenu')
                .setInteractive()
                .setScrollFactor(0)
                .on('pointerdown', () => this.scene.start('MainMenu'));

            // Adjust button position on screen resize
            this.scale.on('resize', (gameSize) => {
                const { height } = gameSize;
                this.backToMenuButton.setPosition(120, height - 60);
            });
        } else {
            console.error('Asset "backToMenu" not found');
        }

        // Add mute button
        if (this.textures.exists('muteButton')) {
            this.muteButton = this.add.image(this.scale.width - 50, 50, 'muteButton')
                .setScale(0.2)
                .setInteractive()
                .setScrollFactor(0)
                .on('pointerdown', () => {
                    const music = this.sound.get('backgroundMusic');
                    if (music) {
                        music.isPlaying ? music.pause() : music.resume();
                    }
                });
        } else {
            console.error('Asset "muteButton" not found');
        }

        // Add switch button
        if (this.textures.exists('industryWork')) {
            this.switchButton = this.add.image(this.scale.width - 100, this.scale.height - 80, 'industryWork')
                .setScale(0.2)
                .setInteractive()
                .setScrollFactor(0)
                .on('pointerdown', () => {
                    const music = this.sound.get('backgroundMusic');
                    if (music) {
                        music.stop();
                        music.destroy();
                    }
                    this.scene.start('Game');
                });
        } else {
            console.error('Asset "industryWork" not found');
        }

        // **Add character with physics**
        this.character = this.physics.add.sprite(this.scale.width / 2, this.scale.height - 150, 'character');
        this.character.setScale(0.5).setCollideWorldBounds(true);
        this.character.setGravityY(300); // Gravity for smooth hover effect
        this.character.setBounce(0.2); // Slight bounce for realism

        // **Set custom landing position instead of a ground asset**
        this.landingY = this.scale.height - 150; // Defines where the character lands

        // Floating hover animation for the character
        this.tweens.add({
            targets: this.character,
            y: this.character.y - 10,
            yoyo: true,
            repeat: -1,
            duration: 800,
        });

        // **Enable cursor keys and A/D keys for movement**
        this.cursors = this.input.keyboard.addKeys({
            left: Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            D: Phaser.Input.Keyboard.KeyCodes.D,
        });

        // **Jump and Flip Controls**
        this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.flipKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
        this.hasFlipped = false; // Tracks if a flip has already been done in the air
        this.isJumping = false; // Tracks if character is in the air

        // **Create and randomise the freelance assets**
        const designs = Phaser.Utils.Array.Shuffle(
            Array.from({ length: 150 }, (_, i) => [`freelance${i + 1}`, `freelancePNG${i + 1}`]).flat()
        );
        
        this.portfolioGroup = [];
        let currentX = 300;
        
        designs.forEach((key) => {
            if (this.textures.exists(key)) {
                const img = this.add.image(currentX, this.scale.height / 2 - 150, key).setInteractive();
        
                // Dynamically set display size while maintaining aspect ratio
                const maxWidth = 400;
                const maxHeight = 400;
        
                if (img.width / img.height > 1) {
                    img.setDisplaySize(maxWidth, maxWidth / (img.width / img.height));
                } else {
                    img.setDisplaySize(maxHeight * (img.width / img.height), maxHeight);
                }
        
                this.addHoverZoom(img, 1.45, 200); // Add hover zoom effect
        
                // Floating animation
                this.tweens.add({
                    targets: img,
                    y: img.y + 15,
                    yoyo: true,
                    repeat: -1,
                    duration: Phaser.Math.Between(2000, 4000),
                });
        
                this.portfolioGroup.push(img);
                currentX += img.displayWidth + 80; // Adjust spacing dynamically
            } else {
                console.error(`Asset "${key}" not found`);
            }
        });

        this.totalDesignWidth = currentX;
        this.physics.world.setBounds(0, 0, this.totalDesignWidth, this.scale.height);
        this.cameras.main.setBounds(0, 0, this.totalDesignWidth, this.scale.height);
        this.cameras.main.startFollow(this.character);
    }

    update() {
        // Left & Right Movement
        if ((this.cursors.left.isDown || this.cursors.A.isDown) && this.character.x > this.scale.width / 2) {
            this.character.setVelocityX(-500);
            this.character.flipX = true;
            this.background.tilePositionX -= 2;
        } else if (this.cursors.right.isDown || this.cursors.D.isDown) {
            this.character.setVelocityX(500);
            this.character.flipX = false;
            this.background.tilePositionX += 2;
        } else {
            this.character.setVelocityX(0);
        }

        // **Ensure images remain visible**
        this.portfolioGroup.forEach((design) => {
            if (design.x < this.character.x - this.scale.width) {
                design.x += this.totalDesignWidth; // Wraps the image back to the right
            } else if (design.x > this.character.x + this.scale.width) {
                design.x -= this.totalDesignWidth; // Wraps the image back to the left
            }
        });
    

        // Jumping with Spacebar (Smooth Hoverboard Motion)
        if (Phaser.Input.Keyboard.JustDown(this.jumpKey) && !this.isJumping) {
            this.isJumping = true; // Mark the character as in the air
            this.hasFlipped = false; // Reset flip capability

            // Apply smooth jump motion (tween up, then down)
            this.tweens.add({
                targets: this.character,
                y: this.character.y - 150, // Smoothly jump up
                duration: 600,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    this.tweens.add({
                        targets: this.character,
                        y: this.landingY, // Smoothly fall back down
                        duration: 800,
                        ease: 'Quad.easeIn',
                        onComplete: () => {
                            this.isJumping = false; // Allow jumping again
                        }
                    });
                }
            });
        
        }

        // Backflip with F Key (only in the air & only once per jump)
        if (Phaser.Input.Keyboard.JustDown(this.flipKey) && this.isJumping && !this.hasFlipped) {
            this.hasFlipped = true; // Prevent multiple flips in one jump
            this.tweens.add({
                targets: this.character,
                angle: this.character.angle + 360, // Rotate fully
                duration: 600, // Smooth flip animation
                ease: 'Cubic.easeOut'
            });
        }

        this.portfolioGroup.forEach((design) => {
            if (design.x < this.character.x - this.scale.width) {
                design.x += this.totalDesignWidth;
            }
        });
    }

    addHoverZoom(target, scaleFactor, duration) {
        target.on('pointerover', () => {
            this.tweens.add({
                targets: target,
                scale: target.scale * scaleFactor,
                duration: duration,
            });
        });

        target.on('pointerout', () => {
            this.tweens.add({
                targets: target,
                scale: target.scale / scaleFactor,
                duration: duration,
            });
        });
    }
}
