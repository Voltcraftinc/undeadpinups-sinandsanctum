// src/scenes/MainMenu.js
import { Scene } from "phaser";

// WharfKit imports
import { SessionKit } from "@wharfkit/session";
import { WebRenderer } from "@wharfkit/web-renderer";

// Wallet plugins
import { WalletPluginAnchor } from "@wharfkit/wallet-plugin-anchor";
import { WalletPluginCloudWallet } from "@wharfkit/wallet-plugin-cloudwallet";
import { WalletPluginWombat } from "@wharfkit/wallet-plugin-wombat";

// The required template IDs to check
const REQUIRED_TEMPLATE_IDS = [877566, 877565, 877564];

// Two WAX mainnet chain definitions
const WAX_CHAINS = [
  {
    // Cloud Wallet chain ID
    id: "1064487b3cd1f44d82c42c1ec67a7e9e66aeb51fd6aa7666b56fdd39c3a2df94",
    url: "https://wax.greymass.com",
  },
  {
    // Anchor/Wombat chain ID
    id: "1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4",
    url: "https://wax.greymass.com",
  },
];

export class MainMenu extends Scene {
  constructor() {
    super("MainMenu");
  }

  async create() {
    //---------------------------------------------------------------------
    // 1) BACKGROUND
    //---------------------------------------------------------------------
    this.add
      .image(this.scale.width / 2, this.scale.height / 2, "background-mainmenu")
      .setOrigin(0.5);

    //---------------------------------------------------------------------
    // 2) MUSIC
    //---------------------------------------------------------------------
    if (!this.sound.get("backgroundMusic")) {
      this.music = this.sound.add("backgroundMusic", { loop: true });
      try {
        this.music.play();
      } catch (e) {
        console.warn("Music failed to autoplay:", e);
      }
    }

    //---------------------------------------------------------------------
    // 3) LOGIN BUTTON (hidden if session is restored)
    //---------------------------------------------------------------------
    this.loginButton = this.add
      .image(this.scale.width / 2, this.scale.height / 3, "loginButton")
      .setInteractive()
      .setScale(1)
      .setVisible(false); // Hide by default, we decide after restore

    this.loginButton.on("pointerdown", () => {
      this.handleMultiWalletLogin();
    });

    //---------------------------------------------------------------------
    // 4) FREELANCE (BEGIN) BUTTON => hidden until user logs in + NFT check
    //---------------------------------------------------------------------
    this.freelanceButton = this.add
      .image(this.scale.width / 2, this.scale.height / 2.3, "freelanceButton")
      .setInteractive()
      .setScale(1.1)
      .setVisible(false);

    // Bobbing tween
    this.tweens.add({
      targets: this.freelanceButton,
      y: this.freelanceButton.y + 10,
      yoyo: true,
      repeat: -1,
      duration: 800,
      ease: "Sine.easeInOut",
    });

    // NOTE: Pass the userName to the Game scene
    this.freelanceButton.on("pointerdown", () => {
      if (!this.userName) {
        console.warn("No userName found, cannot pass to Game scene!");
        return;
      }
      this.scene.start("Game", { waxAccount: this.userName });
    });

    //---------------------------------------------------------------------
    // 4b) STANDINGS BUTTON => only visible if logged in
    //---------------------------------------------------------------------
    this.standingsButton = this.add
      .image(this.scale.width / 2, this.scale.height / 1.6, "standingsButton")
      .setInteractive()
      .setScale(1.1)
      .setVisible(false);

    this.tweens.add({
      targets: this.standingsButton,
      y: this.standingsButton.y + 10,
      yoyo: true,
      repeat: -1,
      duration: 800,
      ease: "Sine.easeInOut",
    });

    this.standingsButton.on("pointerdown", () => {
      this.scene.start("Standings");
    });

    //---------------------------------------------------------------------
    // 5) TOP BAR (black bar + text)
    //---------------------------------------------------------------------
    this.topBar = this.add
      .rectangle(0, 0, this.scale.width, 40, 0x000000, 1)
      .setOrigin(0, 0)
      .setDepth(9999)
      .setVisible(false);

    this.userText = this.add
      .text(10, 5, "User: ??? | WYNX: ???", {
        fontSize: "18px",
        color: "#ffffff",
      })
      .setDepth(9999)
      .setVisible(false);

    this.logoutText = this.add
      .text(this.scale.width - 120, 5, "[Logout]", {
        fontSize: "18px",
        color: "#ffffff",
      })
      .setDepth(9999)
      .setVisible(false)
      .setInteractive();

    this.logoutText.on("pointerdown", () => {
      this.logout();
    });

    //---------------------------------------------------------------------
    // 6) WharfKit SessionKit => multiple chain definitions + multi wallets
    //---------------------------------------------------------------------
    this.sessionKit = new SessionKit({
      appName: "UndeadPinupsDapp",
      chains: WAX_CHAINS,
      ui: new WebRenderer(),
      walletPlugins: [
        new WalletPluginAnchor(),
        new WalletPluginCloudWallet(),
        new WalletPluginWombat(),
      ],
      // By default, it uses BrowserLocalStorage to store sessions
    });

    // Track user data
    this.userName = null;
    this.session = null;

    // 7) Attempt to restore an existing session from localStorage
    await this.restoreSession();
  }

