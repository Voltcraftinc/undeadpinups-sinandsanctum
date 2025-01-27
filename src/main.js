import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { Game } from './scenes/Game';

if (!window.phaserGame) {
    const config = {
        type: Phaser.AUTO,
        width: 1024,
        height: 768,
        parent: 'game-container',
        physics: {
            default: 'arcade',
            arcade: {
                debug: false,
            },
        },
        scene: [Game],
    };

    window.phaserGame = new Phaser.Game(config); // Store game instance globally
}
