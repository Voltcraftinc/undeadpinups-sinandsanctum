// src/scenes/Standings.js
import { Scene } from "phaser"
import { supabase } from "../supabaseClient.js" // Must match your file name & path

export class Standings extends Scene {
  constructor() {
    super("Standings")
  }

  async create() {
    this.cameras.main.setBackgroundColor("#000000")

    const centerX = this.scale.width / 2
    const centerY = this.scale.height / 2

    // Title
    this.add
      .text(centerX, 50, "Undead Pinups Standings", {
        fontFamily: "Arial Black",
        fontSize: 48,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)

    // Fetch leaderboard data
    const leaderboardData = await this.fetchLeaderboardData()

    if (!leaderboardData || leaderboardData.length === 0) {
      this.add
        .text(centerX, centerY, "No Data Found", {
          fontFamily: "Arial",
          fontSize: 24,
          color: "#ff0000",
        })
        .setOrigin(0.5)
    } else {
      // Table Header
      const headerStyle = {
        fontFamily: "Arial Black",
        fontSize: 22,
        color: "#ffff00",
      }
      this.add.text(100, 120, "User", headerStyle)
      this.add.text(300, 120, "WYNX", headerStyle)
      this.add.text(430, 120, "NFTs", headerStyle)
      this.add.text(530, 120, "Vanquished", headerStyle) // kills
      this.add.text(680, 120, "Wave", headerStyle)

      // Show top 10
      const rowStyle = { fontFamily: "Arial", fontSize: 20, color: "#ffffff" }
      leaderboardData.forEach((row, index) => {
        const yPos = 160 + index * 30
        this.add.text(100, yPos, row.wax_account ?? "???", rowStyle)
        this.add.text(300, yPos, String(row.wynx_earned ?? 0), rowStyle)
        this.add.text(430, yPos, String(row.nfts_found ?? 0), rowStyle)
        this.add.text(530, yPos, String(row.kills ?? 0), rowStyle)
        this.add.text(680, yPos, String(row.wave_reached ?? 0), rowStyle)
      })
    }

    // "Back to Menu"
    const backText = this.add
      .text(centerX, this.scale.height - 50, "[ Back to Menu ]", {
        fontFamily: "Arial",
        fontSize: 24,
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setInteractive()

    backText.on("pointerdown", () => {
      this.scene.start("MainMenu")
    })
  }

  async fetchLeaderboardData() {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("wax_account, wynx_earned, nfts_found, kills, wave_reached")
        .order("wynx_earned", { ascending: false })
        .limit(10)

      if (error) {
        console.error("Supabase error =>", error)
        return []
      }
      return data
    } catch (err) {
      console.error("fetchLeaderboardData =>", err)
      return []
    }
  }
}
