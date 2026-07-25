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
    const monsterCount = this.monsters.length
    // 怪物造型始终完整；怪潮时仅省略阴影、位移动画和复杂状态装饰。
    const crowded = monsterCount >= 18
    const intense = monsterCount >= 32 || profile.effectRenderStride >= 4
    const now = Date.now()

    this.monsters.forEach(monster => {
      const ctx = this.ctx
      const size = monster.isBoss ? 22 : 14
      const detailed = !crowded || monster.isBoss
      const motion = detailed
        ? this.getMonsterWalkMotion(monster, size)
        : { bob: 0, squashX: 1, squashY: 1, lean: 0, sway: 0, shadowScale: 1 }

      // 硬重置，避免上一只怪泄漏的 shadow/alpha 污染本帧
      ctx.shadowBlur = 0
      ctx.shadowColor = 'rgba(0,0,0,0)'
      ctx.globalAlpha = 1

      // 怪潮时省略每只怪的阴影，减少额外路径和填充
      if (!crowded || monster.isBoss) {
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
      }

      // 以脚底为轴做弹跳缩放，走路不那么僵
      const footY = monster.y + size * 0.85
      ctx.save()
      if (detailed) {
        ctx.translate(monster.x + motion.lean + motion.sway, footY + motion.bob)
        ctx.scale(motion.squashX, motion.squashY)
        ctx.translate(-(monster.x), -footY)
      }

      // 状态光环
      if (monster.slowTimer > 0) {
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)'
        ctx.lineWidth = detailed ? 3 : 2
        ctx.beginPath()
        ctx.arc(monster.x, monster.y, size + 5, 0, Math.PI * 2)
        ctx.stroke()
      }
      if (monster.vineTimer > 0) {
        // 藤蔓缠绕效果 - 绿色藤蔓环绕
        ctx.strokeStyle = 'rgba(100, 200, 100, 0.9)'
        ctx.lineWidth = 2
        const time = now
        const vineArcCount = detailed ? 3 : 1
        for (let i = 0; i < vineArcCount; i++) {
          const angle = (time * 0.003 + i * Math.PI * 2 / 3) % (Math.PI * 2)
          const waveOffset = Math.sin(time * 0.005 + i) * 2
          ctx.beginPath()
          ctx.arc(monster.x, monster.y, size + 3 + waveOffset, angle, angle + Math.PI * 0.6)
          ctx.stroke()
        }
        if (detailed) {
          ctx.fillStyle = '#ffff00'
          ctx.font = 'bold 10px Arial'
          ctx.textAlign = 'center'
          ctx.fillText('⬇️', monster.x, monster.y - size - 8)
        }
      }

      this.drawMonsterByType(ctx, monster, size)

      if (monster.burnTimer > 0 && detailed) {
        this.drawBurningEffect(ctx, monster, size)
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
      if (crowded && !monster.isBoss) {
        ctx.fillRect(monster.x - barWidth / 2, barY, barWidth, 4)
      } else {
        ctx.beginPath()
        drawRoundRect(ctx, monster.x - barWidth / 2 - 2, barY - 2, barWidth + 4, barHeight + 4, 3)
        ctx.fill()
      }

      // 血条
      const hpColor = hpPercent > 0.6 ? '#44ff44' : hpPercent > 0.3 ? '#ffaa00' : '#ff4444'
      ctx.fillStyle = hpColor
      if (crowded && !monster.isBoss) {
        ctx.fillRect(monster.x - barWidth / 2, barY, Math.max(1, barWidth * hpPercent), 4)
      } else {
        ctx.beginPath()
        drawRoundRect(ctx, monster.x - barWidth / 2, barY, Math.max(1, barWidth * hpPercent), barHeight, 2)
        ctx.fill()
      }

      // 血量百分比
      if (!intense || monster.isBoss) {
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 9px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(`${Math.floor(hpPercent * 100)}%`, monster.x, barY + barHeight + 10)
      }
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

    this.drawCompactMonsterSilhouette(ctx, monster, size, config)
    ctx.restore()
  },

  drawCompactMonsterSilhouette(ctx, monster, size, config) {
    const x = monster.x
    const y = monster.y
    const type = monster.type
    const flying = ['bat', 'harpy', 'phoenix', 'dragon'].includes(type)
    const crawler = ['scarab', 'spider'].includes(type)
    const beast = ['direwolf', 'mammoth'].includes(type)
    const spectral = ['ghost', 'wraith', 'voidling', 'elemental'].includes(type)
    const armored = ['golem', 'troll', 'darkKnight', 'colossus', 'treant'].includes(type)

    ctx.fillStyle = config.bodyColor
    ctx.strokeStyle = config.outlineColor
    ctx.lineWidth = monster.isBoss ? 2.5 : 1.5
    ctx.beginPath()
    if (flying) {
      ctx.moveTo(x, y - size * 0.55)
      ctx.lineTo(x - size * 1.15, y - size * 0.15)
      ctx.lineTo(x - size * 0.65, y + size * 0.55)
      ctx.lineTo(x, y + size * 0.25)
      ctx.lineTo(x + size * 0.65, y + size * 0.55)
      ctx.lineTo(x + size * 1.15, y - size * 0.15)
    } else if (crawler) {
      ctx.ellipse(x, y, size * 0.82, size * 0.62, 0, 0, Math.PI * 2)
    } else if (beast) {
      ctx.ellipse(x - size * 0.1, y + size * 0.08, size, size * 0.62, 0, 0, Math.PI * 2)
    } else if (spectral) {
      ctx.moveTo(x, y - size)
      ctx.quadraticCurveTo(x + size, y - size * 0.45, x + size * 0.72, y + size * 0.55)
      ctx.lineTo(x + size * 0.25, y + size)
      ctx.lineTo(x, y + size * 0.58)
      ctx.lineTo(x - size * 0.28, y + size)
      ctx.lineTo(x - size * 0.72, y + size * 0.55)
      ctx.quadraticCurveTo(x - size, y - size * 0.45, x, y - size)
    } else if (armored) {
      ctx.moveTo(x - size * 0.72, y - size * 0.72)
      ctx.lineTo(x + size * 0.72, y - size * 0.72)
      ctx.lineTo(x + size, y + size * 0.72)
      ctx.lineTo(x, y + size)
      ctx.lineTo(x - size, y + size * 0.72)
    } else {
      ctx.ellipse(x, y, size * 0.78, size, 0, 0, Math.PI * 2)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // 只保留两眼/核心，不再贴 Emoji；两三笔即可维持性能和类型辨识度。
    ctx.fillStyle = config.eyeColor || '#fff'
    if (spectral || type === 'elemental') {
      ctx.beginPath()
      ctx.ellipse(x, y - size * 0.12, size * 0.3, size * 0.18, 0, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.arc(x - size * 0.25, y - size * 0.18, Math.max(1.3, size * 0.1), 0, Math.PI * 2)
      ctx.arc(x + size * 0.25, y - size * 0.18, Math.max(1.3, size * 0.1), 0, Math.PI * 2)
      ctx.fill()
    }

    if (crawler) {
      ctx.strokeStyle = config.outlineColor
      ctx.lineWidth = 1.2
      for (let side = -1; side <= 1; side += 2) {
        for (let leg = -1; leg <= 1; leg++) {
          ctx.beginPath()
          ctx.moveTo(x + side * size * 0.55, y + leg * size * 0.25)
          ctx.lineTo(x + side * size * 1.1, y + leg * size * 0.55)
          ctx.stroke()
        }
      }
    }
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

    const lv = Math.max(1, level || 1)
    const r = 11 + Math.min(3, lv * 0.35)
    ctx.fillStyle = config.color
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.68)'
    ctx.lineWidth = 1.5

    if (type === 'fire') {
      // 胃壁细胞：梨形胞体 + 中央核 + 胞内小管
      ctx.beginPath()
      ctx.moveTo(x, y - r - 2)
      ctx.bezierCurveTo(x + r, y - r * 0.55, x + r, y + r * 0.5, x + r * 0.58, y + r)
      ctx.lineTo(x - r * 0.58, y + r)
      ctx.bezierCurveTo(x - r, y + r * 0.5, x - r, y - r * 0.55, x, y - r - 2)
      ctx.fill()
      ctx.stroke()
      ctx.strokeStyle = '#fff0df'
      for (let i = 0; i < Math.min(5, 2 + Math.floor(lv / 2)); i++) {
        const a = (Math.PI * 2 * i) / Math.min(5, 2 + Math.floor(lv / 2))
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.68)
        ctx.stroke()
      }
      ctx.fillStyle = '#9d4f68'
      ctx.beginPath()
      ctx.arc(x, y + 2, 3.5, 0, Math.PI * 2)
      ctx.fill()
    } else if (type === 'ice') {
      // 嗜中性粒细胞：圆形胞体 + 分叶核
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      const lobes = Math.min(5, 2 + Math.floor((lv - 1) / 2))
      ctx.fillStyle = '#70548c'
      for (let i = 0; i < lobes; i++) {
        const a = (Math.PI * 2 * i) / lobes
        ctx.beginPath()
        ctx.ellipse(x + Math.cos(a) * 3.5, y + Math.sin(a) * 3, 3.5, 2.7, a, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (type === 'nature') {
      // 乳酸杆菌群：随等级由双杆增殖为短链
      const rods = Math.min(5, 2 + Math.floor(lv / 2))
      for (let i = 0; i < rods; i++) {
        const ox = (i - (rods - 1) / 2) * 5
        ctx.save()
        ctx.translate(x + ox, y)
        ctx.rotate(-0.2 + i * 0.1)
        ctx.fillStyle = config.color
        ctx.strokeStyle = '#ddffc9'
        ctx.beginPath()
        ctx.ellipse(0, 0, 3.6, 10.5, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        if (lv >= 4) {
          ctx.beginPath()
          ctx.moveTo(-3, 0)
          ctx.lineTo(3, 0)
          ctx.stroke()
        }
        ctx.restore()
      }
    } else if (type === 'arcane') {
      // 腺泡细胞：围绕中央腺腔的放射状细胞
      const cells = Math.min(7, 4 + Math.floor(lv / 2))
      for (let i = 0; i < cells; i++) {
        const a = (Math.PI * 2 * i) / cells
        ctx.fillStyle = i % 2 ? '#b777db' : config.color
        ctx.beginPath()
        ctx.ellipse(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 6.5, 4.2, a, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
      ctx.fillStyle = '#fff1f8'
      ctx.beginPath()
      ctx.arc(x, y, 2.8, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // 树突细胞：成熟时增加并分叉突起
      const branches = Math.min(10, 5 + Math.floor(lv / 2))
      ctx.strokeStyle = config.color
      ctx.lineWidth = 2
      for (let i = 0; i < branches; i++) {
        const a = (Math.PI * 2 * i) / branches
        const ex = x + Math.cos(a) * (r + 5)
        const ey = y + Math.sin(a) * (r + 5)
        ctx.beginPath()
        ctx.moveTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5)
        ctx.lineTo(ex, ey)
        if (lv >= 4) {
          ctx.moveTo(ex - Math.cos(a) * 4, ey - Math.sin(a) * 4)
          ctx.lineTo(ex + Math.cos(a + 0.65) * 4, ey + Math.sin(a + 0.65) * 4)
        }
        ctx.stroke()
      }
      ctx.fillStyle = config.color
      ctx.strokeStyle = 'rgba(255,255,255,0.68)'
      ctx.beginPath()
      ctx.arc(x, y, r * 0.72, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#8f7937'
      ctx.beginPath()
      ctx.arc(x, y, 3.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // 高等级在简化模式仍保留明显的成熟标记
    if (lv >= 6) {
      ctx.strokeStyle = lv >= 9 ? '#ffe8a0' : 'rgba(255,255,255,0.45)'
      ctx.lineWidth = lv >= 9 ? 1.8 : 1
      ctx.beginPath()
      ctx.arc(x, y, r + 6, 0, Math.PI * 2)
      ctx.stroke()
    }

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

  drawExpandedMonster(ctx, monster, size, config) {
    const x = monster.x
    const y = monster.y
    const body = config.bodyColor || '#777'
    const outline = config.outlineColor || '#333'
    const eye = config.eyeColor || '#fff'
    const phase = this.getMonsterAnimPhase(monster)
    const step = Math.sin(phase) * 2
    const ellipse = (cx, cy, rx, ry, color = body) => {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = outline
      ctx.stroke()
    }
    const eyePair = (cx, cy, gap = 4, radius = 1.8) => {
      ctx.fillStyle = eye
      ctx.beginPath()
      ctx.arc(cx - gap, cy, radius, 0, Math.PI * 2)
      ctx.arc(cx + gap, cy, radius, 0, Math.PI * 2)
      ctx.fill()
    }
    const strokeLine = (points, color = outline, width = 2) => {
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.beginPath()
      points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point[0], point[1])
        else ctx.lineTo(point[0], point[1])
      })
      ctx.stroke()
    }

    ctx.save()
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    switch (monster.type) {
      case 'scarab': {
        for (let side = -1; side <= 1; side += 2) {
          for (let leg = -1; leg <= 1; leg++) {
            strokeLine([
              [x + side * 7, y + leg * 4],
              [x + side * 14, y + leg * 8],
              [x + side * 17, y + leg * 6]
            ], outline, 2)
          }
        }
        ellipse(x, y + 1, 10, 12)
        ctx.strokeStyle = '#d6b24b'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(x, y - 10)
        ctx.lineTo(x, y + 11)
        ctx.stroke()
        ellipse(x, y - 10, 7, 5, outline)
        eyePair(x, y - 11, 2.5, 1.2)
        strokeLine([[x - 3, y - 14], [x - 7, y - 19]], outline, 1.5)
        strokeLine([[x + 3, y - 14], [x + 7, y - 19]], outline, 1.5)
        break
      }
      case 'direwolf': {
        ctx.fillStyle = body
        ctx.beginPath()
        ctx.moveTo(x - 10, y + 3)
        ctx.lineTo(x - 18, y - 5 + step)
        ctx.lineTo(x - 15, y + 7)
        ctx.closePath()
        ctx.fill()
        ellipse(x - 2, y + 3, 12, 7)
        ctx.fillStyle = body
        ctx.fillRect(x - 9, y + 6, 4, 9 + step)
        ctx.fillRect(x + 4, y + 6, 4, 9 - step)
        ctx.beginPath()
        ctx.moveTo(x + 6, y)
        ctx.lineTo(x + 12, y - 9)
        ctx.lineTo(x + 16, y - 2)
        ctx.lineTo(x + 14, y + 6)
        ctx.lineTo(x + 7, y + 5)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = outline
        ctx.stroke()
        ctx.fillStyle = body
        ctx.beginPath()
        ctx.moveTo(x + 9, y - 7)
        ctx.lineTo(x + 9, y - 15)
        ctx.lineTo(x + 13, y - 9)
        ctx.lineTo(x + 16, y - 14)
        ctx.lineTo(x + 16, y - 6)
        ctx.fill()
        eyePair(x + 12, y - 5, 2.2, 1.3)
        break
      }
      case 'shaman': {
        ctx.fillStyle = body
        ctx.beginPath()
        ctx.moveTo(x, y - 13)
        ctx.quadraticCurveTo(x + 10, y - 8, x + 11, y + 13)
        ctx.lineTo(x - 11, y + 13)
        ctx.quadraticCurveTo(x - 10, y - 8, x, y - 13)
        ctx.fill()
        ctx.strokeStyle = outline
        ctx.stroke()
        ellipse(x, y - 8, 7, 7, '#263c2d')
        eyePair(x, y - 8, 2.5, 1.2)
        strokeLine([[x + 12, y + 13], [x + 16, y - 14]], '#6b4824', 2.5)
        ellipse(x + 16, y - 16, 3.5, 3.5, '#9cff6a')
        ctx.strokeStyle = '#8fd46a'
        ctx.beginPath()
        ctx.arc(x, y + 3, 5, 0.2, Math.PI - 0.2)
        ctx.stroke()
        break
      }
      case 'darkKnight': {
        ctx.fillStyle = '#262b37'
        ctx.fillRect(x - 8, y + 5, 6, 10 + step)
        ctx.fillRect(x + 2, y + 5, 6, 10 - step)
        ctx.fillStyle = body
        ctx.beginPath()
        ctx.moveTo(x - 10, y - 7)
        ctx.lineTo(x + 10, y - 7)
        ctx.lineTo(x + 12, y + 8)
        ctx.lineTo(x, y + 12)
        ctx.lineTo(x - 12, y + 8)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = outline
        ctx.stroke()
        ctx.fillStyle = '#242936'
        ctx.beginPath()
        ctx.arc(x, y - 9, 8, Math.PI, 0)
        ctx.lineTo(x + 8, y - 2)
        ctx.lineTo(x - 8, y - 2)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        strokeLine([[x - 6, y - 7], [x + 6, y - 7]], '#aeb7c6', 2)
        eyePair(x, y - 6.5, 3.2, 1.1)
        ctx.fillStyle = '#596276'
        ctx.beginPath()
        ctx.arc(x - 13, y + 2, 7, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#bbc3d0'
        ctx.stroke()
        break
      }
      case 'spider': {
        for (let side = -1; side <= 1; side += 2) {
          for (let leg = 0; leg < 4; leg++) {
            const ly = y - 8 + leg * 5
            strokeLine([
              [x + side * 5, ly],
              [x + side * (12 + leg % 2 * 2), ly - 4 + leg * 2],
              [x + side * 17, ly + (leg - 1.5) * 3]
            ], outline, 2)
          }
        }
        ellipse(x, y + 5, 9, 10)
        ellipse(x, y - 7, 7, 6, '#4d255e')
        ctx.fillStyle = eye
        for (let i = 0; i < 4; i++) {
          ctx.beginPath()
          ctx.arc(x - 4.5 + i * 3, y - 8 + (i % 2) * 2, 1.2, 0, Math.PI * 2)
          ctx.fill()
        }
        break
      }
      case 'elemental': {
        ctx.strokeStyle = '#7ff5ff'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(x, y, size + 2, phase, phase + Math.PI * 1.45)
        ctx.stroke()
        ctx.fillStyle = body
        ctx.beginPath()
        ctx.moveTo(x, y - 15)
        ctx.lineTo(x + 11, y)
        ctx.lineTo(x, y + 15)
        ctx.lineTo(x - 11, y)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = outline
        ctx.stroke()
        ctx.fillStyle = '#baffff'
        ctx.beginPath()
        ctx.moveTo(x, y - 7)
        ctx.lineTo(x + 5, y)
        ctx.lineTo(x, y + 7)
        ctx.lineTo(x - 5, y)
        ctx.closePath()
        ctx.fill()
        break
      }
      case 'assassin': {
        ctx.fillStyle = body
        ctx.beginPath()
        ctx.moveTo(x, y - 14)
        ctx.lineTo(x + 11, y + 13)
        ctx.lineTo(x, y + 9)
        ctx.lineTo(x - 11, y + 13)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = outline
        ctx.stroke()
        ctx.fillStyle = '#171225'
        ctx.beginPath()
        ctx.arc(x, y - 8, 8, Math.PI, 0)
        ctx.lineTo(x + 7, y - 3)
        ctx.lineTo(x - 7, y - 3)
        ctx.closePath()
        ctx.fill()
        strokeLine([[x - 5, y - 7], [x + 5, y - 7]], eye, 1.8)
        strokeLine([[x - 7, y + 3], [x - 15, y - 4]], '#d8e4ef', 2)
        strokeLine([[x + 7, y + 3], [x + 15, y - 4]], '#d8e4ef', 2)
        break
      }
      case 'mammoth': {
        ctx.fillStyle = body
        ctx.fillRect(x - 10, y + 5, 5, 11 + step)
        ctx.fillRect(x + 4, y + 5, 5, 11 - step)
        ellipse(x - 2, y + 1, 13, 10)
        ellipse(x + 9, y - 4, 8, 8, '#6f8999')
        ellipse(x + 3, y - 5, 5, 7, '#8aa7b8')
        ctx.strokeStyle = '#718896'
        ctx.lineWidth = 5
        ctx.beginPath()
        ctx.moveTo(x + 14, y)
        ctx.quadraticCurveTo(x + 18, y + 9, x + 13, y + 14)
        ctx.stroke()
        ctx.strokeStyle = '#fff4d2'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x + 12, y + 1)
        ctx.quadraticCurveTo(x + 19, y + 4, x + 18, y - 1)
        ctx.stroke()
        eyePair(x + 9, y - 6, 2, 1.2)
        break
      }
      case 'harpy': {
        ctx.fillStyle = '#9d8a61'
        ctx.beginPath()
        ctx.moveTo(x - 3, y - 5)
        ctx.lineTo(x - 18, y - 12 + step)
        ctx.lineTo(x - 12, y + 5)
        ctx.lineTo(x - 4, y + 2)
        ctx.lineTo(x + 4, y + 2)
        ctx.lineTo(x + 12, y + 5)
        ctx.lineTo(x + 18, y - 12 - step)
        ctx.lineTo(x + 3, y - 5)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = outline
        ctx.stroke()
        ellipse(x, y + 2, 6, 10)
        ellipse(x, y - 9, 6, 6, '#b99b68')
        ctx.fillStyle = '#d6a43d'
        ctx.beginPath()
        ctx.moveTo(x - 2, y - 8)
        ctx.lineTo(x + 6, y - 6)
        ctx.lineTo(x - 1, y - 4)
        ctx.closePath()
        ctx.fill()
        eyePair(x, y - 10, 2.3, 1.1)
        strokeLine([[x - 3, y + 10], [x - 6, y + 16]], '#d5a849', 1.5)
        strokeLine([[x + 3, y + 10], [x + 6, y + 16]], '#d5a849', 1.5)
        break
      }
      case 'wraith':
      case 'voidling': {
        ctx.fillStyle = body
        ctx.beginPath()
        ctx.moveTo(x, y - 15)
        ctx.quadraticCurveTo(x + 12, y - 10, x + 10, y + 5)
        ctx.quadraticCurveTo(x + 8, y + 14, x + 3, y + 9 + step)
        ctx.lineTo(x, y + 15)
        ctx.lineTo(x - 4, y + 9 - step)
        ctx.quadraticCurveTo(x - 10, y + 12, x - 10, y + 3)
        ctx.quadraticCurveTo(x - 12, y - 10, x, y - 15)
        ctx.fill()
        ctx.strokeStyle = outline
        ctx.stroke()
        ctx.fillStyle = eye
        ctx.beginPath()
        ctx.ellipse(x, y - 4, monster.type === 'voidling' ? 5 : 3, 2.5, 0, 0, Math.PI * 2)
        ctx.fill()
        if (monster.type === 'voidling') {
          ctx.fillStyle = outline
          ctx.beginPath()
          ctx.arc(x, y - 4, 1.8, 0, Math.PI * 2)
          ctx.fill()
        }
        break
      }
      case 'troll': {
        ellipse(x, y + 2, 11, 12)
        ellipse(x, y - 10, 8, 7, '#63754e')
        ctx.fillStyle = body
        ctx.fillRect(x - 15, y - 1, 6, 14 + step)
        ctx.fillRect(x + 9, y - 1, 6, 14 - step)
        eyePair(x, y - 11, 3, 1.5)
        ctx.fillStyle = '#d8c08a'
        ctx.beginPath()
        ctx.moveTo(x - 5, y - 6)
        ctx.lineTo(x - 8, y - 2)
        ctx.lineTo(x - 3, y - 4)
        ctx.moveTo(x + 5, y - 6)
        ctx.lineTo(x + 8, y - 2)
        ctx.lineTo(x + 3, y - 4)
        ctx.fill()
        break
      }
      case 'colossus': {
        ctx.fillStyle = body
        ctx.fillRect(x - 10, y - 9, 20, 22)
        ctx.strokeStyle = outline
        ctx.strokeRect(x - 10, y - 9, 20, 22)
        ctx.fillRect(x - 16, y - 5, 6, 17 + step)
        ctx.fillRect(x + 10, y - 5, 6, 17 - step)
        ctx.fillRect(x - 9, y + 12, 7, 6)
        ctx.fillRect(x + 2, y + 12, 7, 6)
        ctx.fillStyle = '#30291f'
        ctx.fillRect(x - 8, y - 13, 16, 7)
        ctx.fillStyle = eye
        ctx.beginPath()
        ctx.arc(x, y + 1, 3.5, 0, Math.PI * 2)
        ctx.fill()
        strokeLine([[x - 7, y + 7], [x + 7, y + 7]], '#8a775e', 1.5)
        break
      }
      default: {
        ellipse(x, y + 1, 10, 13)
        ctx.fillStyle = outline
        ctx.beginPath()
        ctx.moveTo(x - 7, y - 9)
        ctx.lineTo(x - 3, y - 16)
        ctx.lineTo(x, y - 10)
        ctx.lineTo(x + 4, y - 16)
        ctx.lineTo(x + 7, y - 8)
        ctx.fill()
        eyePair(x, y - 3, 3.5, 1.6)
      }
    }
    ctx.restore()
  },

  // 肠道主题菌体：保留不同类型的体型、鞭毛、孢子和生物膜差异
  drawBacteriaByType(ctx, monster, size, config) {
    const x = monster.x
    const y = monster.y
    const type = monster.type || ''
    const phase = this.getMonsterAnimPhase(monster)
    const isBoss = !!monster.isBoss
    const rodTypes = ['bat', 'orc', 'direwolf', 'assassin', 'mammoth', 'harpy']
    const sporeTypes = ['ghost', 'wraith', 'spider', 'voidling', 'phoenix']
    const filmTypes = ['golem', 'troll', 'darkKnight', 'colossus', 'treant']
    const rod = rodTypes.includes(type)
    const spore = sporeTypes.includes(type)
    const film = filmTypes.includes(type)
    const rx = size * (isBoss ? 1.05 : (rod ? 1.0 : 0.78))
    const ry = size * (isBoss ? 0.82 : (rod ? 0.52 : 0.78))
    const rotation = rod ? Math.sin(phase * 0.45) * 0.18 : 0

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rotation)

    // 鞭毛 / 菌丝
    const flagellaCount = isBoss ? 8 : (rod ? 5 : 3)
    ctx.strokeStyle = config.outlineColor || '#5b2833'
    ctx.lineWidth = isBoss ? 2 : 1.2
    for (let i = 0; i < flagellaCount; i++) {
      const a = (Math.PI * 2 * i) / flagellaCount
      const sx = Math.cos(a) * rx * 0.7
      const sy = Math.sin(a) * ry * 0.7
      const wave = Math.sin(phase + i * 1.7) * size * 0.25
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.quadraticCurveTo(
        Math.cos(a) * rx * 1.25 - Math.sin(a) * wave,
        Math.sin(a) * ry * 1.25 + Math.cos(a) * wave,
        Math.cos(a) * rx * 1.7,
        Math.sin(a) * ry * 1.7
      )
      ctx.stroke()
    }

    // 菌体外膜
    const grad = ctx.createRadialGradient(-rx * 0.3, -ry * 0.35, 1, 0, 0, Math.max(rx, ry))
    grad.addColorStop(0, '#fff3d6')
    grad.addColorStop(0.18, config.bodyColor || '#9bdc65')
    grad.addColorStop(1, config.outlineColor || '#46752f')
    ctx.fillStyle = grad
    ctx.strokeStyle = config.outlineColor || '#46752f'
    ctx.lineWidth = isBoss ? 3 : 1.8
    ctx.beginPath()
    if (film) {
      // 生物膜类边缘不规则
      const points = isBoss ? 14 : 10
      for (let i = 0; i <= points; i++) {
        const a = (Math.PI * 2 * i) / points
        const wobble = 0.88 + Math.sin(i * 2.3 + phase * 0.25) * 0.12
        const px = Math.cos(a) * rx * wobble
        const py = Math.sin(a) * ry * wobble
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
    } else {
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    }
    ctx.fill()
    ctx.stroke()

    // 孢子囊 / 膜内颗粒
    const dotCount = isBoss ? 8 : (spore ? 5 : 3)
    for (let i = 0; i < dotCount; i++) {
      const a = i * 2.35 + phase * 0.08
      const px = Math.cos(a) * rx * 0.48
      const py = Math.sin(a * 1.3) * ry * 0.46
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.5)' : (config.eyeColor || '#49202c')
      ctx.beginPath()
      ctx.arc(px, py, Math.max(1.5, size * (isBoss ? 0.1 : 0.08)), 0, Math.PI * 2)
      ctx.fill()
    }

    // Boss 菌核
    if (isBoss) {
      ctx.strokeStyle = 'rgba(255,245,210,0.72)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = config.eyeColor || '#ffef70'
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.16, 0, Math.PI * 2)
      ctx.fill()
    }

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.38)'
    ctx.beginPath()
    ctx.ellipse(-rx * 0.32, -ry * 0.34, rx * 0.22, ry * 0.13, -0.35, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  },

  drawMonsterByType(ctx, monster, size) {
    const config = MONSTER_TYPES[monster.type]
    // 新主题统一使用菌体造型；旧分支保留作兼容与后续细分参考
    if (config) {
      this.drawBacteriaByType(ctx, monster, size, config)
      return
    }
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
        this.drawExpandedMonster(ctx, monster, size, config)
        break
    }
  },
}
