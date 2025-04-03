// src/scenes/StakingUI.js
import Phaser from "phaser"
import { Scene } from "phaser"
import { SessionKit } from "@wharfkit/session"
import { WebRenderer } from "@wharfkit/web-renderer"
import { WalletPluginAnchor } from "@wharfkit/wallet-plugin-anchor"
import { WalletPluginCloudWallet } from "@wharfkit/wallet-plugin-cloudwallet"
import { WalletPluginWombat } from "@wharfkit/wallet-plugin-wombat"

// Define both chain IDs so that any old sessions referencing an older chain ID are supported.
const WAX_CHAINS = [
  {
    id: "1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4",
    url: "https://wax.greymass.com"
  },
  {
    id: "1064487b3cd1f44d82c42c1ec67a7e9e66aeb51fd6aa7666b56fdd39c3a2df94",
    url: "https://wax.greymass.com"
  }
]

// Your deployed staking contract and target collection
const CONTRACT_ACCOUNT = "siretoken.gm"
const COLLECTION_NAME = "undeadpinups"

export class StakingUI extends Scene {
  constructor() {
    super("StakingUI")
  }

  async create() {
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor("#222")
    // Tinted background
    this.add.rectangle(width / 2, height / 2, width, height, 0x400000).setAlpha(0.4)

    // Title
    this.add
      .text(width / 2, 40, "Undead Pinups SIRE Staking", {
        fontFamily: "Impact",
        fontSize: "48px",
        color: "#ff4444"
      })
      .setOrigin(0.5)

    // Optional blood drip effect
    this.initBloodDrips()

    // 1) Setup SessionKit
    this.sessionKit = new SessionKit({
      appName: "UndeadPinupsSIREStaking",
      chains: WAX_CHAINS,
      ui: new WebRenderer(),
      walletPlugins: [
        new WalletPluginAnchor(),
        new WalletPluginCloudWallet(),
        new WalletPluginWombat()
      ]
    })

    // 2) Restore session or prompt login
    const session = await this.restoreOrLogin()
    if (!session) {
      this.add.text(width / 2, height / 2, "Login required!", {
        fontSize: "24px",
        color: "#ff0000"
      }).setOrigin(0.5)
      return
    }
    this.session = session
    this.userName = this.session.permissionLevel.actor.toString()

    // 3) Load staked and unstaked NFTs
    await this.loadAllNFTs()

    // 4) Build scroll panels for unstaked and staked NFTs
    this.unstakedPanel = this.createScrollPanel(50, 120, 500, 400, "Unstaked")
    this.stakedPanel = this.createScrollPanel(width - 550, 120, 500, 400, "Staked")

    // 5) Populate panels (unstaked & staked)
    this.populateUnstaked()
    this.populateStaked()

    // 6) [Back to Menu] button
    const backBtn = this.add.text(width / 2, height - 30, "[ Back to Menu ]", {
      fontSize: "24px",
      color: "#ffffff"
    }).setOrigin(0.5).setInteractive()
    backBtn.on("pointerdown", () => {
      this.scene.start("MainMenu")
    })

    // 7) Daily claim hint
    const now = new Date()
    if (now.getUTCHours() === 0) {
      this.add.text(width / 2, height - 60, "Daily claim available!", {
        fontSize: "20px",
        color: "#ff3333"
      }).setOrigin(0.5)
    } else {
      this.add.text(width / 2, height - 60, "Next claim after 00:00 UTC", {
        fontSize: "20px",
        color: "#888888"
      }).setOrigin(0.5)
    }
  }

  // Optional blood drip effect
  initBloodDrips() {
    this.bloodEmitter = this.add.particles("redPixel", {
      speed: { min: 10, max: 50 },
      lifespan: 2000,
      scale: { start: 0.4, end: 0 },
      quantity: 1,
      alpha: { start: 1, end: 0 },
      active: false
    })
    this.input.on("pointermove", (pointer) => {
      this.bloodEmitter.emitParticleAt(pointer.x, pointer.y)
    })
  }

