import { Scene } from 'phaser';

export class Game extends Scene {
    constructor() {
        super('Game');
    }

    preload() {
        this.load.image('background', 'assets/streetdesign.png');
        this.load.image('character', 'assets/charactersprite.png');
        this.load.image('backToMenu', 'assets/backToMenu.png'); // Load main menu button
        this.load.image('muteButton', 'assets/mute.png');
        this.load.image('switchButton', 'assets/freelance.png'); // Switch button for freelance.js

        // Load all barsandvenues JPG and PNG images
        for (let i = 1; i <= 234; i++) {
            this.load.image(`barsandvenues${i}`, `assets/barsandvenues(${i}).jpg`);
            this.load.image(`barsandvenuesPNG${i}`, `assets/barsandvenues(${i}).png`); // PNG version
        }
    }

    create() {
        // Add a scrolling background
        this.background = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'background')
            .setOrigin(0)
            .setScrollFactor(0);

        this.backToMenuButton = this.add.image(120, this.scale.height - 60, 'backToMenu')
            .setInteractive()
            .setScrollFactor(0)
            .on('pointerdown', () => this.scene.start('MainMenu'));

        // Add mute button
        this.muteButton = this.add.image(this.scale.width - 50, 50, 'muteButton')
            .setScale(0.2)
            .setInteractive()
            .setScrollFactor(0);
        this.muteButton.on('pointerdown', () => {
            const music = this.sound.get('backgroundMusic');
            if (music) {
                music.isPlaying ? music.pause() : music.resume();
            }
        });

        // Add switch button
        this.switchButton = this.add.image(this.scale.width - 100, this.scale.height - 80, 'switchButton')
            .setScale(0.2)
            .setInteractive()
            .setScrollFactor(0);
        this.switchButton.on('pointerdown', () => {
            this.scene.start('Freelance');
        });

        // **Add character with physics**
        this.character = this.physics.add.sprite(this.scale.width / 2, this.scale.height - 150, 'character');
        this.character.setScale(0.5).setCollideWorldBounds(true);
        this.character.setGravityY(300); // Gravity for smooth hover effect
        this.character.setBounce(0.2); // Slight bounce for realism

        // **Set custom landing position**
        this.landingY = this.scale.height - 150; // Defines where the character lands

        // Floating hover animation
        this.tweens.add({
            targets: this.character,
            y: this.character.y - 10,
            yoyo: true,
            repeat: -1,
            duration: 800,
        });

        // **Enable movement controls**
        this.cursors = this.input.keyboard.addKeys({
            left: Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            D: Phaser.Input.Keyboard.KeyCodes.D,
        });

        // **Jump and Flip Controls**
        this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.flipKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
        this.hasFlipped = false;
        this.isJumping = false;

        // **Load and randomise the barsandvenues assets**
        const designs = Phaser.Utils.Array.Shuffle(
            Array.from({ length: 234 }, (_, i) => [`barsandvenues${i + 1}`, `barsandvenuesPNG${i + 1}`]).flat()
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

                this.addHoverZoom(img, 1.2, 200);

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
        // **Left & Right Movement**
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

        // **Jumping with Spacebar (Smooth Hoverboard Motion)**
        if (Phaser.Input.Keyboard.JustDown(this.jumpKey) && !this.isJumping) {
            this.isJumping = true;
            this.hasFlipped = false;

            // Apply smooth jump motion (tween up, then down)
            this.tweens.add({
                targets: this.character,
                y: this.character.y - 150,
                duration: 600,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    this.tweens.add({
                        targets: this.character,
                        y: this.landingY,
                        duration: 800,
                        ease: 'Quad.easeIn',
                        onComplete: () => {
                            this.isJumping = false;
                        }
                    });
                }
            });
        }

        // **Backflip with F Key (only in the air & only once per jump)**
        if (Phaser.Input.Keyboard.JustDown(this.flipKey) && this.isJumping && !this.hasFlipped) {
            this.hasFlipped = true;
            this.tweens.add({
                targets: this.character,
                angle: this.character.angle + 360,
                duration: 600,
                ease: 'Cubic.easeOut'
            });
        }

        // **Ensure images remain visible**
        this.portfolioGroup.forEach((design) => {
            if (design.x < this.character.x - this.scale.width) {
                design.x += this.totalDesignWidth;
            } else if (design.x > this.character.x + this.scale.width) {
                design.x -= this.totalDesignWidth;
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
