import { Scene } from 'phaser';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        // Display loading text
        this.add.text(512, 512, 'Loading...', { fontSize: 32, color: '#ffffff' }).setOrigin(0.5);

        // Load common assets
        this.load.image('background', 'assets/streetdesign.png');
        this.load.spritesheet('character', 'assets/charactersprite.png', {
            frameWidth: 64,
            frameHeight: 64,
        });
        this.load.audio('backgroundMusic', 'assets/starlighthollow-mellow.mp3');
        this.load.image('muteButton', 'assets/mute.png');

        // Main menu

        // Buttons for switching
        this.load.image('freelanceButton', 'assets/freelance.png'); // For Game.js
        this.load.image('industryworkButton', 'assets/industrywork.png'); // For Freelance.js

        // Load all barsandvenues images
        for (let i = 1; i <= 135; i++) {
            this.load.image(`barsandvenues${i}`, `assets/barsandvenues(${i}).jpg`);
        }

        // Load all freelance JPGs
        for (let i = 1; i <= 135; i++) {
            const path = `assets/freelance(${i}).jpg`;
            console.log(`Loading JPG: ${path}`);
            this.load.image(`freelance${i}`, path);
        }
    }

    create() {
        this.scene.start('MainMenu'); // Start the Game scene initially
    }
}
