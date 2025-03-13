// src/scenes/StakingUI.js
import Phaser from "phaser";
import { Scene } from "phaser";
import { SessionKit } from "@wharfkit/session";
import { WebRenderer } from "@wharfkit/web-renderer";
import { WalletPluginAnchor } from "@wharfkit/wallet-plugin-anchor";
import { WalletPluginCloudWallet } from "@wharfkit/wallet-plugin-cloudwallet";
import { WalletPluginWombat } from "@wharfkit/wallet-plugin-wombat";

// Revert chain calls to wax.greymass.com (for Netlify deploy)
// Revert IPFS calls to ipfs.atomichub.io

const WAX_CHAINS = [
  {
    id: "1064487b3cd1f44d82c42c1ec67a7e9e66aeb51fd6aa7666b56fdd39c3a2df94",
    url: "https://wax.greymass.com"
  },
  {
    id: "1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4",
    url: "https://wax.greymass.com"
  },
];

const CONTRACT_ACCOUNT = "wynxcbyte.gm";
const COLLECTION_NAME = "undeadpinups";

export class StakingUI extends Scene {
  constructor() {
    super("StakingUI");
  }

  async create() {
    this.cameras.main.setBackgroundColor("#222");
    const { width, height } = this.scale;

    // Add a "blood background" overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x400000).setAlpha(0.4);

    // Title
    this.add
      .text(width / 2, 40, "Undead Pinups Staking", {
        fontFamily: "Impact",
        fontSize: "48px",
        color: "#ff4444",
      })
      .setOrigin(0.5);

    // Particle effect for blood drips
    this.initBloodDrips();

    // 1) Setup multi-wallet session
    this.sessionKit = new SessionKit({
      appName: "UndeadPinupsStaking",
      chains: WAX_CHAINS, // using wax.greymass.com
      ui: new WebRenderer(),
      walletPlugins: [
        new WalletPluginAnchor(),
        new WalletPluginCloudWallet(),
        new WalletPluginWombat()
      ],
    });

    // 2) Try restore or login
    const session = await this.restoreOrLogin();
    if (!session) {
      this.add.text(width / 2, height / 2, "Login required!", {
        fontSize: "24px",
        color: "#ff0000",
      }).setOrigin(0.5);
      return;
    }
    this.session = session;
    this.userName = this.session.permissionLevel.actor.toString();

    // 3) Load staked + unstaked
    await this.loadAllNFTs();

    // 4) Build the 2 scroll panels
    // Left: Unstaked
    this.unstakedPanel = this.createScrollPanel(50, 120, 500, 400, "Unstaked");
    // Right: Staked
    this.stakedPanel = this.createScrollPanel(width - 550, 120, 500, 400, "Staked");

    // 5) Populate them
    this.populateUnstaked();
    this.populateStaked();

    // 6) “Back to Menu”
    const backBtn = this.add
      .text(width / 2, height - 30, "[ Back to Menu ]", {
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setInteractive();
    backBtn.on("pointerdown", () => {
      this.scene.start("MainMenu");
    });

    // 7) Show a “Daily claim” or “Wait” text
    const now = new Date();
    if (now.getUTCHours() === 0) {
      this.add
        .text(width / 2, height - 60, "Daily claim available!", {
          fontSize: "20px",
          color: "#ff3333",
        })
        .setOrigin(0.5);
    } else {
      this.add
        .text(width / 2, height - 60, "Next claim after 00:00 UTC", {
          fontSize: "20px",
          color: "#888888",
        })
        .setOrigin(0.5);
    }
  }

  // --------------------------------------------------------------------------
  // A) Blood Drips: on pointermove, spawn a red particle
  // --------------------------------------------------------------------------
  initBloodDrips() {
    this.bloodEmitter = this.add.particles("redPixel", {
      speed: { min: 10, max: 50 },
      lifespan: 2000,
      scale: { start: 0.4, end: 0 },
      quantity: 1,
      alpha: { start: 1, end: 0 },
      active: false
    });

    this.input.on("pointermove", (pointer) => {
      this.bloodEmitter.emitParticleAt(pointer.x, pointer.y);
    });
  }

  // --------------------------------------------------------------------------
  // B) Session login
  // --------------------------------------------------------------------------
  async restoreOrLogin() {
    let s = await this.sessionKit.restore();
    if (s) return s;
    try {
      const resp = await this.sessionKit.login({
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
      return resp.session;
    } catch (err) {
      console.error("Login error =>", err);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // C) Load staked + unstaked
  // --------------------------------------------------------------------------
  async loadAllNFTs() {
    this.stakedAssets = await this.fetchStakedNFTs(this.userName);
    this.userNFTs = await this.fetchAtomicAssets(this.userName);

    const stakedIds = new Set(this.stakedAssets.map((s) => s.asset_id));
    this.unstakedAssets = this.userNFTs.filter((n) => !stakedIds.has(Number(n.asset_id)));
  }

  async fetchStakedNFTs(user) {
    try {
      const url = "https://wax.greymass.com/v1/chain/get_table_rows"; // revert to greymass
      const body = {
        json: true,
        code: CONTRACT_ACCOUNT,
        scope: CONTRACT_ACCOUNT,
        table: "stakes",
        limit: 100,
      };
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!data.rows) return [];
      return data.rows.filter((r) => r.owner === user);
    } catch (err) {
      console.error("fetchStakedNFTs =>", err);
      return [];
    }
  }

  async fetchAtomicAssets(user) {
    try {
      const url = `https://wax.api.atomicassets.io/atomicassets/v1/assets?owner=${user}&collection_name=${COLLECTION_NAME}&limit=100`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (!data || !data.data) return [];
      return data.data;
    } catch (err) {
      console.error("fetchAtomicAssets =>", err);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // D) Create a ScrollPanel
  // --------------------------------------------------------------------------
  createScrollPanel(x, y, w, h, titleText) {
    const panel = this.rexUI.add.scrollablePanel({
      x: x + w / 2,
      y: y + h / 2,
      width: w,
      height: h,
      scrollMode: 0,
      background: this.rexUI.add.roundRectangle(0, 0, 2, 2, 20, 0x000000),
      panel: {
        child: this.rexUI.add.sizer({
          orientation: "vertical",
          space: { item: 10 },
        }),
      },
      slider: {
        track: this.rexUI.add.roundRectangle(0, 0, 20, 10, 10, 0x330000),
        thumb: this.rexUI.add.roundRectangle(0, 0, 0, 0, 10, 0xff4444),
      },
      mouseWheelScroller: {
        focus: false,
        speed: 1,
      },
      space: {
        panel: 10,
        right: 20,
      },
    });

    this.add
      .text(x, y - 30, titleText, {
        fontSize: "24px",
        color: "#ff4444",
      })
      .setOrigin(0, 0.5);

    return panel.layout();
  }

  // --------------------------------------------------------------------------
  // E) Populate Unstaked
  // --------------------------------------------------------------------------
  populateUnstaked() {
    const panelChild = this.unstakedPanel.getElement("panel");
    const stakeAllBtn = this.addFancyText("[Stake All]", 0x00ff00, () => {
      const asset_ids = this.unstakedAssets.map((n) => Number(n.asset_id));
      if (asset_ids.length > 0) this.callStakeAction(asset_ids);
    });
    panelChild.add(stakeAllBtn, { align: "left" });

    this.unstakedAssets.forEach((nft) => {
      const row = this.createNFTRow(nft);
      panelChild.add(row, { align: "left", expand: false });
    });

    this.unstakedPanel.layout();
  }

  // --------------------------------------------------------------------------
  // F) Populate Staked
  // --------------------------------------------------------------------------
  populateStaked() {
    const panelChild = this.stakedPanel.getElement("panel");
    const unstakeAllBtn = this.addFancyText("[Unstake All]", 0xff5555, async () => {
      for (let s of this.stakedAssets) {
        await this.callUnstakeAction(s.asset_id);
      }
    });
    panelChild.add(unstakeAllBtn, { align: "left" });

    this.stakedAssets.forEach((s) => {
      const row = this.createStakedRow(s);
      panelChild.add(row, { align: "left", expand: false });
    });

    this.stakedPanel.layout();
  }

  // --------------------------------------------------------------------------
  // G) Create row for Unstaked
  // --------------------------------------------------------------------------
  createNFTRow(nft) {
    const sizer = this.rexUI.add.sizer({
      orientation: "horizontal",
      space: { left: 10, right: 10, item: 10 },
    });

    const imageKey = `nft_${nft.asset_id}`;
    const imageUrl = nft.data?.img || nft.template?.immutable_data?.img;
    if (imageUrl) {
      this.load.image(imageKey, `https://ipfs.atomichub.io/ipfs/${imageUrl}`);
      this.load.once("complete", () => {
        let icon = this.add.image(0, 0, imageKey).setScale(0.2);
        sizer.add(icon, { align: "left" });
        sizer.layout();
      });
      this.load.start();
    } else {
      let fallbackText = this.add.text(0, 0, nft.name || `NFT #${nft.asset_id}`, {
        fontSize: "16px",
        color: "#ffffff",
      }).setOrigin(0, 0.5);
      sizer.add(fallbackText, { align: "left" });
    }

    const stakeBtn = this.addFancyText("[Stake]", 0x00ff00, () => {
      this.callStakeAction([Number(nft.asset_id)]);
    });
    sizer.add(stakeBtn, { align: "left" });

    return sizer;
  }

  // --------------------------------------------------------------------------
  // H) Create row for Staked
  // --------------------------------------------------------------------------
  createStakedRow(stakedRec) {
    const sizer = this.rexUI.add.sizer({
      orientation: "horizontal",
      space: { left: 10, right: 10, item: 10 },
    });

    const found = this.userNFTs.find((u) => Number(u.asset_id) === stakedRec.asset_id);
    let imageUrl = null;
    if (found) {
      imageUrl = found.data?.img || found.template?.immutable_data?.img;
    }
    const imageKey = `nft_${stakedRec.asset_id}`;
    if (imageUrl) {
      this.load.image(imageKey, `https://ipfs.atomichub.io/ipfs/${imageUrl}`);
      this.load.once("complete", () => {
        let icon = this.add.image(0, 0, imageKey).setScale(0.2);
        sizer.add(icon, { align: "left" });
        sizer.layout();
      });
      this.load.start();
    } else {
      let fallbackText = this.add.text(0, 0, `Staked #${stakedRec.asset_id}`, {
        fontSize: "16px",
        color: "#ffffff",
      }).setOrigin(0, 0.5);
      sizer.add(fallbackText, { align: "left" });
    }

    const claimBtn = this.addFancyText("[Claim]", 0xffff00, () => {
      this.callClaimAction(stakedRec.asset_id);
    });
    sizer.add(claimBtn, { align: "left" });

    const unstakeBtn = this.addFancyText("[Unstake]", 0xff5555, () => {
      this.callUnstakeAction(stakedRec.asset_id);
    });
    sizer.add(unstakeBtn, { align: "left" });

    return sizer;
  }

  // --------------------------------------------------------------------------
  // I) Helper to create fancy text
  // --------------------------------------------------------------------------
  addFancyText(label, color, onClick) {
    const txt = this.add.text(0, 0, label, {
      fontSize: "18px",
      color: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 4, y: 2 },
    });
    txt.setTint(color);
    txt.setInteractive();
    txt.on("pointerover", () => txt.setAlpha(0.8));
    txt.on("pointerout", () => txt.setAlpha(1));
    txt.on("pointerdown", onClick);
    return txt;
  }

  // --------------------------------------------------------------------------
  // J) Actions => stake, claim, unstake
  // --------------------------------------------------------------------------
  async callStakeAction(asset_ids) {
    try {
      const actions = [
        {
          account: CONTRACT_ACCOUNT,
          name: "stake",
          authorization: [{ actor: this.userName, permission: "active" }],
          data: {
            user: this.userName,
            asset_ids: asset_ids,
          },
        },
      ];
      await this.session.transact({ actions }, { broadcast: true });
      this.scene.restart();
    } catch (err) {
      console.error("Stake action =>", err);
      alert(`Stake failed: ${err.message}`);
    }
  }

  async callClaimAction(asset_id) {
    try {
      const actions = [
        {
          account: CONTRACT_ACCOUNT,
          name: "claim",
          authorization: [{ actor: this.userName, permission: "active" }],
          data: {
            user: this.userName,
            asset_id: asset_id,
          },
        },
      ];
      await this.session.transact({ actions }, { broadcast: true });
      this.scene.restart();
    } catch (err) {
      console.error("Claim action =>", err);
      alert(`Claim failed: ${err.message}`);
    }
  }

  async callUnstakeAction(asset_id) {
    try {
      const actions = [
        {
          account: CONTRACT_ACCOUNT,
          name: "unstake",
          authorization: [{ actor: this.userName, permission: "active" }],
          data: {
            user: this.userName,
            asset_id: asset_id,
          },
        },
      ];
      await this.session.transact({ actions }, { broadcast: true });
      this.scene.restart();
    } catch (err) {
      console.error("Unstake action =>", err);
      alert(`Unstake failed: ${err.message}`);
    }
  }
}
