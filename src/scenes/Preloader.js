import { Scene } from 'phaser';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        // Display loading text
        this.add.text(512, 512, 'Loading...', { fontSize: 32, color: '#ffffff' }).setOrigin(0.5);

        // Load background and character
        this.load.image('background', 'assets/streetdesign.png');
        this.load.spritesheet('character', 'assets/charactersprite.png', {
            frameWidth: 64,
            frameHeight: 64,
        });

        // Load all portfolio images
        for (let i = 1; i <= 135; i++) {
            this.load.image(`barsandvenues${i}`, `assets/barsandvenues (${i}).jpg`);
        }

        // Load any PNG variations of portfolio images
        for (let i = 1; i <= 5; i++) {
            this.load.image(`barsandvenues-png${i}`, `assets/barsandvenues-${i}.png`);
        }
    }

    create() {
        this.scene.start('Game');
    }
}