  // ----------------------------------------------------------------
  // (A) RESTORE SESSION => skip login if we have a valid session
  // ----------------------------------------------------------------
  async restoreSession() {
    try {
      const restoredSession = await this.sessionKit.restore();
      if (!restoredSession) {
        console.log("No existing session found => show login button.");
        this.loginButton.setVisible(true);
        return;
      }

      // We have a valid session => set internal data
      this.session = restoredSession;
      console.log("Session restored =>", this.session);

      // Actor name from session.permissionLevel
      const actorName = this.session.permissionLevel?.actor;
      if (!actorName) {
        console.warn("restoreSession => no actor found in permissionLevel");
        this.loginButton.setVisible(true);
        return;
      }

      this.userName = actorName.toString();
      console.log("Session restored => userName =", this.userName);

      // Check NFT
      const ownsNFT = await this.checkUserHasNFT(this.userName);
      if (!ownsNFT) {
        alert(
          "You do not own any of the required Undead Pinups NFT(s)!\n" +
            "Buy one here:\n" +
            "https://wax.atomichub.io/market?primary_chain=wax-mainnet&collection_name=undeadpinups&blockchain=wax-mainnet&order=desc&sort=created#sales"
        );
        // If user lacks NFT, remain logged in, but no "Begin" button
        this.loginButton.setVisible(false);
        return;
      }

      // If NFT check passes => show the begin button & top bar
      this.showLoggedInUI();
    } catch (err) {
      console.error("restoreSession error:", err);
      this.loginButton.setVisible(true);
    }
  }

  // ----------------------------------------------------------------
  // (B) MULTI-WALLET LOGIN => Anchor, Cloud, Wombat
  // ----------------------------------------------------------------
  async handleMultiWalletLogin() {
    try {
      console.log("Attempting multi-wallet login...");

      // Attempt a "dummy transaction" to get the real actor name
      const response = await this.sessionKit.login({
        transact: {
          broadcast: false,
          actions: [
            {
              account: "eosio.null",
              name: "nonce",
              authorization: [{ actor: "", permission: "active" }],
              data: { value: `nonce-${Date.now()}` },
            },
          ],
        },
      });

      console.log("Login response =>", response);

      if (response && response.session) {
        this.session = response.session;
        console.log("Session =>", this.session);

        const actorName = this.session.permissionLevel?.actor;
        if (!actorName) {
          console.error("No actor found in session.permissionLevel =>", this.session.permissionLevel);
          return;
        }

        this.userName = actorName.toString();
        console.log("Multi-Wallet login success =>", this.userName);

        // Check NFT
        const ownsNFT = await this.checkUserHasNFT(this.userName);
        if (!ownsNFT) {
          alert(
            "You do not own any of the required Undead Pinups NFT(s)!\n" +
              "Buy one here:\n" +
              "https://wax.atomichub.io/market?primary_chain=wax-mainnet&collection_name=undeadpinups&blockchain=wax-mainnet&order=desc&sort=created#sales"
          );
          return;
        }

        // Show begin + top bar
        this.showLoggedInUI();
      } else {
        console.error("No session returned from login =>", response);
      }
    } catch (err) {
      console.error("Multi-wallet login error:", err);
    }
  }

  // ----------------------------------------------------------------
  // (C) CHECK NFT => Using AtomicAssets API
  // ----------------------------------------------------------------
  async checkUserHasNFT(accountName) {
    try {
      const url = `https://wax.api.atomicassets.io/atomicassets/v1/assets?owner=${accountName}&limit=100`;
      console.log("Fetching NFT data from:", url);

      const response = await fetch(url);
      if (!response.ok) {
        console.error("NFT API error:", response.status);
        return false;
      }

      const data = await response.json();
      if (!data || !data.data) {
        console.error("NFT API returned invalid data:", data);
        return false;
      }

      return data.data.some((asset) => {
        const tid = parseInt(asset.template?.template_id);
        return REQUIRED_TEMPLATE_IDS.includes(tid);
      });
    } catch (err) {
      console.error("Failed to fetch NFTs:", err);
      return false;
    }
  }

  // ----------------------------------------------------------------
  // (D) SHOW LOGGED IN UI => Hide login, show freelance + top bar
  // ----------------------------------------------------------------
  showLoggedInUI() {
    this.loginButton.setVisible(false);
    this.freelanceButton.setVisible(true);
    this.standingsButton.setVisible(true);
    this.topBar.setVisible(true);
    this.userText.setVisible(true);
    this.logoutText.setVisible(true);
    this.userText.setText(`User: ${this.userName} | WYNX: ???`);
  }

  // ----------------------------------------------------------------
  // (E) LOGOUT => Clear user session + reset UI
  // ----------------------------------------------------------------
  async logout() {
    console.log("Logout => clearing user session");
    try {
      await this.sessionKit.logout();
    } catch (err) {
      console.error("Error logging out:", err);
    }

    this.session = null;
    this.userName = null;

    this.topBar.setVisible(false);
    this.userText.setVisible(false);
    this.logoutText.setVisible(false);
    this.freelanceButton.setVisible(false);
    this.standingsButton.setVisible(false);
    this.loginButton.setVisible(true);
  }
}
