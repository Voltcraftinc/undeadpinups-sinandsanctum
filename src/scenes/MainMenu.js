import { Scene } from "phaser";

export class MainMenu extends Scene {
    constructor() {
        super("MainMenu");
    }

    preload() {
        this.load.image("background-mm", "assets/background-mainmenu.png");
        this.load.image("freelanceButton", "assets/freelancebutton.png");
        this.load.audio("backgroundMusic", "assets/starlighthollow-mellow.mp3");
    }

    create() {
        this.add.image(this.scale.width / 2, this.scale.height / 2, "background-mm").setOrigin(0.5);

        if (!this.sound.get("backgroundMusic")) {
            this.music = this.sound.add("backgroundMusic", { loop: true });
            this.music.play();
        }

        const freelanceButton = this.add
            .image(this.scale.width / 2, this.scale.height / 1.7, "freelanceButton")
            .setInteractive()
            .setScale(1.1);

        this.tweens.add({
            targets: freelanceButton,
            y: freelanceButton.y + 10,
            yoyo: true,
            repeat: -1,
            duration: 800,
            ease: "Sine.easeInOut",
        });

        freelanceButton.on("pointerdown", () => {
            this.scene.start("Game");
        });
    }
}
