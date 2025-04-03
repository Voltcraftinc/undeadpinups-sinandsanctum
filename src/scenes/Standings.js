// src/scenes/Standings.js
import { Scene } from "phaser";
import { supabase } from "../supabaseClient.js";

export class Standings extends Scene {
  constructor() {
    super("Standings");
    this.sortBy = "wynx_earned"; // Default sort column
    this.sortDirection = "desc"; // Default sort direction
    this.currentPage = 0;
    this.pageSize = 8;
    this.totalPlayers = 0;
    this.colors = {
      background: 0x0a0a0a,      // Near black
      titleGlow: 0x990000,       // Blood red glow
      title: 0xbb0000,           // Blood red
      headerBg: 0x220000,        // Dark red
      headerText: 0xff9900,      // Fiery orange
      rowBg1: 0x111111,          // Dark gray
      rowBg2: 0x1a1a1a,          // Slightly lighter gray
      text: 0xcccccc,            // Light gray
      highlight: 0xff3300,       // Bright orange-red
      button: 0x660000,          // Dark red
      buttonHover: 0x990000,     // Brighter red
      pagination: 0xaa0000       // Medium red
    };
  }

  async create() {
    this.createBackground();
    this.createTitle();
    this.createColumnHeaders();
    await this.fetchTotalPlayers();
    await this.fetchAndDisplayLeaderboard();
    this.createNavigation();
    this.createFooter();
    this.createFogEffect();
  }

