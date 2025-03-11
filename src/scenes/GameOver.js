// src/scenes/GameOver.js
import { Scene } from 'phaser'
import { supabase } from '../supabaseClient' // Ensure this path is correct

export class GameOver extends Scene {
  constructor() {
    super('GameOver')
  }

  create(data) {
    // Attempt to save stats if data was passed in
    if (data && data.waxAccount) {
      this.saveStatsToDatabase(data)
    }

    // Existing "Game Over" UI
    this.cameras.main.setBackgroundColor('#000000')

    const centerX = this.scale.width / 2
    const centerY = this.scale.height / 2

    this.add
      .text(centerX, centerY - 50, 'YOU PERISHED', {
        fontFamily: 'Arial Black',
        fontSize: 64,
        color: '#ff0000',
        stroke: '#000000',
        strokeThickness: 8,
      })
      .setOrigin(0.5)

    this.add
      .text(centerX, centerY + 50, 'Click to return to Main Menu', {
        fontFamily: 'Arial',
        fontSize: 24,
        color: '#ffffff',
      })
      .setOrigin(0.5)

    // Return to MainMenu
    this.input.once('pointerdown', () => {
      this.scene.start('MainMenu')
    })
  }

  async saveStatsToDatabase(data) {
    try {
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
              last_login:   new Date().toISOString(),
              // If you want to manually set created_at or updated_at:
              // created_at: new Date().toISOString(),
              // updated_at: new Date().toISOString(),
            },
          ],
          {
            onConflict: 'wax_account', // Make sure wax_account is unique in your table
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
