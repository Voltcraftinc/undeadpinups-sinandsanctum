import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { MainMenu } from './scenes/MainMenu';
import { Game } from './scenes/Game';
import { Freelance } from './scenes/Freelance';

import Phaser from 'phaser';


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
    scene: [Boot, Preloader, MainMenu, Game, Freelance], // Include all scenes
};

const game = new Phaser.Game(config);
