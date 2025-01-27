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
    }

    create() {
        // Add the background
        this.add.image(this.scale.width / 2, this.scale.height / 2, 'background-mm').setOrigin(0.5);

        // Create buttons
        const buttonSpacing = 120; // Vertical spacing between buttons

        const freelanceButton = this.add
            .image(this.scale.width / 2, this.scale.height / 2 - buttonSpacing, 'freelanceButton')
            .setInteractive()
            .setScale(1.1);

        const industryButton = this.add
            .image(this.scale.width / 2, this.scale.height / 2, 'industryButton')
            .setInteractive()
            .setScale(1.1);

        const cvButton = this.add
            .image(this.scale.width / 2, this.scale.height / 2 + buttonSpacing, 'cvButton')
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
