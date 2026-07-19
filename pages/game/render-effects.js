const {
  drawRoundRect,
  CONFIG,
  PERFORMANCE_LIMITS,
  DRAG_UI_INTERVAL,
  IDLE_RENDER_INTERVAL,
  MIN_SUMMON_COST,
  DRAG_START_THRESHOLD,
  FIELD_DRAG_PICK_RADIUS,
  FIELD_MERGE_RADIUS,
  TOWER_SLOT_SNAP_RADIUS,
  INVENTORY_HIT_TOLERANCE,
  INVENTORY_MERGE_RADIUS,
  INVENTORY_MERGE_COMMIT_RADIUS,
  INVENTORY_MERGE_CORE_RATIO,
  BOSS_PRESSURE_BONUS,
  BOSS_PROFILE_GRACE_MS,
  PERFORMANCE_PROFILE_INTERVALS,
  PERFORMANCE_PROFILE_HYSTERESIS,
  AUDIO_SETTING_KEY,
  RUN_PROGRESS_KEY,
  RUN_PROGRESS_VERSION,
  RUN_PROGRESS_INTERVAL,
  COMMANDER_COST,
  COMMANDER_MARK_DURATION,
  COMMANDER_MARK_RADIUS,
  COMMANDER_PULSE_INTERVAL,
  COMMANDER_PULSE_DAMAGE,
  COMMANDER_ZONE_DAMAGE_BONUS,
  COMMANDER_ZONE_ATTACK_SPEED_FACTOR,
  SOUND_ASSETS,
  SOUND_POOL_SIZES,
  SOUND_VOLUMES,
  SOUND_COOLDOWNS,
  AMBIENT_TRACKS,
  TOWER_ATTACK_SOUNDS,
  PERFORMANCE_PROFILES,
  MAX_TOWER_LEVEL,
  TOWER_UPGRADE_GOLD_BASE,
  TOWER_UPGRADE_GOLD_PER_LEVEL_SQ,
  TOWER_TYPES,
  BLESSINGS,
  SUPPLY_REWARDS,
  SUPPLY_SYNERGY,
  THREAT_CHAIN_RULES,
  SPECIALIZATION_OPTIONS,
  MONSTER_TYPES,
  INVENTORY_COLS,
  INVENTORY_ROWS,
  MAP_THEMES
} = require('./config')

