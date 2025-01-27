import { Scene } from 'phaser';

export class Game extends Scene {
    constructor() {
        super('Game');
    }

    preload() {
        this.load.image('background', 'assets/streetdesign.png');
        this.load.image('character', 'assets/charactersprite.png');
        this.load.audio('backgroundMusic', 'assets/starlighthollow-mellow.mp3');
        this.load.image('muteButton', 'assets/mute.png');

        // Load all portfolio images
        for (let i = 1; i <= 135; i++) {
            this.load.image(`barsandvenues${i}`, `assets/barsandvenues (${i}).jpg`);
        }

        // Load PNG variations of portfolio images
        for (let i = 1; i <= 5; i++) {
            this.load.image(`barsandvenues-png${i}`, `assets/barsandvenues-${i}.png`);
        }
    }

    create() {
        // Add a scrolling background
        this.background = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'background')
            .setOrigin(0)
            .setScrollFactor(0);

        // Play background music
        this.music = this.sound.add('backgroundMusic', { loop: true });
        this.music.play();

        // Add mute button
        this.muteButton = this.add.image(this.scale.width - 50, 50, 'muteButton')
            .setScale(0.2)
            .setInteractive()
            .setScrollFactor(0); // Fixed in the top-right corner
        this.muteButton.on('pointerdown', () => {
            if (this.music.isPlaying) {
                this.music.pause();
            } else {
                this.music.resume();
            }
        });

        // Add character
        this.character = this.physics.add.sprite(this.scale.width / 2, this.scale.height - 150, 'character');
        this.character.setScale(0.5);
        this.character.setCollideWorldBounds(true);

        // Floating hover animation for the character
        this.tweens.add({
            targets: this.character,
            y: this.character.y - 10,
            yoyo: true,
            repeat: -1,
            duration: 800,
        });

        // Enable cursor keys and A/D keys
        this.cursors = this.input.keyboard.addKeys({
            left: Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            D: Phaser.Input.Keyboard.KeyCodes.D,
        });

        // Create and randomise the barsandvenues assets
        const designs = Phaser.Utils.Array.Shuffle([
            ...Array.from({ length: 135 }, (_, i) => `barsandvenues${i + 1}`),
            ...Array.from({ length: 5 }, (_, i) => `barsandvenues-png${i + 1}`),
        ]);

        this.portfolioGroup = [];
        let currentX = 300; // Initial X position

        designs.forEach((key) => {
            const img = this.add.image(currentX, this.scale.height / 2 - 150, key).setScale(0.5).setInteractive();
            this.addHoverZoom(img, 1.2, 200); // Add hover zoom effect (scaleFactor = 1.2, duration = 200ms)

            // Floating animation
            this.tweens.add({
                targets: img,
                y: img.y + 15,
                yoyo: true,
                repeat: -1,
                duration: Phaser.Math.Between(2000, 4000),
            });

            this.portfolioGroup.push(img);
            currentX += img.width * 0.3 + 200; // Increased spacing between assets (200 pixels)
        });

        // Save the total width of the designs for looping
        this.totalDesignWidth = currentX;

        // Set camera bounds to prevent going left past the starting point
        this.physics.world.setBounds(0, 0, this.totalDesignWidth, this.scale.height);
        this.cameras.main.setBounds(0, 0, this.totalDesignWidth, this.scale.height);
        this.cameras.main.startFollow(this.character);
    }

    update() {
        // Character movement with arrow keys and A/D keys
        if ((this.cursors.left.isDown || this.cursors.A.isDown) && this.character.x > this.scale.width / 2) {
            this.character.setVelocityX(-200);
            this.character.flipX = true; // Flip character to face left
            this.background.tilePositionX -= 2; // Move the background
        } else if (this.cursors.right.isDown || this.cursors.D.isDown) {
            this.character.setVelocityX(200);
            this.character.flipX = false; // Face right
            this.background.tilePositionX += 2; // Move the background
        } else {
            this.character.setVelocityX(0);
        }

        // Loop the designs infinitely
        this.portfolioGroup.forEach((design) => {
            if (design.x < this.character.x - this.scale.width) {
                design.x += this.totalDesignWidth;
            }
        });
    }

    // Function to add hover zoom effect
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
