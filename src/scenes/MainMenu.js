// src/scenes/MainMenu.js
import { Scene } from "phaser"

// WharfKit imports
import { SessionKit } from "@wharfkit/session"
import { WebRenderer } from "@wharfkit/web-renderer"

// Wallet plugins
import { WalletPluginAnchor } from "@wharfkit/wallet-plugin-anchor"
import { WalletPluginCloudWallet } from "@wharfkit/wallet-plugin-cloudwallet"
import { WalletPluginWombat } from "@wharfkit/wallet-plugin-wombat"

// Required NFT templates
const REQUIRED_TEMPLATE_IDS = [877566, 877565, 877564]

// ---------------------------------------------------------
// The chain ID you said Anchor & Cloud actually recognize
// ---------------------------------------------------------
const WAX_CHAIN_ID = "1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4"
const WAX_NODE_URL = "https://wax.greymass.com"

export class MainMenu extends Scene {
  constructor() {
    super("MainMenu")
  }

  create() {
    // 1) Background
    this.add
      .image(this.scale.width / 2, this.scale.height / 2, "background-mainmenu")
      .setOrigin(0.5)

    // 2) Music
    if (!this.sound.get("backgroundMusic")) {
      this.music = this.sound.add("backgroundMusic", { loop: true })
      this.music.play()
    }

    // 3) LOGIN BUTTON
    this.loginButton = this.add
      .image(this.scale.width / 2, this.scale.height / 3, "loginButton")
      .setInteractive()
      .setScale(1)

    this.loginButton.on("pointerdown", () => {
      this.handleMultiWalletLogin()
    })

    // 4) FREELANCE (BEGIN) BUTTON => hidden until user logs in & NFT check passes
    this.freelanceButton = this.add
      .image(this.scale.width / 2, this.scale.height / 1.7, "freelanceButton")
      .setInteractive()
      .setScale(1.1)
      .setVisible(false)

    this.tweens.add({
      targets: this.freelanceButton,
      y: this.freelanceButton.y + 10,
      yoyo: true,
      repeat: -1,
      duration: 800,
      ease: "Sine.easeInOut",
    })

    this.freelanceButton.on("pointerdown", () => {
      this.scene.start("Game")
    })

    // 5) TOP BAR
    this.topBar = this.add
      .rectangle(0, 0, this.scale.width, 40, 0x000000, 1)
      .setOrigin(0, 0)
      .setDepth(9999)
      .setVisible(false)

    this.userText = this.add
      .text(10, 5, "User: ???", {
        fontSize: "20px",
        color: "#ffffff",
      })
      .setDepth(9999)
      .setVisible(false)

    this.logoutText = this.add
      .text(this.scale.width - 100, 5, "[Logout]", {
        fontSize: "20px",
        color: "#ffffff",
      })
      .setDepth(9999)
      .setVisible(false)
      .setInteractive()

    this.logoutText.on("pointerdown", () => {
      this.logout()
    })

    // 6) WharfKit SessionKit with multiple wallets
    this.sessionKit = new SessionKit({
      appName: "MyMultiWalletDapp",
      chains: [
        {
          id: WAX_CHAIN_ID, // The chain ID that Anchor/Cloud are accepting
          url: WAX_NODE_URL
        }
      ],
      ui: new WebRenderer(),
      walletPlugins: [
        new WalletPluginAnchor(),
        new WalletPluginCloudWallet(),
        new WalletPluginWombat()
      ]
    })

    // 7) Track user data
    this.userName = null
  }

  // ----------------------------------------------------------------
  // MULTI-WALLET LOGIN => (Anchor, Cloud Wallet, Wombat)
  // ----------------------------------------------------------------
  async handleMultiWalletLogin() {
    try {
      console.log("Attempting multi-wallet login...")

      // 1) Attempt login => user picks a wallet
      const response = await this.sessionKit.login()

      // 2) If success, we get a session
      if (response && response.session) {
        const session = response.session
        this.userName = session.auth.actor.toString()
        console.log("Multi-Wallet login success =>", this.userName)

        // 3) Check if user has required NFT
        const ownsNFT = await this.checkUserHasNFT(this.userName)
        if (!ownsNFT) {
          alert("You do not own the required Undead Pinup NFT(s). Please buy one to proceed!")
          return
        }

        // 4) Show FREELANCE button, hide login, show top bar
        this.freelanceButton.setVisible(true)
        this.loginButton.setVisible(false)
        this.topBar.setVisible(true)
        this.userText.setVisible(true)
        this.logoutText.setVisible(true)
        this.userText.setText(`User: ${this.userName}`)
      } else {
        console.error("No session returned from login")
      }
    } catch (err) {
      console.error("Multi-wallet login error:", err)
    }
  }

  // ----------------------------------------------------------------
  // CHECK NFT => AtomicAssets API
  // ----------------------------------------------------------------
  async checkUserHasNFT(accountName) {
    try {
      // Use any public AtomicAssets API endpoint you like
      const url = `https://wax.api.atomicassets.io/atomicassets/v1/assets?owner=${accountName}&limit=100`
      console.log("Fetching NFT data from:", url)

      const response = await fetch(url)
      if (!response.ok) {
        console.error("NFT API error:", response.status)
        return false
      }
      const data = await response.json()

      // Check if any template IDs are in [877566, 877565, 877564]
      return data.data.some(asset => {
        const tid = parseInt(asset.template?.template_id)
        return REQUIRED_TEMPLATE_IDS.includes(tid)
      })
    } catch (err) {
      console.error("Failed to fetch NFTs:", err)
      return false
    }
  }

  // ----------------------------------------------------------------
  // LOGOUT => End the session & hide UI
  // ----------------------------------------------------------------
  async logout() {
    console.log("Logout => clearing user session")
    try {
      // End the WharfKit session (works if your plugin supports it)
      await this.sessionKit.logout()
    } catch (err) {
      console.error("Error logging out:", err)
    }

    this.userName = null
    this.topBar.setVisible(false)
    this.userText.setVisible(false)
    this.logoutText.setVisible(false)
    this.freelanceButton.setVisible(false)
    this.loginButton.setVisible(true)
  }
}
