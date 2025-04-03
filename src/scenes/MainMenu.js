// src/scenes/MainMenu.js
import { Scene } from "phaser";

// WharfKit imports
import { SessionKit } from "@wharfkit/session";
import { WebRenderer } from "@wharfkit/web-renderer";

// Wallet plugins
import { WalletPluginAnchor } from "@wharfkit/wallet-plugin-anchor";
import { WalletPluginCloudWallet } from "@wharfkit/wallet-plugin-cloudwallet";
import { WalletPluginWombat } from "@wharfkit/wallet-plugin-wombat";

// WAX chain definitions
const WAX_CHAINS = [
  {
    // Cloud Wallet chain
    id: "1064487b3cd1f44d82c42c1ec67a7e9e66aeb51fd6aa7666b56fdd39c3a2df94",
    url: "https://wax.greymass.com"
  },
  {
    // Anchor/Wombat chain
    id: "1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4",
    url: "https://wax.greymass.com"
  }
];

// SIRE token contract (used for balance fetch)
const TOKEN_CONTRACT = "siretoken.gm";

export class MainMenu extends Scene {
  constructor() {
    super("MainMenu");
    this.buttonHoverScale = 1.05;
    this.buttonClickScale = 0.95;
    this.sireBalance = 0;
  }

  async create() {
    const { width, height } = this.scale;

    // 1) Set up background with parallax effect
    this.background = this.add
      .image(width / 2, height / 2, "background-mainmenu")
      .setOrigin(0.5);
    this.input.on("pointermove", (pointer) => {
      const deltaX = pointer.x - width / 2;
      const deltaY = pointer.y - height / 2;
      this.background.x = width / 2 + deltaX * 0.003;
      this.background.y = height / 2 + deltaY * 0.003;
    });

    // 2) Music fade-in (if music asset is preloaded)
    if (!this.sound.get("backgroundMusic")) {
      this.music = this.sound.add("backgroundMusic", { loop: true, volume: 0 });
      try {
        this.music.play();
        this.tweens.add({
          targets: this.music,
          volume: 0.7,
          duration: 2000,
          ease: "Linear"
        });
      } catch (e) {
        console.warn("Music failed to autoplay:", e);
      }
    }

    // 3) Display logo image instead of animated text
    this.add.image(width / 2, 160, "undeadpinups-ss-logo")
      .setOrigin(0.5)
      .setScale(0.4);

    // 4) Setup SessionKit for multi-wallet login
    this.sessionKit = new SessionKit({
      appName: "UndeadPinupsSIREDapp",
      chains: WAX_CHAINS,
      ui: new WebRenderer(),
      walletPlugins: [
        new WalletPluginAnchor(),
        new WalletPluginCloudWallet(),
        new WalletPluginWombat()
      ]
    });

    // 5) Prepare login button (styled)
    this.loginButton = this.add
      .image(width / 2, height / 3, "loginButton")
      .setInteractive()
      .setScale(0.9)
      .setVisible(false)
      .setAlpha(0);
    const loginButtonGlow = this.add
      .image(width / 2, height / 3, "loginButton")
      .setScale(1)
      .setVisible(false)
      .setAlpha(0)
      .setTint(0x00ffff);
    this.tweens.add({
      targets: loginButtonGlow,
      scale: 1.1,
      alpha: 0.3,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    this.setupButtonInteraction(this.loginButton);
    this.buttonAppearTween = this.tweens.add({
      targets: [this.loginButton, loginButtonGlow],
      alpha: { from: 0, to: 1 },
      scale: { from: 0.5, to: this.loginButton.scale },
      duration: 800,
      ease: "Back.easeOut",
      paused: true
    });
    this.loginButton.on("pointerdown", () => {
      this.handleMultiWalletLogin();
    });

    // 6) Create menu buttons (only image buttons; no extra overlay text)
    this.freelanceButton = this.createGameButton(width / 2, height / 2 - 50, "freelanceButton");
    this.standingsButton = this.createGameButton(width / 2, height / 2 + 50, "standingsButton");
    this.stakingButton = this.createGameButton(width / 2, height / 2 + 150, "stakingButton");

    // Button functionality (transition to scenes)
    this.freelanceButton.on("pointerdown", () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        if (!this.userName) {
          console.warn("No userName found, cannot continue to Game scene!");
          return;
        }
        this.scene.start("Game", { waxAccount: this.userName });
      });
    });
    this.standingsButton.on("pointerdown", () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("Standings");
      });
    });
    this.stakingButton.on("pointerdown", () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("StakingUI");
      });
    });

    // 7) Create HUD (top bar) to show SIRE balance, username, and logout button
    this.topBar = this.add.rectangle(0, 0, width, 50, 0x000000, 0.8)
      .setOrigin(0, 0)
      .setDepth(9999)
      .setVisible(false);
    this.topBarBorder = this.add.rectangle(0, 50, width, 2, 0xff0066, 1)
      .setOrigin(0, 0)
      .setDepth(9999)
      .setVisible(false);
    this.characterPortrait = this.add.circle(30, 25, 20, 0xff0066)
      .setDepth(10000)
      .setVisible(false);
    this.userText = this.add.text(60, 15, "???", {
      fontSize: "18px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3
    })
      .setDepth(10000)
      .setVisible(false);
    this.sireIcon = this.add.circle(width / 2 - 50, 25, 15, 0xf9d71c)
      .setDepth(10000)
      .setVisible(false);
    this.sireText = this.add.text(width / 2 - 20, 15, "SIRE: 0", {
      fontSize: "18px",
      fontStyle: "bold",
      color: "#f9d71c",
      stroke: "#000000",
      strokeThickness: 3
    })
      .setDepth(10000)
      .setVisible(false);
    this.logoutButton = this.add.rectangle(width - 80, 25, 120, 35, 0x333333, 0.8)
      .setDepth(10000)
      .setVisible(false)
      .setInteractive();
    this.logoutText = this.add.text(width - 80, 25, "LOGOUT", {
      fontSize: "16px",
      fontStyle: "bold",
      color: "#ff0066",
      stroke: "#000000",
      strokeThickness: 2
    })
      .setOrigin(0.5)
      .setDepth(10001)
      .setVisible(false);
    this.logoutButton.on("pointerover", () => {
      this.logoutButton.setFillStyle(0x555555, 0.8);
      this.logoutText.setScale(1.1);
    });
    this.logoutButton.on("pointerout", () => {
      this.logoutButton.setFillStyle(0x333333, 0.8);
      this.logoutText.setScale(1);
    });
    this.logoutButton.on("pointerdown", () => {
      this.logoutButton.setFillStyle(0x222222, 0.8);
      this.logoutText.setScale(0.9);
      this.sound.add("clickSound", { volume: 0.5 }).play();
      this.logout();
    });

    // 8) Loading indicator
    this.loadingContainer = this.add.container(width / 2, height / 2);
    this.loadingBg = this.add.rectangle(0, 0, 300, 100, 0x000000, 0.7).setOrigin(0.5);
    this.loadingText = this.add.text(0, 0, "Connecting to wallet...", {
      fontSize: "20px",
      color: "#ffffff"
    }).setOrigin(0.5);
    this.loadingContainer.add([this.loadingBg, this.loadingText]);
    this.loadingContainer.setVisible(false).setDepth(10000);

    // 9) Attempt to restore session (stay logged in until logout)
    await this.restoreSession();
  }

  // Button interaction effects
  setupButtonInteraction(button) {
    button.on("pointerover", () => {
      this.tweens.add({
        targets: button,
        scale: this.buttonHoverScale * (button.baseScale || 1),
        duration: 100,
        ease: "Power1"
      });
    });
    button.on("pointerout", () => {
      this.tweens.add({
        targets: button,
        scale: button.baseScale || 1,
        duration: 100,
        ease: "Power1"
      });
    });
    button.on("pointerdown", () => {
      this.tweens.add({
        targets: button,
        scale: this.buttonClickScale * (button.baseScale || 1),
        duration: 100,
        yoyo: true,
        ease: "Power1"
      });
      this.sound.add("clickSound", { volume: 0.5 }).play();
    });
    button.baseScale = button.scale;
  }

  // Restore session from storage so user stays logged in
  async restoreSession() {
    try {
      const restoredSession = await this.sessionKit.restore();
      if (!restoredSession) {
        console.log("No existing session found – showing login button.");
        this.loginButton.setVisible(true);
        this.buttonAppearTween.play();
        return;
      }
      this.session = restoredSession;
      this.userName = this.session.permissionLevel.actor.toString();
      console.log("Session restored:", this.session);
      this.loadingContainer.setVisible(true);
      this.loadingText.setText("Fetching SIRE balance...");
      await this.fetchSireBalance();
      this.loadingContainer.setVisible(false);
      this.showLoggedInUI();
    } catch (err) {
      console.error("restoreSession error:", err);
      this.loadingContainer.setVisible(false);
      this.loginButton.setVisible(true);
      this.buttonAppearTween.play();
    }
  }

  // Handle multi-wallet login
  async handleMultiWalletLogin() {
    try {
      console.log("Attempting multi-wallet login...");
      this.loadingContainer.setVisible(true);
      this.loadingText.setText("Connecting to wallet...");
      const response = await this.sessionKit.login({
        transact: {
          broadcast: false,
          actions: [{
            account: "eosio.null",
            name: "nonce",
            authorization: [{ actor: "", permission: "active" }],
            data: { value: `nonce-${Date.now()}` }
          }]
        }
      });
      if (response && response.session) {
        this.session = response.session;
        this.userName = this.session.permissionLevel.actor.toString();
        this.loadingText.setText("Fetching SIRE balance...");
        await this.fetchSireBalance();
        this.loadingContainer.setVisible(false);
        this.showLoggedInUI();
      } else {
        console.error("No session returned from login");
        this.loadingContainer.setVisible(false);
      }
    } catch (err) {
      console.error("Multi-wallet login error:", err);
      this.loadingContainer.setVisible(false);
    }
  }

  // Fetch SIRE balance from the token contract
  async fetchSireBalance() {
    try {
      if (!this.userName) return;
      const endpoint = "https://wax.greymass.com/v1/chain/get_currency_balance";
      const body = {
        code: TOKEN_CONTRACT,
        account: this.userName,
        symbol: "SIRE"
      };
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        const [balanceStr] = data[0].split(" ");
        this.sireBalance = balanceStr;
      } else {
        this.sireBalance = 0;
      }
    } catch (err) {
      console.error("Failed to fetch SIRE balance:", err);
      this.sireBalance = 0;
    }
  }

  // Show HUD with username and SIRE balance, and display menu buttons
  showLoggedInUI() {
    // Hide login button
    if (this.loginButton.visible) {
      this.tweens.add({
        targets: this.loginButton,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          this.loginButton.setVisible(false);
        }
      });
    }
    // Show menu buttons
    this.freelanceButton.show();
    this.standingsButton.show();
    this.stakingButton.show();
    // Show HUD elements
    const hudElements = [
      this.topBar,
      this.topBarBorder,
      this.characterPortrait,
      this.userText,
      this.sireIcon,
      this.sireText,
      this.logoutButton,
      this.logoutText
    ];
    hudElements.forEach(el => el.setVisible(true).setAlpha(0));
    this.tweens.add({
      targets: hudElements,
      alpha: 1,
      duration: 500,
      ease: "Power1"
    });
    this.userText.setText(this.userName);
    this.sireText.setText(`SIRE: ${this.sireBalance}`);
    this.tweens.add({
      targets: this.sireIcon,
      scale: 1.2,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  // Logout and clear session; stay logged out until login is triggered again
  async logout() {
    console.log("Logging out...");
    this.loadingContainer.setVisible(true);
    this.loadingText.setText("Logging out...");
    try {
      await this.sessionKit.logout();
    } catch (err) {
      console.error("Logout error:", err);
    }
    this.session = null;
    this.userName = null;
    this.sireBalance = 0;
    this.scene.restart();
  }

  // Create a simple game button (only image) for the main menu
  createGameButton(x, y, imageName) {
    const buttonImage = this.add.image(x, y, imageName)
      .setInteractive()
      .setScale(0.8)
      .setVisible(false)
      .setAlpha(0);
    this.setupButtonInteraction(buttonImage);
    buttonImage.show = () => {
      buttonImage.setVisible(true);
      this.tweens.add({
        targets: buttonImage,
        alpha: 1,
        scale: { from: 0.5, to: buttonImage.scale },
        duration: 500,
        ease: "Back.easeOut"
      });
      this.tweens.add({
        targets: buttonImage,
        y: buttonImage.y + 5,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    };
    return buttonImage;
  }

  // (Optional) Create a scrollable panel (not used in this trimmed MainMenu)
  createScrollPanel(x, y, w, h, titleText) {
    const panel = this.rexUI.add.scrollablePanel({
      x: x + w / 2,
      y: y + h / 2,
      width: w,
      height: h,
      scrollMode: 0,
      background: this.rexUI.add.roundRectangle(0, 0, 2, 2, 20, 0x000000),
      panel: {
        child: this.rexUI.add.sizer({ orientation: "vertical", space: { item: 10 } })
      },
      slider: {
        track: this.rexUI.add.roundRectangle(0, 0, 20, 10, 10, 0x330000),
        thumb: this.rexUI.add.roundRectangle(0, 0, 0, 0, 10, 0xff4444)
      },
      mouseWheelScroller: { focus: false, speed: 1 },
      space: { panel: 10, right: 20 }
    });
    this.add.text(x, y - 30, titleText, {
      fontSize: "24px",
      color: "#ff4444"
    }).setOrigin(0, 0.5);
    return panel.layout();
  }
}
