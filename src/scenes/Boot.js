import { Scene } from 'phaser';

export class Boot extends Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        // Log that the boot scene is loading
        console.log('Boot scene loaded');
    }

    create() {
        this.scene.start('Preloader'); // Move to the Preloader scene
    }
}
