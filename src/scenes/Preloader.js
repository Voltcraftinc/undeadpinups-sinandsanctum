import { Scene } from 'phaser';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        // Display loading text
        this.add.text(512, 384, 'Loading...', {
            fontSize: 32,
            color: '#ffffff',
        }).setOrigin(0.5);

        // Load common assets
        this.load.image('background-mainmenu', 'assets/background-mainmenu.png');
        this.load.image('freelanceButton', 'assets/freelancebutton.png');
        this.load.image('industryButton', 'assets/industrybutton.png');
        this.load.image('cvButton', 'assets/readmycv.png');
        this.load.image('mtpLogo', 'assets/mtp-logo.png');
        this.load.image('background', 'assets/streetdesign.png');
        this.load.image('character', 'assets/charactersprite.png', {
            frameWidth: 64,
            frameHeight: 64,
        });
        this.load.audio('backgroundMusic', 'assets/starlighthollow-mellow.mp3');
        this.load.image('muteButton', 'assets/mute.png');

        // Load Freelance scene assets
        for (let i = 1; i <= 38; i++) {
            this.load.image(`freelance${i}`, `assets/freelance(${i}).jpg`);
        }

        // Load Game scene assets
        for (let i = 1; i <= 135; i++) {
            this.load.image(`barsandvenues${i}`, `assets/barsandvenues(${i}).jpg`);
        }

        
    }

    create() {
        this.scene.start('MainMenu'); // Start the MainMenu scene after loading
    }

    
}

