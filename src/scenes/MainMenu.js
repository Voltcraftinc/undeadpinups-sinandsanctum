import { Scene } from 'phaser';

export class MainMenu extends Scene {
    constructor() {
        super('MainMenu');
    }

    preload() {
        // Preload assets
        this.load.image('background-mm', 'assets/background-mainmenu.png');
        this.load.image('freelanceButton', 'assets/freelancebutton.png');
        this.load.image('industryButton', 'assets/industrybutton.png');
        this.load.image('cvButton', 'assets/readmycv.png');
        this.load.image('mtpLogo', 'assets/mtp-logo.png'); // Load the logo
        this.load.audio('backgroundMusic', 'assets/starlighthollow-mellow.mp3');
        this.load.image('muteButton', 'assets/mute.png');
        this.load.audio('backgroundMusic', 'assets/starlighthollow-mellow.mp3');
    }

    create() {
        // Add the background
        this.add.image(this.scale.width / 2, this.scale.height / 2, 'background-mm').setOrigin(0.5);

        // Play background music
        if (!this.sound.get('backgroundMusic')) {
            this.music = this.sound.add('backgroundMusic', { loop: true });
            this.music.play();
        }

        // Add mute button
        this.muteButton = this.add.image(this.scale.width - 50, 50, 'muteButton')
            .setScale(0.2)
            .setInteractive()
            .setScrollFactor(0);
        this.muteButton.on('pointerdown', () => {
            if (this.music.isPlaying) {
                this.music.pause();
            } else {
                this.music.resume();
            }
        });

        // Add the logo with floating and glitch effect
        const logo = this.add.image(this.scale.width / 2, this.scale.height / 6, 'mtpLogo')
            .setOrigin(0.5)
            .setScale(0.35); // Adjust scale as needed

        // Floating animation for the logo
        this.tweens.add({
            targets: logo,
            y: logo.y - 10,
            yoyo: true,
            repeat: -1,
            duration: 1500,
            ease: 'Sine.easeInOut',
        });

        // Glitch effect for the logo
        this.time.addEvent({
            delay: Phaser.Math.Between(3000, 5000), // Random delay between glitches
            callback: () => {
                this.tweens.add({
                    targets: logo,
                    x: logo.x + Phaser.Math.Between(-5, 5),
                    y: logo.y + Phaser.Math.Between(-5, 5),
                    duration: 50,
                    yoyo: true,
                    repeat: Phaser.Math.Between(1, 3), // Random number of "jitters"
                    onComplete: () => {
                        logo.setPosition(this.scale.width / 2, this.scale.height / 6); // Reset position after glitch
                    },
                });
            },
            loop: true,
        });

        // Create buttons
        const buttonSpacing = 120; // Vertical spacing between buttons

        const freelanceButton = this.add
            .image(this.scale.width / 2, this.scale.height / 1.7 - buttonSpacing, 'freelanceButton')
            .setInteractive()
            .setScale(1.1);

        const industryButton = this.add
            .image(this.scale.width / 2, this.scale.height / 1.55, 'industryButton')
            .setInteractive()
            .setScale(1.1);

        const cvButton = this.add
            .image(this.scale.width / 2, this.scale.height / 1.43 + buttonSpacing, 'cvButton')
            .setInteractive()
            .setScale(1.1);

        // Add bouncing animations for buttons
        this.tweens.add({
            targets: [freelanceButton, industryButton, cvButton],
            y: '+=10',
            yoyo: true,
            repeat: -1,
            duration: 800,
            ease: 'Sine.easeInOut',
        });

        // Add button functionality
        freelanceButton.on('pointerdown', () => {
            this.scene.start('Freelance'); // Navigate to the freelance portfolio
        });

        industryButton.on('pointerdown', () => {
            this.scene.start('Game'); // Navigate to the industry portfolio
        });

        cvButton.on('pointerdown', () => {
            this.loadCV(); // Load the CV document
        });
    }

    loadCV() {
        // Create a link to download the CV document
        const cvLink = document.createElement('a');
        cvLink.href = 'assets/MDT_DESIGNCV_2025.docx'; // Path to the CV document
        cvLink.download = 'MDT_DESIGNCV_2025.docx';
        cvLink.click();
    }

    
}