module.exports = {
  drawProjectiles() {
    const useCompactProjectiles = this.shouldUseSimplifiedProjectiles()

    this.projectiles.forEach(proj => {
      const ctx = this.ctx
      const lv = proj.towerLevel || 1

      if (useCompactProjectiles) {
        this.drawCompactProjectile(ctx, proj, lv)
        return
      }
      
      ctx.save()
      
      // 绘制轨迹 - 等级越高轨迹越明亮
      if (proj.trail.length > 1) {
        ctx.beginPath()
        ctx.moveTo(proj.trail[0].x, proj.trail[0].y)
        for (let i = 1; i < proj.trail.length; i++) {
          ctx.lineTo(proj.trail[i].x, proj.trail[i].y)
        }
        ctx.strokeStyle = proj.color
        ctx.globalAlpha = 0.2 + lv * 0.05
        ctx.lineWidth = proj.size * (0.4 + lv * 0.08)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
      
      ctx.shadowBlur = 10 + lv * 3
      ctx.shadowColor = proj.color
      
      if (proj.towerType === 'fire') {
        // 火球 - 等级越高越炽热
        ctx.save()
        ctx.shadowBlur = 15 + lv * 5
        ctx.shadowColor = lv >= 4 ? '#ffaa00' : '#ff6600'
        
        // 外层火焰光晕
        const glowR = proj.size * (2 + lv * 0.2)
        const outerGlow = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, glowR)
        if (lv >= 4) {
          outerGlow.addColorStop(0, 'rgba(255, 255, 240, 0.95)')
          outerGlow.addColorStop(0.15, 'rgba(255, 240, 100, 0.8)')
          outerGlow.addColorStop(0.4, 'rgba(255, 140, 0, 0.5)')
          outerGlow.addColorStop(1, 'rgba(255, 50, 0, 0)')
        } else if (lv >= 2) {
          outerGlow.addColorStop(0, 'rgba(255, 255, 210, 0.9)')
          outerGlow.addColorStop(0.2, 'rgba(255, 210, 60, 0.7)')
          outerGlow.addColorStop(0.5, 'rgba(255, 110, 0, 0.4)')
          outerGlow.addColorStop(1, 'rgba(255, 50, 0, 0)')
        } else {
          outerGlow.addColorStop(0, 'rgba(255, 230, 180, 0.8)')
          outerGlow.addColorStop(0.3, 'rgba(255, 160, 30, 0.5)')
          outerGlow.addColorStop(1, 'rgba(255, 50, 0, 0)')
        }
        ctx.fillStyle = outerGlow
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, glowR, 0, Math.PI * 2)
        ctx.fill()
        
        // 核心火球
        const coreR = proj.size * (0.9 + lv * 0.08)
        const gradient = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, coreR)
        if (lv >= 4) {
          gradient.addColorStop(0, '#ffffff')
          gradient.addColorStop(0.1, '#ffffd0')
          gradient.addColorStop(0.25, '#ffee66')
          gradient.addColorStop(0.5, '#ff8800')
          gradient.addColorStop(1, '#ff3300')
        } else {
          gradient.addColorStop(0, '#ffffff')
          gradient.addColorStop(0.15, '#ffffaa')
          gradient.addColorStop(0.3, '#ffcc00')
          gradient.addColorStop(0.6, '#ff6600')
          gradient.addColorStop(1, '#ff2200')
        }
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, coreR, 0, Math.PI * 2)
        ctx.fill()
        
        // 火焰尾巴 - 等级越高越长越密
        const tailCount = 2 + lv
        for (let i = 0; i < tailCount; i++) {
          const tailDist = 5 + i * (5 + lv * 0.5)
          const tailX = proj.x - Math.cos(proj.angle) * tailDist
          const tailY = proj.y - Math.sin(proj.angle) * tailDist
          const flicker = Math.sin(Date.now() * 0.02 + i) * 2.5
          const tailSize = proj.size * (0.7 - i * (0.7 / tailCount))
          
          ctx.globalAlpha = 0.7 - i * (0.6 / tailCount)
          
          const fireGrad = ctx.createRadialGradient(tailX, tailY, 0, tailX, tailY, tailSize * 1.5)
          if (lv >= 4) {
            fireGrad.addColorStop(0, '#ffffff')
            fireGrad.addColorStop(0.3, '#ffee44')
            fireGrad.addColorStop(1, 'rgba(255, 80, 0, 0)')
          } else {
            fireGrad.addColorStop(0, '#ffff00')
            fireGrad.addColorStop(0.4, '#ff8800')
            fireGrad.addColorStop(1, 'rgba(255, 50, 0, 0)')
          }
          ctx.fillStyle = fireGrad
          ctx.beginPath()
          ctx.arc(tailX + flicker, tailY + flicker * 0.5, tailSize, 0, Math.PI * 2)
          ctx.fill()
        }
        
        // 火星粒子 - 等级越高越多
        ctx.fillStyle = lv >= 4 ? '#ffffff' : '#ffff88'
        const sparkCount = 1 + lv
        for (let i = 0; i < sparkCount; i++) {
          const sparkX = proj.x - Math.cos(proj.angle) * (8 + Math.random() * 12) + (Math.random() - 0.5) * 8
          const sparkY = proj.y - Math.sin(proj.angle) * (8 + Math.random() * 12) + (Math.random() - 0.5) * 8 - Math.random() * 4
          ctx.globalAlpha = 0.8
          ctx.beginPath()
          ctx.arc(sparkX, sparkY, 0.8 + Math.random() * 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
        
        ctx.restore()
      } else if (proj.towerType === 'ice') {
        // 寒冰球 - 等级越高冰晶越复杂越亮
        ctx.save()
        ctx.translate(proj.x, proj.y)
        ctx.rotate(proj.angle + Date.now() * (0.003 + lv * 0.001))
        
        // 核心冰球
        const iceGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, proj.size * 1.3)
        if (lv >= 4) {
          iceGrad.addColorStop(0, '#ffffff')
          iceGrad.addColorStop(0.2, '#ddeeff')
          iceGrad.addColorStop(0.5, '#66ddff')
          iceGrad.addColorStop(1, 'rgba(0, 220, 255, 0.4)')
        } else {
          iceGrad.addColorStop(0, '#ffffff')
          iceGrad.addColorStop(0.3, '#aaeeff')
          iceGrad.addColorStop(0.6, '#00ccff')
          iceGrad.addColorStop(1, 'rgba(0, 200, 255, 0.3)')
        }
        ctx.fillStyle = iceGrad
        ctx.beginPath()
        ctx.arc(0, 0, proj.size, 0, Math.PI * 2)
        ctx.fill()
        
        // 六边形冰晶
        ctx.strokeStyle = lv >= 3 ? '#ffffff' : 'rgba(255,255,255,0.8)'
        ctx.lineWidth = 1 + lv * 0.2
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i
          const x1 = Math.cos(angle) * proj.size * (1.4 + lv * 0.1)
          const y1 = Math.sin(angle) * proj.size * (1.4 + lv * 0.1)
          if (i === 0) ctx.moveTo(x1, y1)
          else ctx.lineTo(x1, y1)
        }
        ctx.closePath()
        ctx.stroke()
        
        // 冰晶射线 - 等级越高分叉越多
        ctx.lineWidth = 1 + lv * 0.1
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(Math.cos(angle) * proj.size * 1.6, Math.sin(angle) * proj.size * 1.6)
          ctx.stroke()
          // 分叉
          const bx = Math.cos(angle) * proj.size * 1.0
          const by = Math.sin(angle) * proj.size * 1.0
          ctx.beginPath()
          ctx.moveTo(bx, by)
          ctx.lineTo(bx + Math.cos(angle + 0.5) * proj.size * 0.5, by + Math.sin(angle + 0.5) * proj.size * 0.5)
          ctx.moveTo(bx, by)
          ctx.lineTo(bx + Math.cos(angle - 0.5) * proj.size * 0.5, by + Math.sin(angle - 0.5) * proj.size * 0.5)
          ctx.stroke()
          // 高等级：二级分叉
          if (lv >= 3) {
            const b2x = Math.cos(angle) * proj.size * 0.6
            const b2y = Math.sin(angle) * proj.size * 0.6
            ctx.beginPath()
            ctx.moveTo(b2x, b2y)
            ctx.lineTo(b2x + Math.cos(angle + 0.8) * proj.size * 0.3, b2y + Math.sin(angle + 0.8) * proj.size * 0.3)
            ctx.stroke()
          }
        }
        ctx.restore()
        
        // 寒气尾迹 - 等级越高越浓密
        const frostCount = 2 + lv
        ctx.fillStyle = lv >= 4 ? 'rgba(200, 240, 255, 0.6)' : 'rgba(170, 238, 255, 0.5)'
        for (let i = 0; i < frostCount; i++) {
          const tx = proj.x - Math.cos(proj.angle) * (4 + i * 5) + (Math.random() - 0.5) * 5
          const ty = proj.y - Math.sin(proj.angle) * (4 + i * 5) + (Math.random() - 0.5) * 5
          ctx.globalAlpha = 0.4 - i * (0.35 / frostCount)
          ctx.beginPath()
          ctx.arc(tx, ty, proj.size * (0.4 - i * (0.3 / frostCount)), 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (proj.towerType === 'nature') {
        // 藤蔓球 - 等级越高藤蔓越多越繁茂
        ctx.save()
        ctx.translate(proj.x, proj.y)
        
        // 核心种子 - 高等级偏金色
        const vineGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, proj.size * 1.1)
        if (lv >= 4) {
          vineGrad.addColorStop(0, '#ccff88')
          vineGrad.addColorStop(0.3, '#88ee44')
          vineGrad.addColorStop(0.6, '#44bb22')
          vineGrad.addColorStop(1, 'rgba(68, 187, 34, 0)')
        } else {
          vineGrad.addColorStop(0, '#88ff88')
          vineGrad.addColorStop(0.4, '#44dd44')
          vineGrad.addColorStop(0.7, '#22aa22')
          vineGrad.addColorStop(1, 'rgba(34, 170, 34, 0)')
        }
        ctx.fillStyle = vineGrad
        ctx.beginPath()
        ctx.arc(0, 0, proj.size * 1.1, 0, Math.PI * 2)
        ctx.fill()
        
        // 旋转的藤蔓触手 - 等级越高越多
        ctx.rotate(Date.now() * 0.008)
        const vineCount = 2 + lv
        ctx.strokeStyle = lv >= 4 ? '#44bb33' : '#33aa33'
        ctx.lineWidth = 1.5 + lv * 0.15
        for (let i = 0; i < vineCount; i++) {
          const angle = (Math.PI * 2 / vineCount) * i
          ctx.beginPath()
          ctx.moveTo(Math.cos(angle) * proj.size * 0.4, Math.sin(angle) * proj.size * 0.4)
          const midX = Math.cos(angle) * proj.size * 1.2
          const midY = Math.sin(angle) * proj.size * 1.2
          const endX = Math.cos(angle + 0.3) * proj.size * 1.7
          const endY = Math.sin(angle + 0.3) * proj.size * 1.7
          ctx.quadraticCurveTo(midX, midY, endX, endY)
          ctx.stroke()
          // 叶子 - 高等级更大
          ctx.fillStyle = lv >= 4 ? '#88ff44' : '#66ff66'
          ctx.beginPath()
          ctx.ellipse(endX, endY, 2 + lv * 0.3, 1.5 + lv * 0.2, angle, 0, Math.PI * 2)
          ctx.fill()
        }
        
        // 高等级：小花朵
        if (lv >= 3) {
          const flowerCount = lv - 2
          for (let i = 0; i < flowerCount; i++) {
            const fa = (Math.PI * 2 / flowerCount) * i + Date.now() * 0.005
            const fx = Math.cos(fa) * proj.size * 0.8
            const fy = Math.sin(fa) * proj.size * 0.8
            ctx.fillStyle = lv >= 5 ? '#ffdd44' : '#ffaacc'
            ctx.beginPath()
            ctx.arc(fx, fy, 1.5, 0, Math.PI * 2)
            ctx.fill()
          }
        }
        
        ctx.restore()
        
        // 藤蔓尾迹
        const trailCount = 1 + lv
        ctx.fillStyle = lv >= 4 ? '#88ee44' : '#66dd66'
        for (let i = 0; i < trailCount; i++) {
          const tx = proj.x - Math.cos(proj.angle) * (3 + i * 4)
          const ty = proj.y - Math.sin(proj.angle) * (3 + i * 4)
          ctx.globalAlpha = 0.5 - i * (0.4 / trailCount)
          ctx.beginPath()
          ctx.arc(tx, ty, proj.size * (0.35 - i * (0.25 / trailCount)), 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (proj.towerType === 'arcane') {
        // 奥术球 - 等级越高符文越多能量越强
        ctx.save()
        ctx.translate(proj.x, proj.y)
        
        // 外层能量环 - 高等级多层
        const ringCount = Math.ceil(lv / 2)
        for (let r = 0; r < ringCount; r++) {
          ctx.save()
          ctx.rotate(Date.now() * (0.003 + r * 0.002) * (r % 2 === 0 ? 1 : -1))
          ctx.strokeStyle = `rgba(${170 + lv * 10}, 68, 255, ${0.4 + lv * 0.05})`
          ctx.lineWidth = 1.5 + lv * 0.1
          ctx.beginPath()
          ctx.arc(0, 0, proj.size * (1.8 + r * 0.5), 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }
        
        // 旋转符文 - 等级越高越多
        ctx.save()
        ctx.rotate(Date.now() * -0.006)
        const runeCount = 2 + Math.floor(lv / 2)
        ctx.strokeStyle = lv >= 4 ? '#eebbff' : '#dd88ff'
        ctx.lineWidth = 1 + lv * 0.1
        for (let i = 0; i < runeCount; i++) {
          const angle = (Math.PI * 2 / runeCount) * i
          const rx = Math.cos(angle) * proj.size * 1.3
          const ry = Math.sin(angle) * proj.size * 1.3
          const rs = 2.5 + lv * 0.3
          ctx.beginPath()
          ctx.moveTo(rx, ry - rs)
          ctx.lineTo(rx - rs, ry + rs * 0.7)
          ctx.lineTo(rx + rs, ry + rs * 0.7)
          ctx.closePath()
          ctx.stroke()
        }
        ctx.restore()
        
        ctx.restore()
        
        // 核心能量球
        const arcR = proj.size * (1.2 + lv * 0.08)
        const arcaneGrad = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, arcR)
        if (lv >= 4) {
          arcaneGrad.addColorStop(0, '#ffffff')
          arcaneGrad.addColorStop(0.15, '#ffbbff')
          arcaneGrad.addColorStop(0.4, '#cc66ff')
          arcaneGrad.addColorStop(0.7, '#8833dd')
          arcaneGrad.addColorStop(1, 'rgba(136, 51, 221, 0)')
        } else {
          arcaneGrad.addColorStop(0, '#ffffff')
          arcaneGrad.addColorStop(0.2, '#ee88ff')
          arcaneGrad.addColorStop(0.5, '#aa44ff')
          arcaneGrad.addColorStop(0.8, '#7722cc')
          arcaneGrad.addColorStop(1, 'rgba(119, 34, 204, 0)')
        }
        ctx.fillStyle = arcaneGrad
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, arcR, 0, Math.PI * 2)
        ctx.fill()
        
        // 能量尾迹 - 高等级更长更亮
        const trailLen = 3 + lv
        ctx.strokeStyle = lv >= 4 ? '#cc66ff' : '#aa44ff'
        ctx.lineWidth = 2 + lv * 0.3
        ctx.globalAlpha = 0.5 + lv * 0.05
        ctx.beginPath()
        ctx.moveTo(proj.x, proj.y)
        for (let i = 1; i <= trailLen; i++) {
          const tx = proj.x - Math.cos(proj.angle) * i * 5
          const ty = proj.y - Math.sin(proj.angle) * i * 5
          ctx.lineTo(tx + Math.sin(i * 2) * 2.5, ty + Math.cos(i * 2) * 2.5)
        }
        ctx.stroke()
        
        // 魔法粒子 - 等级越高越多
        ctx.fillStyle = lv >= 4 ? '#eebbff' : '#dd88ff'
        const particleCount = 2 + lv
        for (let i = 0; i < particleCount; i++) {
          const px = proj.x + (Math.random() - 0.5) * proj.size * 2.5
          const py = proj.y + (Math.random() - 0.5) * proj.size * 2.5
          ctx.globalAlpha = 0.7
          ctx.beginPath()
          ctx.arc(px, py, 1 + Math.random() * 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      
      ctx.restore()
    })
  },

  drawFireEffects() {
    const ctx = this.ctx
    ctx.save()
    const stride = this.getEffectRenderStride()
    for (let index = 0; index < this.fireEffects.length; index += stride) {
      const f = this.fireEffects[index]
      const r = f.size
      ctx.globalAlpha = f.alpha * 0.4
      ctx.fillStyle = '#ff4400'
      ctx.beginPath()
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = f.alpha * 0.7
      ctx.fillStyle = '#ffaa00'
      ctx.beginPath()
      ctx.arc(f.x, f.y, r * 0.7, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = f.alpha
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(f.x, f.y, r * 0.3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  },

  drawIceEffects() {
    const stride = this.getEffectRenderStride()
    for (let index = 0; index < this.iceEffects.length; index += stride) {
      const i = this.iceEffects[index]
      const ctx = this.ctx
      ctx.save()
      ctx.globalAlpha = i.alpha

      if (i.dist !== undefined) {
        const x = i.x + Math.cos(i.angle) * i.dist
        const y = i.y + Math.sin(i.angle) * i.dist

        ctx.strokeStyle = '#aaeeff'
        ctx.lineWidth = 2
        ctx.beginPath()
        for (let j = 0; j < 6; j++) {
          const a = i.angle + (Math.PI * 2 / 6) * j
          ctx.moveTo(x, y)
          ctx.lineTo(x + Math.cos(a) * i.size, y + Math.sin(a) * i.size)
        }
        ctx.stroke()
      } else {
        ctx.fillStyle = '#aaeeff'
        ctx.beginPath()
        ctx.arc(i.x, i.y, i.size, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()
    }
  },

  drawPoisonEffects() {
    const stride = this.getEffectRenderStride()
    for (let index = 0; index < this.poisonEffects.length; index += stride) {
      const p = this.poisonEffects[index]
      const ctx = this.ctx
      ctx.save()
      ctx.globalAlpha = p.alpha

      if (p.isVine) {
        ctx.strokeStyle = '#44cc44'
        ctx.lineWidth = p.size * 0.6
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(p.x, p.y + p.size * 2)
        ctx.quadraticCurveTo(
          p.x + Math.sin(Date.now() * 0.01 + p.x) * 5,
          p.y + p.size,
          p.x,
          p.y
        )
        ctx.stroke()
        ctx.fillStyle = '#66ff66'
        ctx.beginPath()
        ctx.ellipse(p.x - 3, p.y - 2, 4, 2, -0.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(p.x + 3, p.y - 2, 4, 2, 0.5, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // 真机兼容：globalAlpha + 实色，替代 createRadialGradient
        ctx.fillStyle = '#44cc44'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = p.alpha * 0.6
        ctx.fillStyle = '#88ee88'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 0.55, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()
    }
  },

  drawArcaneEffects() {
    const stride = this.getEffectRenderStride()
    const compact = stride >= 3
    for (let index = 0; index < this.arcaneEffects.length; index += stride) {
      const a = this.arcaneEffects[index]
      const ctx = this.ctx
      ctx.save()
      ctx.globalAlpha = a.alpha

      const x = a.x + Math.cos(a.angle) * a.dist
      const y = a.y + Math.sin(a.angle) * a.dist

      ctx.fillStyle = '#aa44ff'
      ctx.shadowBlur = compact ? 0 : 6
      ctx.shadowColor = compact ? 'rgba(0,0,0,0)' : '#aa44ff'
      ctx.beginPath()
      ctx.arc(x, y, a.size, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()
    }
  },

  drawLightningEffects() {
    const stride = this.getEffectRenderStride()
    const compact = stride >= 3
    for (let index = 0; index < this.lightningEffects.length; index += stride) {
      const l = this.lightningEffects[index]
      const ctx = this.ctx
      ctx.save()
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = Number.isFinite(l.alpha)
        ? Math.max(0, Math.min(0.85, l.alpha))
        : 0.65

      ctx.strokeStyle = l.color
      ctx.lineWidth = compact ? l.width + 1 : l.width + 3
      ctx.shadowBlur = 0
      ctx.shadowColor = 'rgba(0,0,0,0)'
      ctx.lineCap = 'round'

      ctx.beginPath()
      ctx.moveTo(l.x1, l.y1)

      const segments = compact ? 3 : 5
      const dx = (l.x2 - l.x1) / segments
      const dy = (l.y2 - l.y1) / segments

      for (let i = 1; i < segments; i++) {
        const x = l.x1 + dx * i + (Math.random() - 0.5) * 20
        const y = l.y1 + dy * i + (Math.random() - 0.5) * 20
        ctx.lineTo(x, y)
      }
      ctx.lineTo(l.x2, l.y2)
      ctx.stroke()

      if (!compact) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = l.width * 0.5
        ctx.stroke()
      }

      ctx.restore()
    }
  },

  drawMergeEffects() {
    const compact = this.getEffectRenderStride() >= 3
    this.mergeEffects.forEach(m => {
      const ctx = this.ctx
      ctx.save()
      ctx.globalAlpha = m.alpha

      ctx.shadowBlur = compact ? 0 : 10
      ctx.shadowColor = compact ? 'rgba(0,0,0,0)' : m.color
      ctx.strokeStyle = m.color
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2)
      ctx.stroke()

      ctx.strokeStyle = '#ffd700'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(m.x, m.y, m.radius * 0.7, 0, Math.PI * 2)
      ctx.stroke()

      ctx.restore()
    })
  },

  drawParticles() {
    const stride = this.getEffectRenderStride()
    const ctx = this.ctx
    ctx.save()
    ctx.shadowBlur = 0
    ctx.shadowColor = 'rgba(0,0,0,0)'
    for (let index = 0; index < this.particles.length; index += stride) {
      const p = this.particles[index]
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  },

  drawFloatingTexts() {
    const profile = this.getActivePerformanceProfile()
    const stride = profile.effectRenderStride >= 3 && this.floatingTexts.length > 12 ? 2 : 1

    for (let index = 0; index < this.floatingTexts.length; index += stride) {
      const t = this.floatingTexts[index]
      const ctx = this.ctx
      ctx.save()
      ctx.globalAlpha = t.alpha
      ctx.fillStyle = t.color
      ctx.font = `${t.isBold ? 'bold ' : ''}${14 * (t.scale || 1)}px Arial`
      ctx.textAlign = 'center'
      ctx.shadowBlur = profile.effectRenderStride >= 3 ? 0 : 8
      ctx.shadowColor = t.color
      ctx.fillText(t.text, t.x, t.y)
      ctx.restore()
    }
  },
}