  createBackground() {
    // Set a very dark background
    this.cameras.main.setBackgroundColor("#050505");
    
    // Create a dark overlay with cobweb-like pattern
    const graphics = this.add.graphics();
    
    // Draw subtle grid/cobweb pattern
    graphics.lineStyle(1, 0x330000, 0.2);
    
    // Vertical lines
    for (let x = 0; x < this.scale.width; x += 80) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, this.scale.height);
    }
    
    // Horizontal lines
    for (let y = 0; y < this.scale.height; y += 80) {
      graphics.moveTo(0, y);
      graphics.lineTo(this.scale.width, y);
    }
    
    // Draw some diagonal "cobweb" lines
    for (let i = 0; i < 20; i++) {
      const x1 = Phaser.Math.Between(0, this.scale.width);
      const y1 = Phaser.Math.Between(0, this.scale.height);
      const x2 = x1 + Phaser.Math.Between(-200, 200);
      const y2 = y1 + Phaser.Math.Between(-200, 200);
      graphics.moveTo(x1, y1);
      graphics.lineTo(x2, y2);
    }
    
    graphics.strokePath();
    
    // Add subtle vignette effect
    const vignette = this.add.graphics();
    const vignetteColor = 0x000000;
    
    // Create radial gradient for vignette
    vignette.fillStyle(vignetteColor, 0);
    vignette.fillCircle(this.scale.width / 2, this.scale.height / 2, this.scale.height);
    
    vignette.fillStyle(vignetteColor, 0.7);
    vignette.fillRect(0, 0, this.scale.width, this.scale.height);
    
    vignette.fillStyle(vignetteColor, 0);
    vignette.fillCircle(this.scale.width / 2, this.scale.height / 2, this.scale.height * 0.7);
  }

  createTitle() {
    const centerX = this.scale.width / 2;
    
    // Draw a decorative frame for the title
    const frameGraphics = this.add.graphics();
    frameGraphics.fillStyle(0x220000, 0.6);
    frameGraphics.fillRect(centerX - 300, 20, 600, 70);
    
    // Add border to frame
    frameGraphics.lineStyle(3, 0x660000, 1);
    frameGraphics.strokeRect(centerX - 300, 20, 600, 70);
    
    // Add gothic decorative elements to the frame
    this.addGothicDecoration(frameGraphics, centerX - 300, 20, 600, 70);
    
    // Create title text with red glow effect
    const titleText = this.add.text(centerX, 55, "UNDEAD PINUPS STANDINGS", {
      fontFamily: "Arial Black, sans-serif",
      fontSize: 40,
      color: "#ff0000",
      stroke: "#220000",
      strokeThickness: 6,
    }).setOrigin(0.5);
    
    // Add red pulsing glow effect to title
    this.tweens.add({
      targets: titleText,
      alpha: 0.8,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Add shadow effect
    const shadowText = this.add.text(centerX + 3, 58, "UNDEAD PINUPS STANDINGS", {
      fontFamily: "Arial Black, sans-serif",
      fontSize: 40,
      color: "#000000",
      alpha: 0.4
    }).setOrigin(0.5).setDepth(-1);
  }
  
  addGothicDecoration(graphics, x, y, width, height) {
    // Add gothic spikes and decorative elements
    graphics.lineStyle(2, 0x990000, 0.8);
    
    // Top spikes
    const spikeCount = 10;
    const spikeWidth = width / spikeCount;
    
    for (let i = 0; i < spikeCount; i++) {
      const spikeX = x + (i * spikeWidth) + (spikeWidth / 2);
      graphics.lineTo(spikeX, y - 10);
      graphics.lineTo(spikeX + (spikeWidth / 2), y);
    }
    
    // Bottom spikes
    for (let i = 0; i < spikeCount; i++) {
      const spikeX = x + (i * spikeWidth) + (spikeWidth / 2);
      graphics.lineTo(spikeX, y + height + 10);
      graphics.lineTo(spikeX + (spikeWidth / 2), y + height);
    }
    
    // Add decorative skull symbol
    this.drawSkullSymbol(x + width - 50, y + height / 2, 20);
    this.drawSkullSymbol(x + 50, y + height / 2, 20);
  }
  
  drawSkullSymbol(x, y, size) {
    const skull = this.add.graphics();
    
    // Draw skull shape with Phaser graphics
    skull.fillStyle(0xffffff, 0.7);
    
    // Skull cranium (circle)
    skull.fillCircle(x, y - size/4, size/2);
    
    // Skull jaw (smaller circle/oval)
    skull.fillEllipse(x, y + size/4, size/1.8, size/3);
    
    // Eye sockets
    skull.fillStyle(0x000000, 1);
    skull.fillCircle(x - size/5, y - size/4, size/8);
    skull.fillCircle(x + size/5, y - size/4, size/8);
    
    // Nose hole
    skull.fillCircle(x, y, size/10);
    
    return skull;
  }

  createColumnHeaders() {
    const headerY = 120;
    const headerHeight = 40;
    
    // Headers background
    const headerBg = this.add.graphics();
    headerBg.fillStyle(this.colors.headerBg, 0.8);
    headerBg.fillRect(80, headerY, this.scale.width - 160, headerHeight);
    
    // Add border to header
    headerBg.lineStyle(2, this.colors.title, 0.8);
    headerBg.strokeRect(80, headerY, this.scale.width - 160, headerHeight);
    
    const headerStyle = {
      fontFamily: "Arial, sans-serif",
      fontSize: 22,
      color: "#ff9900",
      fontStyle: "bold"
    };
    
    // Create column headers with sort indicators
    this.createSortableHeader("User", "wax_account", 100, headerY + headerHeight/2, headerStyle);
    this.createSortableHeader("WYNX", "wynx_earned", 300, headerY + headerHeight/2, headerStyle);
    this.createSortableHeader("NFTs", "nfts_found", 430, headerY + headerHeight/2, headerStyle);
    this.createSortableHeader("Vanquished", "kills", 550, headerY + headerHeight/2, headerStyle);
    this.createSortableHeader("Wave", "wave_reached", 680, headerY + headerHeight/2, headerStyle);
  }
  
  createSortableHeader(label, field, x, y, style) {
    // Create interactive text
    const header = this.add.text(x, y, label, style).setOrigin(0, 0.5);
    header.setInteractive({ useHandCursor: true });
    
    // Add sort indicator
    const sortIndicator = this.add.text(x + header.width + 10, y, "", style).setOrigin(0, 0.5);
    
    // Update sort indicator if this is the current sort field
    if (this.sortBy === field) {
      sortIndicator.setText(this.sortDirection === "desc" ? "▼" : "▲");
    }
    
    // Handle clicks to sort
    header.on('pointerdown', () => {
      if (this.sortBy === field) {
        // Toggle direction if already sorting by this field
        this.sortDirection = this.sortDirection === "desc" ? "asc" : "desc";
      } else {
        // Set new sort field
        this.sortBy = field;
        this.sortDirection = "desc";
      }
      
      // Refresh the data with new sort
      this.fetchAndDisplayLeaderboard();
    });
    
    // Hover effects
    header.on('pointerover', () => {
      header.setColor('#ffffff');
    });
    
    header.on('pointerout', () => {
      header.setColor('#ff9900');
    });
  }

  async fetchTotalPlayers() {
    try {
      const { count, error } = await supabase
        .from("players")
        .select("*", { count: "exact", head: true });
      
      if (error) {
        console.error("Error fetching total count:", error);
        this.totalPlayers = 0;
      } else {
        this.totalPlayers = count || 0;
      }
    } catch (err) {
      console.error("fetchTotalPlayers error:", err);
      this.totalPlayers = 0;
    }
  }

  async fetchAndDisplayLeaderboard() {
    // Show loading effect
    this.showLoadingEffect();
    
    try {
      const { data, error } = await supabase
        .from("players")
        .select("wax_account, wynx_earned, nfts_found, kills, wave_reached")
        .order(this.sortBy, { ascending: this.sortDirection === "asc" })
        .range(this.currentPage * this.pageSize, (this.currentPage + 1) * this.pageSize - 1);

      if (error) {
        console.error("Supabase error =>", error);
        this.showErrorMessage("Failed to fetch data");
        return;
      }
      
      // Clear previous rows if any
      if (this.rows) {
        this.rows.forEach(row => row.destroy());
      }
      
      this.displayLeaderboardData(data);
    } catch (err) {
      console.error("fetchAndDisplayLeaderboard =>", err);
      this.showErrorMessage("An error occurred");
    }
  }
  
  showLoadingEffect() {
    // Clear any existing loading text
    if (this.loadingText) this.loadingText.destroy();
    
    // Show animated loading text
    this.loadingText = this.add.text(
      this.scale.width / 2, 
      250, 
      "Summoning the undead data...", 
      {
        fontFamily: "Arial, sans-serif",
        fontSize: 24,
        color: "#990000"
      }
    ).setOrigin(0.5);
    
    // Add pulsing animation
    this.tweens.add({
      targets: this.loadingText,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }
  
  showErrorMessage(message) {
    // Clear loading text
    if (this.loadingText) this.loadingText.destroy();
    
    // Display error message
    this.add.text(
      this.scale.width / 2,
      250,
      message,
      {
        fontFamily: "Arial, sans-serif",
        fontSize: 24,
        color: "#ff0000",
        stroke: "#000000",
        strokeThickness: 3
      }
    ).setOrigin(0.5);
  }

  displayLeaderboardData(data) {
    // Clear loading text
    if (this.loadingText) this.loadingText.destroy();
    
    // Initialize rows container
    this.rows = [];
    
    if (!data || data.length === 0) {
      this.add.text(
        this.scale.width / 2,
        250,
        "No undead have risen yet...",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: 24,
          color: "#990000",
          stroke: "#000000",
          strokeThickness: 3
        }
      ).setOrigin(0.5);
      return;
    }
    
    // Table row style
    const rowStyle = { 
      fontFamily: "Arial, sans-serif", 
      fontSize: 20, 
      color: "#cccccc"
    };
    
    // Display data rows with animation
    data.forEach((row, index) => {
      const yPos = 170 + index * 40;
      
      // Row background with alternating colors
      const rowBg = this.add.graphics();
      const bgColor = index % 2 === 0 ? this.colors.rowBg1 : this.colors.rowBg2;
      rowBg.fillStyle(bgColor, 0.4);
      rowBg.fillRect(80, yPos, this.scale.width - 160, 36);
      
      // Add subtle glow to top players
      if (this.currentPage === 0 && index < 3) {
        const glowColors = [0xffcc00, 0xcccccc, 0xcc6600]; // Gold, Silver, Bronze
        rowBg.lineStyle(2, glowColors[index], 0.7);
        rowBg.strokeRect(80, yPos, this.scale.width - 160, 36);
        
        // Trophy or rank indicator for top 3
        this.drawRankSymbol(55, yPos + 18, index + 1);
      }
      
      // Create row contents with staggered animation
      const rowGroup = this.add.group();
      
      rowGroup.add(this.add.text(100, yPos + 18, row.wax_account ?? "Unknown Soul", rowStyle).setOrigin(0, 0.5));
      rowGroup.add(this.add.text(300, yPos + 18, String(row.wynx_earned ?? 0), rowStyle).setOrigin(0, 0.5));
      rowGroup.add(this.add.text(430, yPos + 18, String(row.nfts_found ?? 0), rowStyle).setOrigin(0, 0.5));
      rowGroup.add(this.add.text(550, yPos + 18, String(row.kills ?? 0), rowStyle).setOrigin(0, 0.5));
      rowGroup.add(this.add.text(680, yPos + 18, String(row.wave_reached ?? 0), rowStyle).setOrigin(0, 0.5));
      
      // Add to rows for later cleanup
      this.rows.push(rowBg);
      rowGroup.getChildren().forEach(child => this.rows.push(child));
      
      // Fade-in animation with delay based on row index
      rowGroup.getChildren().forEach(child => {
        child.alpha = 0;
        this.tweens.add({
          targets: child,
          alpha: 1,
          duration: 300,
          delay: index * 50,
          ease: 'Power2'
        });
      });
    });
  }
  
  drawRankSymbol(x, y, rank) {
    const graphics = this.add.graphics();
    
    if (rank === 1) {
      // Gold crown
      graphics.fillStyle(0xffcc00, 0.9);
      graphics.lineStyle(1, 0xff9900, 1);
      
      // Crown base
      graphics.fillRect(x - 15, y, 30, 10);
      
      // Crown spikes
      graphics.fillTriangle(x - 15, y, x - 15, y - 15, x - 5, y);
      graphics.fillTriangle(x - 5, y, x, y - 20, x + 5, y);
      graphics.fillTriangle(x + 5, y, x + 15, y - 15, x + 15, y);
      
      // Crown outline
      graphics.strokePath();
    } 
    else if (rank === 2) {
      // Silver medallion
      graphics.fillStyle(0xdddddd, 0.9);
      graphics.lineStyle(1, 0xaaaaaa, 1);
      graphics.fillCircle(x, y, 12);
      graphics.strokeCircle(x, y, 12);
      
      // Number 2
      this.add.text(x, y, "2", {
        fontFamily: "Arial",
        fontSize: 14,
        color: "#000000"
      }).setOrigin(0.5);
    } 
    else if (rank === 3) {
      // Bronze medallion
      graphics.fillStyle(0xcc6600, 0.9);
      graphics.lineStyle(1, 0x994400, 1);
      graphics.fillCircle(x, y, 12);
      graphics.strokeCircle(x, y, 12);
      
      // Number 3
      this.add.text(x, y, "3", {
        fontFamily: "Arial",
        fontSize: 14,
        color: "#000000"
      }).setOrigin(0.5);
    }
  }

  createNavigation() {
    const y = 500;
    const buttonWidth = 140;
    const buttonHeight = 40;
    const centerX = this.scale.width / 2;
    
    if (this.totalPlayers <= this.pageSize) {
      // No need for pagination
      return;
    }
    
    // Calculate total pages
    const totalPages = Math.ceil(this.totalPlayers / this.pageSize);
    
    // Create pagination info text
    this.add.text(
      centerX,
      y - 40,
      `Page ${this.currentPage + 1} of ${totalPages}`,
      {
        fontFamily: "Arial",
        fontSize: 18,
        color: "#aa0000"
      }
    ).setOrigin(0.5);
    
    // Previous page button
    if (this.currentPage > 0) {
      this.createGothicButton(
        centerX - 100, 
        y, 
        "Previous", 
        () => {
          this.currentPage--;
          this.fetchAndDisplayLeaderboard();
        }
      );
    }
    
    // Next page button
    if ((this.currentPage + 1) * this.pageSize < this.totalPlayers) {
      this.createGothicButton(
        centerX + 100, 
        y, 
        "Next", 
        () => {
          this.currentPage++;
          this.fetchAndDisplayLeaderboard();
        }
      );
    }
  }
  
  createGothicButton(x, y, label, callback) {
    // Button background
    const bg = this.add.graphics();
    bg.fillStyle(this.colors.button, 0.8);
    bg.fillRect(x - 70, y - 20, 140, 40);
    
    // Button border
    bg.lineStyle(2, this.colors.title, 0.9);
    bg.strokeRect(x - 70, y - 20, 140, 40);
    
    // Button text
    const text = this.add.text(
      x, 
      y, 
      label, 
      {
        fontFamily: "Arial, sans-serif",
        fontSize: 18,
        color: "#ffffff"
      }
    ).setOrigin(0.5);
    
    // Make interactive
    bg.setInteractive(new Phaser.Geom.Rectangle(x - 70, y - 20, 140, 40), Phaser.Geom.Rectangle.Contains);
    
    // Add hover effects
    bg.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(this.colors.buttonHover, 0.9);
      bg.fillRect(x - 70, y - 20, 140, 40);
      bg.lineStyle(2, 0xffffff, 1);
      bg.strokeRect(x - 70, y - 20, 140, 40);
      text.setColor('#ffffff');
      
      // Add pulsing effect on hover
      this.tweens.add({
        targets: text,
        scale: 1.1,
        duration: 200,
        yoyo: true,
        repeat: 0
      });
    });
    
    bg.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(this.colors.button, 0.8);
      bg.fillRect(x - 70, y - 20, 140, 40);
      bg.lineStyle(2, this.colors.title, 0.9);
      bg.strokeRect(x - 70, y - 20, 140, 40);
      text.setColor('#ffffff');
      text.setScale(1);
    });
    
    bg.on('pointerdown', callback);
    
    return { bg, text };
  }

  createFooter() {
    const centerX = this.scale.width / 2;
    const y = this.scale.height - 60;
    
    // Create a footer back button with gothic style
    const backButton = this.createGothicButton(
      centerX,
      y,
      "Return to Main Menu",
      () => {
        this.scene.start("MainMenu");
      }
    );
    
    // Add decorative elements to the footer
    const footerDecor = this.add.graphics();
    footerDecor.lineStyle(2, this.colors.title, 0.7);
    
    // Draw horizontal line
    footerDecor.beginPath();
    footerDecor.moveTo(100, y - 40);
    footerDecor.lineTo(this.scale.width - 100, y - 40);
    footerDecor.strokePath();
    
    // Add small decorative skulls at the ends of the line
    this.drawSkullSymbol(100, y - 40, 15);
    this.drawSkullSymbol(this.scale.width - 100, y - 40, 15);
  }

  createFogEffect() {
    // Create fog particles
    const fogParticles = this.add.graphics();
    
    // Create multiple fog clouds
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(0, this.scale.height);
      const size = Phaser.Math.Between(100, 300);
      const alpha = Phaser.Math.FloatBetween(0.03, 0.1);
      
      // Create a single fog cloud
      this.createFogCloud(x, y, size, alpha);
    }
  }
  
  createFogCloud(x, y, size, alpha) {
    const fog = this.add.graphics();
    fog.fillStyle(0x660000, alpha);
    
    // Draw several overlapping circles to create fog effect
    for (let i = 0; i < 5; i++) {
      const offsetX = Phaser.Math.Between(-20, 20);
      const offsetY = Phaser.Math.Between(-20, 20);
      const circleSize = size * Phaser.Math.FloatBetween(0.7, 1.0);
      fog.fillCircle(x + offsetX, y + offsetY, circleSize);
    }
    
    // Animate the fog
    this.tweens.add({
      targets: fog,
      x: Phaser.Math.Between(-100, 100),
      y: Phaser.Math.Between(-20, 20),
      alpha: { from: alpha, to: 0 },
      duration: Phaser.Math.Between(15000, 30000),
      onComplete: () => {
        fog.destroy();
        // Create a new fog cloud when this one disappears
        this.createFogCloud(
          Phaser.Math.Between(0, this.scale.width),
          Phaser.Math.Between(0, this.scale.height),
          Phaser.Math.Between(100, 300),
          Phaser.Math.FloatBetween(0.03, 0.1)
        );
      }
    });
  }
}