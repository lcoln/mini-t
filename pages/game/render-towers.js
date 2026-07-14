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
  drawTowers() {
    const profile = this.getActivePerformanceProfile()
    this.towers.forEach(tower => {
      const alpha = this.isDragging && !this.draggingFromInventory &&
        this.draggingTowerId === tower.id && this.hasMoved ? 0.3 : 1

      if (profile.simplifyTowers) {
        this.drawCompactTower(this.ctx, tower.x, tower.y, tower.type, tower.level, alpha)
      } else {
        this.drawSingleTower(this.ctx, tower.x, tower.y, tower.type, tower.level, alpha)
      }
    })
  },

  // 绘制单个塔（复用于场上塔和拖动塔）
  drawSingleTower(ctx, x, y, type, level, alpha = 1) {
    const config = TOWER_TYPES[type]
    
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // 底座阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.beginPath()
    ctx.ellipse(x, y + 14, 16, 6, 0, 0, Math.PI * 2)
    ctx.fill()

    // 根据塔类型绘制不同形状
    if (type === 'fire') {
      this._drawFireTower(ctx, x, y, config, level)
    } else if (type === 'ice') {
      this._drawIceTower(ctx, x, y, config, level)
    } else if (type === 'nature') {
      this._drawNatureTower(ctx, x, y, config, level)
    } else if (type === 'arcane') {
      this._drawArcaneTower(ctx, x, y, config, level)
    } else if (type === 'lightning') {
      this._drawLightningTower(ctx, x, y, config, level)
    }
    
    // 等级标签
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
    ctx.beginPath()
    drawRoundRect(ctx, x - 14, y + 12, 28, 14, 4)
    ctx.fill()
    
    ctx.fillStyle = '#ffd700'
    ctx.font = 'bold 10px Arial'
    ctx.fillText(`Lv.${level}`, x, y + 19)
    
    ctx.restore()
  },

  // 火焰塔 - 熔岩石塔造型，等级影响火焰强度和塔身
  _drawFireTower(ctx, x, y, config, level) {
    const lv = level || 1
    const scale = 0.9 + lv * 0.05
    ctx.shadowBlur = 12 + lv * 4
    ctx.shadowColor = lv >= 4 ? '#ff2200' : '#ff4400'

    // 塔身 - 圆角石塔
    const bw = 10 * scale
    const bh = 20 * scale
    const grad = ctx.createLinearGradient(x, y + 10, x, y - bh + 10)
    if (lv >= 4) {
      grad.addColorStop(0, '#1a0000')
      grad.addColorStop(0.2, '#440000')
      grad.addColorStop(0.5, '#881100')
      grad.addColorStop(0.8, '#bb2200')
      grad.addColorStop(1, '#dd3311')
    } else if (lv >= 2) {
      grad.addColorStop(0, '#331100')
      grad.addColorStop(0.5, '#773300')
      grad.addColorStop(1, '#aa4400')
    } else {
      grad.addColorStop(0, '#443322')
      grad.addColorStop(0.5, '#665544')
      grad.addColorStop(1, '#887766')
    }
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(x - bw, y + 10)
    ctx.lineTo(x - bw + 3, y + 10 - bh)
    ctx.arc(x, y + 10 - bh, bw - 3, Math.PI, 0, false)
    ctx.lineTo(x + bw, y + 10)
    ctx.closePath()
    ctx.fill()

    // 石塔边框
    ctx.strokeStyle = lv >= 4 ? '#ff5533' : lv >= 3 ? '#cc4422' : lv >= 2 ? '#aa6644' : '#776655'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 横纹装饰
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'
    ctx.lineWidth = 0.8
    for (let i = 1; i <= 2; i++) {
      const ry = y + 10 - bh * (i / 3)
      const rw = bw - i * 1.5
      ctx.beginPath()
      ctx.moveTo(x - rw, ry)
      ctx.lineTo(x + rw, ry)
      ctx.stroke()
    }

    // 熔岩裂缝 (lv2+ 开始出现，随等级增多变亮)
    if (lv >= 2) {
      const pulse = Math.sin(Date.now() / 300) * 0.15
      const lavaAlpha = lv >= 4 ? 0.7 + pulse : lv >= 3 ? 0.5 + pulse : 0.3 + pulse
      const lavaColor = lv >= 4 ? `rgba(255, 180, 30, ${lavaAlpha})` : `rgba(255, 100, 0, ${lavaAlpha})`
      ctx.strokeStyle = lavaColor
      ctx.lineWidth = lv >= 4 ? 1.8 : 1.2
      // 主裂缝
      ctx.beginPath()
      ctx.moveTo(x - 2, y + 8)
      ctx.quadraticCurveTo(x + 1, y + 3, x - 1, y - 2)
      ctx.quadraticCurveTo(x + 2, y - 5, x, y - 8)
      ctx.stroke()
      if (lv >= 3) {
        // 分支裂缝
        ctx.beginPath()
        ctx.moveTo(x + 3, y + 6)
        ctx.quadraticCurveTo(x + 5, y + 2, x + 2, y - 3)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(x - 1, y - 2)
        ctx.lineTo(x - 5, y - 4)
        ctx.stroke()
      }
      if (lv >= 5) {
        // 更多裂缝
        ctx.beginPath()
        ctx.moveTo(x - 4, y + 4)
        ctx.quadraticCurveTo(x - 6, y, x - 3, y - 6)
        ctx.stroke()
      }
      // 裂缝发光
      ctx.shadowBlur = 8
      ctx.shadowColor = lv >= 4 ? '#ff8800' : '#ff4400'
    }

    // 顶部火焰
    const flicker = Math.sin(Date.now() / 100) * 1.5
    const flameH = (10 + lv * 4) * scale
    const flameW = (6 + lv * 1.5) * scale
    const flameY = y + 10 - bh - 2

    // 外焰
    ctx.shadowBlur = 20 + lv * 5
    ctx.shadowColor = lv >= 4 ? '#ff6600' : '#ff4400'
    const fg = ctx.createRadialGradient(x, flameY - flameH * 0.3 + flicker, 0, x, flameY, flameH)
    fg.addColorStop(0, lv >= 4 ? '#ffffff' : '#ffff66')
    fg.addColorStop(0.2, lv >= 3 ? '#ffcc00' : '#ff8800')
    fg.addColorStop(0.5, '#ff4400')
    fg.addColorStop(0.8, lv >= 4 ? '#cc0000' : '#aa2200')
    fg.addColorStop(1, 'rgba(255, 30, 0, 0)')
    ctx.fillStyle = fg
    ctx.beginPath()
    ctx.moveTo(x, flameY - flameH + flicker)
    ctx.bezierCurveTo(x + flameW, flameY - flameH * 0.6, x + flameW * 0.8, flameY - 2, x + 3, flameY)
    ctx.lineTo(x - 3, flameY)
    ctx.bezierCurveTo(x - flameW * 0.8, flameY - 2, x - flameW, flameY - flameH * 0.6, x, flameY - flameH + flicker)
    ctx.fill()

    // 侧翼小火焰 (lv3+)
    if (lv >= 3) {
      const sideFlameH = flameH * 0.45
      const sideFlameW = flameW * 0.4
      const flicker2 = Math.sin(Date.now() / 130 + 1) * 1.2
      for (const dir of [-1, 1]) {
        const sfx = x + dir * (bw - 2)
        const sfy = flameY + 4
        const sfg = ctx.createRadialGradient(sfx, sfy - sideFlameH * 0.3 + flicker2, 0, sfx, sfy, sideFlameH)
        sfg.addColorStop(0, '#ffff88')
        sfg.addColorStop(0.4, '#ff6600')
        sfg.addColorStop(1, 'rgba(255, 30, 0, 0)')
        ctx.fillStyle = sfg
        ctx.beginPath()
        ctx.moveTo(sfx, sfy - sideFlameH + flicker2)
        ctx.bezierCurveTo(sfx + dir * sideFlameW, sfy - sideFlameH * 0.4, sfx + dir * sideFlameW * 0.5, sfy - 1, sfx + dir * 1, sfy)
        ctx.lineTo(sfx - dir * 1, sfy)
        ctx.bezierCurveTo(sfx - dir * sideFlameW * 0.5, sfy - 1, sfx - dir * sideFlameW * 0.3, sfy - sideFlameH * 0.5, sfx, sfy - sideFlameH + flicker2)
        ctx.fill()
      }
    }

    // 内焰（lv2+更亮）
    if (lv >= 2) {
      const innerH = flameH * (lv >= 4 ? 0.6 : 0.5)
      const ig = ctx.createRadialGradient(x, flameY - innerH * 0.3 + flicker, 0, x, flameY, innerH)
      ig.addColorStop(0, '#ffffff')
      ig.addColorStop(0.3, lv >= 4 ? '#ffffcc' : '#ffff88')
      ig.addColorStop(0.7, lv >= 3 ? '#ffcc44' : '#ffaa44')
      ig.addColorStop(1, 'rgba(255, 200, 0, 0)')
      ctx.fillStyle = ig
      ctx.beginPath()
      ctx.moveTo(x, flameY - innerH + flicker * 0.7)
      ctx.bezierCurveTo(x + flameW * 0.35, flameY - innerH * 0.5, x + 2, flameY - 1, x + 1, flameY)
      ctx.lineTo(x - 1, flameY)
      ctx.bezierCurveTo(x - 2, flameY - 1, x - flameW * 0.35, flameY - innerH * 0.5, x, flameY - innerH + flicker * 0.7)
      ctx.fill()
    }

    // 飞散火星 (lv2+)
    if (lv >= 2) {
      const sparkCount = lv >= 5 ? 6 : lv >= 3 ? 4 : 2
      const t = Date.now() / 250
      for (let i = 0; i < sparkCount; i++) {
        const sa = t + i * 1.5
        const lifetime = (sa * 3) % 6.28
        const sx = x + Math.sin(sa * 1.7) * (3 + lv + Math.random() * 2)
        const sy = flameY - flameH * 0.3 - lifetime * 2.5
        const sparkAlpha = Math.max(0, 0.8 - lifetime / 5)
        if (sparkAlpha > 0 && sy > flameY - flameH - 8) {
          const sparkSize = lv >= 4 ? 1.5 : 1
          ctx.fillStyle = `rgba(255, ${200 + Math.floor(Math.random() * 55)}, ${60 + Math.floor(Math.random() * 40)}, ${sparkAlpha})`
          ctx.beginPath()
          ctx.arc(sx, sy, sparkSize, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    // 塔顶装饰环 (lv4+)
    if (lv >= 4) {
      ctx.strokeStyle = `rgba(255, 200, 50, ${0.5 + Math.sin(Date.now() / 200) * 0.2})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.ellipse(x, y + 10 - bh, bw - 2, 3, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
  },

  // 寒冰塔 - 冰锥尖塔造型，等级影响冰晶层数和光芒
  _drawIceTower(ctx, x, y, config, level) {
    const lv = level || 1
    const scale = 0.9 + lv * 0.05
    ctx.shadowBlur = 10 + lv * 4
    ctx.shadowColor = lv >= 4 ? '#44eeff' : '#00aadd'

    // 基座 - 冰台
    const baseW = 12 * scale
    const baseGrad = ctx.createLinearGradient(x - baseW, y + 8, x + baseW, y + 2)
    baseGrad.addColorStop(0, '#003344')
    baseGrad.addColorStop(0.5, lv >= 3 ? '#0099bb' : '#005577')
    baseGrad.addColorStop(1, '#002233')
    ctx.fillStyle = baseGrad
    ctx.beginPath()
    ctx.moveTo(x - baseW, y + 10)
    ctx.lineTo(x - baseW + 2, y + 4)
    ctx.lineTo(x + baseW - 2, y + 4)
    ctx.lineTo(x + baseW, y + 10)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(100, 220, 255, 0.5)'
    ctx.lineWidth = 1
    ctx.stroke()

    // 中央冰锥
    const spikeH = (22 + lv * 3) * scale
    const spikeW = 6 * scale
    const grad = ctx.createLinearGradient(x, y + 4, x, y + 4 - spikeH)
    grad.addColorStop(0, '#005588')
    grad.addColorStop(0.3, lv >= 3 ? '#33ccee' : '#0099cc')
    grad.addColorStop(0.7, lv >= 4 ? '#aaeeff' : '#66bbdd')
    grad.addColorStop(1, '#eeffff')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(x, y + 4 - spikeH)
    ctx.lineTo(x + spikeW, y + 4)
    ctx.lineTo(x - spikeW, y + 4)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = lv >= 3 ? '#aaeeff' : '#77bbdd'
    ctx.lineWidth = 1
    ctx.stroke()

    // 冰锥高光
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.beginPath()
    ctx.moveTo(x - 1, y + 4 - spikeH + 4)
    ctx.lineTo(x - spikeW + 2, y + 2)
    ctx.lineTo(x - 1, y + 2)
    ctx.closePath()
    ctx.fill()

    // 侧翼冰晶（等级2+）
    if (lv >= 2) {
      const sideH = spikeH * (lv >= 4 ? 0.65 : 0.5)
      const sideW = 4 * scale
      const offX = 7 * scale
      const sideColors = lv >= 4 ? ['#0099cc', '#77ddff', '#ddffff'] : ['#006688', '#33aacc', '#aaddee']
      
      for (const dir of [-1, 1]) {
        const sg = ctx.createLinearGradient(x + dir * offX, y + 5, x + dir * offX, y + 5 - sideH)
        sg.addColorStop(0, sideColors[0])
        sg.addColorStop(0.5, sideColors[1])
        sg.addColorStop(1, sideColors[2])
        ctx.fillStyle = sg
        ctx.beginPath()
        ctx.moveTo(x + dir * offX, y + 5 - sideH)
        ctx.lineTo(x + dir * (offX + sideW), y + 5)
        ctx.lineTo(x + dir * (offX - sideW), y + 5)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = 'rgba(150, 230, 255, 0.4)'
        ctx.lineWidth = 0.8
        ctx.stroke()
      }
    }

    // 额外侧翼（等级4+）
    if (lv >= 4) {
      const sideH2 = spikeH * 0.35
      const offX2 = 13 * scale
      for (const dir of [-1, 1]) {
        const sg = ctx.createLinearGradient(x + dir * offX2, y + 6, x + dir * offX2, y + 6 - sideH2)
        sg.addColorStop(0, '#005577')
        sg.addColorStop(1, '#aaeeff')
        ctx.fillStyle = sg
        ctx.beginPath()
        ctx.moveTo(x + dir * offX2, y + 6 - sideH2)
        ctx.lineTo(x + dir * (offX2 + 3), y + 7)
        ctx.lineTo(x + dir * (offX2 - 3), y + 7)
        ctx.closePath()
        ctx.fill()
      }
    }

    // 冰雾环绕
    const t = Date.now() / 600
    const fogCount = 2 + lv
    for (let i = 0; i < fogCount; i++) {
      const fa = t + i * (Math.PI * 2 / fogCount)
      const fr = (8 + lv * 2) * scale
      const fx = x + Math.cos(fa) * fr
      const fy = y + Math.sin(fa) * 3 - 4
      const fAlpha = (Math.sin(fa + t) + 1) / 2 * (0.15 + lv * 0.05)
      ctx.fillStyle = `rgba(150, 230, 255, ${fAlpha})`
      ctx.beginPath()
      ctx.arc(fx, fy, 2 + lv * 0.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // 顶部闪光（等级3+）
    if (lv >= 3) {
      const glow = (Math.sin(Date.now() / 200) + 1) / 2
      ctx.fillStyle = `rgba(220, 250, 255, ${0.3 + glow * 0.5})`
      ctx.beginPath()
      const starSize = 3 + lv * 0.5
      // 十字闪光
      ctx.moveTo(x, y + 4 - spikeH - starSize)
      ctx.lineTo(x + 1.5, y + 4 - spikeH)
      ctx.lineTo(x + starSize, y + 4 - spikeH + 1)
      ctx.lineTo(x + 1.5, y + 4 - spikeH + 2)
      ctx.lineTo(x, y + 4 - spikeH + starSize + 2)
      ctx.lineTo(x - 1.5, y + 4 - spikeH + 2)
      ctx.lineTo(x - starSize, y + 4 - spikeH + 1)
      ctx.lineTo(x - 1.5, y + 4 - spikeH)
      ctx.closePath()
      ctx.fill()
    }
  },

  // 自然塔 - 生命之树造型，等级影响茂盛度和特效
  _drawNatureTower(ctx, x, y, config, level) {
    const lv = level || 1
    const scale = 0.9 + lv * 0.05
    ctx.shadowBlur = 8 + lv * 3
    ctx.shadowColor = lv >= 4 ? '#44ff88' : '#22aa44'

    // 地面草丛 (lv2+)
    if (lv >= 2) {
      const grassCount = lv >= 4 ? 6 : lv >= 3 ? 4 : 3
      const grassColor = lv >= 4 ? '#44dd44' : '#338822'
      ctx.strokeStyle = grassColor
      ctx.lineWidth = 1.2
      ctx.lineCap = 'round'
      for (let i = 0; i < grassCount; i++) {
        const gx = x - 12 + i * (24 / (grassCount - 1))
        const sway = Math.sin(Date.now() / 500 + i * 1.3) * 2
        ctx.beginPath()
        ctx.moveTo(gx, y + 12)
        ctx.quadraticCurveTo(gx + sway, y + 6, gx + sway * 0.5, y + 3)
        ctx.stroke()
      }
      ctx.lineCap = 'butt'
    }

    // 树干
    const trunkW = (3 + lv * 0.5) * scale
    const trunkH = (18 + lv * 2) * scale
    const trunkGrad = ctx.createLinearGradient(x - trunkW, y + 10, x + trunkW, y + 10 - trunkH)
    trunkGrad.addColorStop(0, '#2a1500')
    trunkGrad.addColorStop(0.3, lv >= 3 ? '#5a3000' : '#3d2200')
    trunkGrad.addColorStop(1, lv >= 3 ? '#7a4a10' : '#5a3800')
    ctx.fillStyle = trunkGrad
    ctx.beginPath()
    ctx.moveTo(x - trunkW - 2, y + 10)
    ctx.quadraticCurveTo(x - trunkW, y + 10 - trunkH * 0.5, x - trunkW + 1, y + 10 - trunkH)
    ctx.lineTo(x + trunkW - 1, y + 10 - trunkH)
    ctx.quadraticCurveTo(x + trunkW, y + 10 - trunkH * 0.5, x + trunkW + 2, y + 10)
    ctx.closePath()
    ctx.fill()

    // 树皮纹理
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(x - 1, y + 8); ctx.lineTo(x, y - 2)
    ctx.moveTo(x + 1, y + 6); ctx.quadraticCurveTo(x + 2, y, x + 1, y - 4)
    ctx.stroke()

    // 藤蔓缠绕 (lv3+)
    if (lv >= 3) {
      const vineAlpha = lv >= 5 ? 0.7 : 0.5
      ctx.strokeStyle = `rgba(80, 200, 60, ${vineAlpha})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let t = 0; t <= 1; t += 0.05) {
        const vy = y + 10 - trunkH * t
        const vx = x + Math.sin(t * Math.PI * 3) * (trunkW + 2)
        if (t === 0) ctx.moveTo(vx, vy)
        else ctx.lineTo(vx, vy)
      }
      ctx.stroke()
      // 藤蔓小叶子
      if (lv >= 4) {
        ctx.fillStyle = `rgba(80, 220, 50, ${vineAlpha})`
        for (let t = 0.2; t <= 0.8; t += 0.3) {
          const vy = y + 10 - trunkH * t
          const vx = x + Math.sin(t * Math.PI * 3) * (trunkW + 2)
          ctx.beginPath()
          ctx.ellipse(vx + 2, vy, 2.5, 1.5, 0.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    // 根部
    ctx.strokeStyle = lv >= 3 ? '#5a3000' : '#3d2200'
    ctx.lineWidth = 2.5 * scale
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x - trunkW, y + 8); ctx.quadraticCurveTo(x - trunkW - 4, y + 11, x - trunkW - 7, y + 12)
    ctx.moveTo(x + trunkW, y + 8); ctx.quadraticCurveTo(x + trunkW + 4, y + 11, x + trunkW + 7, y + 12)
    ctx.stroke()
    if (lv >= 3) {
      ctx.beginPath()
      ctx.moveTo(x - 1, y + 10); ctx.quadraticCurveTo(x - 2, y + 13, x - 5, y + 14)
      ctx.stroke()
    }
    ctx.lineCap = 'butt'

    // 树冠
    const canopyY = y + 10 - trunkH
    const canopyR = (9 + lv * 2) * scale
    const canopyColors = lv >= 5
      ? ['#55ff55', '#33dd33', '#11aa11']
      : lv >= 4
        ? ['#44ff44', '#22cc22', '#118811']
        : lv >= 2
          ? ['#66ee44', '#33aa22', '#116600']
          : ['#55cc33', '#338822', '#115500']

    // 底层树冠（两侧）
    const cg1 = ctx.createRadialGradient(x, canopyY + 3, 0, x, canopyY + 3, canopyR + 4)
    cg1.addColorStop(0, canopyColors[0])
    cg1.addColorStop(0.6, canopyColors[1])
    cg1.addColorStop(1, canopyColors[2])
    ctx.fillStyle = cg1
    ctx.beginPath()
    ctx.arc(x - canopyR * 0.5, canopyY + 3, canopyR * 0.7, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x + canopyR * 0.5, canopyY + 3, canopyR * 0.7, 0, Math.PI * 2)
    ctx.fill()

    // 顶层树冠
    const cg2 = ctx.createRadialGradient(x, canopyY - 2, 0, x, canopyY - 2, canopyR)
    cg2.addColorStop(0, canopyColors[0])
    cg2.addColorStop(0.5, canopyColors[1])
    cg2.addColorStop(1, canopyColors[2])
    ctx.fillStyle = cg2
    ctx.beginPath()
    ctx.arc(x, canopyY - 2, canopyR, 0, Math.PI * 2)
    ctx.fill()

    // 树冠高光
    ctx.fillStyle = `rgba(180, 255, 120, ${0.2 + lv * 0.06})`
    ctx.beginPath()
    ctx.arc(x - canopyR * 0.3, canopyY - canopyR * 0.4, canopyR * 0.45, 0, Math.PI * 2)
    ctx.fill()

    // 树冠暗部
    ctx.fillStyle = 'rgba(0, 40, 0, 0.15)'
    ctx.beginPath()
    ctx.arc(x + canopyR * 0.2, canopyY + canopyR * 0.3, canopyR * 0.5, 0, Math.PI * 2)
    ctx.fill()

    // 树冠斑点纹理（深浅变化）
    if (lv >= 2) {
      const spotCount = lv >= 4 ? 5 : 3
      for (let i = 0; i < spotCount; i++) {
        const angle = (Math.PI * 2 / spotCount) * i + 0.5
        const sr = canopyR * 0.5
        const sx = x + Math.cos(angle) * sr * 0.6
        const sy = canopyY + Math.sin(angle) * sr * 0.5
        ctx.fillStyle = `rgba(80, 180, 40, 0.2)`
        ctx.beginPath()
        ctx.arc(sx, sy, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 花朵 (lv2+) / 果实 (lv4+)
    if (lv >= 2) {
      const ft = Date.now() / 1000
      if (lv >= 4) {
        // 金色果实
        const fruitCount = lv >= 5 ? 5 : 3
        const fruitPositions = [
          { dx: -canopyR * 0.35, dy: canopyR * 0.15 },
          { dx: canopyR * 0.4, dy: 0 },
          { dx: 0, dy: canopyR * 0.35 },
          { dx: canopyR * 0.25, dy: -canopyR * 0.3 },
          { dx: -canopyR * 0.45, dy: -canopyR * 0.15 }
        ]
        for (let i = 0; i < fruitCount; i++) {
          const fp = fruitPositions[i]
          const fx = x + fp.dx
          const fy = canopyY + fp.dy
          // 果实阴影
          ctx.fillStyle = 'rgba(0,0,0,0.15)'
          ctx.beginPath()
          ctx.arc(fx + 0.5, fy + 1, 3, 0, Math.PI * 2)
          ctx.fill()
          // 果实
          const fruitGrad = ctx.createRadialGradient(fx - 1, fy - 1, 0, fx, fy, 3)
          fruitGrad.addColorStop(0, '#ffff88')
          fruitGrad.addColorStop(0.5, `rgba(255, 210, 40, ${0.8 + Math.sin(ft + i) * 0.15})`)
          fruitGrad.addColorStop(1, '#cc8800')
          ctx.fillStyle = fruitGrad
          ctx.beginPath()
          ctx.arc(fx, fy, 2.8, 0, Math.PI * 2)
          ctx.fill()
          // 高光
          ctx.fillStyle = 'rgba(255,255,220,0.6)'
          ctx.beginPath()
          ctx.arc(fx - 0.8, fy - 0.8, 1, 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        // 小花朵
        const flowerCount = lv >= 3 ? 4 : 2
        const flowerPositions = [
          { dx: -canopyR * 0.35, dy: -canopyR * 0.15 },
          { dx: canopyR * 0.4, dy: canopyR * 0.1 },
          { dx: -canopyR * 0.1, dy: canopyR * 0.3 },
          { dx: canopyR * 0.2, dy: -canopyR * 0.35 }
        ]
        for (let i = 0; i < flowerCount; i++) {
          const fp = flowerPositions[i]
          const fx = x + fp.dx
          const fy = canopyY + fp.dy
          // 花瓣
          const petalColor = i % 2 === 0 ? 
            `rgba(255, 180, 200, ${0.7 + Math.sin(ft + i) * 0.2})` : 
            `rgba(255, 220, 150, ${0.7 + Math.sin(ft + i) * 0.2})`
          for (let p = 0; p < 4; p++) {
            const pa = (Math.PI / 2) * p + ft * 0.1
            ctx.fillStyle = petalColor
            ctx.beginPath()
            ctx.ellipse(fx + Math.cos(pa) * 1.5, fy + Math.sin(pa) * 1.5, 1.8, 1, pa, 0, Math.PI * 2)
            ctx.fill()
          }
          // 花心
          ctx.fillStyle = '#ffee44'
          ctx.beginPath()
          ctx.arc(fx, fy, 1, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    // 叶片飘落 (lv2+)
    if (lv >= 2) {
      const leafT = Date.now() / 700
      const leafCount = lv >= 4 ? 3 : 2
      for (let i = 0; i < leafCount; i++) {
        const lt = leafT + i * 2.5
        const lx = x + Math.sin(lt) * (canopyR + 4)
        const progress = ((lt * 4) % 28)
        const ly = canopyY - canopyR + progress
        if (ly < y + 12 && ly > canopyY - canopyR) {
          ctx.fillStyle = `rgba(100, 240, 60, ${0.6 - progress / 40})`
          ctx.beginPath()
          ctx.ellipse(lx, ly, 2.5, 1.2, lt * 0.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    // 生命光环 (lv5)
    if (lv >= 5) {
      const auraT = Date.now() / 800
      const auraAlpha = 0.1 + Math.sin(auraT) * 0.06
      const auraR = canopyR + 8
      const auraG = ctx.createRadialGradient(x, canopyY, canopyR * 0.5, x, canopyY, auraR)
      auraG.addColorStop(0, 'rgba(100, 255, 80, 0)')
      auraG.addColorStop(0.7, `rgba(100, 255, 80, ${auraAlpha})`)
      auraG.addColorStop(1, 'rgba(100, 255, 80, 0)')
      ctx.fillStyle = auraG
      ctx.beginPath()
      ctx.arc(x, canopyY, auraR, 0, Math.PI * 2)
      ctx.fill()
    }
  },

  // 奥术塔 - 悬浮宝石+底座，等级影响宝石大小和粒子
  _drawArcaneTower(ctx, x, y, config, level) {
    const lv = level || 1
    const scale = 0.9 + lv * 0.05
    ctx.shadowBlur = 16 + lv * 4
    ctx.shadowColor = lv >= 4 ? '#cc66ff' : '#aa44ff'

    // 底座石柱
    const baseGrad = ctx.createLinearGradient(x - 8, y + 10, x + 8, y)
    baseGrad.addColorStop(0, '#222233')
    baseGrad.addColorStop(1, lv >= 3 ? '#555577' : '#444466')
    ctx.fillStyle = baseGrad
    ctx.beginPath()
    ctx.moveTo(x - 10 * scale, y + 10)
    ctx.lineTo(x - 6 * scale, y)
    ctx.lineTo(x + 6 * scale, y)
    ctx.lineTo(x + 10 * scale, y + 10)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = lv >= 3 ? '#8866cc' : '#6644aa'
    ctx.lineWidth = 1
    ctx.stroke()

    // 底座符文（等级3+）
    if (lv >= 3) {
      ctx.strokeStyle = `rgba(170, 100, 255, ${0.3 + Math.sin(Date.now() / 400) * 0.15})`
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(x - 4, y + 7); ctx.lineTo(x, y + 3); ctx.lineTo(x + 4, y + 7)
      ctx.stroke()
    }

    // 悬浮菱形宝石
    const hover = Math.sin(Date.now() / 400) * 2
    const gemSize = (10 + lv * 1.5) * scale
    const gy = y - 10 + hover
    const gemGrad = ctx.createLinearGradient(x - gemSize, gy - gemSize * 1.2, x + gemSize, gy + gemSize)
    if (lv >= 4) {
      gemGrad.addColorStop(0, '#ee99ff')
      gemGrad.addColorStop(0.5, '#aa44dd')
      gemGrad.addColorStop(1, '#440088')
    } else {
      gemGrad.addColorStop(0, '#dd88ff')
      gemGrad.addColorStop(0.5, '#8833cc')
      gemGrad.addColorStop(1, '#330066')
    }
    ctx.fillStyle = gemGrad
    ctx.beginPath()
    ctx.moveTo(x, gy - gemSize * 1.2)
    ctx.lineTo(x + gemSize, gy)
    ctx.lineTo(x, gy + gemSize)
    ctx.lineTo(x - gemSize, gy)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = lv >= 4 ? '#dd99ff' : '#cc77ff'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 宝石内部高光
    ctx.fillStyle = `rgba(255, 200, 255, ${0.3 + lv * 0.05})`
    ctx.beginPath()
    ctx.moveTo(x - 2, gy - gemSize * 0.8)
    ctx.lineTo(x + gemSize * 0.5, gy - gemSize * 0.2)
    ctx.lineTo(x - 1, gy + gemSize * 0.2)
    ctx.closePath()
    ctx.fill()

    // 能量连接线 - 底座到宝石
    ctx.strokeStyle = `rgba(170, 68, 255, ${0.4 + Math.sin(Date.now() / 200) * 0.2})`
    ctx.lineWidth = lv >= 3 ? 1.5 : 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, gy + gemSize)
    ctx.stroke()
    ctx.setLineDash([])

    // 环绕粒子
    const pt = Date.now() / 600
    const particleCount = 2 + lv
    for (let i = 0; i < particleCount; i++) {
      const pa = pt + i * (Math.PI * 2 / particleCount)
      const pr = (10 + lv * 2) * scale
      const px = x + Math.cos(pa) * pr
      const py = gy + Math.sin(pa) * pr * 0.5
      const pSize = 1 + lv * 0.3
      ctx.fillStyle = `rgba(200, 150, 255, ${0.5 + Math.sin(pa) * 0.3})`
      ctx.beginPath()
      ctx.arc(px, py, pSize, 0, Math.PI * 2)
      ctx.fill()
    }
  },

  // 闪电塔 - 能量方尖碑造型，升级后更亮更炫
  _drawLightningTower(ctx, x, y, config, level) {
    const lv = level || 1
    const scale = 0.9 + lv * 0.05
    // 随等级大幅提升亮度
    ctx.shadowBlur = 4 + lv * 6
    ctx.shadowColor = lv >= 5 ? '#ffff88' : lv >= 4 ? '#ffff66' : lv >= 3 ? '#eeee44' : lv >= 2 ? '#dddd22' : '#888800'

    // 底座 - 金属基座，等级越高越亮
    const baseW = 11 * scale
    const baseGrad = ctx.createLinearGradient(x - baseW, y + 8, x + baseW, y + 3)
    if (lv >= 4) {
      baseGrad.addColorStop(0, '#444430')
      baseGrad.addColorStop(0.5, '#8a8a50')
      baseGrad.addColorStop(1, '#444430')
    } else if (lv >= 2) {
      baseGrad.addColorStop(0, '#333328')
      baseGrad.addColorStop(0.5, '#6a6a3a')
      baseGrad.addColorStop(1, '#333328')
    } else {
      baseGrad.addColorStop(0, '#2a2a20')
      baseGrad.addColorStop(0.5, '#444430')
      baseGrad.addColorStop(1, '#2a2a20')
    }
    ctx.fillStyle = baseGrad
    ctx.beginPath()
    ctx.moveTo(x - baseW, y + 10)
    ctx.lineTo(x - baseW + 3, y + 3)
    ctx.lineTo(x + baseW - 3, y + 3)
    ctx.lineTo(x + baseW, y + 10)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = lv >= 4 ? '#dddd66' : lv >= 3 ? '#bbbb55' : lv >= 2 ? '#999944' : '#777744'
    ctx.lineWidth = lv >= 4 ? 1.5 : 1
    ctx.stroke()

    // 底座能量纹 (lv3+)
    if (lv >= 3) {
      const runeAlpha = 0.3 + Math.sin(Date.now() / 300) * 0.15
      ctx.strokeStyle = `rgba(255, 255, 100, ${runeAlpha})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x - baseW + 5, y + 8)
      ctx.lineTo(x, y + 5)
      ctx.lineTo(x + baseW - 5, y + 8)
      ctx.stroke()
    }

    // 方尖碑主体 - 等级越高越亮
    const pillarH = (22 + lv * 3) * scale
    const pillarW = 5 * scale
    const pg = ctx.createLinearGradient(x, y + 3, x, y + 3 - pillarH)
    if (lv >= 5) {
      pg.addColorStop(0, '#555540')
      pg.addColorStop(0.2, '#888866')
      pg.addColorStop(0.5, '#aaaa88')
      pg.addColorStop(0.8, '#ccccaa')
      pg.addColorStop(1, '#eeeedd')
    } else if (lv >= 4) {
      pg.addColorStop(0, '#444435')
      pg.addColorStop(0.3, '#777755')
      pg.addColorStop(0.7, '#999977')
      pg.addColorStop(1, '#ccccaa')
    } else if (lv >= 3) {
      pg.addColorStop(0, '#3a3a2e')
      pg.addColorStop(0.3, '#666648')
      pg.addColorStop(0.8, '#888866')
      pg.addColorStop(1, '#bbbb99')
    } else if (lv >= 2) {
      pg.addColorStop(0, '#333328')
      pg.addColorStop(0.5, '#5a5a44')
      pg.addColorStop(1, '#999977')
    } else {
      pg.addColorStop(0, '#2d2d24')
      pg.addColorStop(0.5, '#4a4a38')
      pg.addColorStop(1, '#777766')
    }
    ctx.fillStyle = pg
    ctx.beginPath()
    ctx.moveTo(x, y + 3 - pillarH)
    ctx.lineTo(x + pillarW, y + 3)
    ctx.lineTo(x - pillarW, y + 3)
    ctx.closePath()
    ctx.fill()

    // 碑身边框 - 越高级越亮
    ctx.strokeStyle = lv >= 4 ? 'rgba(255, 255, 150, 0.7)' : lv >= 3 ? 'rgba(230, 230, 120, 0.5)' : `rgba(200, 200, 100, ${0.3 + lv * 0.05})`
    ctx.lineWidth = lv >= 4 ? 1.5 : 1
    ctx.stroke()

    // 碑身高光
    ctx.fillStyle = `rgba(255, 255, 200, ${0.1 + lv * 0.04})`
    ctx.beginPath()
    ctx.moveTo(x - 1, y + 3 - pillarH + 3)
    ctx.lineTo(x - pillarW + 1, y + 1)
    ctx.lineTo(x - 1, y + 1)
    ctx.closePath()
    ctx.fill()

    // 碑身能量脉络 (lv3+)
    if (lv >= 3) {
      const veins = lv >= 5 ? 3 : 2
      const veinT = Date.now() / 250
      for (let i = 0; i < veins; i++) {
        const vProgress = ((veinT + i * 2) % 6) / 6
        const vy = y + 3 - pillarH * vProgress
        const vx = x + (0.5 - vProgress) * pillarW * 0.5
        const vAlpha = Math.sin(vProgress * Math.PI) * (lv >= 5 ? 0.7 : 0.4)
        if (vAlpha > 0) {
          ctx.fillStyle = `rgba(255, 255, 150, ${vAlpha})`
          ctx.beginPath()
          ctx.arc(vx, vy, 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    // 能量环（等级2+）
    if (lv >= 2) {
      const ringCount = lv >= 5 ? 4 : lv >= 4 ? 3 : lv >= 3 ? 2 : 1
      const t = Date.now() / 400
      for (let i = 0; i < ringCount; i++) {
        const ringY = y + 3 - pillarH * (0.25 + i * 0.2)
        const ringR = (6 + i * 1.5) * scale
        const ringAlpha = lv >= 4 ? 0.5 + Math.sin(t + i * 1.5) * 0.25 : 0.3 + Math.sin(t + i * 1.5) * 0.2
        const ringBright = lv >= 5 ? '255, 255, 180' : lv >= 4 ? '255, 255, 130' : '255, 255, 100'
        ctx.strokeStyle = `rgba(${ringBright}, ${ringAlpha})`
        ctx.lineWidth = lv >= 4 ? 2 : 1.5
        ctx.beginPath()
        ctx.ellipse(x, ringY, ringR, ringR * 0.35, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    // 顶部能量球 - 高等级更大更亮，低等级小巧
    const topY = y + 3 - pillarH
    const orbR = (1.5 + lv * 0.8) * scale
    ctx.shadowBlur = 10 + lv * 6
    ctx.shadowColor = lv >= 4 ? '#ffff88' : lv >= 2 ? '#ffff44' : '#cccc00'
    const orbG = ctx.createRadialGradient(x, topY, 0, x, topY, orbR)
    if (lv >= 5) {
      orbG.addColorStop(0, '#ffffff')
      orbG.addColorStop(0.2, '#ffffee')
      orbG.addColorStop(0.5, '#ffffaa')
      orbG.addColorStop(0.8, '#eeee44')
      orbG.addColorStop(1, 'rgba(200, 200, 50, 0)')
    } else if (lv >= 4) {
      orbG.addColorStop(0, '#ffffff')
      orbG.addColorStop(0.25, '#ffffcc')
      orbG.addColorStop(0.6, '#eecc22')
      orbG.addColorStop(1, 'rgba(180, 180, 20, 0)')
    } else if (lv >= 3) {
      orbG.addColorStop(0, '#ffffff')
      orbG.addColorStop(0.3, '#ffff88')
      orbG.addColorStop(0.7, '#ddbb00')
      orbG.addColorStop(1, 'rgba(160, 160, 0, 0)')
    } else {
      orbG.addColorStop(0, '#ffffff')
      orbG.addColorStop(0.3, '#ffff66')
      orbG.addColorStop(0.7, '#aaaa00')
      orbG.addColorStop(1, 'rgba(120, 120, 0, 0)')
    }
    ctx.fillStyle = orbG
    ctx.beginPath()
    ctx.arc(x, topY, orbR, 0, Math.PI * 2)
    ctx.fill()

    // 电弧 - 低等级少且短，高等级更亮更粗更多
    const arcBright = lv >= 5 ? '255, 255, 200' : lv >= 4 ? '255, 255, 180' : '255, 255, 150'
    ctx.strokeStyle = `rgba(${arcBright}, ${0.6 + Math.random() * 0.4})`
    ctx.lineWidth = lv >= 5 ? 2 : lv >= 4 ? 1.8 : lv >= 3 ? 1.5 : lv >= 2 ? 1 : 0.8
    const arcCount = lv >= 5 ? 6 : lv >= 4 ? 5 : lv >= 3 ? 4 : lv >= 2 ? 2 : 1
    for (let i = 0; i < arcCount; i++) {
      const angle = (Math.PI * 2 / arcCount) * i + Math.random() * 0.5
      const dist = (3 + lv * 2.5 + Math.random() * (lv * 1.5)) * scale
      ctx.beginPath()
      ctx.moveTo(x, topY)
      const segments = 2 + Math.floor(Math.random() * 2)
      for (let s = 1; s <= segments; s++) {
        const progress = s / segments
        const tx = x + Math.cos(angle) * dist * progress
        const ty = topY + Math.sin(angle) * dist * progress
        const jitter = (1 - progress) * (3 + lv)
        ctx.lineTo(tx + (Math.random() - 0.5) * jitter, ty + (Math.random() - 0.5) * jitter)
      }
      ctx.stroke()
    }

    // 底部接地电弧（等级3+，比之前更早出现）
    if (lv >= 3) {
      const groundBright = lv >= 5 ? 0.6 : lv >= 4 ? 0.4 : 0.25
      ctx.strokeStyle = `rgba(255, 255, 120, ${groundBright + Math.random() * 0.2})`
      ctx.lineWidth = lv >= 4 ? 1.2 : 0.8
      const groundArcs = lv >= 5 ? 3 : 2
      for (let i = 0; i < groundArcs; i++) {
        const dir = i === 0 ? -1 : i === 1 ? 1 : (Math.random() > 0.5 ? 1 : -1)
        const spread = pillarW + 2 + Math.random() * (2 + lv)
        ctx.beginPath()
        ctx.moveTo(x + dir * pillarW * 0.5, y + 3)
        ctx.lineTo(x + dir * spread, y + 6 + Math.random() * 2)
        ctx.lineTo(x + dir * (spread + 2 + Math.random() * 3), y + 10)
        ctx.stroke()
      }
    }

    // 电场光晕 (lv5)
    if (lv >= 5) {
      const haloT = Date.now() / 600
      const haloAlpha = 0.08 + Math.sin(haloT) * 0.04
      const haloR = orbR + 12
      const haloG = ctx.createRadialGradient(x, topY, orbR, x, topY, haloR)
      haloG.addColorStop(0, `rgba(255, 255, 150, ${haloAlpha * 2})`)
      haloG.addColorStop(1, 'rgba(255, 255, 100, 0)')
      ctx.fillStyle = haloG
      ctx.beginPath()
      ctx.arc(x, topY, haloR, 0, Math.PI * 2)
      ctx.fill()
    }
  },

  // 绘制拖动中的塔（跟随手指）
  drawDraggingTower() {
    if (!this.isDragging || !this.draggingTower || !this.hasMoved) return
    
    // dragX/dragY 是手指相对于 canvas 的坐标
    // 如果手指在 canvas 区域外（比如在仓库），dragY 会大于 canvasHeight 或小于 0
    // 给一点余量（20px）让边缘拖动也能显示
    if (this.dragX < -20 || this.dragX > CONFIG.canvasWidth + 20) return
    if (this.dragY < -20 || this.dragY > CONFIG.canvasHeight + 20) return
    
    // 限制绘制坐标在 canvas 范围内
    const x = Math.max(0, Math.min(CONFIG.canvasWidth, this.dragX))
    const y = Math.max(0, Math.min(CONFIG.canvasHeight, this.dragY))
    
    const ctx = this.ctx
    
    // 绘制半透明的塔跟随手指
    this.drawSingleTower(ctx, x, y, this.draggingTower.type, this.draggingTower.level, 0.85)
    
    // 如果有合成目标，绘制连接线和提示
    if (this.mergeTarget && this.mergeTargetType === 'tower') {
      ctx.save()
      ctx.strokeStyle = '#ffd700'
      ctx.lineWidth = 3
      ctx.setLineDash([8, 4])
      ctx.shadowBlur = 10
      ctx.shadowColor = '#ffd700'
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(this.mergeTarget.x, this.mergeTarget.y)
      ctx.stroke()
      
      // 合成目标高亮
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 3
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.arc(this.mergeTarget.x, this.mergeTarget.y, 22, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  },
}
