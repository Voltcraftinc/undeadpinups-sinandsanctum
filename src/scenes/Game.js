// src/scenes/Game.js
import { Scene } from 'phaser'

export class Game extends Scene {
  constructor() {
    super('Game')
  }

  preload() {
    // Preloader.js handles loading
  }

  create(data) {
    console.log('[Game.create] START')

    ///////////////////////////////////////////////////////////////////////////
    // 0) CAPTURE ANY DATA PASSED IN (e.g. from MainMenu)
    ///////////////////////////////////////////////////////////////////////////
    this.waxAccount = data?.waxAccount || null
    console.log('WaxAccount in Game =>', this.waxAccount)

    ///////////////////////////////////////////////////////////////////////////
    // FLAGS & ARRAYS
    ///////////////////////////////////////////////////////////////////////////
    this.playerDead = false
    this.drops = []
    this.wynxCollected = 0 // track how many WYNX tokens the player picks up

    ///////////////////////////////////////////////////////////////////////////
    // AUDIO
    ///////////////////////////////////////////////////////////////////////////
    this.zombieHurtSounds = [
      this.sound.add('zombiehurt1'),
      this.sound.add('zombiehurt2'),
      this.sound.add('zombiehurt3'),
    ]
    this.bloodChargeSound = this.sound.add('bloodchargefire')

    ///////////////////////////////////////////////////////////////////////////
    // GO SIGN
    ///////////////////////////////////////////////////////////////////////////
    this.goSign = this.add
      .image(this.scale.width - 100, this.scale.height / 2, 'goSign')
      .setDepth(9999)
      .setVisible(false)

    this.goSignTween = this.tweens.add({
      targets: this.goSign,
      alpha: 0.2,
      duration: 500,
      ease: 'Linear',
      yoyo: true,
      repeat: -1,
      paused: true,
    })

    ///////////////////////////////////////////////////////////////////////////
    // BACKGROUND
    ///////////////////////////////////////////////////////////////////////////
    this.background1 = this.add
      .image(0, 0, 'background')
      .setOrigin(0, 0)
      .setDepth(-9999)
    this.background2 = this.add
      .image(7335, 0, 'background')
      .setOrigin(0, 0)
      .setDepth(-9999)

    this.gameWidth = 7335
    this.totalSections = 5
    this.sectionWidth = 1024
    this.currentSection = 0

    ///////////////////////////////////////////////////////////////////////////
    // ROAD & PLAYER
    ///////////////////////////////////////////////////////////////////////////
    this.roadTop = this.scale.height - 275
    this.roadBottom = this.scale.height - 100

    this.player = this.add
      .sprite(50, this.roadBottom, 'Idle')
      .setScale(1.5)
      .setDepth(9999)
    this.isJumping = false
    this.isAttacking = false

    ///////////////////////////////////////////////////////////////////////////
    // KEYBOARD
    ///////////////////////////////////////////////////////////////////////////
    this.cursors = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      W: Phaser.Input.Keyboard.KeyCodes.W,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      attack: Phaser.Input.Keyboard.KeyCodes.PERIOD,
    })

    ///////////////////////////////////////////////////////////////////////////
    // PROJECTILES
    ///////////////////////////////////////////////////////////////////////////
    this.bloodProjectiles = []

    ///////////////////////////////////////////////////////////////////////////
    // CREATE ANIMATIONS
    ///////////////////////////////////////////////////////////////////////////
    this.createAnimations()
    this.player.play('Idle')

    // Attack => spawn projectile after Attack_1
    this.player.on('animationcomplete-Attack_1', () => {
      if (this.isAttacking) {
        console.log('[Attack_1 complete] => spawn projectile')
        this.bloodChargeSound.play()

        const offsetX = this.player.flipX ? -30 : 30
        const offsetY = -30
        const proj = this.add.sprite(
          this.player.x + offsetX,
          this.player.y + offsetY,
          'Blood_Charge'
        )
        proj.flipX = this.player.flipX
        proj.speed = this.player.flipX ? -300 : 300
        proj.setDepth(9999)

        proj.play('Blood_Charge_Anim')
        this.bloodProjectiles.push(proj)
      }
    })

    // Crisp
    this.cameras.main.roundPixels = true

    ///////////////////////////////////////////////////////////////////////////
    // UI & WAVES
    ///////////////////////////////////////////////////////////////////////////
    this.createPlayerSoulUI()
    this.createKillsUI()
    this.initWaveSystem()
  }

  update(time, delta) {
    const dt = delta / 1000
    const speed = this.cursors.shift.isDown ? 200 : 120

    if (this.playerDead) {
      this.handleSectionTransition()
      return
    }

    // Horizontal movement
    let movingHoriz = false
    if ((this.cursors.left.isDown || this.cursors.A.isDown) && !this.isAttacking) {
      movingHoriz = true
      this.player.x -= speed * dt
      this.player.flipX = true
    } else if (
      (this.cursors.right.isDown || this.cursors.D.isDown) &&
      !this.isAttacking
    ) {
      movingHoriz = true
      this.player.x += speed * dt
      this.player.flipX = false
    }
    if (this.player.x < 0) {
      this.player.x = 0
    }

    // Vertical
    let movingVert = false
    if ((this.cursors.up.isDown || this.cursors.W.isDown) && !this.isAttacking) {
      movingVert = true
      this.player.y -= speed * dt
    } else if (
      (this.cursors.down.isDown || this.cursors.S.isDown) &&
      !this.isAttacking
    ) {
      movingVert = true
      this.player.y += speed * dt
    }

    // Clamp Y if not jumping
    if (!this.isJumping) {
      if (this.player.y < this.roadTop) {
        this.player.y = this.roadTop
      }
      if (this.player.y > this.roadBottom) {
        this.player.y = this.roadBottom
      }
    }

    // Movement anim
    if (!this.isAttacking && !this.isJumping) {
      if (movingHoriz || movingVert) {
        this.player.play(this.cursors.shift.isDown ? 'Run' : 'Walk', true)
      } else {
        this.player.play('Idle', true)
      }
    }

    // Jump
    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.space) &&
      !this.isJumping &&
      !this.isAttacking
    ) {
      this.isJumping = true
      this.player.play('Jump', true)
      this.tweens.add({
        targets: this.player,
        y: this.player.y - 80,
        duration: 300,
        ease: 'Sine.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: this.player,
            y: this.player.y + 80,
            duration: 300,
            ease: 'Sine.easeIn',
            onComplete: () => {
              this.isJumping = false
              if (!this.isAttacking) {
                if (movingHoriz || movingVert) {
                  this.player.play(
                    this.cursors.shift.isDown ? 'Run' : 'Walk',
                    true
                  )
                } else {
                  this.player.play('Idle', true)
                }
              }
            },
          })
        },
      })
    }

    // Attack
    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.attack) &&
      !this.isAttacking &&
      !this.isJumping
    ) {
      this.isAttacking = true
      this.player.play('Attack_1', true)

      this.time.delayedCall(500, () => {
        if (this.isAttacking) {
          this.isAttacking = false
          if (movingHoriz || movingVert) {
            this.player.play(
              this.cursors.shift.isDown ? 'Run' : 'Walk',
              true
            )
          } else {
            this.player.play('Idle', true)
          }
        }
      })
    }

    // Move projectiles
    const totalWidth = this.totalSections * this.sectionWidth
    for (let i = this.bloodProjectiles.length - 1; i >= 0; i--) {
      const p = this.bloodProjectiles[i]
      p.x += p.speed * dt
      if (p.x < 0 || p.x > totalWidth) {
        p.destroy()
        this.bloodProjectiles.splice(i, 1)
      }
    }

    // DROPS
    this.updateDrops(dt)

    // WAVES
    this.updateZombies(dt)
    this.checkProjectileHits()
    this.handleSectionTransition()
  }

  ///////////////////////////////////////////////////////////////////////////
  // DROPS
  ///////////////////////////////////////////////////////////////////////////
  updateDrops(dt) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i]
      d.shadow.x = d.x
      d.shadow.y = d.y + 12

      const dist = Phaser.Math.Distance.Between(d.x, d.y, this.player.x, this.player.y)
      if (dist < 40) {
        // Soul => +25
        if (d.isSoul) {
          console.log('Picked up Soul => +25')
          this.playerSoul = Math.min(this.playerSoul + 25, 100)
          this.updatePlayerSoulUI()
        }
        // WYNX => increment
        else if (d.isWynx) {
          console.log('Picked up WYNX => +1')
          this.wynxCollected++
        }
        // Destroy
        d.shadow.destroy()
        d.destroy()
        this.drops.splice(i, 1)
      }
    }
  }

  makeDropFloat(drop) {
    drop.shadow = this.add
      .ellipse(drop.x, drop.y + 12, 30, 12, 0x000000, 0.3)
      .setDepth(drop.depth - 1)

    this.tweens.add({
      targets: drop,
      angle: 360,
      duration: 1500,
      repeat: -1,
    })

    this.tweens.add({
      targets: drop,
      y: '-=5',
      yoyo: true,
      repeat: -1,
      duration: 800,
      ease: 'Sine.easeInOut',
    })

    this.drops.push(drop)
  }

  ///////////////////////////////////////////////////////////////////////////
  // ANIMATIONS
  ///////////////////////////////////////////////////////////////////////////
  createAnimations() {
    if (this.anims.get('Idle')) {
      return
    }
    // Player
    this.anims.create({
      key: 'Idle',
      frames: this.anims.generateFrameNumbers('Idle'),
      frameRate: 6,
      repeat: -1,
    })
    this.anims.create({
      key: 'Walk',
      frames: this.anims.generateFrameNumbers('Walk'),
      frameRate: 10,
      repeat: -1,
    })
    this.anims.create({
      key: 'Run',
      frames: this.anims.generateFrameNumbers('Run'),
      frameRate: 14,
      repeat: -1,
    })
    this.anims.create({
      key: 'Jump',
      frames: this.anims.generateFrameNumbers('Jump'),
      frameRate: 10,
      repeat: 0,
    })
    this.anims.create({
      key: 'Attack_1',
      frames: this.anims.generateFrameNumbers('Attack_1'),
      frameRate: 12,
      repeat: 0,
    })
    this.anims.create({
      key: 'Player_Dead',
      frames: this.anims.generateFrameNumbers('Dead'),
      frameRate: 6,
      repeat: 0,
    })

    // Zombies
    for (let i = 1; i <= 4; i++) {
      this.anims.create({
        key: `Zombie${i}_Idle`,
        frames: this.anims.generateFrameNumbers(`Zombie${i}_Idle`),
        frameRate: 6,
        repeat: -1,
      })
      this.anims.create({
        key: `Zombie${i}_Walk`,
        frames: this.anims.generateFrameNumbers(`Zombie${i}_Walk`),
        frameRate: 8,
        repeat: -1,
      })
      this.anims.create({
        key: `Zombie${i}_Attack`,
        frames: this.anims.generateFrameNumbers(`Zombie${i}_Attack`),
        frameRate: 8,
        repeat: 0,
      })
      this.anims.create({
        key: `Zombie${i}_Hurt`,
        frames: this.anims.generateFrameNumbers(`Zombie${i}_Hurt`),
        frameRate: 8,
        repeat: 0,
      })
      this.anims.create({
        key: `Zombie${i}_Dead`,
        frames: this.anims.generateFrameNumbers(`Zombie${i}_Dead`),
        frameRate: 6,
        repeat: 0,
      })
    }

    // Projectile
    this.anims.create({
      key: 'Blood_Charge_Anim',
      frames: this.anims.generateFrameNumbers('Blood_Charge', { start: 0, end: 2 }),
      frameRate: 10,
      repeat: -1,
    })
  }

  ///////////////////////////////////////////////////////////////////////////
  // UI
  ///////////////////////////////////////////////////////////////////////////
  playerSoul = 100
  kills = 0

  createPlayerSoulUI() {
    this.soulBg = this.add
      .rectangle(10, 10, 200, 20, 0x000000)
      .setOrigin(0)
      .setDepth(9999)
    this.soulFill = this.add
      .rectangle(10, 10, 200, 20, 0xff0000)
      .setOrigin(0)
      .setDepth(9999)
    this.soulText = this.add
      .text(12, 12, 'Soul: 100%', { fontSize: '14px', color: '#ffffff' })
      .setDepth(9999)
  }
  updatePlayerSoulUI() {
    if (this.playerSoul < 0) this.playerSoul = 0
    if (this.playerSoul > 100) this.playerSoul = 100
    const ratio = this.playerSoul / 100
    this.soulFill.width = 200 * ratio
    this.soulText.setText(`Soul: ${this.playerSoul}%`)
  }

  createKillsUI() {
    this.killsText = this.add
      .text(12, 34, 'Kills: 0', { fontSize: '14px', color: '#00ff00' })
      .setDepth(9999)
  }
  updateKillsUI() {
    this.killsText.setText(`Kills: ${this.kills}`)
  }

  ///////////////////////////////////////////////////////////////////////////
  // WAVES
  ///////////////////////////////////////////////////////////////////////////
  waveNumber = 1
  waveZombiesLeft = 0
  waveDone = false
  stageTransitioning = false

  zombies = []

  initWaveSystem() {
    console.log('[initWaveSystem] called ONCE')
    this.playerSoul = 100
    this.updatePlayerSoulUI()
    this.kills = 0
    this.updateKillsUI()
    this.waveNumber = 1
    this.startWave()
  }

  startWave() {
    const waveIndex = ((this.waveNumber - 1) % 10) + 1
    const waveCycle = Math.floor((this.waveNumber - 1) / 10)

    const baseBars = 2,
      baseSpeed = 40,
      baseDamage = 10
    const healthMult = 2 ** waveCycle
    const speedMult = 1 + 0.25 * waveCycle
    const damageMult = 2 ** waveCycle

    const waveBars = baseBars * healthMult
    const waveSpeed = baseSpeed * speedMult
    const waveDamage = baseDamage * damageMult

    this.waveZombiesLeft = waveIndex
    this.waveDone = false

    console.log(
      `Spawning wave #${this.waveNumber} => waveIndex=${waveIndex}, waveCycle=${waveCycle}, bars=${waveBars}, speed=${waveSpeed}`
    )

    for (let i = 0; i < waveIndex; i++) {
      this.time.delayedCall(2000 * i, () => {
        this.spawnOneZombie(waveBars, waveSpeed, waveDamage)
      })
    }
  }

  spawnOneZombie(bars, speed, damage) {
    const type = Phaser.Math.Between(1, 4)

    const spawnX = this.sectionWidth - 50
    const spawnY = Phaser.Math.Between(this.roadTop, this.roadBottom)

    const z = this.add
      .sprite(spawnX, spawnY, `Zombie${type}_Idle`)
      .setScale(1.4)
      .setDepth(9999)

    z.play(`Zombie${type}_Idle`)

    // Movement sound => loop
    z.movementSound = this.sound.add('zombiemovementsound', {
      loop: true,
      volume: 0.7,
    })
    z.movementSound.play()

    z.type = type
    z.bars = bars
    z.damage = damage
    z.speed = speed
    z.isDead = false
    z.isAttacking = false

    // HP bar
    z.healthBg = this.add
      .rectangle(z.x - 20, z.y - 40, 40, 5, 0x000000)
      .setDepth(9999)
    z.healthFill = this.add
      .rectangle(z.x - 20, z.y - 40, 40, 5, 0xff0000)
      .setDepth(9999)

    this.time.delayedCall(1000, () => {
      if (!z.isDead) {
        z.play(`Zombie${z.type}_Walk`)
      }
    })

    this.zombies.push(z)
  }

  updateZombies(dt) {
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i]
      if (!z || !z.anims) continue

      if (z.isDead) {
        if (
          z.anims.currentAnim &&
          z.anims.currentAnim.key.includes('Dead') &&
          !z.anims.isPlaying
        ) {
          if (z.movementSound) {
            z.movementSound.stop()
            z.movementSound.destroy()
          }
          z.healthBg.destroy()
          z.healthFill.destroy()
          z.destroy()
          this.zombies.splice(i, 1)

          this.waveZombiesLeft--
          this.kills++
          this.updateKillsUI()

          // Drops
          const dropChance = Phaser.Math.Between(1, 1000)
          if (dropChance <= 5) {
            // WYNX
            const wynx = this.add.sprite(z.x, z.y, 'wynx-token').setDepth(9999)
            wynx.isWynx = true
            this.makeDropFloat(wynx)
          } else if (dropChance <= 55) {
            // soul
            const soul = this.add
              .sprite(z.x, z.y, 'soul-restore')
              .setDepth(9999)
            soul.isSoul = true
            this.makeDropFloat(soul)
          }

          if (this.waveZombiesLeft <= 0) {
            this.waveDone = true
            console.log(
              '[updateZombies] wave done => waveZombiesLeft=0 => waveDone=true'
            )
            this.goSign.setVisible(true)
            this.goSignTween.play()
          }
        }
        continue
      }

      if (this.playerSoul <= 0 || this.playerDead) {
        continue
      }

      // HP bar
      z.healthBg.x = z.x - 20
      z.healthBg.y = z.y - 40
      z.healthFill.x = z.x - 20
      z.healthFill.y = z.y - 40
      const maxBars = 8
      const ratio = z.bars / maxBars
      z.healthFill.width = 40 * ratio

      // chase
      if (!z.isAttacking) {
        const angle = Math.atan2(this.player.y - z.y, this.player.x - z.x)
        const vx = Math.cos(angle) * z.speed * dt
        const vy = Math.sin(angle) * z.speed * dt
        z.x += vx
        z.y += vy

        z.flipX = z.x > this.player.x
      }

      // if close => attack
      const dist = Phaser.Math.Distance.Between(z.x, z.y, this.player.x, this.player.y)
      if (dist < 40 && !z.isAttacking) {
        if (!z.scene || !z.anims) continue

        z.isAttacking = true
        z.play(`Zombie${z.type}_Attack`)
        z.once('animationcomplete', () => {
          if (!z.isDead && !this.playerDead && this.playerSoul > 0) {
            this.playerSoul -= z.damage
            if (this.playerSoul < 0) this.playerSoul = 0
            this.updatePlayerSoulUI()

            z.isAttacking = false
            if (!z.isDead) {
              z.play(`Zombie${z.type}_Walk`)
            }

            // If soul=0 => player dead anim
            if (this.playerSoul <= 0 && !this.playerDead) {
              console.log('Player soul=0 => play Player_Dead anim...')
              this.playerDead = true
              this.player.play('Player_Dead')

              // Once anim done => fade out => pass data to GameOver
              this.player.once('animationcomplete', () => {
                this.cameras.main.fadeOut(1000, 0, 0, 0)
                this.cameras.main.once('camerafadeoutcomplete', () => {
                  this.scene.start('GameOver', {
                    waxAccount: this.waxAccount,
                    kills: this.kills,
                    waveReached: this.waveNumber,
                    wynxEarned: this.wynxCollected,
                    // you can pass more fields if you want
                  })
                })
              })
            }
          }
        })
      }
    }
  }

  checkProjectileHits() {
    if (!this.scene.isActive()) return

    for (let i = this.bloodProjectiles.length - 1; i >= 0; i--) {
      const p = this.bloodProjectiles[i]
      for (let z of this.zombies) {
        if (!z || !z.anims || z.isDead) continue

        const dist = Phaser.Math.Distance.Between(p.x, p.y, z.x, z.y)
        if (dist < 30) {
          p.destroy()
          this.bloodProjectiles.splice(i, 1)

          z.bars--
          z.play(`Zombie${z.type}_Hurt`)
          Phaser.Utils.Array.GetRandom(this.zombieHurtSounds).play()

          if (z.bars <= 0) {
            z.isDead = true
            z.play(`Zombie${z.type}_Dead`)
          } else {
            this.time.delayedCall(300, () => {
              if (!z.isDead && !z.isAttacking && z.anims) {
                z.play(`Zombie${z.type}_Walk`)
              }
            })
          }
          break
        }
      }
    }
  }

  stageTransitioning = false

  handleSectionTransition() {
    if (!this.waveDone) {
      if (this.player.x >= 1000) {
        this.player.x = 1000
      }
      return
    }

    if (this.player.x >= 1000 && !this.stageTransitioning) {
      this.goSign.setVisible(false)
      this.goSignTween.pause()
      this.goSign.setAlpha(1)

      this.stageTransitioning = true
      console.log(
        `[handleSectionTransition] wave #${this.waveNumber} done => shifting left => waveNumber++ => ${
          this.waveNumber + 1
        }`
      )
      this.player.x = 1000

      const shift = this.sectionWidth
      this.currentSection = (this.currentSection + 1) % this.totalSections

      // keep them on top
      this.background1.setDepth(-9999)
      this.background2.setDepth(-9999)
      this.player.setDepth(9999)
      this.bloodProjectiles.forEach((b) => b.setDepth(9999))
      this.zombies.forEach((z) => z.setDepth(9999))
      this.drops.forEach((d) => d.setDepth(9999))
      if (this.goSign) this.goSign.setDepth(9999)

      this.tweens.add({
        targets: [
          this.background1,
          this.background2,
          this.player,
          ...this.bloodProjectiles,
          ...this.zombies,
          ...this.drops,
        ],
        x: (target) => target.x - shift,
        duration: 1000,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          if (this.background1.x <= -7335) {
            this.background1.x = this.background2.x + 7335
          }
          if (this.background2.x <= -7335) {
            this.background2.x = this.background1.x + 7335
          }
        },
        onComplete: () => {
          this.waveNumber++
          this.waveDone = false
          this.startWave()
          this.stageTransitioning = false
        },
      })
    }
  }
}
