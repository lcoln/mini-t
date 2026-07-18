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
  // 连续走路相位（比 0~3 的 animFrame 顺滑得多）
  getMonsterAnimPhase(monster) {
    if (Number.isFinite(monster.walkPhase)) return monster.walkPhase
    return (monster.animFrame || 0) * 0.85
  },

  getMonsterWalkMotion(monster, size) {
    const phase = this.getMonsterAnimPhase(monster)
    const slow = monster.slowTimer > 0 ? 0.6 : 1
    // 用单周期慢波，避免 sin(phase*2) 造成的鬼畜高频抖动
    const hop = (1 - Math.cos(phase)) * 0.5
    return {
      phase,
      bob: -hop * (monster.isBoss ? 1.1 : 1.4) * slow,
      squashX: 1 + hop * 0.03 * slow,
      squashY: 1 - hop * 0.025 * slow,
      lean: Math.sin(phase) * 0.35 * (monster.facing || 1) * slow,
      sway: Math.sin(phase * 0.5) * 0.25 * slow,
      shadowScale: 1.02 - hop * 0.06
    }
  },

  drawMonsters() {
    const profile = this.getActivePerformanceProfile()

    this.monsters.forEach(monster => {
      const ctx = this.ctx
      const config = MONSTER_TYPES[monster.type]
      const size = monster.isBoss ? 22 : 14
      // 仅在 intense 等档位精简；Boss 完整绘制已去掉 shadowBlur，不再强制 compact
      const useCompactMonster = monster.isBoss
        ? !!profile.simplifyBosses
        : !!profile.simplifyMonsters
      const motion = this.getMonsterWalkMotion(monster, size)

      // 硬重置，避免上一只怪泄漏的 shadow/alpha 污染本帧
      ctx.shadowBlur = 0
      ctx.shadowColor = 'rgba(0,0,0,0)'
      ctx.globalAlpha = 1

      // 脚下阴影（随步伐缩放，更有落地感）
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
      ctx.beginPath()
      const shadowW = size * 0.8 * motion.shadowScale
      const shadowH = size * 0.3 * motion.shadowScale
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(monster.x + motion.sway * 0.3, monster.y + size + 4, shadowW, shadowH, 0, 0, Math.PI * 2)
      } else {
        ctx.arc(monster.x, monster.y + size + 4, size * 0.55 * motion.shadowScale, 0, Math.PI * 2)
      }
      ctx.fill()

      // 以脚底为轴做弹跳缩放，走路不那么僵
      const footY = monster.y + size * 0.85
      ctx.save()
      ctx.translate(monster.x + motion.lean + motion.sway, footY + motion.bob)
      ctx.scale(motion.squashX, motion.squashY)
      ctx.translate(-(monster.x), -footY)

      if (useCompactMonster) {
        this.drawCompactMonster(ctx, monster, size, config)
      } else {
        // 状态光环
        if (monster.slowTimer > 0) {
          ctx.save()
          ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(monster.x, monster.y, size + 5, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }
        if (monster.vineTimer > 0) {
          // 藤蔓缠绕效果 - 绿色藤蔓环绕
          ctx.save()
          ctx.strokeStyle = 'rgba(100, 200, 100, 0.9)'
          ctx.lineWidth = 2
          // 绘制缠绕的藤蔓
          const time = Date.now()
          for (let i = 0; i < 3; i++) {
            const angle = (time * 0.003 + i * Math.PI * 2 / 3) % (Math.PI * 2)
            const waveOffset = Math.sin(time * 0.005 + i) * 2
            ctx.beginPath()
            ctx.arc(monster.x, monster.y, size + 3 + waveOffset, angle, angle + Math.PI * 0.6)
            ctx.stroke()
          }
          // 易伤标记
          ctx.fillStyle = '#ffff00'
          ctx.font = 'bold 10px Arial'
          ctx.textAlign = 'center'
          ctx.fillText('⬇️', monster.x, monster.y - size - 8)
          ctx.restore()
        }

        // 根据怪物类型绘制不同外观
        this.drawMonsterByType(ctx, monster, size)

        // 燃烧效果 - 绘制在怪物身上
        if (monster.burnTimer > 0) {
          this.drawBurningEffect(ctx, monster, size)
        }
      }
      ctx.restore()

      // 绘制后再次硬重置，防止 Boss/特效状态泄漏到后续塔/路径
      ctx.shadowBlur = 0
      ctx.shadowColor = 'rgba(0,0,0,0)'
      ctx.globalAlpha = 1

      // 血条背景
      const barWidth = monster.isBoss ? 55 : 35
      const barHeight = 7
      const barY = monster.y - size - 16
      const hpPercent = Math.max(0, monster.hp / monster.maxHp)

      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.beginPath()
      drawRoundRect(ctx, monster.x - barWidth / 2 - 2, barY - 2, barWidth + 4, barHeight + 4, 3)
      ctx.fill()

      // 血条
      const hpColor = hpPercent > 0.6 ? '#44ff44' : hpPercent > 0.3 ? '#ffaa00' : '#ff4444'
      ctx.fillStyle = hpColor
      ctx.beginPath()
      drawRoundRect(ctx, monster.x - barWidth / 2, barY, Math.max(1, barWidth * hpPercent), barHeight, 2)
      ctx.fill()

      // 血量百分比
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 9px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(`${Math.floor(hpPercent * 100)}%`, monster.x, barY + barHeight + 10)
    })
  },

  drawCompactMonster(ctx, monster, size, config) {
    ctx.save()

    let auraColor = ''
    if (monster.slowTimer > 0) {
      auraColor = 'rgba(100, 200, 255, 0.55)'
    } else if (monster.vineTimer > 0) {
      auraColor = 'rgba(100, 220, 100, 0.55)'
    } else if (monster.burnTimer > 0) {
      auraColor = 'rgba(255, 140, 60, 0.45)'
    }

    if (auraColor) {
      ctx.strokeStyle = auraColor
      ctx.lineWidth = monster.isBoss ? 3 : 2
      ctx.beginPath()
      ctx.arc(monster.x, monster.y, size + 4, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.fillStyle = config.bodyColor
    ctx.beginPath()
    ctx.arc(monster.x, monster.y, size, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = config.outlineColor
    ctx.lineWidth = monster.isBoss ? 2.5 : 1.5
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `${monster.isBoss ? '18px' : '14px'} Arial`
    ctx.fillText(config.emoji, monster.x, monster.y + 0.5)
    ctx.restore()
  },

  drawCompactTower(ctx, x, y, type, level, alpha = 1) {
    const config = TOWER_TYPES[type]

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.beginPath()
    ctx.ellipse(x, y + 12, 15, 5, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = config.color
    ctx.beginPath()
    ctx.arc(x, y, 13, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = '14px Arial'
    ctx.fillText(config.emoji, x, y)

    ctx.fillStyle = 'rgba(0, 0, 0, 0.82)'
    ctx.beginPath()
    drawRoundRect(ctx, x - 12, y + 10, 24, 12, 4)
    ctx.fill()

    ctx.fillStyle = '#ffd700'
    ctx.font = 'bold 9px Arial'
    ctx.fillText(`Lv.${level}`, x, y + 16)
    ctx.restore()
  },

  drawCompactProjectile(ctx, proj, level = 1) {
    const trailLimit = this.getProjectileTrailLimit()
    const visibleTrail = proj.trail.slice(Math.max(0, proj.trail.length - trailLimit))

    ctx.save()
    ctx.strokeStyle = proj.color
    ctx.fillStyle = proj.color
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = 0.92

    if (visibleTrail.length > 1) {
      ctx.beginPath()
      ctx.moveTo(visibleTrail[0].x, visibleTrail[0].y)
      for (let i = 1; i < visibleTrail.length; i++) {
        ctx.lineTo(visibleTrail[i].x, visibleTrail[i].y)
      }
      ctx.lineWidth = Math.max(1.6, proj.size * 0.4)
      ctx.strokeStyle = proj.color
      ctx.globalAlpha = 0.35
      ctx.stroke()
      ctx.globalAlpha = 0.92
    }

    if (proj.towerType === 'lightning') {
      ctx.strokeStyle = '#fff6a0'
      ctx.lineWidth = Math.max(2, 1.2 + level * 0.35)
      ctx.beginPath()
      ctx.moveTo(proj.x - Math.cos(proj.angle) * 7, proj.y - Math.sin(proj.angle) * 7)
      ctx.lineTo(proj.x, proj.y)
      ctx.stroke()
    } else if (proj.towerType === 'arcane') {
      ctx.beginPath()
      ctx.arc(proj.x, proj.y, Math.max(3.5, proj.size * 0.72), 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#f0d4ff'
      ctx.lineWidth = 1.2
      ctx.stroke()
    } else if (proj.towerType === 'nature') {
      ctx.beginPath()
      ctx.arc(proj.x, proj.y, Math.max(3.2, proj.size * 0.65), 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#d7ffb2'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(proj.x - 2, proj.y + 1)
      ctx.lineTo(proj.x, proj.y - 3)
      ctx.lineTo(proj.x + 2.4, proj.y + 1)
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.arc(proj.x, proj.y, Math.max(3, proj.size * 0.68), 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  },

  // 绘制燃烧效果 - 更逼真的火焰
  drawBurningEffect(ctx, monster, size) {
    ctx.save()

    const profile = this.getActivePerformanceProfile()
    const intensity = Math.min(1, monster.burnTimer / 120)
    const time = Date.now()

    if (monster.isBoss) {
      // Boss 出场时燃烧特效会形成满屏黄光叠加 + 巨量 Canvas 2D 调用导致卡顿发烫，
      // 此处直接跳过底盘光晕与外层光圈绘制，仅保留内部亮核（见下方共用的 fireFlame 逻辑）。
      ctx.globalAlpha = 1
      ctx.restore()
      return
    }

    const flameCount = 6
    // 1. 底部火焰光环
    const glowRadius = size * 1.5 + Math.sin(time * 0.008) * 5
    const glowGrad = ctx.createRadialGradient(monster.x, monster.y + size * 0.5, 0, monster.x, monster.y + size * 0.5, glowRadius)
    glowGrad.addColorStop(0, `rgba(255, 150, 50, ${0.4 * intensity})`)
    glowGrad.addColorStop(0.5, `rgba(255, 80, 0, ${0.2 * intensity})`)
    glowGrad.addColorStop(1, 'rgba(255, 50, 0, 0)')
    ctx.fillStyle = glowGrad
    ctx.beginPath()
    ctx.ellipse(monster.x, monster.y + size * 0.5, glowRadius, glowRadius * 0.6, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 2. 身体周围动态火焰
    for (let i = 0; i < flameCount; i++) {
      const baseAngle = (Math.PI * 2 / flameCount) * i
      const waveAngle = baseAngle + Math.sin(time * 0.006 + i * 0.8) * 0.3
      const dist = size * 0.7 + Math.sin(time * 0.01 + i * 1.5) * 4
      
      const fx = monster.x + Math.cos(waveAngle) * dist
      const fy = monster.y + Math.sin(waveAngle) * dist * 0.8 - Math.abs(Math.sin(time * 0.012 + i)) * 8
      
      // 火焰主体 - 多层渐变
      const flameHeight = 12 + Math.sin(time * 0.015 + i * 2) * 4
      const flameWidth = 6 + Math.sin(time * 0.02 + i) * 2
      
      // 外层光晕
      const outerGlow = ctx.createRadialGradient(fx, fy, 0, fx, fy, flameHeight)
      outerGlow.addColorStop(0, `rgba(255, 255, 150, ${0.9 * intensity})`)
      outerGlow.addColorStop(0.2, `rgba(255, 200, 50, ${0.7 * intensity})`)
      outerGlow.addColorStop(0.5, `rgba(255, 100, 0, ${0.5 * intensity})`)
      outerGlow.addColorStop(0.8, `rgba(200, 50, 0, ${0.3 * intensity})`)
      outerGlow.addColorStop(1, 'rgba(150, 0, 0, 0)')
      
      ctx.fillStyle = outerGlow
      ctx.beginPath()
      // 火焰形状 - 泪滴形
      ctx.moveTo(fx, fy - flameHeight)
      ctx.bezierCurveTo(fx - flameWidth, fy - flameHeight * 0.5, fx - flameWidth * 0.8, fy + flameHeight * 0.3, fx, fy + flameHeight * 0.2)
      ctx.bezierCurveTo(fx + flameWidth * 0.8, fy + flameHeight * 0.3, fx + flameWidth, fy - flameHeight * 0.5, fx, fy - flameHeight)
      ctx.fill()
      
      // 内部亮核
      ctx.fillStyle = `rgba(255, 255, 200, ${0.8 * intensity})`
      ctx.beginPath()
      ctx.ellipse(fx, fy, flameWidth * 0.3, flameHeight * 0.2, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // 3. 向上飘的火苗
    for (let i = 0; i < 5; i++) {
      const seed = i * 137.5 // 黄金角度
      const floatX = monster.x + Math.sin(seed + time * 0.003) * size * 0.8
      const floatPhase = (time * 0.005 + i * 0.7) % 1
      const floatY = monster.y - size * 0.3 - floatPhase * size * 1.5
      const floatSize = (1 - floatPhase) * (5 + Math.sin(time * 0.02 + i) * 2)
      
      if (floatSize > 0.5) {
        const floatAlpha = (1 - floatPhase) * intensity
        const floatGrad = ctx.createRadialGradient(floatX, floatY, 0, floatX, floatY, floatSize * 2)
        floatGrad.addColorStop(0, `rgba(255, 255, 100, ${floatAlpha})`)
        floatGrad.addColorStop(0.4, `rgba(255, 150, 0, ${floatAlpha * 0.7})`)
        floatGrad.addColorStop(1, 'rgba(255, 50, 0, 0)')
        ctx.fillStyle = floatGrad
        ctx.beginPath()
        ctx.arc(floatX, floatY, floatSize * 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    
    // 4. 火星粒子
    for (let i = 0; i < 4; i++) {
      const sparkSeed = i * 89
      const sparkPhase = (time * 0.008 + sparkSeed * 0.01) % 1
      const sparkAngle = sparkSeed + time * 0.002
      const sparkDist = sparkPhase * size * 2
      const sparkX = monster.x + Math.cos(sparkAngle) * sparkDist * 0.5
      const sparkY = monster.y - sparkPhase * size * 1.2 - Math.sin(sparkAngle) * sparkDist * 0.3
      const sparkSize = (1 - sparkPhase) * 2.5
      
      if (sparkSize > 0.3) {
        ctx.fillStyle = `rgba(255, 255, 150, ${(1 - sparkPhase) * intensity})`
        ctx.beginPath()
        ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    
    // 5. 整体光晕效果
    ctx.shadowBlur = 25 * intensity
    ctx.shadowColor = '#ff6600'
    ctx.strokeStyle = `rgba(255, 100, 0, ${0.4 * intensity})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(monster.x, monster.y, size + 5 + Math.sin(time * 0.01) * 3, 0, Math.PI * 2)
    ctx.stroke()
    
    ctx.restore()
  },

  drawMonsterByType(ctx, monster, size) {
    const config = MONSTER_TYPES[monster.type]
    const phase = this.getMonsterAnimPhase(monster)
    const bounce = Math.sin(phase) * 2
    
    switch (monster.type) {
      case 'slime':
        // 史莱姆 - 果冻质感，轻微弹软即可
        const slimeSquash = Math.sin(phase)
        const sw = size + slimeSquash * 1.2
        const sh = size - slimeSquash * 1.0
        
        // 身体 - 水滴形+渐变
        ctx.save()
        const slimeGrad = ctx.createRadialGradient(
          monster.x - 3, monster.y - 4, 0, 
          monster.x, monster.y, sw
        )
        slimeGrad.addColorStop(0, '#aaffaa')
        slimeGrad.addColorStop(0.4, '#55ee55')
        slimeGrad.addColorStop(0.7, '#33bb33')
        slimeGrad.addColorStop(1, '#228822')
        ctx.fillStyle = slimeGrad
        ctx.beginPath()
        // 水滴形底部更宽
        ctx.moveTo(monster.x, monster.y - sh)
        ctx.bezierCurveTo(
          monster.x + sw * 0.8, monster.y - sh * 0.7,
          monster.x + sw * 1.1, monster.y + sh * 0.2,
          monster.x + sw * 0.6, monster.y + sh * 0.7
        )
        ctx.quadraticCurveTo(monster.x, monster.y + sh + 2, monster.x - sw * 0.6, monster.y + sh * 0.7)
        ctx.bezierCurveTo(
          monster.x - sw * 1.1, monster.y + sh * 0.2,
          monster.x - sw * 0.8, monster.y - sh * 0.7,
          monster.x, monster.y - sh
        )
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = '#228822'
        ctx.lineWidth = 1.5
        ctx.stroke()
        
        // 内部气泡
        const bubbleT = Date.now() * 0.003
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
        ctx.beginPath()
        ctx.arc(monster.x + 3 + Math.sin(bubbleT) * 2, monster.y + 2, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(monster.x - 4 + Math.sin(bubbleT + 1) * 1.5, monster.y + 5, 2, 0, Math.PI * 2)
        ctx.fill()
        
        // 大高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
        ctx.beginPath()
        ctx.ellipse(monster.x - 4, monster.y - 5, 4.5, 3, -0.4, 0, Math.PI * 2)
        ctx.fill()
        // 小高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.beginPath()
        ctx.arc(monster.x - 3, monster.y - 6, 1.8, 0, Math.PI * 2)
        ctx.fill()
        
        // 眼睛 - 可爱的大眼
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.ellipse(monster.x - 4, monster.y - 2, 4.5, 5, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(monster.x + 4, monster.y - 2, 4.5, 5, 0, 0, Math.PI * 2)
        ctx.fill()
        // 瞳孔
        ctx.fillStyle = '#114411'
        ctx.beginPath()
        ctx.arc(monster.x - 3, monster.y - 1, 2.5, 0, Math.PI * 2)
        ctx.arc(monster.x + 5, monster.y - 1, 2.5, 0, Math.PI * 2)
        ctx.fill()
        // 眼睛高光
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(monster.x - 2, monster.y - 2.5, 1, 0, Math.PI * 2)
        ctx.arc(monster.x + 6, monster.y - 2.5, 1, 0, Math.PI * 2)
        ctx.fill()
        
        // 小嘴
        ctx.strokeStyle = '#226622'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.arc(monster.x + 0.5, monster.y + 4, 3, 0.1, Math.PI - 0.1)
        ctx.stroke()
        
        ctx.restore()
        break
      
      case 'bat':
        // 蝙蝠 - 飞行的小怪
        const batY = monster.y + Math.sin(phase) * 2.2
        const wingFlap = Math.sin(phase * 1.4) * 0.28
        ctx.fillStyle = config.bodyColor
        // 身体
        ctx.beginPath()
        ctx.ellipse(monster.x, batY, size * 0.6, size * 0.5, 0, 0, Math.PI * 2)
        ctx.fill()
        // 翅膀
        ctx.beginPath()
        ctx.moveTo(monster.x - size * 0.4, batY)
        ctx.quadraticCurveTo(monster.x - size * 1.2, batY - size * wingFlap, monster.x - size * 1.5, batY + size * 0.3)
        ctx.quadraticCurveTo(monster.x - size * 0.8, batY + size * 0.2, monster.x - size * 0.4, batY)
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(monster.x + size * 0.4, batY)
        ctx.quadraticCurveTo(monster.x + size * 1.2, batY - size * wingFlap, monster.x + size * 1.5, batY + size * 0.3)
        ctx.quadraticCurveTo(monster.x + size * 0.8, batY + size * 0.2, monster.x + size * 0.4, batY)
        ctx.fill()
        // 眼睛
        ctx.fillStyle = config.eyeColor
        ctx.beginPath()
        ctx.arc(monster.x - 3, batY - 2, 2, 0, Math.PI * 2)
        ctx.arc(monster.x + 3, batY - 2, 2, 0, Math.PI * 2)
        ctx.fill()
        // 耳朵
        ctx.fillStyle = config.bodyColor
        ctx.beginPath()
        ctx.moveTo(monster.x - 4, batY - size * 0.4)
        ctx.lineTo(monster.x - 6, batY - size * 0.9)
        ctx.lineTo(monster.x - 2, batY - size * 0.5)
        ctx.closePath()
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(monster.x + 4, batY - size * 0.4)
        ctx.lineTo(monster.x + 6, batY - size * 0.9)
        ctx.lineTo(monster.x + 2, batY - size * 0.5)
        ctx.closePath()
        ctx.fill()
        break
        
      case 'skeleton':
        // 骷髅 - 骨头形状
        ctx.fillStyle = config.bodyColor
        // 头
        ctx.beginPath()
        ctx.arc(monster.x, monster.y - 2, size * 0.8, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = config.outlineColor
        ctx.lineWidth = 2
        ctx.stroke()
        // 身体
        ctx.fillRect(monster.x - 4, monster.y + size * 0.5, 8, size * 0.8)
        // 眼眶
        ctx.fillStyle = '#000'
        ctx.beginPath()
        ctx.arc(monster.x - 4, monster.y - 4, 3, 0, Math.PI * 2)
        ctx.arc(monster.x + 4, monster.y - 4, 3, 0, Math.PI * 2)
        ctx.fill()
        // 红眼
        ctx.fillStyle = config.eyeColor
        ctx.beginPath()
        ctx.arc(monster.x - 4, monster.y - 4, 1.5, 0, Math.PI * 2)
        ctx.arc(monster.x + 4, monster.y - 4, 1.5, 0, Math.PI * 2)
        ctx.fill()
        // 鼻孔
        ctx.fillStyle = '#000'
        ctx.beginPath()
        ctx.arc(monster.x - 1, monster.y, 1, 0, Math.PI * 2)
        ctx.arc(monster.x + 1, monster.y, 1, 0, Math.PI * 2)
        ctx.fill()
        break
        
      case 'ghost':
        // 幽灵 - 半透明漂浮
        ctx.save()
        ctx.globalAlpha = 0.7 + Math.sin(phase * 0.9) * 0.2
        const ghostY = monster.y + Math.sin(phase * 1.1) * 3
        ctx.fillStyle = config.bodyColor
        ctx.beginPath()
        ctx.arc(monster.x, ghostY - 5, size, 0, Math.PI)
        // 波浪底部
        ctx.lineTo(monster.x + size, ghostY + 5)
        for (let i = 0; i < 4; i++) {
          const waveX = monster.x + size - (i + 1) * (size * 0.5)
          const waveY = ghostY + 5 + ((i % 2) * 6)
          ctx.quadraticCurveTo(waveX + size * 0.25, waveY + 3, waveX, waveY)
        }
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = config.outlineColor
        ctx.lineWidth = 2
        ctx.stroke()
        // 眼睛
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(monster.x - 5, ghostY - 6, 5, 0, Math.PI * 2)
        ctx.arc(monster.x + 5, ghostY - 6, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = config.eyeColor
        ctx.beginPath()
        ctx.arc(monster.x - 4, ghostY - 6, 2, 0, Math.PI * 2)
        ctx.arc(monster.x + 6, ghostY - 6, 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        break
      
      case 'orc':
        // 兽人 - 强壮的绿皮
        ctx.fillStyle = config.bodyColor
        // 身体
        ctx.beginPath()
        ctx.ellipse(monster.x, monster.y + 2, size * 0.9, size * 1.1, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = config.outlineColor
        ctx.lineWidth = 2
        ctx.stroke()
        // 头
        ctx.beginPath()
        ctx.arc(monster.x, monster.y - size * 0.5, size * 0.7, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        // 眼睛
        ctx.fillStyle = config.eyeColor
        ctx.beginPath()
        ctx.arc(monster.x - 4, monster.y - size * 0.5, 3, 0, Math.PI * 2)
        ctx.arc(monster.x + 4, monster.y - size * 0.5, 3, 0, Math.PI * 2)
        ctx.fill()
        // 獠牙
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.moveTo(monster.x - 5, monster.y - size * 0.2)
        ctx.lineTo(monster.x - 3, monster.y + 2)
        ctx.lineTo(monster.x - 7, monster.y - size * 0.1)
        ctx.closePath()
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(monster.x + 5, monster.y - size * 0.2)
        ctx.lineTo(monster.x + 3, monster.y + 2)
        ctx.lineTo(monster.x + 7, monster.y - size * 0.1)
        ctx.closePath()
        ctx.fill()
        break
        
      case 'golem':
        // 石魔 - 方块岩石
        ctx.fillStyle = config.bodyColor
        // 身体（方形）
        ctx.beginPath()
        drawRoundRect(ctx, monster.x - size, monster.y - size * 0.8, size * 2, size * 1.8, 4)
        ctx.fill()
        ctx.strokeStyle = config.outlineColor
        ctx.lineWidth = 3
        ctx.stroke()
        // 裂纹
        ctx.strokeStyle = '#555'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(monster.x - 6, monster.y - 8)
        ctx.lineTo(monster.x - 2, monster.y + 5)
        ctx.moveTo(monster.x + 4, monster.y - 5)
        ctx.lineTo(monster.x + 8, monster.y + 8)
        ctx.stroke()
        // 眼睛（发光）
        ctx.fillStyle = config.eyeColor
        ctx.shadowBlur = 10
        ctx.shadowColor = config.eyeColor
        ctx.beginPath()
        ctx.arc(monster.x - 6, monster.y - 3, 4, 0, Math.PI * 2)
        ctx.arc(monster.x + 6, monster.y - 3, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        break
      
      case 'demon':
        // 恶魔 - 红皮有角
        ctx.fillStyle = config.bodyColor
        // 身体
        ctx.beginPath()
        ctx.ellipse(monster.x, monster.y, size * 0.9, size, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = config.outlineColor
        ctx.lineWidth = 2
        ctx.stroke()
        // 角
        ctx.fillStyle = '#440000'
        ctx.beginPath()
        ctx.moveTo(monster.x - 8, monster.y - size * 0.6)
        ctx.lineTo(monster.x - 12, monster.y - size * 1.3)
        ctx.lineTo(monster.x - 4, monster.y - size * 0.5)
        ctx.closePath()
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(monster.x + 8, monster.y - size * 0.6)
        ctx.lineTo(monster.x + 12, monster.y - size * 1.3)
        ctx.lineTo(monster.x + 4, monster.y - size * 0.5)
        ctx.closePath()
        ctx.fill()
        // 眼睛
        ctx.fillStyle = config.eyeColor
        ctx.shadowBlur = 8
        ctx.shadowColor = config.eyeColor
        ctx.beginPath()
        ctx.arc(monster.x - 5, monster.y - 3, 3, 0, Math.PI * 2)
        ctx.arc(monster.x + 5, monster.y - 3, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        // 邪恶微笑
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(monster.x, monster.y + 3, 5, 0.2, Math.PI - 0.2)
        ctx.stroke()
        break
        
      case 'dragon':
        // 巨龙 - Boss
        const dragonSize = size * 1.2
        // 身体
        ctx.fillStyle = config.bodyColor
        ctx.beginPath()
        ctx.ellipse(monster.x, monster.y, dragonSize, dragonSize * 0.7, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = config.outlineColor
        ctx.lineWidth = 3
        ctx.stroke()
        // 翅膀
        ctx.fillStyle = '#cc3300'
        ctx.beginPath()
        ctx.moveTo(monster.x - dragonSize, monster.y - 5)
        ctx.lineTo(monster.x - dragonSize * 1.8, monster.y - dragonSize)
        ctx.lineTo(monster.x - dragonSize * 0.5, monster.y - 3)
        ctx.closePath()
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(monster.x + dragonSize, monster.y - 5)
        ctx.lineTo(monster.x + dragonSize * 1.8, monster.y - dragonSize)
        ctx.lineTo(monster.x + dragonSize * 0.5, monster.y - 3)
        ctx.closePath()
        ctx.fill()
        // 头
        ctx.fillStyle = config.bodyColor
        ctx.beginPath()
        ctx.ellipse(monster.x, monster.y - dragonSize * 0.3, dragonSize * 0.6, dragonSize * 0.5, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        // 角
        ctx.fillStyle = '#aa5500'
        ctx.beginPath()
        ctx.moveTo(monster.x - 8, monster.y - dragonSize * 0.6)
        ctx.lineTo(monster.x - 12, monster.y - dragonSize * 1.1)
        ctx.lineTo(monster.x - 4, monster.y - dragonSize * 0.5)
        ctx.closePath()
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(monster.x + 8, monster.y - dragonSize * 0.6)
        ctx.lineTo(monster.x + 12, monster.y - dragonSize * 1.1)
        ctx.lineTo(monster.x + 4, monster.y - dragonSize * 0.5)
        ctx.closePath()
        ctx.fill()
        // 眼睛（禁用 shadowBlur：真机上 #ffff00 光晕会扩散成满屏黄光）
        ctx.fillStyle = config.eyeColor
        ctx.beginPath()
        ctx.arc(monster.x - 7, monster.y - dragonSize * 0.35, 4, 0, Math.PI * 2)
        ctx.arc(monster.x + 7, monster.y - dragonSize * 0.35, 4, 0, Math.PI * 2)
        ctx.fill()
        // 鼻孔喷火
        if (Math.sin(phase * 2) > 0) {
          ctx.fillStyle = '#ff6600'
          ctx.beginPath()
          ctx.moveTo(monster.x - 3, monster.y - dragonSize * 0.1)
          ctx.lineTo(monster.x, monster.y + 5)
          ctx.lineTo(monster.x + 3, monster.y - dragonSize * 0.1)
          ctx.closePath()
          ctx.fill()
        }
        break
      
      case 'treant':
        // 树人王 - Boss
        const treantSize = size * 1.2
        // 树干身体
        ctx.fillStyle = '#5a3520'
        ctx.beginPath()
        ctx.moveTo(monster.x - treantSize * 0.5, monster.y + treantSize)
        ctx.lineTo(monster.x - treantSize * 0.6, monster.y - treantSize * 0.1)
        ctx.quadraticCurveTo(monster.x - treantSize * 0.7, monster.y - treantSize * 0.5, monster.x - treantSize * 0.3, monster.y - treantSize * 0.6)
        ctx.lineTo(monster.x + treantSize * 0.3, monster.y - treantSize * 0.6)
        ctx.quadraticCurveTo(monster.x + treantSize * 0.7, monster.y - treantSize * 0.5, monster.x + treantSize * 0.6, monster.y - treantSize * 0.1)
        ctx.lineTo(monster.x + treantSize * 0.5, monster.y + treantSize)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = config.outlineColor
        ctx.lineWidth = 2.5
        ctx.stroke()
        // 树纹理
        ctx.strokeStyle = '#3a2010'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(monster.x - 3, monster.y - treantSize * 0.3)
        ctx.lineTo(monster.x - 5, monster.y + treantSize * 0.5)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(monster.x + 4, monster.y - treantSize * 0.2)
        ctx.lineTo(monster.x + 2, monster.y + treantSize * 0.6)
        ctx.stroke()
        // 树冠
        const leafSway = Math.sin(phase * 0.9) * 2
        ctx.fillStyle = config.bodyColor
        ctx.beginPath()
        ctx.arc(monster.x + leafSway, monster.y - treantSize * 0.7, treantSize * 0.8, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#4a8822'
        ctx.beginPath()
        ctx.arc(monster.x - treantSize * 0.4 + leafSway, monster.y - treantSize * 0.5, treantSize * 0.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(monster.x + treantSize * 0.4 + leafSway, monster.y - treantSize * 0.5, treantSize * 0.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = config.outlineColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(monster.x + leafSway, monster.y - treantSize * 0.7, treantSize * 0.8, 0, Math.PI * 2)
        ctx.stroke()
        // 眼睛 - 在树干上（禁用 shadowBlur，避免真机满屏染色）
        ctx.fillStyle = config.eyeColor
        ctx.beginPath()
        ctx.arc(monster.x - 7, monster.y - treantSize * 0.15, 4, 0, Math.PI * 2)
        ctx.arc(monster.x + 7, monster.y - treantSize * 0.15, 4, 0, Math.PI * 2)
        ctx.fill()
        // 瞳孔
        ctx.fillStyle = '#114400'
        ctx.beginPath()
        ctx.arc(monster.x - 6, monster.y - treantSize * 0.15, 2, 0, Math.PI * 2)
        ctx.arc(monster.x + 8, monster.y - treantSize * 0.15, 2, 0, Math.PI * 2)
        ctx.fill()
        // 树枝手臂
        ctx.strokeStyle = '#5a3520'
        ctx.lineWidth = 3
        const armSway = Math.sin(phase * 1.1) * 0.15
        ctx.beginPath()
        ctx.moveTo(monster.x - treantSize * 0.6, monster.y)
        ctx.quadraticCurveTo(monster.x - treantSize * 1.2, monster.y - treantSize * 0.3 + armSway * 20, monster.x - treantSize * 1.0, monster.y + treantSize * 0.2)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(monster.x + treantSize * 0.6, monster.y)
        ctx.quadraticCurveTo(monster.x + treantSize * 1.2, monster.y - treantSize * 0.3 - armSway * 20, monster.x + treantSize * 1.0, monster.y + treantSize * 0.2)
        ctx.stroke()
        // 根部
        ctx.strokeStyle = '#4a2a15'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(monster.x - treantSize * 0.4, monster.y + treantSize)
        ctx.quadraticCurveTo(monster.x - treantSize * 0.7, monster.y + treantSize * 1.2, monster.x - treantSize * 0.9, monster.y + treantSize * 1.0)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(monster.x + treantSize * 0.4, monster.y + treantSize)
        ctx.quadraticCurveTo(monster.x + treantSize * 0.7, monster.y + treantSize * 1.2, monster.x + treantSize * 0.9, monster.y + treantSize * 1.0)
        ctx.stroke()
        break
        
      case 'lich':
        // 巫妖 - Boss（去掉径向渐变光环，降低真机 Canvas 压力）
        const lichSize = size * 1.15
        // 飘动的斗篷身体
        const lichFloat = Math.sin(phase * 1.1) * 3
        ctx.fillStyle = config.bodyColor
        ctx.beginPath()
        ctx.moveTo(monster.x - lichSize * 0.6, monster.y - lichSize * 0.3 + lichFloat)
        ctx.quadraticCurveTo(monster.x - lichSize * 0.8, monster.y + lichSize * 0.6, monster.x - lichSize * 0.5, monster.y + lichSize + lichFloat)
        // 底部波浪
        ctx.quadraticCurveTo(monster.x - lichSize * 0.2, monster.y + lichSize * 1.2 + lichFloat, monster.x, monster.y + lichSize * 0.9 + lichFloat)
        ctx.quadraticCurveTo(monster.x + lichSize * 0.2, monster.y + lichSize * 1.2 + lichFloat, monster.x + lichSize * 0.5, monster.y + lichSize + lichFloat)
        ctx.quadraticCurveTo(monster.x + lichSize * 0.8, monster.y + lichSize * 0.6, monster.x + lichSize * 0.6, monster.y - lichSize * 0.3 + lichFloat)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = config.outlineColor
        ctx.lineWidth = 2
        ctx.stroke()
        // 头部 - 骷髅形
        ctx.fillStyle = '#ccbbdd'
        ctx.beginPath()
        ctx.arc(monster.x, monster.y - lichSize * 0.4 + lichFloat, lichSize * 0.55, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = config.outlineColor
        ctx.lineWidth = 2
        ctx.stroke()
        // 兜帽
        ctx.fillStyle = '#3a1166'
        ctx.beginPath()
        ctx.moveTo(monster.x - lichSize * 0.65, monster.y - lichSize * 0.2 + lichFloat)
        ctx.quadraticCurveTo(monster.x, monster.y - lichSize * 1.4 + lichFloat, monster.x + lichSize * 0.65, monster.y - lichSize * 0.2 + lichFloat)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = config.outlineColor
        ctx.lineWidth = 1.5
        ctx.stroke()
        // 眼睛（禁用 shadowBlur，避免真机满屏染色）
        ctx.fillStyle = config.eyeColor
        ctx.beginPath()
        ctx.arc(monster.x - 6, monster.y - lichSize * 0.45 + lichFloat, 4, 0, Math.PI * 2)
        ctx.arc(monster.x + 6, monster.y - lichSize * 0.45 + lichFloat, 4, 0, Math.PI * 2)
        ctx.fill()
        // 眼内瞳
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(monster.x - 5, monster.y - lichSize * 0.47 + lichFloat, 1.5, 0, Math.PI * 2)
        ctx.arc(monster.x + 7, monster.y - lichSize * 0.47 + lichFloat, 1.5, 0, Math.PI * 2)
        ctx.fill()
        // 法杖
        ctx.strokeStyle = '#6644aa'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(monster.x + lichSize * 0.7, monster.y - lichSize * 0.5 + lichFloat)
        ctx.lineTo(monster.x + lichSize * 0.5, monster.y + lichSize * 0.9 + lichFloat)
        ctx.stroke()
        // 法杖顶端宝珠
        ctx.fillStyle = '#aa66ff'
        ctx.beginPath()
        ctx.arc(monster.x + lichSize * 0.7, monster.y - lichSize * 0.55 + lichFloat, 5, 0, Math.PI * 2)
        ctx.fill()
        // 漂浮的灵魂粒子
        const soulT = Date.now() * 0.002
        for (let i = 0; i < 3; i++) {
          const sAngle = soulT + i * Math.PI * 2 / 3
          const sx = monster.x + Math.cos(sAngle) * lichSize * 1.0
          const sy = monster.y + Math.sin(sAngle) * lichSize * 0.6 + lichFloat
          ctx.globalAlpha = 0.4 + Math.sin(soulT + i) * 0.2
          ctx.fillStyle = '#bb88ff'
          ctx.beginPath()
          ctx.arc(sx, sy, 3, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
        break
        
      case 'phoenix':
        // 凤凰 - Boss（去掉径向渐变光环：真机易整屏染黄/橙并卡顿）
        const phSize = size * 1.2
        // 身体
        ctx.fillStyle = config.bodyColor
        ctx.beginPath()
        ctx.ellipse(monster.x, monster.y, phSize * 0.7, phSize * 0.55, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = config.outlineColor
        ctx.lineWidth = 2.5
        ctx.stroke()
        // 翅膀 - 火焰状展开
        const wingFlap2 = Math.sin(phase * 1.3) * 0.3
        ctx.fillStyle = '#ffaa00'
        // 左翅
        ctx.beginPath()
        ctx.moveTo(monster.x - phSize * 0.5, monster.y)
        ctx.quadraticCurveTo(monster.x - phSize * 1.5, monster.y - phSize * (0.8 + wingFlap2), monster.x - phSize * 1.8, monster.y - phSize * 0.2)
        ctx.quadraticCurveTo(monster.x - phSize * 1.6, monster.y - phSize * (1.0 + wingFlap2), monster.x - phSize * 1.2, monster.y + phSize * 0.1)
        ctx.quadraticCurveTo(monster.x - phSize * 0.9, monster.y + phSize * 0.3, monster.x - phSize * 0.4, monster.y + phSize * 0.2)
        ctx.closePath()
        ctx.fill()
        // 右翅
        ctx.beginPath()
        ctx.moveTo(monster.x + phSize * 0.5, monster.y)
        ctx.quadraticCurveTo(monster.x + phSize * 1.5, monster.y - phSize * (0.8 + wingFlap2), monster.x + phSize * 1.8, monster.y - phSize * 0.2)
        ctx.quadraticCurveTo(monster.x + phSize * 1.6, monster.y - phSize * (1.0 + wingFlap2), monster.x + phSize * 1.2, monster.y + phSize * 0.1)
        ctx.quadraticCurveTo(monster.x + phSize * 0.9, monster.y + phSize * 0.3, monster.x + phSize * 0.4, monster.y + phSize * 0.2)
        ctx.closePath()
        ctx.fill()
        // 翅膀火焰尖端
        ctx.fillStyle = '#ff4400'
        ctx.beginPath()
        ctx.moveTo(monster.x - phSize * 1.6, monster.y - phSize * 0.1)
        ctx.lineTo(monster.x - phSize * 2.0, monster.y - phSize * (0.5 + wingFlap2 * 0.5))
        ctx.lineTo(monster.x - phSize * 1.4, monster.y - phSize * 0.3)
        ctx.closePath()
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(monster.x + phSize * 1.6, monster.y - phSize * 0.1)
        ctx.lineTo(monster.x + phSize * 2.0, monster.y - phSize * (0.5 + wingFlap2 * 0.5))
        ctx.lineTo(monster.x + phSize * 1.4, monster.y - phSize * 0.3)
        ctx.closePath()
        ctx.fill()
        // 头部
        ctx.fillStyle = config.bodyColor
        ctx.beginPath()
        ctx.arc(monster.x, monster.y - phSize * 0.45, phSize * 0.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = config.outlineColor
        ctx.lineWidth = 2
        ctx.stroke()
        // 头冠火焰
        ctx.fillStyle = '#ffcc00'
        ctx.beginPath()
        ctx.moveTo(monster.x - 5, monster.y - phSize * 0.7)
        ctx.lineTo(monster.x - 3, monster.y - phSize * 1.1)
        ctx.lineTo(monster.x, monster.y - phSize * 0.75)
        ctx.lineTo(monster.x + 3, monster.y - phSize * 1.2)
        ctx.lineTo(monster.x + 5, monster.y - phSize * 0.7)
        ctx.closePath()
        ctx.fill()
        // 眼睛（禁用 shadowBlur）
        ctx.fillStyle = config.eyeColor
        ctx.beginPath()
        ctx.arc(monster.x - 5, monster.y - phSize * 0.5, 3.5, 0, Math.PI * 2)
        ctx.arc(monster.x + 5, monster.y - phSize * 0.5, 3.5, 0, Math.PI * 2)
        ctx.fill()
        // 喙
        ctx.fillStyle = '#cc6600'
        ctx.beginPath()
        ctx.moveTo(monster.x - 2, monster.y - phSize * 0.35)
        ctx.lineTo(monster.x, monster.y - phSize * 0.2)
        ctx.lineTo(monster.x + 2, monster.y - phSize * 0.35)
        ctx.closePath()
        ctx.fill()
        // 尾巴火焰
        const tailWave = Math.sin(phase) * 3
        ctx.fillStyle = '#ff6600'
        ctx.beginPath()
        ctx.moveTo(monster.x, monster.y + phSize * 0.4)
        ctx.quadraticCurveTo(monster.x + tailWave, monster.y + phSize * 1.2, monster.x - 5 + tailWave, monster.y + phSize * 1.6)
        ctx.quadraticCurveTo(monster.x + tailWave * 0.5, monster.y + phSize * 1.0, monster.x + 5 + tailWave, monster.y + phSize * 1.5)
        ctx.quadraticCurveTo(monster.x - tailWave * 0.5, monster.y + phSize * 0.8, monster.x, monster.y + phSize * 0.4)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#ffcc00'
        ctx.beginPath()
        ctx.moveTo(monster.x, monster.y + phSize * 0.45)
        ctx.quadraticCurveTo(monster.x + tailWave * 0.5, monster.y + phSize * 0.9, monster.x + tailWave, monster.y + phSize * 1.2)
        ctx.quadraticCurveTo(monster.x, monster.y + phSize * 0.7, monster.x, monster.y + phSize * 0.45)
        ctx.closePath()
        ctx.fill()
        break
      
      default:
        // 默认绘制 - 圆形
        ctx.fillStyle = config.bodyColor || '#888'
        ctx.beginPath()
        ctx.arc(monster.x, monster.y, size, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = config.outlineColor || '#444'
        ctx.lineWidth = 2
        ctx.stroke()
        break
    }
  },
}
