// src/scenes/GameOver.js
import { Scene } from 'phaser'
import { supabase } from '../supabaseClient' // <-- Make sure this path is correct

export class GameOver extends Scene {
  constructor() {
    super('GameOver')
  }

  // Phaser automatically passes any data from scene.start('GameOver', data)
  create(data) {
    // 1) Attempt to save stats if data was passed
    if (data && data.waxAccount) {
      this.saveStatsToDatabase(data)
    }

    // 2) Your existing "Game Over" UI
    this.cameras.main.setBackgroundColor('#000000')
    const centerX = this.scale.width / 2
    const centerY = this.scale.height / 2

    this.add
      .text(centerX, centerY - 50, 'YOU PERISHED', {
        fontFamily: 'Arial Black',
        fontSize: 64,
        color: '#ff0000',
        stroke: '#000000',
        strokeThickness: 8
      })
      .setOrigin(0.5)

    this.add
      .text(centerX, centerY + 50, 'Click to return to Main Menu', {
        fontFamily: 'Arial',
        fontSize: 24,
        color: '#ffffff'
      })
      .setOrigin(0.5)

    // 3) Return to Main Menu on click/tap
    this.input.once('pointerdown', () => {
      this.scene.start('MainMenu')
    })
  }

  // ------------------------------------------------------------------
  // Save stats to Supabase
  // ------------------------------------------------------------------
  async saveStatsToDatabase(data) {
    try {
      // Upsert row in "players" table, matching on wax_account (unique key)
      const { error } = await supabase
        .from('players')
        .upsert(
          [
            {
              wax_account:  data.waxAccount   || null,
              player_name:  data.playerName   || null,
              kills:        data.kills        || 0,
              wynx_earned:  data.wynxEarned   || 0,
              distance:     data.distance     || 0,
              wave_reached: data.waveReached  || 0,
              best_score:   data.bestScore    || 0,
              nfts_found:   data.nftsFound    || 0,
              achievements: data.achievements || {},
              inventory:    data.inventory    || {},
              xp_level:     data.xpLevel      || 0,
              time_played:  data.timePlayed   || 0,
              last_login:   new Date().toISOString()
              // created_at & updated_at can auto-update if you set them up in Supabase
            }
          ],
          {
            onConflict: 'wax_account' // or your chosen unique key
          }
        )

      if (error) {
        console.error('Error saving stats to Supabase =>', error.message)
      } else {
        console.log('Stats successfully upserted!')
      }
    } catch (err) {
      console.error('Supabase error =>', err)
    }
  }
}