  // Restore session or prompt login
  async restoreOrLogin() {
    let restored = await this.sessionKit.restore()
    if (restored) return restored

    try {
      const resp = await this.sessionKit.login({
        transact: {
          broadcast: false,
          actions: [{
            account: "eosio.null",
            name: "nonce",
            authorization: [{ actor: "", permission: "active" }],
            data: { value: `nonce-${Date.now()}` }
          }]
        }
      })
      return resp.session
    } catch (err) {
      console.error("Login error =>", err)
      return null
    }
  }

  // Load staked and user NFTs
  async loadAllNFTs() {
    // Fetch staked NFTs from your contract's table
    this.stakedAssets = await this.fetchStakedNFTs(this.userName)
    console.log("Staked Assets (from contract):", this.stakedAssets)

    // Fetch user's NFTs from AtomicAssets
    this.userNFTs = await this.fetchAtomicAssets(this.userName)
    console.log("User NFTs (from atomicassets):", this.userNFTs)

    // Filter out NFTs that are staked
    const stakedIds = new Set(this.stakedAssets.map(s => Number(s.asset_id)))
    this.unstakedAssets = this.userNFTs.filter(n => !stakedIds.has(Number(n.asset_id)))
    console.log("Unstaked NFTs (after filtering):", this.unstakedAssets)
  }

