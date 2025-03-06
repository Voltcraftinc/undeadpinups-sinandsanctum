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

        // **Load Main Assets**
        this.load.image("background-mainmenu", "assets/background-mainmenu.png");
        this.load.image("freelanceButton", "assets/freelancebutton.png");
        this.load.image("background", "assets/streetdesign.png");
        this.load.audio("backgroundMusic", "assets/starlighthollow-mellow.mp3");
        this.load.image("muteButton", "assets/mute.png");
        this.load.image("goSign", "assets/go-icon.png");


        // **Load Character Spritesheets** (Countess)
        this.load.spritesheet("Idle", "assets/sprites/Countess_Vampire/Idle.png", {
            frameWidth: 128,
            frameHeight: 128
        });
        this.load.spritesheet("Walk", "assets/sprites/Countess_Vampire/Walk.png", {
            frameWidth: 128,
            frameHeight: 128
        });
        this.load.spritesheet("Run", "assets/sprites/Countess_Vampire/Run.png", {
            frameWidth: 128,
            frameHeight: 128
        });
        this.load.spritesheet("Jump", "assets/sprites/Countess_Vampire/Jump.png", {
            frameWidth: 128,
            frameHeight: 128
        });
        this.load.spritesheet("Attack_1", "assets/sprites/Countess_Vampire/Attack_1.png", {
            frameWidth: 128,
            frameHeight: 128
        });
       // After (use spritesheet):
this.load.spritesheet("Blood_Charge", "assets/sprites/Countess_Vampire/Blood_Charge_1.png", {
    frameWidth: 64,  
    frameHeight: 48
});
        this.load.spritesheet("Hurt", "assets/sprites/Countess_Vampire/Hurt.png", {
            frameWidth: 128,
            frameHeight: 128
        });
        this.load.spritesheet("Dead", "assets/sprites/Countess_Vampire/Dead.png", {
            frameWidth: 128,
            frameHeight: 128
        });

           // ~~~ Zombie_1 (5 PNGs) ~~~
           this.load.spritesheet("Zombie1_Attack","assets/sprites/Zombie_1/Attack.png",{ frameWidth:128, frameHeight:128 });
           this.load.spritesheet("Zombie1_Dead",  "assets/sprites/Zombie_1/Dead.png",  { frameWidth:128, frameHeight:128 });
           this.load.spritesheet("Zombie1_Hurt",  "assets/sprites/Zombie_1/Hurt.png",  { frameWidth:128, frameHeight:128 });
           this.load.spritesheet("Zombie1_Idle",  "assets/sprites/Zombie_1/Idle.png",  { frameWidth:128, frameHeight:128 });
           this.load.spritesheet("Zombie1_Walk",  "assets/sprites/Zombie_1/Walk.png",  { frameWidth:128, frameHeight:128 });
   
           // ~~~ Zombie_2 ~~~
           this.load.spritesheet("Zombie2_Attack","assets/sprites/Zombie_2/Attack.png",{ frameWidth:128, frameHeight:128 });
           this.load.spritesheet("Zombie2_Dead",  "assets/sprites/Zombie_2/Dead.png",  { frameWidth:128, frameHeight:128 });
           this.load.spritesheet("Zombie2_Hurt",  "assets/sprites/Zombie_2/Hurt.png",  { frameWidth:128, frameHeight:128 });
           this.load.spritesheet("Zombie2_Idle",  "assets/sprites/Zombie_2/Idle.png",  { frameWidth:128, frameHeight:128 });
           this.load.spritesheet("Zombie2_Walk",  "assets/sprites/Zombie_2/Walk.png",  { frameWidth:128, frameHeight:128 });
   
           // ~~~ Zombie_3 ~~~
           this.load.spritesheet("Zombie3_Attack","assets/sprites/Zombie_3/Attack.png",{ frameWidth:128, frameHeight:128 });
           this.load.spritesheet("Zombie3_Dead",  "assets/sprites/Zombie_3/Dead.png",  { frameWidth:128, frameHeight:128 });
           this.load.spritesheet("Zombie3_Hurt",  "assets/sprites/Zombie_3/Hurt.png",  { frameWidth:128, frameHeight:128 });
           this.load.spritesheet("Zombie3_Idle",  "assets/sprites/Zombie_3/Idle.png",  { frameWidth:128, frameHeight:128 });
           this.load.spritesheet("Zombie3_Walk",  "assets/sprites/Zombie_3/Walk.png",  { frameWidth:128, frameHeight:128 });
   
           // ~~~ Zombie_4 ~~~
           this.load.spritesheet("Zombie4_Attack","assets/sprites/Zombie_4/Attack.png",{ frameWidth:128, frameHeight:128 });
           this.load.spritesheet("Zombie4_Dead",  "assets/sprites/Zombie_4/Dead.png",  { frameWidth:128, frameHeight:128 });
           this.load.spritesheet("Zombie4_Hurt",  "assets/sprites/Zombie_4/Hurt.png",  { frameWidth:128, frameHeight:128 });
           this.load.spritesheet("Zombie4_Idle",  "assets/sprites/Zombie_4/Idle.png",  { frameWidth:128, frameHeight:128 });
           this.load.spritesheet("Zombie4_Walk",  "assets/sprites/Zombie_4/Walk.png",  { frameWidth:128, frameHeight:128 });
   

        // Once complete => start MainMenu
        this.load.once("complete", () => {
            this.scene.start("MainMenu");
        });
    }
}
