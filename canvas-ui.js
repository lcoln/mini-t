/**
 * canvas-ui.js — 小游戏模式 UI 层（把原 WXML+WXSS 的界面用 canvas 手绘）
 *
 * 背景：pages/game/game.js 是小程序 Page 架构，UI 原本靠 WXML/WXSS 渲染。
 * 小游戏环境没有 WXML 渲染层，所以状态栏/准备条/塔位圈/仓库/按钮/弹窗都不显示。
 * 本模块在战场 render() 之后叠加绘制这些 UI，并提供触摸命中派发，
 * 复用 game.js 已算好的 data（inventorySlots/blessingOptions/waveChoiceOptions 等），不重写业务逻辑。
 *
 * 用法（在入口 game.js 里）：
 *   const CanvasUI = require('./canvas-ui')
 *   const ui = CanvasUI.create(pageInstance, ctx, { W, H, DPR, CONFIG, TOWER_TYPES })
 *   ui.topInset / ui.bottomInset  → 写进 pageInstance._uiTopInset/_uiBottomInset
 *   包一层 render：先 origRender()，再 ui.draw()
 *   触摸：ui.handleTouchStart(x,y) 返回 true 表示已被 UI 消费
 */

function create(page, ctx, opts) {
  const W = opts.W
  const H = opts.H
  const CONFIG = opts.CONFIG
  const TOWER_TYPES = opts.TOWER_TYPES || {}
  const SAFE_TOP = Math.max(0, Number(opts.SAFE_TOP) || 0)
  const SAFE_BOTTOM = Math.max(0, Number(opts.SAFE_BOTTOM) || 0)
  const MENU_RECT = opts.MENU_RECT || null
  // HUD_BOTTOM：从屏幕顶端到顶栏底边（已含刘海/状态栏），与微信胶囊对齐
  const HUD_BOTTOM = Math.max(
    SAFE_TOP + 44,
    Number(opts.HUD_BOTTOM) || 0,
    MENU_RECT && Number.isFinite(MENU_RECT.bottom) ? Math.ceil(MENU_RECT.bottom + 6) : 0
  )

  // ---- 布局带高度 ----
  // hudH = 屏顶→顶栏底（含安全区）；prep/banner 接在其后
  const HUD_H = HUD_BOTTOM
  const PREP_H = 90
  const BANNER_H = 38
  const INV_H = 188

  // 命中区列表：每帧绘制时重建，touchStart 时倒序遍历命中
  let hitRegions = []

  function addHit(x, y, w, h, handler, meta) {
    hitRegions.push({ x, y, w, h, handler, meta: meta || null })
  }

  function d() { return page.data || {} }

  // ---------- 通用绘制helper ----------
  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + rr, y)
    ctx.arcTo(x + w, y, x + w, y + h, rr)
    ctx.arcTo(x + w, y + h, x, y + h, rr)
    ctx.arcTo(x, y + h, x, y, rr)
    ctx.arcTo(x, y, x + w, y, rr)
    ctx.closePath()
  }

  function text(str, x, y, font, color, align, baseline) {
    ctx.font = font || '13px sans-serif'
    ctx.fillStyle = color || '#fff'
    ctx.textAlign = align || 'left'
    ctx.textBaseline = baseline || 'middle'
    ctx.fillText(str, x, y)
  }

  // 紧凑状态胶囊；maxRight 限制右边界，放不下则返回 0（不画）
  function drawStatPill(x, cy, icon, value, valueColor, suffix, maxRight) {
    const label = value + ''
    const iconW = 16
    ctx.font = 'bold 12px sans-serif'
    const textW = ctx.measureText(label).width
    ctx.font = '10px sans-serif'
    const sufW = suffix ? ctx.measureText(suffix).width + 2 : 0
    const padX = 6
    const w = padX + iconW + textW + sufW + padX
    const h = 26
    if (Number.isFinite(maxRight) && x + w > maxRight) return 0
    const y = cy - h / 2
    roundRect(x, y, w, h, 12)
    ctx.fillStyle = 'rgba(0,0,0,0.34)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    ctx.stroke()
    text(icon, x + padX, cy, '12px sans-serif', '#fff', 'left')
    text(label, x + padX + iconW, cy, 'bold 12px sans-serif', valueColor, 'left')
    if (suffix) text(suffix, x + padX + iconW + textW + 2, cy + 1, '10px sans-serif', 'rgba(255,255,255,0.55)', 'left')
    return w
  }

  function drawCircleBtn(cx, cy, r, emoji, muted) {
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = muted ? 'rgba(120,80,80,0.30)' : 'rgba(70,190,110,0.28)'
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = muted ? 'rgba(255,140,140,0.5)' : 'rgba(90,255,130,0.5)'
    ctx.stroke()
    text(emoji, cx, cy + 1, '14px sans-serif', '#fff', 'center')
  }

  // ---------- 顶部状态栏：竖向对齐胶囊，右侧按钮绝不压到胶囊/分数 ----------
  function drawHUD() {
    ctx.save()
    const g = ctx.createLinearGradient(0, 0, 0, HUD_BOTTOM)
    g.addColorStop(0, 'rgba(30,60,30,0.98)')
    g.addColorStop(1, 'rgba(15,30,15,0.94)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, HUD_BOTTOM)
    ctx.strokeStyle = 'rgba(80,255,80,0.4)'
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(0, HUD_BOTTOM); ctx.lineTo(W, HUD_BOTTOM); ctx.stroke()

    // 垂直中心：优先对齐微信胶囊
    let cy = SAFE_TOP + (HUD_BOTTOM - SAFE_TOP) / 2
    if (MENU_RECT && Number.isFinite(MENU_RECT.top) && Number.isFinite(MENU_RECT.height)) {
      cy = MENU_RECT.top + MENU_RECT.height / 2
    }

    const r = 13
    const gapBtn = 6
    // 右侧留给：音效 + 暂停，再空出胶囊
    let rightLimit = W - 10
    if (MENU_RECT && Number.isFinite(MENU_RECT.left)) {
      rightLimit = MENU_RECT.left - 8
    }
    const pauseCx = rightLimit - r
    const soundCx = pauseCx - r * 2 - gapBtn
    const actionsLeft = soundCx - r - 8

    // 左侧数值：只画放得下的，优先关卡/金币/生命，分数可省略
    let x = 10
    const pills = [
      { icon: '🏰', value: (d().level || 1) + '-' + (d().waveInLevel || 1), color: '#ffffff', suffix: '关' },
      { icon: '💰', value: d().gold || 0, color: '#ffd700', suffix: '' },
      { icon: '❤️', value: d().lives || 0, color: '#ff6666', suffix: '' },
      { icon: '⭐', value: d().score || 0, color: '#ffffff', suffix: '' }
    ]
    for (let i = 0; i < pills.length; i++) {
      const p = pills[i]
      const w = drawStatPill(x, cy, p.icon, p.value, p.color, p.suffix, actionsLeft)
      if (w <= 0) break
      x += w + 5
    }

    drawCircleBtn(soundCx, cy, r, d().soundEnabled ? '🔊' : '🔇', !d().soundEnabled)
    drawCircleBtn(pauseCx, cy, r, '⏸', false)
    addHit(soundCx - r, cy - r, r * 2, r * 2, () => page.toggleSound())
    addHit(pauseCx - r, cy - r, r * 2, r * 2, () => page.togglePause())
    ctx.restore()
  }

  // ---------- 战斗中顶部提示条：祝福 + 波次进度 ----------
  function drawBattleBanner() {
    const y0 = HUD_BOTTOM
    ctx.save()
    const g = ctx.createLinearGradient(0, y0, 0, y0 + BANNER_H)
    g.addColorStop(0, 'rgba(10,22,10,0.92)')
    g.addColorStop(1, 'rgba(6,14,6,0.85)')
    ctx.fillStyle = g
    ctx.fillRect(0, y0, W, BANNER_H)
    ctx.strokeStyle = 'rgba(80,255,80,0.16)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, y0 + BANNER_H); ctx.lineTo(W, y0 + BANNER_H); ctx.stroke()

    const level = d().level || 1
    const waveInLevel = d().waveInLevel || 1
    const totalWaves = d().totalWavesInLevel || 10
    const remaining = Math.max(0, totalWaves - waveInLevel)
    const blessTxt = (d().selectedBlessingIcon || '⚡') + ' ' + (d().selectedBlessingName || '战术祝福')

    text('第' + level + '关 · ' + waveInLevel + '/' + totalWaves + '波',
      12, y0 + 12, 'bold 11px sans-serif', '#ffcc44', 'left')
    text('剩' + remaining + '波 · 第' + (d().nextSupplyWave || 3) + '波补给',
      W - 12, y0 + 12, '10px sans-serif', 'rgba(220,255,220,0.72)', 'right')

    const barX = 12
    const barY = y0 + 20
    const barW = Math.min(120, W * 0.34)
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fillRect(barX, barY, barW, 3)
    ctx.fillStyle = '#ffcc44'
    ctx.fillRect(barX, barY, barW * (waveInLevel / totalWaves), 3)

    text(blessTxt, 12, y0 + 32, 'bold 11px sans-serif', '#f7f5d0', 'left')
    text('拖动同塔合成升级', W - 12, y0 + 32, '10px sans-serif', 'rgba(220,255,220,0.7)', 'right')
    ctx.restore()
  }

  // 胶囊 chip
  function drawChip(x, cy, str, active, subtle) {
    ctx.font = 'bold 11px sans-serif'
    const tw = ctx.measureText(str).width
    const padX = 11
    const w = tw + padX * 2
    const h = 24
    const y = cy - h / 2
    roundRect(x, y, w, h, 12)
    ctx.fillStyle = subtle ? 'rgba(120,255,120,0.05)' : 'rgba(255,255,255,0.05)'
    ctx.fill()
    ctx.lineWidth = active ? 1.5 : 1
    ctx.strokeStyle = active ? 'rgba(255,215,120,0.55)' : (subtle ? 'rgba(120,255,120,0.16)' : 'rgba(255,255,255,0.12)')
    ctx.stroke()
    text(str, x + padX, cy, 'bold 11px sans-serif', subtle ? 'rgba(205,255,205,0.78)' : '#f7f5d0', 'left')
    return w
  }

  // ---------- 战前准备条（紧凑：标题+卡片+开始，少挡地图）----------
  function drawPrepBar() {
    const y0 = HUD_BOTTOM
    ctx.save()
    ctx.fillStyle = 'rgba(12,22,18,0.92)'
    ctx.fillRect(0, y0, W, PREP_H)
    ctx.strokeStyle = 'rgba(120,255,160,0.16)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, y0 + PREP_H); ctx.lineTo(W, y0 + PREP_H); ctx.stroke()

    const hasBless = !!d().selectedBlessingKey
    const fieldCount = d().fieldTowerCount || 0
    const canStart = !!d().canStartBattle

    text(hasBless ? '选下方塔，拖到发光圈' : '先选 1 个战术祝福',
      12, y0 + 14, '12px sans-serif', '#eafff2', 'left')
    text(fieldCount > 0 ? '已布阵 1/1' : '待布阵 0/1',
      W - 12, y0 + 14, '11px sans-serif', fieldCount > 0 ? '#8dffab' : '#c7b28a', 'right')

    const options = d().blessingOptions || []
    const cardW = Math.min(108, (W - 24 - (options.length - 1) * 6) / Math.max(1, options.length))
    const cardH = 34
    const cardY = y0 + 26
    let cx = 12
    for (let i = 0; i < options.length; i++) {
      const opt = options[i]
      const selected = d().selectedBlessingKey === opt.key
      roundRect(cx, cardY, cardW, cardH, 8)
      ctx.fillStyle = selected ? 'rgba(255,215,120,0.22)' : 'rgba(255,255,255,0.06)'
      ctx.fill()
      ctx.strokeStyle = selected ? '#ffd76a' : 'rgba(255,255,255,0.14)'
      ctx.lineWidth = selected ? 2 : 1
      ctx.stroke()
      text((opt.icon || '') + ' ' + (opt.name || ''), cx + cardW / 2, cardY + cardH / 2,
        '11px sans-serif', selected ? '#fff' : '#dce8e0', 'center')
      ;(function (key) { addHit(cx, cardY, cardW, cardH, () => page.selectBlessing({ currentTarget: { dataset: { key } } })) })(opt.key)
      cx += cardW + 6
    }

    const btnW = 132, btnH = 26
    const btnX = (W - btnW) / 2, btnY = y0 + PREP_H - btnH - 5
    roundRect(btnX, btnY, btnW, btnH, 13)
    ctx.fillStyle = canStart ? '#37c26a' : 'rgba(120,140,128,0.35)'
    ctx.fill()
    text('开始第一波', btnX + btnW / 2, btnY + btnH / 2, '13px sans-serif', canStart ? '#fff' : '#9fb0a5', 'center')
    if (canStart) addHit(btnX, btnY, btnW, btnH, () => page.startBattle())
    ctx.restore()
  }

  // ---------- prep 塔位圈（画在战场上，坐标来自 game.js 已算好的百分比）----------
  function drawPrepSlots() {
    const slots = d().prepTowerSlots || []
    if (!slots.length) return
    ctx.save()
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i]
      // left/top 是 "xx%" 字符串，换算回 canvas 逻辑坐标
      const px = (parseFloat(s.left) / 100) * W
      const py = (parseFloat(s.top) / 100) * H
      if (!Number.isFinite(px) || !Number.isFinite(py)) continue
      const r = (CONFIG.cellSize || 30) * 0.42
      const selectable = d().selectedInventoryIndex !== -1 && !s.occupied
      ctx.beginPath()
      ctx.arc(px, py, r, 0, Math.PI * 2)
      ctx.fillStyle = s.occupied ? 'rgba(120,120,120,0.10)' : (selectable ? 'rgba(255,215,120,0.16)' : 'rgba(120,255,120,0.10)')
      ctx.fill()
      ctx.lineWidth = 2
      ctx.setLineDash(selectable ? [] : [4, 4])
      ctx.strokeStyle = s.occupied ? 'rgba(160,160,160,0.5)' : (selectable ? '#ffd76a' : 'rgba(140,255,150,0.6)')
      ctx.stroke()
      ctx.setLineDash([])
      ;(function (row, col) {
        addHit(px - r, py - r, r * 2, r * 2, () => page.handlePrepSlotTap({ currentTarget: { dataset: { row, col } } }))
      })(s.row, s.col)
    }
    ctx.restore()
  }

  // ---------- 底部仓库区（底部再留 Home 指示条安全区）----------
  function drawInventory() {
    const panelH = INV_H + SAFE_BOTTOM
    const y0 = H - panelH
    ctx.save()
    ctx.fillStyle = 'rgba(10,16,13,0.9)'
    ctx.fillRect(0, y0, W, panelH)
    ctx.strokeStyle = 'rgba(120,255,160,0.16)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke()

    // 标题 + 动作按钮
    text('🏰 防御塔仓库', 12, y0 + 16, '13px sans-serif', '#eafff2', 'left')

    // 三个动作按钮：空投 / 指挥 / 召唤
    const btnH = 26, btnY = y0 + 6
    const cp = d().commandPoints || 0
    const btns = [
      { label: '📦空投', sub: cp + '/2', enabled: cp >= 2, handler: () => page.callSupplyDrop() },
      { label: '🛰️指挥', sub: cp + '/' + (d().commanderCost || 3), enabled: cp >= (d().commanderCost || 3), handler: () => page.toggleCommanderTargeting() },
      { label: '✨召唤', sub: '💰' + (d().summonCost || 20), enabled: (d().gold || 0) >= (d().summonCost || 20) && !d().inventoryFull, handler: () => page.summonTower() }
    ]
    const bw = 64
    let bx = W - 12 - (bw * 3 + 12)
    for (let i = 0; i < btns.length; i++) {
      const b = btns[i]
      roundRect(bx, btnY, bw, btnH, 6)
      ctx.fillStyle = b.enabled ? 'rgba(90,180,120,0.28)' : 'rgba(90,100,95,0.18)'
      ctx.fill()
      ctx.strokeStyle = b.enabled ? 'rgba(120,255,160,0.5)' : 'rgba(150,160,155,0.3)'
      ctx.lineWidth = 1; ctx.stroke()
      text(b.label, bx + bw / 2, btnY + 9, '10px sans-serif', b.enabled ? '#eafff2' : '#8a978f', 'center')
      text(b.sub, bx + bw / 2, btnY + 19, '9px sans-serif', b.enabled ? '#cfe8d8' : '#77837b', 'center')
      if (b.enabled) addHit(bx, btnY, bw, btnH, b.handler)
      bx += bw + 6
    }

    // 提示行
    text('无漏怪/杀精英攒战术点 · 2点空投 · 3点集火 · 长按回收', 12, y0 + 38, '9px sans-serif', '#8fb3a1', 'left')

    // 5x4 仓库格
    const COLS = 5, ROWS = 4
    const gridTop = y0 + 50
    const gap = 6
    const cellW = (W - 24 - (COLS - 1) * gap) / COLS
    const cellH = Math.min(cellW, (INV_H - 56 - (ROWS - 1) * gap) / ROWS)
    const slots = d().inventorySlots || []
    const invSlotRects = []
    for (let idx = 0; idx < COLS * ROWS; idx++) {
      const r = Math.floor(idx / COLS)
      const c = idx % COLS
      const cx = 12 + c * (cellW + gap)
      const cyy = gridTop + r * (cellH + gap)
      // 供拖拽合成命中：屏幕逻辑坐标矩形（与 clientX/Y 同系）
      invSlotRects.push({ left: cx, top: cyy, width: cellW, height: cellH })
      const item = slots[idx]
      const selected = d().selectedInventoryIndex === idx
      roundRect(cx, cyy, cellW, cellH, 8)
      ctx.fillStyle = item ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)'
      ctx.fill()
      ctx.strokeStyle = selected ? '#ffd76a' : (item ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)')
      ctx.lineWidth = selected ? 2 : 1
      ctx.stroke()
      if (item) {
        const tt = TOWER_TYPES[item.type] || {}
        // 塔身圆
        ctx.beginPath()
        ctx.arc(cx + cellW / 2, cyy + cellH / 2 - 4, Math.min(cellW, cellH) * 0.26, 0, Math.PI * 2)
        ctx.fillStyle = tt.color || '#8bff7b'
        ctx.fill()
        text(tt.emoji || '✨', cx + cellW / 2, cyy + cellH / 2 - 4, '16px sans-serif', '#fff', 'center')
        text('Lv.' + item.level, cx + cellW / 2, cyy + cellH - 8, '9px sans-serif', '#ffd76a', 'center')
      } else {
        text('+', cx + cellW / 2, cyy + cellH / 2, '18px sans-serif', 'rgba(255,255,255,0.25)', 'center')
      }
      ;(function (index) {
        addHit(cx, cyy, cellW, cellH, null, { kind: 'invSlot', index: index })
      })(idx)
    }
    ctx.restore()

    // 把仓库格的屏幕矩形暴露给 page，供拖拽合成命中检测（替代 WXML 的 refreshInventoryRect）
    page.inventorySlotRects = invSlotRects
    page.inventoryRect = {
      left: 12, top: gridTop, width: W - 24, height: (cellH + gap) * ROWS
    }
  }

  // ---------- 弹窗（补给/暂停/结束）----------
  function drawOverlay() {
    const gs = d().gameState
    const showChoice = d().showWaveChoice
    if (!showChoice && gs !== 'paused' && gs !== 'gameover') return

    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.62)'
    ctx.fillRect(0, 0, W, H)

    const panelW = Math.min(300, W - 48)
    let panelH = 240
    const panelX = (W - panelW) / 2
    const panelY = (H - panelH) / 2

    if (showChoice) {
      const options = d().waveChoiceOptions || []
      panelH = 96 + options.length * 58
      const py = (H - panelH) / 2
      roundRect(panelX, py, panelW, panelH, 14)
      ctx.fillStyle = '#14201a'; ctx.fill()
      ctx.strokeStyle = 'rgba(120,255,160,0.3)'; ctx.lineWidth = 1; ctx.stroke()
      text(d().waveChoicePanelTitle || '战术补给', panelX + panelW / 2, py + 24, '17px sans-serif', '#ffd76a', 'center')
      text(d().waveChoiceTitle || '', panelX + panelW / 2, py + 48, '12px sans-serif', '#cfe8d8', 'center')
      let oy = py + 68
      for (let i = 0; i < options.length; i++) {
        const opt = options[i]
        roundRect(panelX + 16, oy, panelW - 32, 50, 10)
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1; ctx.stroke()
        text((opt.icon || '') + ' ' + (opt.title || ''), panelX + 28, oy + 16, '13px sans-serif', '#fff', 'left')
        text(opt.description || '', panelX + 28, oy + 34, '10px sans-serif', '#9fc9b4', 'left')
        ;(function (key) { addHit(panelX + 16, oy, panelW - 32, 50, () => page.applyWaveChoice({ currentTarget: { dataset: { key } } })) })(opt.key)
        oy += 58
      }
    } else if (gs === 'paused') {
      roundRect(panelX, panelY, panelW, panelH, 14)
      ctx.fillStyle = '#14201a'; ctx.fill()
      ctx.strokeStyle = 'rgba(120,255,160,0.3)'; ctx.lineWidth = 1; ctx.stroke()
      text('游戏暂停', panelX + panelW / 2, panelY + 28, '18px sans-serif', '#ffd76a', 'center')
      text('第' + (d().level || 1) + '关 第' + (d().waveInLevel || 1) + '/' + (d().totalWavesInLevel || 10) + '波', panelX + panelW / 2, panelY + 58, '12px sans-serif', '#cfe8d8', 'center')
      text('💰 ' + (d().gold || 0), panelX + panelW / 2, panelY + 80, '13px sans-serif', '#ffd76a', 'center')
      drawPanelBtn(panelX, panelY + 108, panelW, '继续游戏', '#37c26a', () => page.resumeGame())
      drawPanelBtn(panelX, panelY + 150, panelW, '重新开始', 'rgba(255,255,255,0.12)', () => page.restartGame())
      drawPanelBtn(panelX, panelY + 192, panelW, '返回菜单', 'rgba(255,255,255,0.12)', () => page.backToMenu())
    } else if (gs === 'gameover') {
      roundRect(panelX, panelY, panelW, panelH, 14)
      ctx.fillStyle = '#20140f'; ctx.fill()
      ctx.strokeStyle = 'rgba(255,120,120,0.4)'; ctx.lineWidth = 1; ctx.stroke()
      text('💀 防守失败!', panelX + panelW / 2, panelY + 30, '18px sans-serif', '#ff8a8a', 'center')
      text('最终分数 ' + (d().score || 0), panelX + panelW / 2, panelY + 64, '15px sans-serif', '#fff', 'center')
      text('坚持波数 ' + (d().wave || 0), panelX + panelW / 2, panelY + 90, '12px sans-serif', '#cfe8d8', 'center')
      if (d().isNewRecord) text('🏆 新纪录!', panelX + panelW / 2, panelY + 112, '13px sans-serif', '#ffd76a', 'center')
      drawPanelBtn(panelX, panelY + 138, panelW, '再来一局', '#37c26a', () => page.restartGame())
      drawPanelBtn(panelX, panelY + 184, panelW, '返回菜单', 'rgba(255,255,255,0.12)', () => page.backToMenu())
    }
    ctx.restore()
  }

  function drawPanelBtn(panelX, y, panelW, label, color, handler) {
    const btnW = panelW - 48, btnX = panelX + 24, btnH = 32
    roundRect(btnX, y, btnW, btnH, 16)
    ctx.fillStyle = color; ctx.fill()
    text(label, btnX + btnW / 2, y + btnH / 2, '14px sans-serif', '#fff', 'center')
    addHit(btnX, y, btnW, btnH, handler)
  }

  // ---------- 主绘制入口 ----------
  function draw() {
    hitRegions = []
    ctx.save()
    ctx.setTransform(opts.DPR, 0, 0, opts.DPR, 0, 0)
    ctx.globalAlpha = 1
    ctx.shadowBlur = 0
    ctx.setLineDash([])

    const gs = d().gameState
    drawHUD()
    if (gs === 'prep') {
      drawPrepBar()
      drawPrepSlots()
    } else if (gs !== 'menu') {
      drawBattleBanner()
    }
    drawInventory()
    drawOverlay()
    ctx.restore()
  }

  // ---------- 触摸命中派发 ----------
  // 返回值：
  //   false           → 未命中 UI，交给战场（拖场上塔）
  //   true            → 命中并已消费（按钮/祝福/塔位/弹窗）
  //   {invSlotIndex}  → 命中仓库格，需由入口启动拖拽链（保留原拖拽合成手感）
  function handleTouchStart(x, y) {
    // 倒序：后画的（弹窗/按钮）在上层，优先命中
    for (let i = hitRegions.length - 1; i >= 0; i--) {
      const r = hitRegions[i]
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        // 仓库格：不直接执行，返回描述符让入口走拖拽链
        if (r.meta && r.meta.kind === 'invSlot') {
          return { invSlotIndex: r.meta.index }
        }
        if (typeof r.handler === 'function') {
          try { r.handler() } catch (e) { console.error('[canvas-ui] hit handler err:', e) }
          page.needsRender = true
        }
        return true
      }
    }
    return false
  }

  return {
    // hudH 已含刘海到顶栏底，勿再加 SAFE_TOP
    topInset: HUD_H + PREP_H,
    bottomInset: INV_H + SAFE_BOTTOM,
    safeTop: SAFE_TOP,
    safeBottom: SAFE_BOTTOM,
    hudH: HUD_H,
    prepH: PREP_H,
    bannerH: BANNER_H,
    invH: INV_H,
    draw,
    handleTouchStart
  }
}

module.exports = { create }