  // Fetch staked NFTs from the contract
  async fetchStakedNFTs(user) {
    const proxyURL = "https://thingproxy.freeboard.io/fetch/"
    const endpoint = "https://wax.greymass.com/v1/chain/get_table_rows"
    try {
      const url = proxyURL + endpoint
      const body = {
        json: true,
        code: CONTRACT_ACCOUNT,
        scope: CONTRACT_ACCOUNT,
        table: "stakes",
        limit: 100
      }
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      const text = await resp.text()
      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        console.error("Failed to parse JSON from proxy response:", text)
        return []
      }
      if (!data.rows) return []
      return data.rows.filter(r => r.owner === user)
    } catch (err) {
      console.error("fetchStakedNFTs =>", err)
      return []
    }
  }

  // Fetch user's NFTs from AtomicAssets
  async fetchAtomicAssets(user) {
    try {
      const url = `https://wax.api.atomicassets.io/atomicassets/v1/assets?owner=${user}&collection_name=${COLLECTION_NAME}&limit=100`
      const resp = await fetch(url)
      const data = await resp.json()
      if (!data || !data.data) return []
      return data.data
    } catch (err) {
      console.error("fetchAtomicAssets =>", err)
      return []
    }
  }

  // Create a scrollable panel
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
      mouseWheelScroller: {
        focus: false,
        speed: 1
      },
      space: {
        panel: 10,
        right: 20
      }
    })

    this.add.text(x, y - 30, titleText, {
      fontSize: "24px",
      color: "#ff4444"
    }).setOrigin(0, 0.5)

    return panel.layout()
  }

  // Populate Unstaked panel: display NFT name and a [Stake] button
  populateUnstaked() {
    const panelChild = this.unstakedPanel.getElement("panel")
    // Stake All button
    const stakeAllBtn = this.addFancyText("[Stake All]", 0x00ff00, () => {
      const asset_ids = this.unstakedAssets.map(n => Number(n.asset_id))
      if (asset_ids.length > 0) {
        this.callStakeAction(asset_ids)
      }
    })
    panelChild.add(stakeAllBtn, { align: "left" })

    this.unstakedAssets.forEach(nft => {
      const row = this.createUnstakedRow(nft)
      panelChild.add(row, { align: "left", expand: false })
    })

    this.unstakedPanel.layout()
  }

  // Populate Staked panel: display NFT name and buttons for [Claim] and [Unstake]
  // Also add a [Claim All] button
  populateStaked() {
    const panelChild = this.stakedPanel.getElement("panel")

    // Claim All button
    const claimAllBtn = this.addFancyText("[Claim All]", 0xffff00, async () => {
      for (let s of this.stakedAssets) {
        await this.callClaimAction(s.asset_id)
      }
    })
    panelChild.add(claimAllBtn, { align: "left" })

    // Unstake All button
    const unstakeAllBtn = this.addFancyText("[Unstake All]", 0xff5555, async () => {
      for (let s of this.stakedAssets) {
        await this.callUnstakeAction(s.asset_id)
      }
    })
    panelChild.add(unstakeAllBtn, { align: "left" })

    // Individual staked NFT rows
    this.stakedAssets.forEach(s => {
      const row = this.createStakedRow(s)
      panelChild.add(row, { align: "left", expand: false })
    })

    this.stakedPanel.layout()
  }

  // Create a row for an unstaked NFT: show NFT name and a [Stake] button
  createUnstakedRow(nft) {
    const sizer = this.rexUI.add.sizer({
      orientation: "horizontal",
      space: { left: 10, right: 10, item: 10 }
    })

    const nftName = nft.name || `NFT #${nft.asset_id}`
    const nameText = this.add.text(0, 0, nftName, {
      fontSize: "16px",
      color: "#ffffff"
    }).setOrigin(0, 0.5)
    sizer.add(nameText, { align: "left" })

    const stakeBtn = this.addFancyText("[Stake]", 0x00ff00, () => {
      this.callStakeAction([Number(nft.asset_id)])
    })
    sizer.add(stakeBtn, { align: "left" })

    return sizer
  }

  // Create a row for a staked NFT: show NFT name, [Claim] and [Unstake] buttons
  createStakedRow(stakedRec) {
    const sizer = this.rexUI.add.sizer({
      orientation: "horizontal",
      space: { left: 10, right: 10, item: 10 }
    })

    // Try to match NFT name from the user's NFTs
    const found = this.userNFTs.find(u => Number(u.asset_id) === Number(stakedRec.asset_id))
    const nftName = (found && found.name) ? found.name : `Staked #${stakedRec.asset_id}`
    const nameText = this.add.text(0, 0, nftName, {
      fontSize: "16px",
      color: "#ffffff"
    }).setOrigin(0, 0.5)
    sizer.add(nameText, { align: "left" })

    // [Claim] button
    const claimBtn = this.addFancyText("[Claim]", 0xffff00, () => {
      this.callClaimAction(stakedRec.asset_id)
    })
    sizer.add(claimBtn, { align: "left" })

    // [Unstake] button
    const unstakeBtn = this.addFancyText("[Unstake]", 0xff5555, () => {
      this.callUnstakeAction(stakedRec.asset_id)
    })
    sizer.add(unstakeBtn, { align: "left" })

    return sizer
  }

  // Helper: Create styled interactive text
  addFancyText(label, color, onClick) {
    const txt = this.add.text(0, 0, label, {
      fontSize: "18px",
      color: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 4, y: 2 }
    })
    txt.setTint(color)
    txt.setInteractive()
    txt.on("pointerover", () => txt.setAlpha(0.8))
    txt.on("pointerout", () => txt.setAlpha(1))
    txt.on("pointerdown", onClick)
    return txt
  }

  // Call Stake Action
  async callStakeAction(asset_ids) {
    try {
      const actions = [{
        account: CONTRACT_ACCOUNT,
        name: "stake",
        authorization: [{ actor: this.userName, permission: "active" }],
        data: { user: this.userName, asset_ids }
      }]
      await this.session.transact({ actions }, { broadcast: true })
      this.scene.restart()
    } catch (err) {
      console.error("Stake action =>", err)
      alert(`Stake failed: ${err.message}`)
    }
  }

  // Call Claim Action
  async callClaimAction(asset_id) {
    try {
      const actions = [{
        account: CONTRACT_ACCOUNT,
        name: "claim",
        authorization: [{ actor: this.userName, permission: "active" }],
        data: { user: this.userName, asset_id }
      }]
      await this.session.transact({ actions }, { broadcast: true })
      this.scene.restart()
    } catch (err) {
      console.error("Claim action =>", err)
      alert(`Claim failed: ${err.message}`)
    }
  }

  // Call Unstake Action
  async callUnstakeAction(asset_id) {
    try {
      const actions = [{
        account: CONTRACT_ACCOUNT,
        name: "unstake",
        authorization: [{ actor: this.userName, permission: "active" }],
        data: { user: this.userName, asset_id }
      }]
      await this.session.transact({ actions }, { broadcast: true })
      this.scene.restart()
    } catch (err) {
      console.error("Unstake action =>", err)
      alert(`Unstake failed: ${err.message}`)
    }
  }
}
