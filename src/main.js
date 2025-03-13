import Phaser from "phaser";
import { Boot } from "./scenes/Boot";
import { Preloader } from "./scenes/Preloader";
import { MainMenu } from "./scenes/MainMenu";
import { Game } from "./scenes/Game";
import { GameOver } from "./scenes/GameOver";
import { Standings } from "./scenes/Standings";
import { StakingUI } from "./scenes/StakingUI";
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';


const config = {
  type: Phaser.AUTO,
  width: 1024,
  height: 768,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: [Boot, Preloader, MainMenu, Game, GameOver, Standings, StakingUI],
  
  plugins: {
    scene: [
      {
        key: 'rexUI',
        plugin: RexUIPlugin,
        mapping: 'rexUI'
      }
    ]
  }
};

if (!window.game) {
  window.game = new Phaser.Game(config);
}
