import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { MainMenu } from './scenes/MainMenu';
import { Game } from './scenes/Game';
import { Freelance } from './scenes/Freelance';

const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { debug: false },
    },
    scene: [Boot, Preloader, MainMenu, Game, Freelance],
};

// REMOVE window.game CHECK – Just start Phaser normally
new Phaser.Game(config);
