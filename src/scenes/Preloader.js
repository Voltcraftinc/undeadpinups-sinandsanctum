import { Scene } from "phaser";

export class Preloader extends Scene {
    constructor() {
        super("Preloader");
    }

    preload() {
        this.add.text(512, 384, "Loading...", {
            fontSize: 32,
            color: "#ffffff",
        }).setOrigin(0.5);

        // **Main Menu Assets**
        this.load.image("background-mainmenu", "assets/background-mainmenu.png");
        this.load.image("background", "assets/streetdesign.png");
        this.load.audio("backgroundMusic", "assets/starlighthollow-mellow.mp3");
        this.load.image("muteButton", "assets/mute.png");
        this.load.image("goSign", "assets/go-icon.png");

        // **Buttons**
        this.load.image("freelanceButton", "assets/freelancebutton.png");
        this.load.image("loginButton", "assets/login-button.png");

        // **Wallet UI Elements**
        this.load.image("blackOverlay", "assets/black-overlay.png");
        this.load.image("waxWallet", "assets/wax-wallet.png");
        this.load.image("anchorWallet", "assets/anchor-wallet.png");

        // **Sounds**
        this.load.audio("zombiehurt1", "assets/zombiehurt1.mp3");
        this.load.audio("zombiehurt2", "assets/zombiehurt2.mp3");
        this.load.audio("zombiehurt3", "assets/zombiehurt3.mp3");
        this.load.audio("bloodchargefire", "assets/bloodchargefire.mp3");
        this.load.audio("zombiemovementsound", "assets/zombiemovementsound.mp3");

        // **Soul restore & WYNX token**
        this.load.image("soul-restore", "assets/soul-restore.png");
        this.load.image("wynx-token", "assets/wynx-token.png");

        // **Character Spritesheets**
        this.load.spritesheet("Idle", "assets/sprites/Countess_Vampire/Idle.png", {
            frameWidth: 128, frameHeight: 128
        });
        this.load.spritesheet("Walk", "assets/sprites/Countess_Vampire/Walk.png", {
            frameWidth: 128, frameHeight: 128
        });
        this.load.spritesheet("Run", "assets/sprites/Countess_Vampire/Run.png", {
            frameWidth: 128, frameHeight: 128
        });
        this.load.spritesheet("Jump", "assets/sprites/Countess_Vampire/Jump.png", {
            frameWidth: 128, frameHeight: 128
        });
        this.load.spritesheet("Attack_1", "assets/sprites/Countess_Vampire/Attack_1.png", {
            frameWidth: 128, frameHeight: 128
        });
        this.load.spritesheet("Blood_Charge", "assets/sprites/Countess_Vampire/Blood_Charge_1.png", {
            frameWidth: 64, frameHeight: 48
        
        });

        this.load.spritesheet("Dead", "assets/sprites/Countess_Vampire/Dead.png", {
            frameWidth: 128,
            frameHeight: 128
          }); 

        // **Zombie Spritesheets**
        for (let i = 1; i <= 4; i++) {
            this.load.spritesheet(`Zombie${i}_Attack`, `assets/sprites/Zombie_${i}/Attack.png`, { frameWidth: 128, frameHeight: 128 });
            this.load.spritesheet(`Zombie${i}_Dead`, `assets/sprites/Zombie_${i}/Dead.png`, { frameWidth: 128, frameHeight: 128 });
            this.load.spritesheet(`Zombie${i}_Hurt`, `assets/sprites/Zombie_${i}/Hurt.png`, { frameWidth: 128, frameHeight: 128 });
            this.load.spritesheet(`Zombie${i}_Idle`, `assets/sprites/Zombie_${i}/Idle.png`, { frameWidth: 128, frameHeight: 128 });
            this.load.spritesheet(`Zombie${i}_Walk`, `assets/sprites/Zombie_${i}/Walk.png`, { frameWidth: 128, frameHeight: 128 });
        }

        // **Once complete => start MainMenu**
        this.load.once("complete", () => {
            this.scene.start("MainMenu");
        });
    }
}
