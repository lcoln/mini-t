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
const renderTowers = require('./render-towers')
const renderMonsters = require('./render-monsters')
const renderEffects = require('./render-effects')

const HIGH_LEVEL_TOWER_DAMAGE_GROWTH = 1.42
const TOWER_RANGE_PER_LEVEL = 6
const TOWER_SPEED_GAIN_PER_LEVEL = 55
const MIN_TOWER_ATTACK_INTERVAL = 480

function hslToHex(hue, saturation, lightness) {
  const h = ((hue % 360) + 360) % 360
  const s = Math.max(0, Math.min(100, saturation)) / 100
  const l = Math.max(0, Math.min(100, lightness)) / 100
  const chroma = (1 - Math.abs(2 * l - 1)) * s
  const x = chroma * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - chroma / 2
  let rgb = [0, 0, 0]
  if (h < 60) rgb = [chroma, x, 0]
  else if (h < 120) rgb = [x, chroma, 0]
  else if (h < 180) rgb = [0, chroma, x]
  else if (h < 240) rgb = [0, x, chroma]
  else if (h < 300) rgb = [x, 0, chroma]
  else rgb = [chroma, 0, x]
  return `#${rgb.map((value) => Math.round((value + m) * 255).toString(16).padStart(2, '0')).join('')}`
}

function hslaColor(hue, saturation, lightness, alpha) {
  const hex = hslToHex(hue, saturation, lightness)
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

Page(Object.assign({
  data: {
    wave: 1,
    score: 0,
    gold: 100,
    lives: 20,
    gameState: 'prep',
    showMergeHint: false,
    isNewRecord: false,
    gridOffsetX: 0,
    gridOffsetY: 60,
    // 关卡与波次信息
    level: 1,           // 当前关卡（每10波一关）
    waveInLevel: 1,     // 当前关卡内第几波
    totalWavesInLevel: 10, // 每关总波数
    // 底部仓库
    inventorySlots: [],
    summonCost: 20,
    inventoryFull: false,
    canvasRect: null,
    draggingSlotIndex: -1,
    mergeTargetSlotIndex: -1,
    mergeCost: 0,
    mergeTargetNextLevel: 2,
    dragFloating: false,
    dragFloatingX: 0,
    dragFloatingY: 0,
    dragFloatingEmoji: '✨',
    dragFloatingColor: '#8bff7b',
    dragFloatingLevel: 1,
    dragFloatingType: 'fire',
    // 当前地形主题
    currentTheme: 'forest',
    selectedBlessingKey: '',
    selectedBlessingName: '尚未选择战术祝福',
    selectedBlessingIcon: '✨',
    selectedBlessingDescription: '选择后会立刻生效，并持续整局。',
    blessingOptions: Object.values(BLESSINGS),
    fieldTowerCount: 0,
    canStartBattle: false,
    selectedInventoryIndex: -1,
    prepTowerSlots: [],
    prepActionHint: '先选祝福',
    runBuffSummary: '未激活',
    nextSupplyWave: 3,
    showWaveChoice: false,
    waveChoiceMode: '',
    waveChoicePanelTitle: '战术补给',
    waveChoiceTitle: '',
    waveChoiceHint: '',
    waveChoiceOptions: [],
    pendingSpecializationTowerId: null,
    pendingSpecializationSource: '',
    choiceReturnState: 'playing',
    activeChainIcon: '',
    activeChainTitle: '',
    activeChainDescription: '',
    currentThreatIcon: '🐜',
    currentThreatTitle: '虫潮奔袭',
    currentThreatDescription: '敌人更多，但单体更脆。',
    currentThreatCounterText: '推荐：火焰 / 闪电',
    threatMissionText: '压制 0/6',
    threatMissionReady: false,
    commanderCost: COMMANDER_COST,
    commanderAiming: false,
    commanderReadyText: '3 点可火力标记',
    commandPoints: 0,
    soundEnabled: true,
    isIOS: false,
    inventoryBottomStyle: ''
  },

  canvas: null,
  ctx: null,
  gameLoop: null,
  
  // 游戏对象
  towers: [],        // 场上的塔
  inventory: [],     // 仓库的塔
  monsters: [],
  projectiles: [],
  particles: [],
  floatingTexts: [],
  lightningEffects: [],
  fireEffects: [],      // 火焰特效
  iceEffects: [],       // 冰霜特效
  poisonEffects: [],    // 毒雾特效
  arcaneEffects: [],    // 奥术特效
  mergeEffects: [],     // 合成特效
  
  pathPoints: [],
  grid: [],
  pathDecorations: [],  // 预生成的路径装饰，避免每帧随机
  mapDecorations: [],   // 预生成的地图装饰
  commanderZone: null,
  
  waveMonsters: [],
  spawnIndex: 0,
  lastSpawnTime: 0,
  waveComplete: false,
  blessingApplied: false,
  scheduledTimeouts: [],
  pendingWaveAdvance: null,
  runDamageBonus: 0,
  runRangeBonus: 0,
  runAttackSpeedBonus: 0,
  needsRender: true,
  lastIdleRenderAt: 0,
  lastDragUiUpdateAt: 0,
  lastMergeHintVisible: false,
  lastMergeHintSlotIndex: -1,
  inventoryRect: null,
  windowWidth: 375,
  
  // 拖动 - 优化
  draggingTower: null,
  draggingFromInventory: false,
  draggingInventoryIndex: -1,
  dragStartX: 0,
  dragStartY: 0,
  dragX: 0,
  dragY: 0,
  isDragging: false,
  mergeTarget: null,
  dragOffsetX: 0,
  dragOffsetY: 0,
  pendingDragTower: null,    // 待拖动的塔
  dragStartClientX: 0,       // 触摸起始位置X
  dragStartClientY: 0,       // 触摸起始位置Y
  hasMoved: false,           // 是否已经开始移动
  dragThreshold: 8,          // 拖动阈值（降低）
  touchStartTime: 0,         // 触摸开始时间
  mergeTargetType: null,
  mergeTargetInventoryIndex: -1,

  onLoad() {
    this.setupIOSGestureSafeArea()
    this.enableLeaveGuard()
    this.initSoundSettings()
    this.initCanvas()
  },

  onShow() {
    this.enableLeaveGuard()
    if (this.canvas && !this.gameLoop) {
      this.startGame()
      this.requestRender()
    }
    if (this.soundEnabled && this.data.gameState === 'playing') {
      this.syncAmbientTrack()
    }
  },

  onShareAppMessage() {
    return {
      title: `合成塔防：我已经守到第${this.data.level || 1}关，你能超过吗？`,
      path: '/pages/index/index'
    }
  },

  onHide() {
    this.persistRunProgress({ immediate: true })
    this.stopAllSounds()
    this.stopGame()
  },

  onUnload() {
    if (this._prepLayoutSyncTimer) {
      clearTimeout(this._prepLayoutSyncTimer)
      this._prepLayoutSyncTimer = null
    }
    this.persistRunProgress({ immediate: true })
    this.stopGame()
    this.destroySoundPool()
  },

  // 微信 iOS 7.0.5+ 强制保留边缘侧滑返回，无法通过 disableSwipeBack 关闭。
  // 用离页确认拦截误滑；主动“返回菜单”时会先关闭确认。
  enableLeaveGuard() {
    if (this._leaveGuardEnabled || typeof wx.enableAlertBeforeUnload !== 'function') return
    try {
      wx.enableAlertBeforeUnload({
        message: '战局正在进行，确定要离开吗？进度会自动保存。',
        success: () => {
          this._leaveGuardEnabled = true
        }
      })
    } catch (error) {
      this._leaveGuardEnabled = false
    }
  },

  disableLeaveGuard() {
    if (typeof wx.disableAlertBeforeUnload !== 'function') return
    try {
      wx.disableAlertBeforeUnload()
    } catch (error) {
      // 低版本基础库不支持时忽略
    }
    this._leaveGuardEnabled = false
  },

  setupIOSGestureSafeArea() {
    try {
      const info = wx.getWindowInfo()
      const isIOS = info.platform === 'ios'
      if (!isIOS) {
        this.setData({ isIOS: false, inventoryBottomStyle: '' })
        return
      }

      const safeBottom = info.safeArea && Number.isFinite(info.safeArea.bottom)
        ? Math.max(0, (info.screenHeight || info.windowHeight) - info.safeArea.bottom)
        : 0
      // Home 指示条本身约 34px，再多留 18px，避免从塔位起手时进入系统横滑区。
      const gestureInset = Math.max(44, safeBottom + 18)
      this.setData({
        isIOS: true,
        inventoryBottomStyle: `padding-bottom: ${gestureInset}px;`
      })
    } catch (error) {
      this.setData({ isIOS: false, inventoryBottomStyle: '' })
    }
  },

  initCanvas() {
    // 等 flex 布局完成后再量尺寸，否则 height 可能是 0/旧值
    wx.nextTick(() => {
      wx.createSelectorQuery()
        .select('#gameCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) return

          const canvas = res[0].node
          const ctx = canvas.getContext('2d')

          const systemInfo = wx.getWindowInfo()
          const dpr = systemInfo.pixelRatio || 2
          this.windowWidth = systemInfo.windowWidth || 375
          this._canvasDpr = dpr
          canvas.width = res[0].width * dpr
          canvas.height = res[0].height * dpr
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

          this.canvas = canvas
          this.ctx = ctx
          this.updateCanvasMetrics(res[0].width, res[0].height)
          this.refreshCanvasRect()
          this.refreshInventoryRect()

          if (!this.tryRestoreRunProgress()) {
            this.initGame()
          }
          this.startGame()
        })
    })
  },

  // flex 高度变化后重绑 canvas，并刷新路径/准备塔位（prep 圈与路径必须同一套坐标）
  remeasureCanvasLayout() {
    wx.nextTick(() => {
      wx.createSelectorQuery()
        .select('#gameCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node || !this.ctx) return
          const width = res[0].width
          const height = res[0].height
          if (!Number.isFinite(width) || !Number.isFinite(height) || height < 8) return

          const dpr = this._canvasDpr || (wx.getWindowInfo().pixelRatio || 2)
          const prevW = CONFIG.canvasWidth || 0
          const prevH = CONFIG.canvasHeight || 0
          const dw = Math.abs(width - prevW)
          const dh = Math.abs(height - prevH)
          // 游玩中忽略亚像素/布局抖动，避免整图重建造成地图晃动
          const playing = this.data.gameState === 'playing'
          const sizeTol = playing ? 8 : 1
          const sameSize = dw < sizeTol && dh < sizeTol
          if (!sameSize) {
            const canvas = res[0].node
            canvas.width = width * dpr
            canvas.height = height * dpr
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            this.canvas = canvas
            this.updateCanvasMetrics(width, height)
          } else if (this.data.gameState === 'prep') {
            // 仅准备阶段、尺寸未变时轻量同步塔位圈，绝不重随机器装饰
            this.rebuildGridFromTowers()
            this.syncPrepTowerSlots(this.data.currentTheme || 'forest')
            this.requestRender()
          }
          this.refreshCanvasRect()
        })
    })
  },

  // prep-hud 较大，首帧布局常未完成；延迟再测一两次
  schedulePrepLayoutSync() {
    this.remeasureCanvasLayout()
    if (this._prepLayoutSyncTimer) {
      clearTimeout(this._prepLayoutSyncTimer)
    }
    this._prepLayoutSyncTimer = setTimeout(() => {
      this._prepLayoutSyncTimer = null
      this.remeasureCanvasLayout()
    }, 120)
  },

  getGridOffsetX() {
    return Number.isFinite(this._gridOffsetX) ? this._gridOffsetX : (this.data.gridOffsetX || 0)
  },

  getGridOffsetY() {
    return Number.isFinite(this._gridOffsetY) ? this._gridOffsetY : (this.data.gridOffsetY || 0)
  },

  updateCanvasMetrics(width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 8 || height < 8) {
      return
    }

    // Canvas 尺寸变化会让部分真机上的旧 CanvasGradient 失效，必须重建。
    this._cachedBgGradientKey = ''
    this._cachedBgGradient = null

    // 上下留白给塔尖/塔座；整块网格必须落在 canvas 内，绝不能伸进仓库区域
    const topInset = 20
    const bottomInset = 36
    const maxCellByWidth = Math.floor(width / CONFIG.gridCols)
    const maxCellByHeight = Math.floor(
      (height - topInset - bottomInset) / CONFIG.gridRows
    )
    const nextCellSize = Math.max(1, Math.min(34, maxCellByWidth, maxCellByHeight))

    const gridWidth = CONFIG.gridCols * nextCellSize
    const gridHeight = CONFIG.gridRows * nextCellSize
    const gridOffsetX = Math.max(0, Math.floor((width - gridWidth) / 2))
    const availableY = height - topInset - bottomInset
    const gridOffsetY = topInset + Math.max(0, Math.floor((availableY - gridHeight) / 2))

    const prevW = CONFIG.canvasWidth || width
    const prevH = CONFIG.canvasHeight || height
    const prevCell = CONFIG.cellSize
    const prevOx = this.getGridOffsetX()
    const prevOy = this.getGridOffsetY()
    const metricsUnchanged =
      Math.abs(prevW - width) < 0.5 &&
      Math.abs(prevH - height) < 0.5 &&
      prevCell === nextCellSize &&
      prevOx === gridOffsetX &&
      prevOy === gridOffsetY

    if (metricsUnchanged) {
      return
    }

    CONFIG.canvasWidth = width
    CONFIG.canvasHeight = height
    CONFIG.cellSize = nextCellSize

    // 同步写入，避免 setData 异步期间读到旧 offset
    this._gridOffsetX = gridOffsetX
    this._gridOffsetY = gridOffsetY
    this.data.gridOffsetX = gridOffsetX
    this.data.gridOffsetY = gridOffsetY

    const themeKey = this.data.currentTheme || 'forest'
    const hasDressing = Array.isArray(this.grassDots) && this.grassDots.length > 0
    const refreshDressing = !hasDressing
    // 局中只重算路径几何并等比缩放装饰，避免随机重生成导致整图抖动
    // 格子尺寸/偏移一变，路径几何必变，塔位必须跟着重算，否则圈会漂离路边
    this.generatePath(themeKey, {
      refreshDressing,
      rebuildSlots: true,
      relocateTowers: this.data.gameState === 'prep' || this.data.gameState === 'playing'
    })
    if (!refreshDressing) {
      this.scaleBattlefieldDressing(prevW, prevH, width, height)
    }
    if (Array.isArray(this.grid) && this.grid.length === CONFIG.gridRows) {
      this.rebuildGridFromTowers()
      this.syncPrepTowerSlots(themeKey)
    }

    // gridOffset 仅缓存给逻辑用，避免无意义 setData 触发视图层抖动
    if (this.data.gridOffsetX !== gridOffsetX || this.data.gridOffsetY !== gridOffsetY) {
      this.setData({ gridOffsetX, gridOffsetY })
    }
    this.requestRender()
  },

  scaleBattlefieldDressing(prevW, prevH, nextW, nextH) {
    if (!prevW || !prevH || (prevW === nextW && prevH === nextH)) return
    const sx = nextW / prevW
    const sy = nextH / prevH
    if (!Number.isFinite(sx) || !Number.isFinite(sy)) return
    if (Math.abs(sx - 1) < 0.001 && Math.abs(sy - 1) < 0.001) return

    const scalePoint = (p) => {
      if (!p) return
      if (Number.isFinite(p.x)) p.x *= sx
      if (Number.isFinite(p.y)) p.y *= sy
    }

    ;(this.grassDots || []).forEach(scalePoint)
    ;(this.grassTufts || []).forEach(scalePoint)
    ;(this.mapDecorations || []).forEach(scalePoint)

    // 局中实体随画布缩放，避免怪/弹道停在旧坐标系里“跳一下”
    ;(this.monsters || []).forEach(scalePoint)
    ;(this.projectiles || []).forEach((p) => {
      scalePoint(p)
      if (Array.isArray(p.trail)) p.trail.forEach(scalePoint)
    })
    ;(this.particles || []).forEach(scalePoint)
    ;(this.floatingTexts || []).forEach(scalePoint)
    ;(this.lightningEffects || []).forEach(scalePoint)
    ;(this.fireEffects || []).forEach(scalePoint)
    ;(this.iceEffects || []).forEach(scalePoint)
    ;(this.poisonEffects || []).forEach(scalePoint)
    ;(this.arcaneEffects || []).forEach(scalePoint)
    ;(this.mergeEffects || []).forEach(scalePoint)
  },

  requestRender() {
    this.needsRender = true
  },

  refreshCanvasRect() {
    wx.nextTick(() => {
      wx.createSelectorQuery().select('#gameCanvas').boundingClientRect((rect) => {
        if (!rect) return
        this.cachedCanvasRect = rect
        // 仅缓存，不 setData，避免拖拽/重测时视图层跟着抖
      }).exec()
    })
  },

  refreshInventoryRect() {
    wx.nextTick(() => {
      wx.createSelectorQuery()
        .select('.inventory-grid')
        .boundingClientRect()
        .selectAll('.inventory-slot')
        .boundingClientRect()
        .exec((res) => {
          if (!res) return
          if (res[0]) this.inventoryRect = res[0]
          if (Array.isArray(res[1])) this.inventorySlotRects = res[1]
        })
    })
  },

  scheduleTimeout(callback, delay) {
    const timeoutId = setTimeout(() => {
      this.scheduledTimeouts = this.scheduledTimeouts.filter((id) => id !== timeoutId)
      callback()
    }, delay)
    this.scheduledTimeouts.push(timeoutId)
    return timeoutId
  },

  clearScheduledTimeouts() {
    this.scheduledTimeouts.forEach((timeoutId) => clearTimeout(timeoutId))
    this.scheduledTimeouts = []
    this.pendingWaveAdvance = null
  },

  trimEffectQueue(queueName, limit) {
    if (!this[queueName] || this[queueName].length <= limit) return
    this[queueName].splice(0, this[queueName].length - limit)
  },

  getDynamicEffectLimits() {
    const monsterCount = this.monsters ? this.monsters.length : 0
    const profileKey = this.performanceProfileKey || 'relaxed'
    let scale = 1
    if (profileKey === 'busy' || monsterCount >= 20) scale = 0.45
    if (profileKey === 'intense' || monsterCount >= 34) scale = 0.28
    const scaleLimit = (n) => Math.max(8, Math.floor(n * scale))
    return {
      particles: scaleLimit(PERFORMANCE_LIMITS.particles),
      floatingTexts: scaleLimit(PERFORMANCE_LIMITS.floatingTexts),
      lightningEffects: scaleLimit(PERFORMANCE_LIMITS.lightningEffects),
      fireEffects: scaleLimit(PERFORMANCE_LIMITS.fireEffects),
      iceEffects: scaleLimit(PERFORMANCE_LIMITS.iceEffects),
      poisonEffects: scaleLimit(PERFORMANCE_LIMITS.poisonEffects),
      arcaneEffects: scaleLimit(PERFORMANCE_LIMITS.arcaneEffects),
      mergeEffects: scaleLimit(PERFORMANCE_LIMITS.mergeEffects)
    }
  },

  enforcePerformanceCaps() {
    const particlesBefore = this.particles ? this.particles.length : 0
    const projectilesBefore = this.projectiles ? this.projectiles.length : 0
    const limits = this.getDynamicEffectLimits()

    this.trimEffectQueue('particles', limits.particles)
    this.trimEffectQueue('floatingTexts', limits.floatingTexts)
    this.trimEffectQueue('lightningEffects', limits.lightningEffects)
    this.trimEffectQueue('fireEffects', limits.fireEffects)
    this.trimEffectQueue('iceEffects', limits.iceEffects)
    this.trimEffectQueue('poisonEffects', limits.poisonEffects)
    this.trimEffectQueue('arcaneEffects', limits.arcaneEffects)
    this.trimEffectQueue('mergeEffects', limits.mergeEffects)

    const trailLimit = this.getProjectileTrailLimit()
    this.projectiles.forEach((proj) => {
      if (proj.trail && proj.trail.length > trailLimit) {
        proj.trail.splice(0, proj.trail.length - trailLimit)
      }
    })

    // 防御性硬上限：防止后期/Boss 波弹丸与怪物瞬时堆积把堆冲爆
    const MAX_PROJECTILES_HARD = this.performanceProfileKey === 'intense' ? 70 : 110
    if (this.projectiles.length > MAX_PROJECTILES_HARD) {
      this.projectiles.splice(0, this.projectiles.length - MAX_PROJECTILES_HARD)
    }
    const MAX_MONSTERS_HARD = 56
    if (this.monsters.length > MAX_MONSTERS_HARD) {
      this.monsters.splice(0, this.monsters.length - MAX_MONSTERS_HARD)
    }

    // 禁止每帧 triggerGC（会造成明显卡顿/画面抖动）；仅在大量裁剪后且限频调用
    const trimmedHard =
      particlesBefore - (this.particles ? this.particles.length : 0) > 40 ||
      projectilesBefore - (this.projectiles ? this.projectiles.length : 0) > 40
    const now = Date.now()
    if (
      trimmedHard &&
      typeof wx !== 'undefined' &&
      typeof wx.triggerGC === 'function' &&
      now - (this.lastTriggerGcAt || 0) > 8000
    ) {
      this.lastTriggerGcAt = now
      try { wx.triggerGC() } catch (e) {}
    }
  },

  getNextSupplyWave(baseWave = this.data.wave) {
    return Math.ceil(baseWave / 3) * 3
  },

  updateRunBuffSummary(baseWave = this.data.wave) {
    const summaryParts = []
    if (this.runDamageBonus > 0) summaryParts.push(`伤害+${this.runDamageBonus}`)
    if (this.runAttackSpeedBonus > 0) summaryParts.push(`攻速+${this.runAttackSpeedBonus}ms`)
    if (this.runRangeBonus > 0) summaryParts.push(`射程+${this.runRangeBonus}`)

    this.setData({
      runBuffSummary: summaryParts.length ? summaryParts.join(' / ') : '未激活',
      nextSupplyWave: this.getNextSupplyWave(baseWave)
    })
  },

  refreshAllTowerStats(blessingKey = this.data.selectedBlessingKey) {
    this.inventory = this.inventory.map((tower) => ({
      ...tower,
      ...this.getTowerStatsForLevel(tower.type, tower.level, 'inventory', blessingKey)
    }))

    this.towers = this.towers.map((tower) => ({
      ...tower,
      ...this.getTowerStatsForLevel(tower.type, tower.level, 'field', blessingKey),
      lastAttack: tower.lastAttack || 0
    }))

    this.updateInventoryDisplay()
    this.requestRender()
  },

  initSoundSettings() {
    const stored = wx.getStorageSync(AUDIO_SETTING_KEY)
    const soundEnabled = typeof stored === 'boolean' ? stored : true
    this.soundEnabled = soundEnabled
    this.setData({ soundEnabled })
    this.ensureSoundPool()
  },

  ensureSoundPool(key = '') {
    if (!this.soundInitialized) {
      this.soundPool = {}
      this.soundPoolCursor = {}
      this.soundLastPlayedAt = {}
      this.soundInitialized = true
    }

    // 按需创建，避免进游戏一次性初始化数十个 InnerAudioContext。
    if (!key || String(key).endsWith('Ambience') || !SOUND_ASSETS[key] || this.soundPool[key]) return

    const configuredSize = SOUND_POOL_SIZES[key] || 1
    const size = Math.min(configuredSize, String(key).includes('Attack') ? 2 : 1)
    this.soundPool[key] = []
    this.soundPoolCursor[key] = 0

    for (let i = 0; i < size; i++) {
      try {
        const audio = wx.createInnerAudioContext()
        audio.src = SOUND_ASSETS[key]
        audio.autoplay = false
        audio.loop = false
        audio.obeyMuteSwitch = true
        audio.volume = SOUND_VOLUMES[key] ?? 0.5
        this.soundPool[key].push(audio)
      } catch (error) {
        // 忽略单个音频实例初始化失败
      }
    }
  },

  ensureAmbientAudio() {
    if (this.ambientAudio) return this.ambientAudio

    try {
      const audio = wx.createInnerAudioContext()
      audio.autoplay = false
      audio.loop = true
      audio.obeyMuteSwitch = true
      this.ambientAudio = audio
      return audio
    } catch (error) {
      this.ambientAudio = null
      return null
    }
  },

  syncAmbientTrack(themeKey = this.data.currentTheme) {
    if (!this.soundEnabled) return

    const ambientKey = AMBIENT_TRACKS[themeKey]
    if (!ambientKey || !SOUND_ASSETS[ambientKey]) return

    const audio = this.ensureAmbientAudio()
    if (!audio) return

    try {
      audio.volume = SOUND_VOLUMES[ambientKey] ?? 0.16
      if (this.ambientKey !== ambientKey) {
        audio.stop()
        audio.src = SOUND_ASSETS[ambientKey]
        this.ambientKey = ambientKey
      }
      audio.play()
    } catch (error) {
      // 忽略环境音失败
    }
  },

  stopAmbientTrack() {
    if (!this.ambientAudio) return
    try {
      this.ambientAudio.stop()
    } catch (error) {
      // 忽略停止失败
    }
  },

  playSound(key, options = {}) {
    if (!this.soundEnabled) return
    this.ensureSoundPool(key)

    const pool = this.soundPool && this.soundPool[key]
    if (!pool || pool.length === 0) return

    const cooldown = options.cooldown ?? SOUND_COOLDOWNS[key] ?? 0
    const cooldownKey = options.cooldownKey || key
    const now = Date.now()
    const lastAt = this.soundLastPlayedAt[cooldownKey] || 0
    if (cooldown > 0 && now - lastAt < cooldown) {
      return
    }
    this.soundLastPlayedAt[cooldownKey] = now

    const cursor = this.soundPoolCursor[key] || 0
    const audio = pool[cursor % pool.length]
    this.soundPoolCursor[key] = (cursor + 1) % pool.length
    if (!audio) return

    try {
      audio.stop()
      if (typeof audio.seek === 'function') {
        audio.seek(0)
      }
      audio.volume = options.volume ?? SOUND_VOLUMES[key] ?? 0.5
      audio.play()
    } catch (error) {
      // 低端机或未解锁音频时静默降级
    }
  },

  playTowerAttackSound(tower) {
    if (!tower) return

    const soundConfig = TOWER_ATTACK_SOUNDS[tower.type] || TOWER_ATTACK_SOUNDS.fire
    if (!soundConfig) return

    const soundKeys = soundConfig.keys || [soundConfig.key]
    const level = Math.max(1, tower.level || 1)
    const variantIndex = (level + (this.renderFrameCount || 0)) % soundKeys.length
    const soundKey = soundKeys[variantIndex]
    const baseVolume = SOUND_VOLUMES[soundKey] ?? 0.22
    const levelBoost = Math.min((level - 1) * (soundConfig.levelBoost || 0.015), 0.08)

    this.playSound(soundKey, {
      volume: Math.min(baseVolume + levelBoost, 0.34),
      cooldownKey: soundConfig.cooldownKey || soundKey
    })
  },

  stopAllSounds() {
    Object.values(this.soundPool || {}).forEach((pool) => {
      ;(pool || []).forEach((audio) => {
        try {
          audio.stop()
        } catch (error) {
          // 忽略停止失败
        }
      })
    })
    this.stopAmbientTrack()
  },

  destroySoundPool() {
    this.stopAllSounds()
    Object.values(this.soundPool || {}).forEach((pool) => {
      ;(pool || []).forEach((audio) => {
        try {
          audio.destroy()
        } catch (error) {
          // 忽略销毁失败
        }
      })
    })
    if (this.ambientAudio) {
      try {
        this.ambientAudio.destroy()
      } catch (error) {
        // 忽略销毁失败
      }
    }
    this.ambientAudio = null
    this.ambientKey = ''
    this.soundPool = {}
    this.soundPoolCursor = {}
    this.soundLastPlayedAt = {}
    this.soundInitialized = false
  },

  toggleSound() {
    const nextEnabled = !this.soundEnabled
    this.soundEnabled = nextEnabled
    wx.setStorageSync(AUDIO_SETTING_KEY, nextEnabled)
    if (!nextEnabled) {
      this.stopAllSounds()
    }
    this.setData({ soundEnabled: nextEnabled })
    wx.showToast({ title: nextEnabled ? '音效已开启' : '音效已关闭', icon: 'none' })
    if (nextEnabled) {
      this.playSound('ui', { cooldown: 0, volume: 0.4 })
      this.syncAmbientTrack()
    }
  },

  getSupplyDropPool(threat = this.currentWaveThreat) {
    const pool = []
    const blessingType = BLESSINGS[this.data.selectedBlessingKey]?.towerType

    if (blessingType) {
      pool.push(blessingType)
    }

    ;(threat?.counterTypes || []).forEach((type) => {
      if (TOWER_TYPES[type] && !pool.includes(type)) {
        pool.push(type)
      }
    })

    if (pool.length === 0) {
      return Object.keys(TOWER_TYPES)
    }

    return pool
  },

  callSupplyDrop() {
    this.flushQueuedStats()

    if ((this.data.commandPoints || 0) < 2) {
      wx.showToast({ title: '至少需要 2 点战术点', icon: 'none' })
      return
    }

    const nextPoints = this.data.commandPoints - 2
    if (this.inventory.length >= INVENTORY_COLS * INVENTORY_ROWS) {
      this.setData({
        commandPoints: nextPoints,
        gold: this.data.gold + 25
      })
      this.playSound('reward', { cooldown: 0 })
      wx.showToast({ title: '仓库已满，改为空投金币 +25', icon: 'none' })
      return
    }

    const pool = this.getSupplyDropPool()
    const type = pool[Math.floor(Math.random() * pool.length)]
    this.inventory.unshift(this.createTowerData(type))
    this.setData({ commandPoints: nextPoints })
    this.updateInventoryDisplay()
    this.playSound('reward', { cooldown: 0 })

    this.floatingTexts.push({
      x: CONFIG.canvasWidth / 2,
      y: CONFIG.canvasHeight / 2 - 14,
      text: `🛰️ 空投抵达：${TOWER_TYPES[type].name}`,
      color: '#a8f2ff',
      life: 90,
      maxLife: 90,
      vy: -0.34,
      vx: 0,
      scale: 1.16,
      isBold: true
    })
    wx.showToast({ title: `空投 ${TOWER_TYPES[type].name}`, icon: 'none' })
  },

  toggleCommanderTargeting() {
    this.flushQueuedStats()

    if (this.data.gameState !== 'playing') {
      wx.showToast({ title: '战斗中才能下达指挥', icon: 'none' })
      return
    }

    if ((this.data.commandPoints || 0) < COMMANDER_COST) {
      wx.showToast({ title: `至少需要 ${COMMANDER_COST} 点战术点`, icon: 'none' })
      return
    }

    const nextAiming = !this.data.commanderAiming
    this.setData({ commanderAiming: nextAiming })
    this.playSound('ui', { cooldown: 0, volume: 0.3 })
    if (nextAiming) {
      wx.showToast({ title: '点地图投放集火区：优先攻击并增伤', icon: 'none' })
    }
  },

  deployCommanderMark(x, y) {
    this.flushQueuedStats()
    if ((this.data.commandPoints || 0) < COMMANDER_COST) return false

    this.commanderZone = {
      x,
      y,
      radius: COMMANDER_MARK_RADIUS,
      expiresAt: Date.now() + COMMANDER_MARK_DURATION,
      lastPulseAt: 0
    }

    this.setData({
      commandPoints: Math.max(0, (this.data.commandPoints || 0) - COMMANDER_COST),
      commanderAiming: false
    })

    const burstDamage = COMMANDER_PULSE_DAMAGE + Math.floor(this.data.wave * 0.5)
    const burstTargets = this.monsters
      .filter((monster) => this.isMonsterInCommanderZone(monster))
      .sort((a, b) => b.pathIndex - a.pathIndex)
      .slice(0, 4)

    burstTargets.forEach((monster) => {
      this.applyDamage(monster, burstDamage, 'commander')
      this.arcaneEffects.push({
        x: monster.x,
        y: monster.y,
        size: 10,
        life: 16,
        maxLife: 16,
        angle: Math.random() * Math.PI * 2,
        dist: 0,
        speed: 3.5
      })
    })

    this.playSound('commander', { cooldown: 0 })
    this.floatingTexts.push({
      x,
      y: y - 18,
      text: '🛰️ 集火区已锁定',
      color: '#9ee6ff',
      life: 96,
      maxLife: 96,
      vy: -0.45,
      vx: 0,
      scale: 1.12,
      isBold: true
    })
    wx.showToast({ title: '集火区生效：优先攻击并增伤', icon: 'none' })
    this.requestRender()
    return true
  },

  isMonsterInCommanderZone(monster, zone = this.commanderZone) {
    if (!monster || !zone) return false
    const dx = monster.x - zone.x
    const dy = monster.y - zone.y
    return Math.sqrt(dx * dx + dy * dy) <= zone.radius
  },

  updateCommander(now) {
    const zone = this.commanderZone
    if (!zone) return

    if (now >= zone.expiresAt) {
      this.commanderZone = null
      this.requestRender()
      return
    }

    if (now - (zone.lastPulseAt || 0) < COMMANDER_PULSE_INTERVAL) {
      return
    }

    zone.lastPulseAt = now
    let target = null
    this.monsters.forEach((monster) => {
      if (!this.isMonsterInCommanderZone(monster, zone)) return
      if (!target || monster.pathIndex > target.pathIndex) {
        target = monster
      }
    })

    if (!target) return

    this.applyDamage(target, COMMANDER_PULSE_DAMAGE + Math.floor(this.data.wave * 0.6), 'commander')
    this.arcaneEffects.push({
      x: target.x,
      y: target.y,
      size: 9,
      life: 16,
      maxLife: 16,
      angle: Math.random() * Math.PI * 2,
      dist: 0,
      speed: 3.2
    })
  },

  drawCommanderZone() {
    const ctx = this.ctx
    const zone = this.commanderZone
    if (!ctx || !zone) return

    const remain = Math.max(0, zone.expiresAt - Date.now())
    const remainRatio = remain / COMMANDER_MARK_DURATION
    const alpha = 0.32 + remainRatio * 0.22

    ctx.shadowBlur = 0
    ctx.shadowColor = 'rgba(0,0,0,0)'
    ctx.globalAlpha = 1
    ctx.setLineDash([])

    ctx.globalAlpha = Math.max(0.12, alpha - 0.14)
    ctx.fillStyle = '#46a0ff'
    ctx.beginPath()
    ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = 1
    ctx.strokeStyle = '#82e1ff'
    ctx.lineWidth = 2.5
    ctx.setLineDash([7, 5])
    ctx.beginPath()
    ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.globalAlpha = Math.min(0.92, alpha + 0.12)
    ctx.strokeStyle = '#d8f6ff'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(zone.x - 10, zone.y)
    ctx.lineTo(zone.x + 10, zone.y)
    ctx.moveTo(zone.x, zone.y - 10)
    ctx.lineTo(zone.x, zone.y + 10)
    ctx.stroke()

    ctx.globalAlpha = 1
    ctx.fillStyle = '#d8f6ff'
    ctx.font = 'bold 10px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('集火', zone.x, zone.y - 14)
    ctx.font = '9px Arial'
    ctx.fillText('+45% 伤害', zone.x, zone.y + 14)
  },

  setActiveWaveModifierDisplay(modifier = null) {
    this.activeWaveModifier = modifier || null
    this.setData({
      activeChainIcon: modifier?.icon || '',
      activeChainTitle: modifier?.title || '',
      activeChainDescription: modifier?.detail || ''
    })
  },

  queueStatDelta(delta) {
    if (!this._pendingStatDeltas) this._pendingStatDeltas = []
    this._pendingStatDeltas.push(delta)
  },

  flushQueuedStats() {
    const deltas = this._pendingStatDeltas
    if (!deltas || !deltas.length) return
    this._pendingStatDeltas = []

    const merged = {}
    deltas.forEach((d) => {
      Object.keys(d).forEach((key) => {
        merged[key] = (merged[key] || 0) + d[key]
      })
    })

    const patch = {}
    if (merged.commandPoints) {
      patch.commandPoints = Math.max(0, this.data.commandPoints + merged.commandPoints)
    }
    if (merged.gold) {
      patch.gold = Math.max(0, this.data.gold + merged.gold)
    }
    if (merged.score) {
      patch.score = Math.max(0, this.data.score + merged.score)
    }
    if (merged.lives) {
      patch.lives = Math.max(0, this.data.lives + merged.lives)
    }

    if (Object.keys(patch).length) {
      this.setData(patch)
    }
  },

  canOfferThreatChain(completedWave = this.data.wave) {
    return completedWave >= 6 && !!this.currentThreatMissionCompleted
  },

  buildThreatChainOptions(nextWave = this.data.wave + 1) {
    const favorSwarm = this.currentWaveThreat?.key === 'swarm'
    const order = favorSwarm ? ['blitz', 'greed', 'hunt'] : ['hunt', 'blitz', 'greed']
    return order.map((key) => {
      const rule = THREAT_CHAIN_RULES[key]
      return {
        key: rule.key,
        icon: rule.icon,
        title: rule.title,
        description: `第${nextWave}波：${rule.description} ${rule.detail}`
      }
    })
  },

  openChoiceOverlay({
    mode,
    panelTitle,
    title,
    hint = '',
    options = [],
    returnState = this.data.gameState,
    pendingSpecializationTowerId = null,
    pendingSpecializationSource = ''
  }) {
    const nextState = returnState === 'playing' ? 'choice' : returnState
    this.setData({
      showWaveChoice: true,
      waveChoiceMode: mode,
      waveChoicePanelTitle: panelTitle,
      waveChoiceTitle: title,
      waveChoiceHint: hint,
      waveChoiceOptions: options,
      pendingSpecializationTowerId,
      pendingSpecializationSource,
      choiceReturnState: returnState,
      gameState: nextState,
      commanderAiming: false
    })
    this.requestRender()
  },

  closeChoiceOverlay(nextState = this.data.choiceReturnState || 'playing') {
    this.setData({
      showWaveChoice: false,
      waveChoiceMode: '',
      waveChoicePanelTitle: '战术补给',
      waveChoiceTitle: '',
      waveChoiceHint: '',
      waveChoiceOptions: [],
      pendingSpecializationTowerId: null,
      pendingSpecializationSource: '',
      choiceReturnState: 'playing',
      gameState: nextState === 'choice' ? 'playing' : nextState,
      commanderAiming: false
    })
  },

  applyThreatChainChoice(choiceKey) {
    const modifier = THREAT_CHAIN_RULES[choiceKey]
    if (!modifier || !this.pendingWaveAdvance) return

    this.pendingNextWaveModifier = {
      ...modifier,
      targetWave: this.pendingWaveAdvance.wave
    }
    this.setActiveWaveModifierDisplay(modifier)
    this.playSound('chainReady', { cooldown: 0 })
    this.floatingTexts.push({
      x: CONFIG.canvasWidth / 2,
      y: CONFIG.canvasHeight / 2 - 20,
      text: `${modifier.icon} ${modifier.title}`,
      color: '#d8f6ff',
      life: 92,
      maxLife: 92,
      vy: -0.45,
      vx: 0,
      scale: 1.28,
      isBold: true
    })
  },

  grantCommandPoints(amount = 1, options = {}) {
    if (!amount || amount <= 0) return

    this.queueStatDelta({ commandPoints: amount })

    const text = options.text || `🛰️ 战术点 +${amount}`
    this.floatingTexts.push({
      x: options.x ?? (CONFIG.canvasWidth / 2),
      y: options.y ?? (CONFIG.canvasHeight / 2 - 10),
      text,
      color: options.color || '#a8f2ff',
      life: options.life || 95,
      maxLife: options.life || 95,
      vy: -0.42,
      vx: 0,
      scale: options.scale || 1.2,
      isBold: true
    })
  },

  buildWaveChoiceOptions() {
    const selectedBlessingKey = this.data.selectedBlessingKey
    const synergyKey = SUPPLY_SYNERGY[selectedBlessingKey]
    const pool = Object.values(SUPPLY_REWARDS)
      .filter((reward) => reward.key !== synergyKey)
      .sort(() => Math.random() - 0.5)

    const options = []
    if (synergyKey && SUPPLY_REWARDS[synergyKey]) {
      options.push(SUPPLY_REWARDS[synergyKey])
    }

    pool.forEach((reward) => {
      if (options.length >= 2) return
      options.push(reward)
    })

    return options.slice(0, 2)
  },

  applySupplyReward(rewardKey) {
    const reward = SUPPLY_REWARDS[rewardKey]
    if (!reward) return

    const nextData = {}
    let rewardLabel = reward.title

    switch (reward.type) {
      case 'damage':
        this.runDamageBonus += reward.amount
        this.refreshAllTowerStats()
        rewardLabel = `全塔伤害 +${reward.amount}`
        break
      case 'attackSpeed':
        this.runAttackSpeedBonus += reward.amount
        this.refreshAllTowerStats()
        rewardLabel = `全塔攻速 +${reward.amount}ms`
        break
      case 'range':
        this.runRangeBonus += reward.amount
        this.refreshAllTowerStats()
        rewardLabel = `全塔射程 +${reward.amount}`
        break
      case 'gold':
        nextData.gold = this.data.gold + reward.amount
        rewardLabel = `金币 +${reward.amount}`
        break
      case 'lives':
        nextData.lives = this.data.lives + reward.amount
        rewardLabel = `生命 +${reward.amount}`
        break
      case 'tower': {
        const blessing = BLESSINGS[this.data.selectedBlessingKey]
        const towerType = blessing?.towerType || Object.keys(TOWER_TYPES)[Math.floor(Math.random() * Object.keys(TOWER_TYPES).length)]
        if (this.inventory.length < INVENTORY_COLS * INVENTORY_ROWS) {
          this.inventory.unshift(this.createTowerData(towerType))
          this.updateInventoryDisplay()
          rewardLabel = `获得 ${TOWER_TYPES[towerType].name}`
        } else {
          nextData.gold = this.data.gold + 45
          rewardLabel = '仓库满，改为金币 +45'
        }
        break
      }
      case 'summonCost':
        nextData.summonCost = Math.max(MIN_SUMMON_COST, this.data.summonCost - reward.amount)
        rewardLabel = `召唤价格 -${reward.amount}`
        break
      default:
        break
    }

    if (Object.keys(nextData).length > 0) {
      this.setData(nextData)
    }

    this.floatingTexts.push({
      x: CONFIG.canvasWidth / 2,
      y: CONFIG.canvasHeight / 2 - 30,
      text: `${reward.icon} ${rewardLabel}`,
      color: '#ffe79a',
      life: 90,
      maxLife: 90,
      vy: -0.4,
      vx: 0,
      scale: 1.35,
      isBold: true
    })

    this.requestRender()
  },

  applyWaveChoice(e) {
    const rewardKey = e.currentTarget.dataset.key
    const pendingWave = this.pendingWaveAdvance
    if (!rewardKey || !pendingWave) return

    const isThreatChain = this.data.waveChoiceMode === 'threatChain'
    if (isThreatChain) {
      this.applyThreatChainChoice(rewardKey)
      this.pendingWaveAdvance = null
      this.setData({
        showWaveChoice: false,
        waveChoiceMode: '',
        waveChoicePanelTitle: '战术补给',
        waveChoiceTitle: '',
        waveChoiceHint: '',
        waveChoiceOptions: [],
        wave: pendingWave.wave,
        level: pendingWave.level,
        waveInLevel: pendingWave.waveInLevel,
        totalWavesInLevel: 10,
        gameState: 'playing'
      }, () => {
        this.updateRunBuffSummary(pendingWave.wave)
        this.generateWave(pendingWave.wave)
        this.lastSpawnTime = Date.now() + 300
        this.requestRender()
      })
      return
    }

    this.applySupplyReward(rewardKey)
    this.pendingWaveAdvance = null
    this.setData({
      showWaveChoice: false,
      waveChoiceTitle: '',
      waveChoiceOptions: [],
      wave: pendingWave.wave,
      level: pendingWave.level,
      waveInLevel: pendingWave.waveInLevel,
      totalWavesInLevel: 10,
      gameState: 'playing'
    }, () => {
      this.updateRunBuffSummary(pendingWave.wave)
      this.generateWave(pendingWave.wave)
      this.lastSpawnTime = Date.now() + 300
      this.requestRender()
    })
  },

  initGame() {
    this.clearScheduledTimeouts()
    this.grid = []
    for (let row = 0; row < CONFIG.gridRows; row++) {
      this.grid[row] = []
      for (let col = 0; col < CONFIG.gridCols; col++) {
        this.grid[row][col] = null
      }
    }
    
    this.generatePath()
    
    this.towers = []
    this.monsters = []
    this.projectiles = []
    this.particles = []
    this.floatingTexts = []
    this.lightningEffects = []
    this.fireEffects = []
    this.iceEffects = []
    this.poisonEffects = []
    this.arcaneEffects = []
    this.mergeEffects = []
    this.blessingApplied = false
    this.runDamageBonus = 0
    this.runRangeBonus = 0
    this.runAttackSpeedBonus = 0
    this.lastIdleRenderAt = 0
    this.lastDragUiUpdateAt = 0
    this.lastMergeHintVisible = false
    this.lastMergeHintSlotIndex = -1
    
    // 初始化仓库 - 给5个随机塔
    this.inventory = []
    const types = Object.keys(TOWER_TYPES)
    for (let i = 0; i < 5; i++) {
      const type = types[Math.floor(Math.random() * types.length)]
      this.inventory.push(this.createTowerData(type, ''))
    }
    this.updateInventoryDisplay()
    
    this.spawnIndex = 0
    this.waveComplete = false
    this.generateWave(1)
    
    this.setData({
      wave: 1,
      score: 0,
      gold: 100,
      lives: 20,
      gameState: 'prep',
      level: 1,
      waveInLevel: 1,
      totalWavesInLevel: 10,
      currentTheme: 'forest',
      selectedBlessingKey: '',
      selectedBlessingName: '尚未选择战术祝福',
      selectedBlessingIcon: '✨',
      fieldTowerCount: 0,
      canStartBattle: false,
      selectedInventoryIndex: -1,
      prepActionHint: '先选祝福',
      runBuffSummary: '未激活',
      nextSupplyWave: 3,
      showWaveChoice: false,
      waveChoiceTitle: '',
      waveChoiceOptions: [],
      summonCost: 20
    }, () => {
      this.syncPrepTowerSlots('forest')
      this.refreshInventoryRect()
      // prep-hud 渲染后中间区域高度会变，必须重测，否则 DOM 塔位与路径错位（圈落在路上、点了放不上）
      this.schedulePrepLayoutSync()
      this.requestRender()
    })
  },

  createTowerData(type, blessingKey = this.data.selectedBlessingKey) {
    const stats = this.getTowerStatsForLevel(type, 1, 'inventory', blessingKey)
    return {
      id: Date.now() + Math.random(),
      type,
      level: 1,
      damage: stats.damage,
      range: stats.range,
      attackSpeed: stats.attackSpeed,
      lastAttack: 0
    }
  },

  applyBlessingToTower(tower, blessingKey = this.data.selectedBlessingKey) {
    const blessing = BLESSINGS[blessingKey]
    if (!blessing || blessing.towerType !== tower.type) {
      return tower
    }

    return {
      ...tower,
      damage: tower.damage + (blessing.damageBonus || 0),
      range: tower.range + (blessing.rangeBonus || 0),
      attackSpeed: Math.max(450, tower.attackSpeed - (blessing.attackSpeedBonus || 0))
    }
  },

  setPerformanceProfile(nextKey) {
    if (!PERFORMANCE_PROFILES[nextKey]) {
      nextKey = 'relaxed'
    }
    if (nextKey !== this.performanceProfileKey || !this.activePerformanceProfile) {
      this.performanceProfileKey = nextKey
      this.activePerformanceProfile = PERFORMANCE_PROFILES[nextKey]
    }
  },

  calculateScenePressure() {
    const effectLoad = this.particles.length + this.fireEffects.length + this.iceEffects.length +
      this.poisonEffects.length + this.arcaneEffects.length + this.lightningEffects.length +
      this.mergeEffects.length
    const bossCount = this.monsters.filter((monster) => monster.isBoss).length
    const towerLoad = this.towers.reduce((sum, tower) => {
      return sum + 1.25 + Math.max(0, (tower.level || 1) - 4) * 0.45
    }, 0)

    return this.monsters.length * 3.6 +
      bossCount * BOSS_PRESSURE_BONUS +
      this.projectiles.length * 2.35 +
      towerLoad +
      effectLoad * 0.26 +
      this.floatingTexts.length * 0.7 +
      (this.isDragging ? 12 : 0)
  },

  resolvePerformanceProfileKey(pressure) {
    const currentKey = this.performanceProfileKey || 'relaxed'

    if (currentKey === 'intense') {
      if (pressure <= PERFORMANCE_PROFILE_HYSTERESIS.intenseExit) {
        return pressure <= PERFORMANCE_PROFILE_HYSTERESIS.busyExit ? 'relaxed' : 'busy'
      }
      return this.isDragging ? 'busy' : 'intense'
    }

    if (currentKey === 'busy') {
      if (pressure >= PERFORMANCE_PROFILE_HYSTERESIS.intenseEnter) {
        return this.isDragging ? 'busy' : 'intense'
      }
      if (pressure <= PERFORMANCE_PROFILE_HYSTERESIS.busyExit) {
        return 'relaxed'
      }
      return 'busy'
    }

    if (pressure >= PERFORMANCE_PROFILE_HYSTERESIS.intenseEnter) {
      return this.isDragging ? 'busy' : 'intense'
    }

    if (pressure >= PERFORMANCE_PROFILE_HYSTERESIS.busyEnter) {
      return 'busy'
    }

    return 'relaxed'
  },

  updatePerformanceProfile(now = Date.now(), force = false) {
    const pressure = this.calculateScenePressure()

    const checkInterval = this.performanceProfileKey !== 'relaxed' || pressure >= 48
      ? PERFORMANCE_PROFILE_INTERVALS.elevated
      : PERFORMANCE_PROFILE_INTERVALS.relaxed

    if (!force && now - this.lastPerformanceProfileCheckAt < checkInterval) {
      return
    }

    this.lastPerformanceProfileCheckAt = now
    const nextKey = this.resolvePerformanceProfileKey(pressure)
    this.setPerformanceProfile(nextKey)
  },

  getAdaptiveRenderInterval() {
    const profile = this.getActivePerformanceProfile()
    if (this.isDragging) {
      return Math.min(profile.renderInterval, 34)
    }
    return profile.renderInterval
  },

  shouldRenderFrame(now = Date.now()) {
    if (this.needsRender) {
      return true
    }
    return now - this.lastFrameRenderAt >= this.getAdaptiveRenderInterval()
  },

  hasBossOnField() {
    return this.monsters.some((monster) => monster.isBoss)
  },

  shouldUseSimplifiedProjectiles() {
    const profile = this.getActivePerformanceProfile()
    return !!profile.simplifyProjectiles
  },

  getEffectRenderStride() {
    const profile = this.getActivePerformanceProfile()
    const stride = profile.effectRenderStride || 1
    return this.isDragging ? Math.min(stride, 2) : stride
  },

  getProjectileTrailLimit() {
    const profile = this.getActivePerformanceProfile()
    return profile.projectileTrailPoints || PERFORMANCE_LIMITS.trailPoints
  },

  getDamageTextStride() {
    const profile = this.getActivePerformanceProfile()
    return profile.damageTextStride || 1
  },

  getTowerSpecializationConfig(type, specializationKey = '') {
    const options = SPECIALIZATION_OPTIONS[type] || []
    return options.find((option) => option.key === specializationKey) || null
  },

  applySpecializationToTower(tower, specializationKey, mode = 'field') {
    if (!tower) return null

    const specialization = this.getTowerSpecializationConfig(tower.type, specializationKey)
    if (!specialization) return null

    tower.specializationKey = specialization.key
    tower.specializationTitle = specialization.title
    tower.specializationShort = specialization.shortName
    Object.assign(tower, this.getTowerStatsForLevel(
      tower.type,
      tower.level,
      mode,
      this.data.selectedBlessingKey,
      specialization.key
    ))
    tower.lastAttack = tower.lastAttack || 0
    return specialization
  },

  getTowerStatsForLevel(type, level, mode = 'field', blessingKey = this.data.selectedBlessingKey, specializationKey = '') {
    const config = TOWER_TYPES[type]
    let damage = config.baseDamage
    let range = config.baseRange
    let attackSpeed = config.baseAttackSpeed

    if (level > 1) {
      // 旧版仓库1.8倍/场上1.5倍指数成长会让5级以上塔迅速碾压入口，
      // 统一成长曲线也避免同一座塔在仓库和场上显示两套战力。
      damage = Math.floor(config.baseDamage * Math.pow(HIGH_LEVEL_TOWER_DAMAGE_GROWTH, level - 1))
      range = config.baseRange + (level - 1) * TOWER_RANGE_PER_LEVEL
      attackSpeed = Math.max(
        MIN_TOWER_ATTACK_INTERVAL,
        config.baseAttackSpeed - (level - 1) * TOWER_SPEED_GAIN_PER_LEVEL
      )
    }

    damage += this.runDamageBonus
    range += this.runRangeBonus
    attackSpeed = Math.max(420, attackSpeed - this.runAttackSpeedBonus)

    const stats = this.applyBlessingToTower({
      type,
      level,
      damage,
      range,
      attackSpeed
    }, blessingKey)

    // 专精加成
    if (specializationKey) {
      const specialization = this.getTowerSpecializationConfig(type, specializationKey)
      if (specialization) {
        stats.damage = (stats.damage || damage) + (specialization.damageBonus || 0)
        stats.range = (stats.range || range) + (specialization.rangeBonus || 0)
        stats.attackSpeed = Math.max(420, (stats.attackSpeed || attackSpeed) - (specialization.attackSpeedBonus || 0))
      }
    }

    return stats
  },

  getPrepActionHint(selectedBlessingKey = this.data.selectedBlessingKey, fieldTowerCount = this.data.fieldTowerCount) {
    if (!selectedBlessingKey) {
      return '先选祝福'
    }

    if (fieldTowerCount === 0) {
      return '点仓库塔，再点发光塔位'
    }

    return '已可开始第一波'
  },

  updatePrepStatus(extraData = {}) {
    const hasSelectedBlessing = Object.prototype.hasOwnProperty.call(extraData, 'selectedBlessingKey')
      ? !!extraData.selectedBlessingKey
      : !!this.data.selectedBlessingKey
    const fieldTowerCount = Object.prototype.hasOwnProperty.call(extraData, 'fieldTowerCount')
      ? extraData.fieldTowerCount
      : this.data.fieldTowerCount

    this.setData({
      ...extraData,
      canStartBattle: hasSelectedBlessing && fieldTowerCount > 0,
      prepActionHint: this.getPrepActionHint(
        Object.prototype.hasOwnProperty.call(extraData, 'selectedBlessingKey')
          ? extraData.selectedBlessingKey
          : this.data.selectedBlessingKey,
        fieldTowerCount
      )
    }, () => {
      this.refreshCanvasRect()
      this.refreshInventoryRect()
      this.requestRender()
    })
  },

  syncFieldTowerCount() {
    this.updatePrepStatus({ fieldTowerCount: this.towers.length })
    this.syncPrepTowerSlots()
  },

  getPathHalfWidth() {
    // 与 drawPath 最外层线宽 30 对齐
    return 15
  },

  getTowerSlots() {
    if (Array.isArray(this.towerSlots) && this.towerSlots.length > 0) {
      return this.towerSlots
    }
    // 有路径时绝不回退主题硬编码槽位（那些点并不贴路）
    if (Array.isArray(this.pathPoints) && this.pathPoints.length >= 2) {
      this.towerSlots = this.buildTowerSlotsAlongPath()
      return this.towerSlots
    }
    const theme = MAP_THEMES[this.data.currentTheme] || MAP_THEMES.forest
    return (theme && theme.towerSlots) || []
  },

  getCellPathInfo(row, col) {
    if (!Array.isArray(this.pathPoints) || this.pathPoints.length < 2) {
      return { dist: Infinity, t: 0, side: 0 }
    }
    const offsetX = this.getGridOffsetX()
    const offsetY = this.getGridOffsetY()
    const cellSize = CONFIG.cellSize
    const cx = offsetX + col * cellSize + cellSize / 2
    const cy = offsetY + row * cellSize + cellSize / 2
    let minD = Infinity
    let bestT = 0
    let bestSide = 0
    let pathLen = 0

    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      const p1 = this.pathPoints[i]
      const p2 = this.pathPoints[i + 1]
      const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y)
      const dist = this.pointToSegmentDist(cx, cy, p1.x, p1.y, p2.x, p2.y)
      if (dist < minD) {
        minD = dist
        const A = cx - p1.x
        const B = cy - p1.y
        const C = p2.x - p1.x
        const D = p2.y - p1.y
        const lenSq = C * C + D * D
        const param = lenSq > 0 ? Math.max(0, Math.min(1, (A * C + B * D) / lenSq)) : 0
        bestT = pathLen + param * segLen
        // 相对路径前进方向的左右侧（叉积符号）
        const cross = A * D - B * C
        bestSide = cross === 0 ? 0 : (cross > 0 ? 1 : -1)
      }
      pathLen += segLen
    }
    return { dist: minD, t: bestT, side: bestSide }
  },

  getPathLength() {
    if (!Array.isArray(this.pathPoints) || this.pathPoints.length < 2) return 0
    let len = 0
    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      const p1 = this.pathPoints[i]
      const p2 = this.pathPoints[i + 1]
      len += Math.hypot(p2.x - p1.x, p2.y - p1.y)
    }
    return len
  },

  // 全图扫描贴路格，再按路径进度左右分桶挑选 → 稳定约 16 个、两侧都有
  buildTowerSlotsAlongPath(targetCount = 16) {
    if (!Array.isArray(this.pathPoints) || this.pathPoints.length < 2) {
      return []
    }

    const cellSize = CONFIG.cellSize
    if (!Number.isFinite(cellSize) || cellSize <= 0) return []

    const pathHalf = this.getPathHalfWidth()
    const pathLen = this.getPathLength()
    if (pathLen < cellSize) return []

    const idealDist = pathHalf + cellSize * 0.6
    // 贴路边约 0.5~1.5 格，保证两侧都有可选格
    const minDist = pathHalf + cellSize * 0.22
    const maxDist = pathHalf + cellSize * 1.55

    const candidates = []
    for (let row = 0; row < CONFIG.gridRows; row++) {
      for (let col = 0; col < CONFIG.gridCols; col++) {
        if (this.isOnPath(row, col)) continue
        const info = this.getCellPathInfo(row, col)
        if (!info.side) continue
        if (info.dist < minDist || info.dist > maxDist) continue
        candidates.push({
          row,
          col,
          t: info.t,
          side: info.side,
          dist: info.dist,
          score: -Math.abs(info.dist - idealDist)
        })
      }
    }
    if (!candidates.length) return []

    const selected = []
    const keyOf = (c) => `${c.row},${c.col}`
    const selectedKeys = new Set()
    const tooClose = (a, b, minGrid) => {
      const gridDist = Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col))
      if (gridDist < minGrid) return true
      // 同侧沿路别挤在一起；异侧允许隔路对放
      if (a.side === b.side && Math.abs(a.t - b.t) < cellSize * 1.05) return true
      return false
    }
    const tryAdd = (c, minGrid) => {
      if (!c || selectedKeys.has(keyOf(c))) return false
      if (selected.some((s) => tooClose(s, c, minGrid))) return false
      selected.push(c)
      selectedKeys.add(keyOf(c))
      return true
    }

    // 按路径进度分桶：每桶左右各取最贴路的 1 个
    const bucketCount = Math.max(6, Math.min(8, Math.ceil(targetCount / 2)))
    const buckets = Array.from({ length: bucketCount }, () => ({ left: [], right: [] }))
    candidates.forEach((c) => {
      const idx = Math.min(
        bucketCount - 1,
        Math.max(0, Math.floor((c.t / pathLen) * bucketCount))
      )
      if (c.side < 0) buckets[idx].left.push(c)
      else buckets[idx].right.push(c)
    })
    const byScore = (a, b) => b.score - a.score || a.dist - b.dist
    buckets.forEach((b) => {
      b.left.sort(byScore)
      b.right.sort(byScore)
    })

    // 第一轮：严格隔一格，左右成对
    for (let i = 0; i < bucketCount && selected.length < targetCount; i++) {
      for (const list of [buckets[i].left, buckets[i].right]) {
        if (selected.length >= targetCount) break
        for (let k = 0; k < list.length; k++) {
          if (tryAdd(list[k], 2)) break
        }
      }
    }

    // 第二轮：补缺侧（仍隔一格）
    for (let i = 0; i < bucketCount && selected.length < targetCount; i++) {
      const hasLeft = selected.some((s) => {
        const idx = Math.min(bucketCount - 1, Math.floor((s.t / pathLen) * bucketCount))
        return idx === i && s.side < 0
      })
      const hasRight = selected.some((s) => {
        const idx = Math.min(bucketCount - 1, Math.floor((s.t / pathLen) * bucketCount))
        return idx === i && s.side > 0
      })
      if (!hasLeft) {
        for (const c of buckets[i].left) {
          if (tryAdd(c, 2)) break
        }
      }
      if (!hasRight && selected.length < targetCount) {
        for (const c of buckets[i].right) {
          if (tryAdd(c, 2)) break
        }
      }
    }

    // 第三轮：全局按贴路分补满
    if (selected.length < targetCount) {
      const leftovers = candidates.slice().sort(byScore)
      for (let i = 0; i < leftovers.length && selected.length < targetCount; i++) {
        tryAdd(leftovers[i], 2)
      }
    }

    // 第四轮：仍不足则允许相邻格（仅不同格）
    if (selected.length < targetCount) {
      const leftovers = candidates.slice().sort(byScore)
      for (let i = 0; i < leftovers.length && selected.length < targetCount; i++) {
        tryAdd(leftovers[i], 1)
      }
    }

    // 保留场上已有塔的格子
    if (Array.isArray(this.towers)) {
      this.towers.forEach((tower) => {
        if (tower.row == null || tower.col == null) return
        if (this.isOnPath(tower.row, tower.col)) return
        const info = this.getCellPathInfo(tower.row, tower.col)
        if (info.dist > maxDist * 1.25) return
        const c = { row: tower.row, col: tower.col, t: info.t, side: info.side, dist: info.dist }
        if (!selectedKeys.has(keyOf(c))) {
          selected.push(c)
          selectedKeys.add(keyOf(c))
        }
      })
    }

    selected.sort((a, b) => a.t - b.t)
    return selected.map((s) => ({ row: s.row, col: s.col }))
  },

  syncPrepTowerSlots(themeKey = this.data.currentTheme) {
    // 防御：开发者工具模拟器偶发 canvas res width/height=0 → CONFIG.cellSize / gridOffsetX/Y 变成 NaN
    // 此时算出的 left/top 全是 NaN，setData NaN 会被外层两次 catch 兜底到 []，导致玩家看不到任何圈
    // 修复：无效尺寸时直接 return，**保留** 上次 prepTowerSlots（不主动清空，避免"圈又没了"假象）
    if (!Number.isFinite(CONFIG.cellSize) || CONFIG.cellSize <= 0
        || !Number.isFinite(this.getGridOffsetX()) || !Number.isFinite(this.getGridOffsetY())) {
      return
    }
    // 关键：整个函数 try-catch 包裹，任何 setData NaN/undefined 异常都不能阻断 render——否则 fillRect 不画，canvas 完全空（"地图直接没了"）
    try {
      const slots = this.getTowerSlots()
      if (!slots.length) {
        this.setData({ prepTowerSlots: [] })
        return
      }
      const ox = this.getGridOffsetX()
      const oy = this.getGridOffsetY()
      const canvasW = CONFIG.canvasWidth || 1
      const canvasH = CONFIG.canvasHeight || 1
      const hasPath = Array.isArray(this.pathPoints) && this.pathPoints.length >= 2
      const prepTowerSlots = slots
        .filter(slot => !hasPath || !this.isOnPath(slot.row, slot.col))
        .map((slot) => {
          const x = ox + slot.col * CONFIG.cellSize + CONFIG.cellSize / 2
          const y = oy + slot.row * CONFIG.cellSize + CONFIG.cellSize / 2
          // 用百分比定位：canvas CSS 被 flex 拉伸时，圈仍与路径对齐（绝对 px 会错位到路中间）
          return {
            key: `${slot.row}-${slot.col}`,
            row: slot.row,
            col: slot.col,
            left: `${(x / canvasW) * 100}%`,
            top: `${(y / canvasH) * 100}%`,
            occupied: !!(this.grid[slot.row] && this.grid[slot.row][slot.col])
          }
        })
      this.setData({ prepTowerSlots })
    } catch (error) {
      // fallback：保留所有塔位——绝对不能让 prep 圈消失，玩家需要圈来放塔
      console.warn('syncPrepTowerSlots failed, fallback to all slots', (error && error.stack) || error)
      try {
        const slots = this.getTowerSlots()
        if (slots.length) {
          const ox = this.getGridOffsetX()
          const oy = this.getGridOffsetY()
          const canvasW = CONFIG.canvasWidth || 1
          const canvasH = CONFIG.canvasHeight || 1
          const prepTowerSlots = slots.map((slot) => {
            const x = ox + slot.col * CONFIG.cellSize + CONFIG.cellSize / 2
            const y = oy + slot.row * CONFIG.cellSize + CONFIG.cellSize / 2
            return {
              key: `${slot.row}-${slot.col}`,
              row: slot.row,
              col: slot.col,
              left: `${(x / canvasW) * 100}%`,
              top: `${(y / canvasH) * 100}%`,
              occupied: !!(this.grid[slot.row] && this.grid[slot.row][slot.col])
            }
          })
          this.setData({ prepTowerSlots })
        } else {
          this.setData({ prepTowerSlots: [] })
        }
      } catch (e2) {
        console.warn('syncPrepTowerSlots fallback also failed', e2)
        this.setData({ prepTowerSlots: [] })
      }
    }
  },

  getNextSelectedInventoryIndex(removedIndex) {
    if (this.data.selectedInventoryIndex === -1) {
      return -1
    }
    if (this.data.selectedInventoryIndex === removedIndex) {
      return -1
    }
    if (this.data.selectedInventoryIndex > removedIndex) {
      return this.data.selectedInventoryIndex - 1
    }
    return this.data.selectedInventoryIndex
  },

  canEditBattlefield() {
    return this.data.gameState === 'prep' || this.data.gameState === 'playing'
  },

  selectBlessing(e) {
    const key = e.currentTarget.dataset.key
    const blessing = BLESSINGS[key]
    if (!blessing) return

    this.updatePrepStatus({
      selectedBlessingKey: key,
      selectedBlessingName: blessing.name,
      selectedBlessingIcon: blessing.icon
    })
    this.playSound('blessing', { cooldown: 0 })
    // 选祝福后 prep-hud 变矮，战场变高，需再同步塔位
    this.schedulePrepLayoutSync()
  },

  handleInventorySlotTap(e) {
    if (this.data.gameState !== 'prep') return

    const index = Number(e.currentTarget.dataset.index)
    if (Number.isNaN(index) || index < 0 || index >= this.inventory.length) {
      return
    }

    this.setData({ selectedInventoryIndex: index }, () => {
      this.refreshCanvasRect()
    })
  },

  handlePrepSlotTap(e) {
    if (this.data.gameState !== 'prep') return

    if (!this.data.selectedBlessingKey) {
      wx.showToast({ title: '先选祝福', icon: 'none' })
      return
    }

    const inventoryIndex = this.data.selectedInventoryIndex
    if (inventoryIndex < 0 || inventoryIndex >= this.inventory.length) {
      wx.showToast({ title: '先点下方一座塔', icon: 'none' })
      return
    }

    const row = Number(e.currentTarget.dataset.row)
    const col = Number(e.currentTarget.dataset.col)
    if (Number.isNaN(row) || Number.isNaN(col)) {
      return
    }

    if (!this.isTowerSlot(row, col)) {
      return
    }

    if (this.grid[row][col]) {
      wx.showToast({ title: '该塔位已有防御塔', icon: 'none' })
      return
    }

    this.placeTowerFromInventory(row, col, inventoryIndex)
  },

  applySelectedBlessing() {
    if (this.blessingApplied || !this.data.selectedBlessingKey) return

    const blessing = BLESSINGS[this.data.selectedBlessingKey]
    if (!blessing) return

    if (blessing.extraTowerType && this.inventory.length < INVENTORY_COLS * INVENTORY_ROWS) {
      this.inventory.unshift(this.createTowerData(blessing.extraTowerType, blessing.key))
    }

    const nextData = {
      selectedBlessingName: blessing.name,
      selectedBlessingIcon: blessing.icon,
      nextSupplyWave: this.getNextSupplyWave(1)
    }

    if (blessing.bonusGold) {
      nextData.gold = this.data.gold + blessing.bonusGold
    }

    if (blessing.bonusLives) {
      nextData.lives = this.data.lives + blessing.bonusLives
    }

    this.blessingApplied = true
    this.refreshAllTowerStats(blessing.key)
    this.updateRunBuffSummary()
    this.setData(nextData)
  },

  startBattle() {
    if (!this.data.selectedBlessingKey) {
      wx.showToast({ title: '先选择一个战术祝福', icon: 'none' })
      return
    }

    if (this.towers.length === 0) {
      wx.showToast({ title: '先拖一座塔到发光塔位', icon: 'none' })
      return
    }

    this.applySelectedBlessing()
    this.lastSpawnTime = Date.now()
    this.setData({ gameState: 'playing', commanderAiming: false }, () => {
      // prep-hud 卸下后中间可用高度变化，重测以免底部仍按旧高度绘制被仓库挡住
      this.remeasureCanvasLayout()
      this.refreshInventoryRect()
      this.syncAmbientTrack()
      this.requestRender()
    })
    this.playSound('wave', { cooldown: 0, volume: 0.5 })
    this.floatingTexts.push({
      x: CONFIG.canvasWidth / 2,
      y: CONFIG.canvasHeight / 2 - 40,
      text: `${this.data.selectedBlessingIcon} ${this.data.selectedBlessingName}`,
      color: BLESSINGS[this.data.selectedBlessingKey].color,
      life: 100,
      maxLife: 100,
      vy: -0.35,
      vx: 0,
      scale: 1.4,
      isBold: true
    })
  },

  updateInventoryDisplay() {
    const slots = []
    for (let i = 0; i < INVENTORY_COLS * INVENTORY_ROWS; i++) {
      if (i < this.inventory.length) {
        const tower = this.inventory[i]
        const config = TOWER_TYPES[tower.type]
        slots.push({
          ...tower,
          emoji: config.emoji,
          color: config.color,
          name: config.name
        })
      } else {
        slots.push(null)
      }
    }

    const currentSelectedInventoryIndex = Number.isInteger(this.data.selectedInventoryIndex)
      ? this.data.selectedInventoryIndex
      : -1
    const selectedInventoryIndex = currentSelectedInventoryIndex >= this.inventory.length
      ? -1
      : currentSelectedInventoryIndex

    this.setData({ 
      inventorySlots: slots,
      inventoryFull: this.inventory.length >= INVENTORY_COLS * INVENTORY_ROWS,
      selectedInventoryIndex
    }, () => {
      this.refreshInventoryRect()
    })
  },

  ensureProceduralTheme(level = this.data.level || 1) {
    const normalizedLevel = Math.max(1, Math.floor(level))
    if (normalizedLevel === 1) return 'forest'

    const key = `realm_${normalizedLevel}`
    if (MAP_THEMES[key] && MAP_THEMES[key].colorFormat === 'rgb-v1') return key

    const adjectives = ['暮光', '星砂', '苍翠', '绯炎', '霜月', '雷鸣', '幽蓝', '金辉', '紫雾', '赤晶', '碧潮', '黑曜']
    const nouns = ['荒原', '秘境', '峡谷', '高地', '沼泽', '天穹', '遗迹', '海岸', '盆地', '群岛', '裂谷', '庭院']
    const decorSets = [
      ['tree', 'bush', 'flower', 'mushroom', 'rock'],
      ['cactus', 'rock', 'skull', 'tumbleweed'],
      ['ice_crystal', 'snow_pile', 'frozen_tree', 'rock'],
      ['lava_rock', 'fire_vent', 'ash_pile', 'dead_tree']
    ]
    const layoutKeys = ['forest', 'desert', 'ice', 'volcano']
    // 黄金角推进色相；即使关卡无限增长，也不会按四张地图循环颜色。
    const hue = Math.round((normalizedLevel * 137.508) % 360)
    const pathHue = (hue + 28 + normalizedLevel * 7) % 360
    const accentHue = (hue + 95) % 360
    const decorIndex = (normalizedLevel * 5 + Math.floor(normalizedLevel / 3)) % decorSets.length

    MAP_THEMES[key] = {
      name: `${adjectives[(normalizedLevel - 1) % adjectives.length]}${nouns[Math.floor((normalizedLevel - 1) / adjectives.length) % nouns.length]}·第${normalizedLevel}境`,
      bgColors: [
        hslToHex(hue, 48, 8),
        hslToHex((hue + 12) % 360, 42, 15),
        hslToHex((hue + 26) % 360, 50, 7)
      ],
      pathColors: [
        hslToHex(pathHue, 42, 14),
        hslToHex(pathHue, 35, 30),
        hslToHex((pathHue + 8) % 360, 38, 43)
      ],
      grassColor: hslaColor(accentHue, 58, 55, 0.14),
      gridColor: hslaColor(accentHue, 72, 64, 0.22),
      colorFormat: 'rgb-v1',
      decorTypes: decorSets[decorIndex],
      pathLayoutKey: layoutKeys[(normalizedLevel - 1) % layoutKeys.length],
      terrainLevel: normalizedLevel,
      // 动态塔位会覆盖此项；保留基础槽位用于极端尺寸下的 fallback。
      towerSlots: MAP_THEMES[layoutKeys[(normalizedLevel - 1) % layoutKeys.length]].towerSlots
        .map((slot) => ({ ...slot }))
    }
    return key
  },

  ensureThemeForKey(themeKey, level = this.data.level || 1) {
    if (MAP_THEMES[themeKey]) return themeKey
    const matched = /^realm_(\d+)$/.exec(themeKey || '')
    if (matched) return this.ensureProceduralTheme(Number(matched[1]))
    return this.ensureProceduralTheme(level)
  },

  buildProceduralPath(level, offsetX, offsetY, cellSize) {
    // 仅由关卡号推导，读档和画布重测时都能还原同一路线。
    let seed = (Math.imul(Math.max(2, level), 2654435761) ^ 0x9e3779b9) >>> 0
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 4294967296
    }
    const pickRow = (previous) => {
      let row = 1 + Math.floor(random() * 9)
      if (Math.abs(row - previous) < 2) {
        row = (row + 4 + Math.floor(random() * 3)) % 10 + 1
      }
      return row + 0.5
    }

    const columns = [1.5, 3.5, 5.5, 7.5, 9.5]
    let row = pickRow(-10)
    const points = [{ x: -20, y: offsetY + cellSize * row }]

    columns.forEach((column) => {
      const x = offsetX + cellSize * column
      points.push({ x, y: offsetY + cellSize * row })
      const nextRow = pickRow(row - 0.5)
      points.push({ x, y: offsetY + cellSize * nextRow })
      row = nextRow
    })
    points.push({ x: CONFIG.canvasWidth + 20, y: offsetY + cellSize * row })
    return points
  },

  generatePath(themeKey = 'forest', options = {}) {
    const {
      refreshDressing = true,
      rebuildSlots = true,
      relocateTowers = true
    } = options
    const offsetX = this.getGridOffsetX()
    const offsetY = this.getGridOffsetY()
    const cellSize = CONFIG.cellSize
    
    // 蜿蜒路径，利用更多空间，塔位在路两侧
    const pathLayouts = {
      forest: [
        { x: -20, y: offsetY + cellSize * 1.5 },
        { x: offsetX + cellSize * 2.5, y: offsetY + cellSize * 1.5 },
        { x: offsetX + cellSize * 2.5, y: offsetY + cellSize * 3.5 },
        { x: offsetX + cellSize * 5.5, y: offsetY + cellSize * 3.5 },
        { x: offsetX + cellSize * 5.5, y: offsetY + cellSize * 1.5 },
        { x: offsetX + cellSize * 8.5, y: offsetY + cellSize * 1.5 },
        { x: offsetX + cellSize * 8.5, y: offsetY + cellSize * 5.5 },
        { x: offsetX + cellSize * 3.5, y: offsetY + cellSize * 5.5 },
        { x: offsetX + cellSize * 3.5, y: offsetY + cellSize * 7.5 },
        { x: offsetX + cellSize * 8.5, y: offsetY + cellSize * 7.5 },
        { x: offsetX + cellSize * 8.5, y: offsetY + cellSize * 9.5 },
        { x: CONFIG.canvasWidth + 20, y: offsetY + cellSize * 9.5 }
      ],
      desert: [
        { x: -20, y: offsetY + cellSize * 3.5 },
        { x: offsetX + cellSize * 1.5, y: offsetY + cellSize * 3.5 },
        { x: offsetX + cellSize * 1.5, y: offsetY + cellSize * 1.5 },
        { x: offsetX + cellSize * 5.5, y: offsetY + cellSize * 1.5 },
        { x: offsetX + cellSize * 5.5, y: offsetY + cellSize * 5.5 },
        { x: offsetX + cellSize * 8.5, y: offsetY + cellSize * 5.5 },
        { x: offsetX + cellSize * 8.5, y: offsetY + cellSize * 3.5 },
        { x: offsetX + cellSize * 10.5, y: offsetY + cellSize * 3.5 },
        { x: offsetX + cellSize * 10.5, y: offsetY + cellSize * 7.5 },
        { x: offsetX + cellSize * 5.5, y: offsetY + cellSize * 7.5 },
        { x: offsetX + cellSize * 5.5, y: offsetY + cellSize * 9.5 },
        { x: CONFIG.canvasWidth + 20, y: offsetY + cellSize * 9.5 }
      ],
      ice: [
        { x: -20, y: offsetY + cellSize * 7.5 },
        { x: offsetX + cellSize * 0.5, y: offsetY + cellSize * 7.5 },
        { x: offsetX + cellSize * 0.5, y: offsetY + cellSize * 3.5 },
        { x: offsetX + cellSize * 3.5, y: offsetY + cellSize * 3.5 },
        { x: offsetX + cellSize * 3.5, y: offsetY + cellSize * 1.5 },
        { x: offsetX + cellSize * 7.5, y: offsetY + cellSize * 1.5 },
        { x: offsetX + cellSize * 7.5, y: offsetY + cellSize * 5.5 },
        { x: offsetX + cellSize * 10.5, y: offsetY + cellSize * 5.5 },
        { x: offsetX + cellSize * 10.5, y: offsetY + cellSize * 3.5 },
        { x: offsetX + cellSize * 10.5, y: offsetY + cellSize * 7.5 },
        { x: offsetX + cellSize * 5.5, y: offsetY + cellSize * 7.5 },
        { x: offsetX + cellSize * 5.5, y: offsetY + cellSize * 9.5 },
        { x: CONFIG.canvasWidth + 20, y: offsetY + cellSize * 9.5 }
      ],
      volcano: [
        { x: -20, y: offsetY + cellSize * 1.5 },
        { x: offsetX + cellSize * 3.5, y: offsetY + cellSize * 1.5 },
        { x: offsetX + cellSize * 3.5, y: offsetY + cellSize * 3.5 },
        { x: offsetX + cellSize * 1.5, y: offsetY + cellSize * 3.5 },
        { x: offsetX + cellSize * 1.5, y: offsetY + cellSize * 7.5 },
        { x: offsetX + cellSize * 5.5, y: offsetY + cellSize * 7.5 },
        { x: offsetX + cellSize * 5.5, y: offsetY + cellSize * 5.5 },
        { x: offsetX + cellSize * 8.5, y: offsetY + cellSize * 5.5 },
        { x: offsetX + cellSize * 8.5, y: offsetY + cellSize * 3.5 },
        { x: offsetX + cellSize * 10.5, y: offsetY + cellSize * 3.5 },
        { x: offsetX + cellSize * 10.5, y: offsetY + cellSize * 7.5 },
        { x: offsetX + cellSize * 7.5, y: offsetY + cellSize * 7.5 },
        { x: offsetX + cellSize * 7.5, y: offsetY + cellSize * 9.5 },
        { x: CONFIG.canvasWidth + 20, y: offsetY + cellSize * 9.5 }
      ]
    }
    
    const resolvedThemeKey = this.ensureThemeForKey(themeKey)
    const theme = MAP_THEMES[resolvedThemeKey] || MAP_THEMES.forest
    const layoutKey = theme.pathLayoutKey || resolvedThemeKey
    this.pathPoints = theme.terrainLevel
      ? this.buildProceduralPath(theme.terrainLevel, offsetX, offsetY, cellSize)
      : (pathLayouts[layoutKey] || pathLayouts.forest)

    if (rebuildSlots) {
      // 按当前路径重新生成两侧塔位（避免各主题硬编码与路线错位）
      this.towerSlots = this.buildTowerSlotsAlongPath()
    }
    if (relocateTowers) {
      this.relocateInvalidTowers()
    }

    if (!refreshDressing) {
      // 仅路径几何更新：路径石子跟新路径重建（确定性，不抖），草地/树木保持原样由外部缩放
      this.rebuildPathDecorations(false)
      return
    }
    
    this.rebuildPathDecorations(true)
    this.generateMapDecorations(resolvedThemeKey)
    
    // 预生成背景纹理点 - 控制密度，减少持续绘制负担
    this.grassDots = []
    for (let i = 0; i < 110; i++) {
      this.grassDots.push({
        x: Math.random() * CONFIG.canvasWidth,
        y: Math.random() * CONFIG.canvasHeight,
        size: 0.8 + Math.random() * 2.1
      })
    }
    
    // 小草丛
    this.grassTufts = []
    for (let i = 0; i < 18; i++) {
      this.grassTufts.push({
        x: Math.random() * CONFIG.canvasWidth,
        y: Math.random() * CONFIG.canvasHeight,
        blades: 3 + Math.floor(Math.random() * 3),
        height: 4 + Math.random() * 5,
        sway: Math.random() * Math.PI * 2
      })
    }
  },

  // jitter=false 时用确定性偏移，避免每次重建路径石子乱跳
  rebuildPathDecorations(jitter = true) {
    this.pathDecorations = []
    if (!Array.isArray(this.pathPoints) || this.pathPoints.length < 2) return

    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      const p1 = this.pathPoints[i]
      const p2 = this.pathPoints[i + 1]
      const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
      const stoneCount = Math.floor(dist / 15)

      for (let j = 0; j < stoneCount; j++) {
        const t = stoneCount <= 0 ? 0 : j / stoneCount
        const seed = (i * 17 + j * 31) % 100
        const jx = jitter ? (Math.random() - 0.5) * 18 : ((seed / 100) - 0.5) * 12
        const jy = jitter ? (Math.random() - 0.5) * 18 : (((seed * 3) % 100) / 100 - 0.5) * 12
        const size = jitter ? (1 + Math.random() * 2.5) : (1.2 + (seed % 10) * 0.12)
        this.pathDecorations.push({
          x: p1.x + (p2.x - p1.x) * t + jx,
          y: p1.y + (p2.y - p1.y) * t + jy,
          size
        })
      }
    }
  },

  rebuildGridFromTowers() {
    this.grid = []
    for (let row = 0; row < CONFIG.gridRows; row++) {
      this.grid[row] = []
      for (let col = 0; col < CONFIG.gridCols; col++) {
        this.grid[row][col] = null
      }
    }

    this.towers.forEach((tower) => {
      if (tower.row >= 0 && tower.row < CONFIG.gridRows && tower.col >= 0 && tower.col < CONFIG.gridCols) {
        tower.x = this.getGridOffsetX() + tower.col * CONFIG.cellSize + CONFIG.cellSize / 2
        tower.y = this.getGridOffsetY() + tower.row * CONFIG.cellSize + CONFIG.cellSize / 2
        this.grid[tower.row][tower.col] = tower
      }
    })
  },

  ensureBattlefieldState() {
    const pathInvalid = !Array.isArray(this.pathPoints) || this.pathPoints.length < 2
    const gridInvalid = !Array.isArray(this.grid) || this.grid.length !== CONFIG.gridRows
    if (!pathInvalid && !gridInvalid) {
      return true
    }

    const hasDressing = Array.isArray(this.grassDots) && this.grassDots.length > 0
    this.generatePath(this.data.currentTheme, {
      refreshDressing: !hasDressing,
      rebuildSlots: true,
      relocateTowers: false
    })
    this.rebuildGridFromTowers()
    this.syncPrepTowerSlots(this.data.currentTheme)
    return false
  },

  hasMeaningfulRunProgress() {
    return !!this.data.selectedBlessingKey ||
      this.towers.length > 0 ||
      this.data.wave > 1 ||
      this.data.score > 0 ||
      this.data.gameState !== 'prep'
  },

  buildRunProgressSnapshot() {
    const threat = this.currentWaveThreat ||
      (typeof this.resolveWaveThreat === 'function' ? this.resolveWaveThreat(this.data.wave) : null) ||
      { key: 'swarm' }
    const missionTarget = this.currentThreatMissionTarget ||
      (typeof this.getThreatMissionTarget === 'function'
        ? this.getThreatMissionTarget(this.data.wave, threat)
        : 0)

    return {
      version: RUN_PROGRESS_VERSION,
      savedAt: Date.now(),
      currentWaveThreatKey: threat.key || 'swarm',
      currentThreatMissionProgress: this.currentThreatMissionProgress || 0,
      currentThreatMissionTarget: missionTarget,
      currentThreatMissionCompleted: !!this.currentThreatMissionCompleted,
      runBonuses: {
        damage: this.runDamageBonus || 0,
        range: this.runRangeBonus || 0,
        attackSpeed: this.runAttackSpeedBonus || 0,
        crit: this.runCritBonus || 0
      },
      blessingApplied: !!this.blessingApplied,
      waveStartLives: this.waveStartLives || this.data.lives,
      waveComplete: !!this.waveComplete,
      spawnIndex: this.spawnIndex || 0,
      lastSpawnDelta: Math.max(0, Date.now() - (this.lastSpawnTime || 0)),
      pendingWaveAdvance: this.pendingWaveAdvance || null,
      data: {
        wave: this.data.wave,
        score: this.data.score,
        gold: this.data.gold,
        lives: this.data.lives,
        gameState: this.data.gameState,
        level: this.data.level,
        waveInLevel: this.data.waveInLevel,
        totalWavesInLevel: this.data.totalWavesInLevel,
        currentTheme: this.data.currentTheme,
        selectedBlessingKey: this.data.selectedBlessingKey,
        selectedBlessingName: this.data.selectedBlessingName,
        selectedBlessingIcon: this.data.selectedBlessingIcon,
        selectedBlessingDescription: this.data.selectedBlessingDescription,
        fieldTowerCount: this.towers.length,
        canStartBattle: this.data.canStartBattle,
        prepActionHint: this.data.prepActionHint,
        runBuffSummary: this.data.runBuffSummary,
        nextSupplyWave: this.data.nextSupplyWave,
        showWaveChoice: this.data.showWaveChoice,
        waveChoiceMode: this.data.waveChoiceMode,
        waveChoicePanelTitle: this.data.waveChoicePanelTitle,
        waveChoiceTitle: this.data.waveChoiceTitle,
        waveChoiceHint: this.data.waveChoiceHint,
        waveChoiceOptions: this.data.waveChoiceOptions || [],
        pendingSpecializationTowerId: this.data.pendingSpecializationTowerId,
        pendingSpecializationSource: this.data.pendingSpecializationSource,
        choiceReturnState: this.data.choiceReturnState,
        activeChainIcon: this.data.activeChainIcon,
        activeChainTitle: this.data.activeChainTitle,
        activeChainDescription: this.data.activeChainDescription,
        currentThreatIcon: this.data.currentThreatIcon,
        currentThreatTitle: this.data.currentThreatTitle,
        currentThreatDescription: this.data.currentThreatDescription,
        currentThreatCounterText: this.data.currentThreatCounterText,
        threatMissionText: this.data.threatMissionText,
        threatMissionReady: this.data.threatMissionReady,
        commanderCost: this.data.commanderCost,
        commanderAiming: false,
        commanderReadyText: this.data.commanderReadyText,
        commandPoints: this.data.commandPoints,
        summonCost: this.data.summonCost,
        selectedInventoryIndex: this.data.selectedInventoryIndex
      },
      inventory: this.inventory,
      towers: this.towers,
      // 截断保存，防止后期怪物过多导致序列化卡死 / OOM
      monsters: (this.monsters || []).slice(0, 30),
      waveMonsters: (this.waveMonsters || []).slice(0, 50)
    }
  },

  persistRunProgress({ immediate = false } = {}) {
    if (!this.hasMeaningfulRunProgress() || this.data.gameState === 'gameover') {
      this.clearRunProgress()
      return false
    }

    const now = Date.now()
    // 怪潮时 JSON 快照 + storage 会造成明显尖峰；退出/暂停仍会 immediate 同步保存
    if (!immediate && this.performanceProfileKey && this.performanceProfileKey !== 'relaxed') {
      return false
    }
    if (!immediate && now - (this.lastRunPersistedAt || 0) < RUN_PROGRESS_INTERVAL) {
      return false
    }

    const snapshot = this.buildRunProgressSnapshot()
    this.lastRunPersistedAt = now

    // 退出/暂停必须同步落盘，避免 async 未完成或 inFlight 跳过导致读到旧档/空档
    if (immediate) {
      try {
        wx.setStorageSync(RUN_PROGRESS_KEY, snapshot)
        this._persistInFlight = false
        return true
      } catch (error) {
        console.warn('persistRunProgress sync failed', error)
        this._persistInFlight = false
        return false
      }
    }

    // 上一份 setStorage 未完成则跳过，避免异步队列堆积旧 snapshot 闭包导致 OOM
    if (this._persistInFlight) {
      return false
    }

    this._persistInFlight = true
    try {
      wx.setStorage({
        key: RUN_PROGRESS_KEY,
        data: snapshot,
        complete: () => {
          this._persistInFlight = false
        }
      })
      return true
    } catch (error) {
      console.warn('persistRunProgress failed', error)
      this._persistInFlight = false
      return false
    }
  },

  clearRunProgress() {
    this.lastRunPersistedAt = 0
    this._persistInFlight = false
    try {
      wx.removeStorageSync(RUN_PROGRESS_KEY)
    } catch (error) {
      console.warn('clearRunProgress failed', error)
    }
  },

  normalizeSavedTower(tower, mode = 'field', blessingKey = this.data.selectedBlessingKey) {
    if (!tower || !tower.type || !TOWER_TYPES[tower.type]) return null
    const stats = this.getTowerStatsForLevel(
      tower.type,
      tower.level || 1,
      mode,
      blessingKey,
      tower.specializationKey
    )
    return {
      ...tower,
      ...stats,
      lastAttack: tower.lastAttack || 0
    }
  },

  tryRestoreRunProgress() {
    let snapshot = null
    try {
      snapshot = wx.getStorageSync(RUN_PROGRESS_KEY)
    } catch (error) {
      snapshot = null
    }

    if (!snapshot || snapshot.version !== RUN_PROGRESS_VERSION || !snapshot.data) {
      return false
    }

    try {
      const savedData = snapshot.data
      const blessingKey = savedData.selectedBlessingKey || ''
      const themeKey = savedData.currentTheme || 'forest'
      this.ensureThemeForKey(themeKey, savedData.level || 1)
      const threat = (typeof this.resolveWaveThreat === 'function'
        ? this.resolveWaveThreat(savedData.wave || 1)
        : null) || {
        key: snapshot.currentWaveThreatKey || 'swarm',
        icon: savedData.currentThreatIcon || '🐜',
        title: savedData.currentThreatTitle || '虫潮奔袭',
        description: savedData.currentThreatDescription || '',
        counterText: savedData.currentThreatCounterText || ''
      }

      if (typeof this.clearScheduledTimeouts === 'function') {
        this.clearScheduledTimeouts()
      }

      this.generatePath(themeKey)
      this.towers = (snapshot.towers || [])
        .map((tower) => this.normalizeSavedTower(tower, 'field', blessingKey))
        .filter(Boolean)
      this.inventory = (snapshot.inventory || [])
        .map((tower) => this.normalizeSavedTower(tower, 'inventory', blessingKey))
        .filter(Boolean)
      this.monsters = (snapshot.monsters || []).map((monster) => ({
        ...monster,
        walkPhase: Number.isFinite(monster.walkPhase) ? monster.walkPhase : Math.random() * Math.PI * 2,
        facing: monster.facing || 1,
        animFrame: monster.animFrame || 0,
        animTimer: monster.animTimer || 0
      }))
      this.waveMonsters = (snapshot.waveMonsters || []).map((monster) => ({ ...monster }))
      this.projectiles = []
      this.particles = []
      this.floatingTexts = []
      this.lightningEffects = []
      this.fireEffects = []
      this.iceEffects = []
      this.poisonEffects = []
      this.arcaneEffects = []
      this.mergeEffects = []
      this.blessingApplied = snapshot.blessingApplied !== false
      this.runDamageBonus = snapshot.runBonuses?.damage || 0
      this.runRangeBonus = snapshot.runBonuses?.range || 0
      this.runAttackSpeedBonus = snapshot.runBonuses?.attackSpeed || 0
      this.runCritBonus = snapshot.runBonuses?.crit || 0
      this.currentWaveThreat = threat
      this.currentThreatMissionProgress = snapshot.currentThreatMissionProgress || 0
      this.currentThreatMissionTarget = snapshot.currentThreatMissionTarget ||
        (typeof this.getThreatMissionTarget === 'function'
          ? this.getThreatMissionTarget(savedData.wave || 1, threat)
          : 0)
      this.currentThreatMissionCompleted = !!snapshot.currentThreatMissionCompleted
      this.waveStartLives = snapshot.waveStartLives || savedData.lives || 20
      this.waveComplete = !!snapshot.waveComplete
      this.spawnIndex = Math.max(0, snapshot.spawnIndex || 0)
      this.lastSpawnTime = Date.now() - Math.min(snapshot.lastSpawnDelta || 0, CONFIG.spawnInterval)
      this.pendingWaveAdvance = snapshot.pendingWaveAdvance || null
      // 规范化读档状态：暂停/死局/空选择/波次死锁都会导致“关卡不动、不出怪”
      const restored = this.sanitizeRestoredRunState(savedData, snapshot)
      Object.assign(savedData, restored.dataPatch)
      this.performanceProfileKey = 'relaxed'
      this.activePerformanceProfile = PERFORMANCE_PROFILES.relaxed
      this.lastPerformanceProfileCheckAt = 0
      this.lastBossSeenAt = 0
      this.lastFrameRenderAt = 0
      this.renderFrameCount = 0
      this.pendingGoldDelta = 0
      this.pendingScoreDelta = 0
      this.pendingLivesDelta = 0
      this.pendingCommandPointsDelta = 0
      this.lastIdleRenderAt = 0
      this.lastDragUiUpdateAt = 0
      this.lastMergeHintVisible = false
      this.lastMergeHintSlotIndex = -1
      this.lastMergeCost = 0
      this.lastMergeTargetNextLevel = 0
      this.draggingTower = null
      this.pendingDragTower = null
      this.isDragging = false
      this.hasMoved = false
      this.mergeTarget = null
      this.mergeTargetType = null
      this.mergeTargetInventoryIndex = -1

      this.rebuildGridFromTowers()
      // 读档后按当前路径重算塔位，并把落在路上/过远的塔挪开
      this.towerSlots = this.buildTowerSlotsAlongPath()
      this.relocateInvalidTowers()

      this.setData({
        ...savedData,
        gameState: restored.gameState,
        currentTheme: themeKey,
        currentThreatIcon: threat.icon || savedData.currentThreatIcon,
        currentThreatTitle: threat.title || savedData.currentThreatTitle,
        currentThreatDescription: threat.description || savedData.currentThreatDescription,
        currentThreatCounterText: threat.counterText || savedData.currentThreatCounterText,
        dragFloating: false,
        draggingSlotIndex: -1,
        mergeTargetSlotIndex: -1,
        showMergeHint: false,
        commanderAiming: false,
        showWaveChoice: restored.gameState === 'choice' ? !!savedData.showWaveChoice : false
      })

      this.updateInventoryDisplay()
      this.syncPrepTowerSlots(themeKey)
      this.syncFieldTowerCount()
      if (typeof this.updateRunBuffSummary === 'function') {
        this.updateRunBuffSummary(savedData.wave || 1)
      }
      if (typeof this.syncThreatMissionDisplay === 'function') {
        this.syncThreatMissionDisplay()
      }
      this.refreshCanvasRect()
      this.refreshInventoryRect()
      if (restored.gameState === 'prep' && typeof this.schedulePrepLayoutSync === 'function') {
        this.schedulePrepLayoutSync()
      }
      this.requestRender()
      this.lastRunPersistedAt = Date.now()
      wx.showToast({ title: '已恢复上次战局', icon: 'none' })
      return true
    } catch (error) {
      console.warn('tryRestoreRunProgress failed', error)
      this.clearRunProgress()
      return false
    }
  },

  // 读档后修复会卡死推进的状态（暂停回菜单再进最常见）
  sanitizeRestoredRunState(savedData = {}, snapshot = {}) {
    const dataPatch = {
      showWaveChoice: !!savedData.showWaveChoice,
      waveChoiceOptions: savedData.waveChoiceOptions || [],
      wave: savedData.wave || 1,
      level: savedData.level || 1,
      waveInLevel: savedData.waveInLevel || 1
    }

    let gameState = savedData.gameState || 'playing'

    // 从菜单重新进入：自动续玩，避免停在 paused 导致 update 不跑、不出怪
    if (gameState === 'paused' || gameState === 'gameover') {
      gameState = 'playing'
    }

    // choice 但选项丢失时，降级为可游玩
    if (gameState === 'choice') {
      const options = dataPatch.waveChoiceOptions
      if (!dataPatch.showWaveChoice || !Array.isArray(options) || options.length === 0) {
        gameState = 'playing'
        dataPatch.showWaveChoice = false
        dataPatch.waveChoiceOptions = []
      }
    }

    if (gameState === 'prep') {
      this.waveComplete = false
      this.pendingWaveAdvance = null
      this.lastSpawnTime = Date.now() + 60000
      return { gameState, dataPatch }
    }

    if (gameState === 'choice') {
      return { gameState, dataPatch }
    }

    // playing：修复波次死锁（waveComplete / 空波次队列 / 被清掉的推进定时器）
    const noMonsters = !this.monsters || this.monsters.length === 0
    const waveQueueEmpty = !this.waveMonsters || this.waveMonsters.length === 0
    const spawnDone = waveQueueEmpty || this.spawnIndex >= this.waveMonsters.length

    if (this.pendingWaveAdvance && noMonsters) {
      const pw = this.pendingWaveAdvance
      this.pendingWaveAdvance = null
      this.waveComplete = false
      dataPatch.wave = pw.wave || dataPatch.wave
      dataPatch.level = pw.level || dataPatch.level
      dataPatch.waveInLevel = pw.waveInLevel || dataPatch.waveInLevel
      this.generateWave(dataPatch.wave)
      this.lastSpawnTime = Date.now()
      return { gameState: 'playing', dataPatch }
    }

    if (noMonsters && (this.waveComplete || spawnDone)) {
      this.waveComplete = false
      this.pendingWaveAdvance = null
      this.generateWave(dataPatch.wave)
      this.lastSpawnTime = Date.now()
    } else {
      // 确保不会因为 lastSpawnTime 异常偏未来而长时间不出怪
      this.lastSpawnTime = Math.min(this.lastSpawnTime || Date.now(), Date.now())
      this.waveComplete = false
    }

    return { gameState: 'playing', dataPatch }
  },

  generateMapDecorations(themeKey) {
    const theme = MAP_THEMES[themeKey] || MAP_THEMES.forest
    this.mapDecorations = []
    
    // 边缘装饰 - 更丰富
    const edgePositions = [
      { x: 15, y: 40 }, { x: 12, y: 100 }, { x: 20, y: 160 },
      { x: 10, y: 220 }, { x: 18, y: 280 }, { x: 25, y: 340 },
      { x: CONFIG.canvasWidth - 18, y: 35 }, { x: CONFIG.canvasWidth - 15, y: 90 },
      { x: CONFIG.canvasWidth - 22, y: 150 }, { x: CONFIG.canvasWidth - 12, y: 210 },
      { x: CONFIG.canvasWidth - 20, y: 270 }, { x: CONFIG.canvasWidth - 25, y: 330 },
      { x: CONFIG.canvasWidth / 2 - 60, y: 20 }, { x: CONFIG.canvasWidth / 2 + 50, y: 15 },
      { x: CONFIG.canvasWidth / 2, y: CONFIG.canvasHeight - 40 },
      // 额外装饰点
      { x: 30, y: 400 }, { x: CONFIG.canvasWidth - 30, y: 400 },
      { x: 50, y: 60 }, { x: CONFIG.canvasWidth - 50, y: 60 },
      { x: CONFIG.canvasWidth / 2 - 100, y: CONFIG.canvasHeight - 25 },
      { x: CONFIG.canvasWidth / 2 + 100, y: CONFIG.canvasHeight - 30 },
      { x: 8, y: 460 }, { x: CONFIG.canvasWidth - 10, y: 470 }
    ]
    
    edgePositions.forEach((pos, i) => {
      const types = theme.decorTypes
      this.mapDecorations.push({
        x: pos.x,
        y: pos.y,
        type: types[i % types.length],
        size: 0.7 + Math.random() * 0.5
      })
    })
    
    // 存储当前主题
    this.currentThemeKey = themeKey
  },

  generateWave(wave) {
    this.waveMonsters = []

    const threat = this.resolveWaveThreat ? this.resolveWaveThreat(wave) : {}
    const waveModifier = this.pendingNextWaveModifier && this.pendingNextWaveModifier.targetWave === wave
      ? this.pendingNextWaveModifier
      : null
    if (waveModifier) {
      this.pendingNextWaveModifier = null
    }

    // 基础怪物数量随波次增加，并受威胁类型调节；前两图略少，避免开局被数量压垮
    const level = Math.ceil(wave / 10)
    const rawBaseCount = level <= 2
      ? 4 + Math.floor(wave * 1.15)
      : 5 + Math.floor(wave * 1.5)
    const baseCount = Math.max(
      level <= 2 ? 4 : 5,
      Math.min(
        70,
        Math.round(rawBaseCount * (threat.countMultiplier || 1) * (waveModifier?.countMultiplier || 1))
      )
    )

    // 获取当前波次可用的怪物类型
    const availableTypes = Object.keys(MONSTER_TYPES).filter((t) => {
      const config = MONSTER_TYPES[t]
      return !config.isBoss && config.unlockWave <= wave
    })

    // 前 2 个地图：血量/护甲更软，方便合成塔打穿；第 3 图起再爬升。
    // 第 3 图起：以第 2 图末为锚点爬升，真正难度主要由场上塔数/等级在 spawn 时加压。
    let progressionHpMultiplier
    let baseArmor
    if (level <= 2) {
      const earlyHpEase = level === 1 ? 0.86 : 0.9
      progressionHpMultiplier = (1 + (wave - 1) * 0.13) * (1 + (level - 1) * 0.08) * earlyHpEase
      baseArmor = Math.min(0.18, (wave - 1) * 0.004 + (level - 1) * 0.018)
    } else {
      const map2EndMultiplier = (1 + 19 * 0.13) * (1 + 1 * 0.08) * 0.9
      progressionHpMultiplier = map2EndMultiplier * (1 + (wave - 20) * 0.08) * (1 + (level - 2) * 0.12)
      baseArmor = Math.min(0.55, 0.08 + (wave - 20) * 0.01 + (level - 2) * 0.04)
    }
    const hpMultiplier = progressionHpMultiplier *
      (threat.hpMultiplier || 1) * (waveModifier?.hpMultiplier || 1)
    // 前三关只小幅放慢；随后恢复原速，不影响中后期节奏。
    const earlySpeedFactor = level === 1 ? 0.9 : (level === 2 ? 0.94 : (level === 3 ? 0.97 : 1))
    const speedMultiplier = (threat.speedMultiplier || 1) *
      (waveModifier?.speedMultiplier || 1) * earlySpeedFactor
    const goldMultiplier = waveModifier?.goldMultiplier || 1
    const armorCap = level <= 2 ? 0.18 : 0.55

    for (let i = 0; i < baseCount; i++) {
      let type
      if (availableTypes.length === 1) {
        type = availableTypes[0]
      } else {
        const weights = availableTypes.map((t) => {
          const unlockWave = MONSTER_TYPES[t].unlockWave
          return Math.max(1, wave - unlockWave + 2)
        })
        const totalWeight = weights.reduce((a, b) => a + b, 0)
        let random = Math.random() * totalWeight
        let typeIndex = 0
        for (let j = 0; j < weights.length; j++) {
          random -= weights[j]
          if (random <= 0) {
            typeIndex = j
            break
          }
        }
        type = availableTypes[typeIndex]
      }

      const config = MONSTER_TYPES[type]
      this.waveMonsters.push({
        type,
        ...config,
        hp: Math.floor(config.baseHp * hpMultiplier),
        maxHp: Math.floor(config.baseHp * hpMultiplier),
        speed: Number((config.speed * speedMultiplier).toFixed(2)),
        goldDrop: Math.floor(config.goldDrop * (1 + (wave - 1) * 0.06) * goldMultiplier),
        armor: Math.min(armorCap, baseArmor + (config.armor || 0))
      })
    }

    // 每5波出Boss - 不同关卡不同Boss
    if (wave % 5 === 0) {
      const bossTypes = ['dragon', 'treant', 'lich', 'phoenix']
      const bossType = bossTypes[(level - 1) % bossTypes.length]
      const bossConfig = MONSTER_TYPES[bossType]
      const bossHpMultiplier = (level <= 2
        ? (1 + (wave - 1) * 0.07) * (level === 1 ? 0.58 : 0.66)
        : progressionHpMultiplier * 1.05) * (threat.bossHpMultiplier || 1)
      this.waveMonsters.push({
        type: bossType,
        ...bossConfig,
        hp: Math.floor(bossConfig.baseHp * bossHpMultiplier),
        maxHp: Math.floor(bossConfig.baseHp * bossHpMultiplier),
        speed: Number((bossConfig.speed * speedMultiplier).toFixed(2)),
        goldDrop: bossConfig.goldDrop * Math.ceil(wave / 5) + (threat.bossGoldBonus || 0),
        armor: Math.min(armorCap, baseArmor + (level <= 2 ? 0.04 : 0.12))
      })
    }

    // 随机打乱顺序
    this.waveMonsters.sort(() => Math.random() - 0.5)

    this.spawnIndex = 0
    this.waveComplete = false
    this.lastSpawnTime = Date.now()
  },

  startGame() {
    if (this.gameLoop) {
      clearInterval(this.gameLoop)
    }

    this.lastFrameRenderAt = 0
    this.updatePerformanceProfile(Date.now(), true)

    this.gameLoop = setInterval(() => {
      const now = Date.now()

      if (this.data.gameState === 'playing') {
        this.update(now)
        if (this.shouldRenderFrame(now)) {
          this.render()
          this.lastFrameRenderAt = now
        }
        return
      }

      if (this.needsRender || now - this.lastIdleRenderAt >= IDLE_RENDER_INTERVAL) {
        this.render()
        this.needsRender = false
        this.lastIdleRenderAt = now
        this.lastFrameRenderAt = now
      }
    }, 1000 / 60)
  },

  stopGame() {
    if (this.gameLoop) {
      clearInterval(this.gameLoop)
      this.gameLoop = null
    }
    this.lastFrameRenderAt = 0
    this.clearScheduledTimeouts()
  },

  safeUpdate(step, fn, ...args) {
    try {
      fn.apply(this, args)
    } catch (error) {
      if (!this._updateStepFailures) this._updateStepFailures = {}
      const rec = this._updateStepFailures[step] || (this._updateStepFailures[step] = { count: 0, firstMessage: '', firstStack: '' })
      rec.count += 1
      if (!rec.firstMessage) {
        rec.firstMessage = (error && error.message) || String(error)
        rec.firstStack = (error && error.stack) || rec.firstMessage
      }
      const now = Date.now()
      if (now - (this.lastUpdateStepWarnAt || 0) >= 2000) {
        this.lastUpdateStepWarnAt = now
        console.warn('update step failed: ' + step, rec.firstStack)
      }
      // 单步逻辑更新失败不影响整局，避免一处异常导致 update 链中断、整局数据冻结（"停住不动"）
    }
  },

  update(now = Date.now()) {
    if (this.data.gameState !== 'playing') return

    this.safeUpdate('perfProfile', this.updatePerformanceProfile, now)

    if (this.spawnIndex < this.waveMonsters.length) {
      if (now - this.lastSpawnTime > CONFIG.spawnInterval) {
        this.safeUpdate('spawn', () => {
          this.spawnMonster(this.waveMonsters[this.spawnIndex])
        })
        this.spawnIndex++
        this.lastSpawnTime = now
      }
    }

    this.safeUpdate('monsters', this.updateMonsters)
    this.safeUpdate('commander', this.updateCommander, now)
    this._towerUpdateTick = (this._towerUpdateTick || 0) + 1
    const towerUpdateStride = this.performanceProfileKey === 'intense'
      ? 3
      : (this.performanceProfileKey === 'busy' ? 2 : 1)
    if (this._towerUpdateTick % towerUpdateStride === 0) {
      this.safeUpdate('towers', this.updateTowers, now)
    }
    this.safeUpdate('projectiles', this.updateProjectiles)

    // 拖拽合成时优先保证触摸命中：跳过重特效更新与存档，减轻主线程抢占
    if (!this.isDragging) {
      this._effectUpdateTick = (this._effectUpdateTick || 0) + 1
      const effectUpdateStride = this.performanceProfileKey === 'intense' ? 2 : 1
      if (this._effectUpdateTick % effectUpdateStride === 0) {
        this.safeUpdate('particles', this.updateParticles)
        this.safeUpdate('floatingTexts', this.updateFloatingTexts)
        this.safeUpdate('lightningEffects', this.updateLightningEffects)
        this.safeUpdate('fireEffects', this.updateFireEffects)
        this.safeUpdate('iceEffects', this.updateIceEffects)
        this.safeUpdate('poisonEffects', this.updatePoisonEffects)
        this.safeUpdate('arcaneEffects', this.updateArcaneEffects)
        this.safeUpdate('mergeEffects', this.updateMergeEffects)
      }
      this.safeUpdate('persistProgress', this.persistRunProgress)
    }

    this._performanceCapTick = (this._performanceCapTick || 0) + 1
    const capStride = this.performanceProfileKey === 'intense' ? 3 : 2
    if (this._performanceCapTick % capStride === 0) {
      this.safeUpdate('performanceCaps', this.enforcePerformanceCaps)
    }
    this.safeUpdate('flushStats', this.flushQueuedStats)

    if (this.spawnIndex >= this.waveMonsters.length && this.monsters.length === 0 && !this.waveComplete) {
      this.waveComplete = true
      this.nextWave()
    }

    // Boss 在场时塔攻击力轻幅下降（动态维护 runBossDamagePenalty，applyDamage 读取）
    this.runBossDamagePenalty = this.hasBossOnField() ? 0.85 : 1

    // 看门狗：波次推进卡在 choice 分支（overlay 未真正切入 choice 状态）时，超时兜底推进，避免整局冻结
    if (this.pendingWaveAdvance && this.data.gameState === 'playing') {
      this._pendingWaveStuckAt = this._pendingWaveStuckAt || Date.now()
      if (Date.now() - this._pendingWaveStuckAt > 2500) {
        const pw = this.pendingWaveAdvance
        this.pendingWaveAdvance = null
        this._pendingWaveStuckAt = 0
        this.setData({
          showWaveChoice: false,
          waveChoiceMode: '',
          waveChoicePanelTitle: '战术补给',
          waveChoiceTitle: '',
          waveChoiceHint: '',
          waveChoiceOptions: [],
          pendingSpecializationTowerId: null,
          pendingSpecializationSource: '',
          choiceReturnState: 'playing',
          wave: pw.wave,
          level: pw.level,
          waveInLevel: pw.waveInLevel,
          totalWavesInLevel: 10,
          nextSupplyWave: this.getNextSupplyWave(pw.wave),
          gameState: 'playing',
          commanderAiming: false
        }, () => {
          this.generateWave(pw.wave)
          this.lastSpawnTime = Date.now() + 300
          this.requestRender()
        })
        console.warn('watchdog: force-advance wave (choice overlay did not enter choice state)', pw)
      }
    } else {
      this._pendingWaveStuckAt = 0
    }

    if (this.data.lives <= 0) {
      this.safeUpdate('gameOver', this.gameOver)
    }
  },

  // 第 3 图起：怪物强度与场上塔数量/等级强相关；前两图不加压，保证开局。
  getDefensePressure() {
    const level = this.data.level || Math.ceil((this.data.wave || 1) / 10)
    if (level < 3) {
      return {
        active: false,
        hpMultiplier: 1,
        armorBonus: 0,
        speedMultiplier: 1,
        powerScore: 0
      }
    }

    const towers = this.towers || []
    const towerCount = towers.length
    const powerScore = towers.reduce((sum, tower) => {
      return sum + Math.pow(Math.max(1, tower.level || 1), 1.25)
    }, 0)
    // 约 6 座 3 级塔附近开始明显加压；高阶塔权重更大，上限防止失控。
    const excessPower = Math.max(0, powerScore - 10)
    return {
      active: true,
      powerScore,
      hpMultiplier: 1 + Math.min(5.5, Math.pow(excessPower, 0.78) * 0.22 + towerCount * 0.03),
      armorBonus: Math.min(0.2, excessPower * 0.008 + towerCount * 0.004),
      speedMultiplier: 1 + Math.min(0.18, excessPower * 0.003 + towerCount * 0.002)
    }
  },

  spawnMonster(template) {
    const pressure = this.getDefensePressure()
    const templateMaxHp = template.maxHp || template.hp || template.baseHp || 1
    const scaledHp = Math.max(1, Math.floor(templateMaxHp * pressure.hpMultiplier))
    this.monsters.push({
      ...template,
      hp: scaledHp,
      maxHp: scaledHp,
      armor: Math.min(0.7, (template.armor || 0) + pressure.armorBonus),
      speed: Number((template.speed * pressure.speedMultiplier).toFixed(2)),
      defensePressureScore: pressure.powerScore,
      x: this.pathPoints[0].x,
      y: this.pathPoints[0].y,
      pathIndex: 0,
      // 状态效果
      burnTimer: 0,
      burnDamage: 0,
      slowTimer: 0,
      vineTimer: 0,        // 藤蔓缠绕计时器
      vineVulnerability: 0, // 藤蔓造成的易伤比例
      // 动画
      animFrame: 0,
      animTimer: 0,
      walkPhase: Math.random() * Math.PI * 2,
      facing: 1
    })
    if (template.isBoss) {
      this.playSound('boss', { cooldown: 0 })
    }
  },

  updateMonsters() {
    const crowded = this.monsters.length >= 18
    const effectStride = crowded ? 3 : 1

    this.monsters = this.monsters.filter(monster => {
      // 动画计时（兼容旧逻辑；主走路动画用 walkPhase）
      monster.animTimer++
      if (monster.animTimer > 5) {
        monster.animTimer = 0
        monster.animFrame = (monster.animFrame + 1) % 8
      }

      // 生命回复（巨魔等坦克怪）
      if (monster.regenPerSec && monster.regenPerSec > 0) {
        monster.hp = Math.min(monster.maxHp, monster.hp + monster.regenPerSec / 60)
      }

      // 灼烧效果
      if (monster.burnTimer > 0) {
        monster.hp -= monster.burnDamage
        monster.burnTimer--
        if (!crowded && monster.burnTimer % 10 === 0) {
          this.fireEffects.push({
            x: monster.x + (Math.random() - 0.5) * 20,
            y: monster.y + (Math.random() - 0.5) * 20,
            size: 8 + Math.random() * 6,
            life: 20,
            maxLife: 20
          })
        }
      }
      
      // 减速效果
      let speedMod = 1
      if (monster.slowTimer > 0) {
        speedMod = 0.5
        monster.slowTimer--
        if (!crowded && monster.slowTimer % 15 === 0) {
          this.iceEffects.push({
            x: monster.x + (Math.random() - 0.5) * 20,
            y: monster.y + (Math.random() - 0.5) * 20,
            size: 5 + Math.random() * 4,
            life: 25,
            maxLife: 25,
            angle: Math.random() * Math.PI * 2
          })
        }
      }

      // 藤蔓缠绕效果 - 减速30% + 易伤
      if (monster.vineTimer > 0) {
        speedMod *= 0.7  // 额外减速30%
        monster.vineTimer--
        if (!crowded && monster.vineTimer % (12 * effectStride) === 0) {
          this.poisonEffects.push({
            x: monster.x + (Math.random() - 0.5) * 15,
            y: monster.y + 5,
            size: 4 + Math.random() * 3,
            life: 20,
            maxLife: 20,
            vy: 0.2,
            isVine: true
          })
        }
        if (monster.vineTimer <= 0) {
          monster.vineVulnerability = 0
        }
      }
      
      const target = this.pathPoints[monster.pathIndex + 1]
      if (!target) {
        this.queueStatDelta({ lives: -(monster.isBoss ? 5 : 1) })
        if (!crowded) this.createParticles(monster.x, monster.y, '#ff0000', 12)
        return false
      }
      
      const dx = target.x - monster.x
      const dy = target.y - monster.y
      const distSq = dx * dx + dy * dy
      
      if (distSq < 25) {
        monster.pathIndex++
        monster.walkPhase = (monster.walkPhase || 0) + 0.03 * speedMod
      } else {
        const dist = Math.sqrt(distSq)
        const moveSpeed = monster.speed * speedMod * 1.5
        monster.x += (dx / dist) * moveSpeed
        monster.y += (dy / dist) * moveSpeed
        if (Math.abs(dx) > 0.2) {
          monster.facing = dx >= 0 ? 1 : -1
        }
        monster.walkPhase = (monster.walkPhase || 0) + moveSpeed * 0.12
      }
      
      if (monster.hp <= 0) {
        this.onMonsterKilled(monster)
        return false
      }
      
      return true
    })
  },

  onMonsterKilled(monster) {
    const gold = monster.goldDrop || 0
    this.queueStatDelta({
      gold,
      score: gold * 10
    })

    const crowded = this.monsters.length >= 20
    // 怪多时只留一条飘字，避免击杀洪峰打爆主线程
    this._killTextTick = (this._killTextTick || 0) + 1
    if (!crowded || monster.isBoss || this._killTextTick % 3 === 0) {
      this.floatingTexts.push({
        x: monster.x,
        y: monster.y - 20,
        text: `+${gold}`,
        color: '#ffd700',
        life: crowded ? 36 : 60,
        maxLife: crowded ? 36 : 60,
        vy: -1.5,
        vx: 0,
        scale: crowded ? 1.1 : 1.5,
        isBold: true
      })
    }

    if (!crowded) {
      this.createMonsterDeathEffect(monster)
    } else if (monster.isBoss) {
      this.createParticles(monster.x, monster.y, monster.bodyColor || '#fff', 10)
    }
  },

  // 差异化怪物死亡特效
  createMonsterDeathEffect(monster) {
    const size = monster.isBoss ? 22 : 14
    
    switch (monster.type) {
      case 'slime':
        // 史莱姆：分裂成小液滴四散
        for (let i = 0; i < 12; i++) {
          const angle = (Math.PI * 2 / 12) * i + Math.random() * 0.3
          const speed = 2 + Math.random() * 3
          this.particles.push({
            x: monster.x, y: monster.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            size: 4 + Math.random() * 6,
            color: monster.bodyColor,
            life: 40,
            maxLife: 40,
            alpha: 0.8
          })
        }
        // 粘液飞溅
        for (let i = 0; i < 6; i++) {
          this.floatingTexts.push({
            x: monster.x + (Math.random() - 0.5) * 30,
            y: monster.y + (Math.random() - 0.5) * 20,
            text: '💧',
            color: '#66ff66',
            life: 30,
            maxLife: 30,
            vy: -1 - Math.random(),
            vx: (Math.random() - 0.5) * 3,
            scale: 0.5 + Math.random() * 0.3
          })
        }
        break
        
      case 'bat':
        // 蝙蝠：羽毛飘落
        for (let i = 0; i < 8; i++) {
          const angle = Math.random() * Math.PI * 2
          this.particles.push({
            x: monster.x + (Math.random() - 0.5) * 20,
            y: monster.y,
            vx: (Math.random() - 0.5) * 2,
            vy: 0.5 + Math.random(),  // 向下飘落
            size: 3 + Math.random() * 3,
            color: '#444455',
            life: 50,
            maxLife: 50,
            alpha: 1
          })
        }
        // 翅膀碎片emoji
        this.floatingTexts.push({
          x: monster.x - 15, y: monster.y,
          text: '🪶', color: '#666', life: 40, maxLife: 40,
          vy: 0.5, vx: -1, scale: 0.8
        })
        this.floatingTexts.push({
          x: monster.x + 15, y: monster.y,
          text: '🪶', color: '#666', life: 40, maxLife: 40,
          vy: 0.5, vx: 1, scale: 0.8
        })
        break
        
      case 'skeleton':
        // 骷髅：骨头散落
        const boneEmojis = ['🦴', '💀', '🦷']
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 / 6) * i
          this.floatingTexts.push({
            x: monster.x,
            y: monster.y,
            text: boneEmojis[i % boneEmojis.length],
            color: '#eee',
            life: 50,
            maxLife: 50,
            vy: -2 - Math.random() * 2,
            vx: Math.cos(angle) * 3,
            scale: 0.6 + Math.random() * 0.3
          })
        }
        // 白色碎片
        this.createParticles(monster.x, monster.y, '#eeeeee', 15)
        break
        
      case 'ghost':
        // 幽灵：渐隐消散 + 灵魂升天
        for (let i = 0; i < 10; i++) {
          this.particles.push({
            x: monster.x + (Math.random() - 0.5) * 30,
            y: monster.y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 1,
            vy: -1 - Math.random() * 2,  // 向上飘
            size: 8 + Math.random() * 8,
            color: 'rgba(180, 180, 255, 0.5)',
            life: 60,
            maxLife: 60,
            alpha: 0.6
          })
        }
        // 灵魂升天
        this.floatingTexts.push({
          x: monster.x, y: monster.y,
          text: '👻', color: '#aaf', life: 60, maxLife: 60,
          vy: -2, vx: 0, scale: 1.2
        })
        break
        
      case 'orc':
        // 兽人：血液飞溅 + 武器掉落
        for (let i = 0; i < 15; i++) {
          const angle = Math.random() * Math.PI * 2
          const speed = 2 + Math.random() * 4
          this.particles.push({
            x: monster.x, y: monster.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            size: 3 + Math.random() * 4,
            color: '#882222',  // 血红色
            life: 35,
            maxLife: 35,
            alpha: 1
          })
        }
        // 武器掉落
        this.floatingTexts.push({
          x: monster.x, y: monster.y,
          text: '🪓', color: '#888', life: 50, maxLife: 50,
          vy: -1, vx: 2, scale: 1
        })
        this.createParticles(monster.x, monster.y, monster.bodyColor, 10)
        break
        
      case 'golem':
        // 石魔：岩石崩裂
        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2
          const speed = 1 + Math.random() * 5
          this.particles.push({
            x: monster.x + (Math.random() - 0.5) * 20,
            y: monster.y + (Math.random() - 0.5) * 20,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            size: 4 + Math.random() * 8,
            color: Math.random() > 0.5 ? '#666666' : '#888888',
            life: 45,
            maxLife: 45,
            alpha: 1
          })
        }
        // 碎石emoji
        this.floatingTexts.push({
          x: monster.x, y: monster.y,
          text: '🪨', color: '#777', life: 40, maxLife: 40,
          vy: -2, vx: -1, scale: 1
        })
        this.floatingTexts.push({
          x: monster.x, y: monster.y,
          text: '🪨', color: '#777', life: 40, maxLife: 40,
          vy: -1.5, vx: 1.5, scale: 0.8
        })
        break
        
      case 'demon':
        // 恶魔：火焰爆发 + 暗影消散
        for (let i = 0; i < 15; i++) {
          const angle = (Math.PI * 2 / 15) * i
          this.fireEffects.push({
            x: monster.x + Math.cos(angle) * 10,
            y: monster.y + Math.sin(angle) * 10,
            size: 10 + Math.random() * 8,
            life: 30,
            maxLife: 30,
            vx: Math.cos(angle) * 2,
            vy: Math.sin(angle) * 2 - 1
          })
        }
        // 暗影粒子
        for (let i = 0; i < 10; i++) {
          this.particles.push({
            x: monster.x + (Math.random() - 0.5) * 30,
            y: monster.y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 3,
            vy: -2 - Math.random() * 2,
            size: 6 + Math.random() * 6,
            color: '#220000',
            life: 40,
            maxLife: 40,
            alpha: 0.8
          })
        }
        // 恶魔符号
        this.floatingTexts.push({
          x: monster.x, y: monster.y,
          text: '😈', color: '#ff4444', life: 50, maxLife: 50,
          vy: -2.5, vx: 0, scale: 1.5
        })
        break
        
      case 'dragon':
        // 巨龙Boss击杀特效（真机限制：粒子数大幅削减，避免 40 个全屏金色粒子导致整张地图变色+卡顿）
        this.fireEffects.push({
          x: monster.x, y: monster.y,
          size: 30, life: 28, maxLife: 28
        })
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i
          this.particles.push({
            x: monster.x + Math.cos(angle) * 10,
            y: monster.y + Math.sin(angle) * 10,
            vx: Math.cos(angle) * 2, vy: Math.sin(angle) * 2 - 1,
            size: 6 + Math.random() * 4,
            color: '#ff6600', life: 30, maxLife: 30, alpha: 0.8
          })
        }
        this.floatingTexts.push({
          x: monster.x, y: monster.y - 20,
          text: '🐉', color: '#ff6600', life: 80, maxLife: 80,
          vy: -1.5, vx: 0, scale: 2
        })
        this.floatingTexts.push({
          x: monster.x, y: monster.y + 10,
          text: '💥 BOSS DOWN! 💥', color: '#ffaa00', life: 80, maxLife: 80,
          vy: -1, vx: 0, scale: 1.2, isBold: true
        })
        break
      
      case 'treant':
        // 树人王击杀特效（真机削减）
        for (let i = 0; i < 8; i++) {
          const angle = Math.random() * Math.PI * 2
          this.particles.push({
            x: monster.x, y: monster.y,
            vx: Math.cos(angle) * 2, vy: Math.sin(angle) * 2 - 1,
            size: 5 + Math.random() * 4,
            color: '#44aa22',
            life: 35, maxLife: 35, alpha: 0.8
          })
        }
        this.floatingTexts.push({
          x: monster.x, y: monster.y - 20,
          text: '🌳', color: '#44aa22', life: 80, maxLife: 80,
          vy: -1.5, vx: 0, scale: 2
        })
        this.floatingTexts.push({
          x: monster.x, y: monster.y + 10,
          text: '💥 BOSS DOWN! 💥', color: '#88dd44', life: 100, maxLife: 100,
          vy: -1, vx: 0, scale: 1.2, isBold: true
        })
        break
        
      case 'lich':
        // 巫妖击杀特效（真机削减）
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 / 6) * i
          this.arcaneEffects.push({
            x: monster.x, y: monster.y,
            size: 5 + Math.random() * 4,
            life: 25, maxLife: 25,
            angle: angle, dist: 0, speed: 2
          })
        }
        for (let i = 0; i < 5; i++) {
          this.particles.push({
            x: monster.x + (Math.random() - 0.5) * 20,
            y: monster.y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2,
            size: 4 + Math.random() * 4,
            color: '#8844ff', life: 30, maxLife: 30, alpha: 0.7
          })
        }
        this.floatingTexts.push({
          x: monster.x, y: monster.y - 20,
          text: '💀', color: '#aa66ff', life: 80, maxLife: 80,
          vy: -1.5, vx: 0, scale: 2
        })
        this.floatingTexts.push({
          x: monster.x, y: monster.y + 10,
          text: '💥 BOSS DOWN! 💥', color: '#aa66ff', life: 100, maxLife: 100,
          vy: -1, vx: 0, scale: 1.2, isBold: true
        })
        break
        
      case 'phoenix':
        // 凤凰击杀特效（真机削减）
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i
          this.fireEffects.push({
            x: monster.x + Math.cos(angle) * 10,
            y: monster.y + Math.sin(angle) * 10,
            size: 10 + Math.random() * 8,
            life: 28, maxLife: 28,
            vx: Math.cos(angle) * 1.5,
            vy: Math.sin(angle) * 1.5 - 1
          })
        }
        this.floatingTexts.push({
          x: monster.x, y: monster.y - 20,
          text: '🔥', color: '#ff6600', life: 80, maxLife: 80,
          vy: -1.5, vx: 0, scale: 2
        })
        this.floatingTexts.push({
          x: monster.x, y: monster.y + 10,
          text: '💥 BOSS DOWN! 💥', color: '#ffaa00', life: 100, maxLife: 100,
          vy: -1, vx: 0, scale: 1.2, isBold: true
        })
        break
      
      default:
        // 默认死亡特效
        this.createParticles(monster.x, monster.y, monster.bodyColor, 20)
        break
    }
  },

  updateTowers(now) {
    const monsters = this.monsters
    if (!monsters.length || !this.towers.length) return
    const commanderZone = this.commanderZone

    this.towers.forEach(tower => {
      if (now - tower.lastAttack < tower.attackSpeed) return
      
      let target = null
      let fallbackTarget = null
      const rangeSq = tower.range * tower.range
      
      for (let i = 0; i < monsters.length; i++) {
        const monster = monsters[i]
        const dx = monster.x - tower.x
        const dy = monster.y - tower.y
        if (dx * dx + dy * dy >= rangeSq) continue

        if (!fallbackTarget || monster.pathIndex > fallbackTarget.pathIndex) {
          fallbackTarget = monster
        }
        if (commanderZone && this.isMonsterInCommanderZone(monster, commanderZone) &&
            (!target || monster.pathIndex > target.pathIndex)) {
          target = monster
        }
      }

      const finalTarget = target || fallbackTarget
      if (finalTarget) {
        const inZone = this.isMonsterInCommanderZone(finalTarget, commanderZone)
        this.towerAttack(tower, finalTarget)
        tower.lastAttack = inZone
          ? now - tower.attackSpeed * (1 - COMMANDER_ZONE_ATTACK_SPEED_FACTOR)
          : now
      }
    })
  },

  towerAttack(tower, target) {
    const config = TOWER_TYPES[tower.type]
    const commanderBoosted = this.isMonsterInCommanderZone(target)
    const damageMultiplier = commanderBoosted ? (1 + COMMANDER_ZONE_DAMAGE_BONUS) : 1
    const shotDamage = tower.damage * damageMultiplier
    const shotColor = commanderBoosted ? '#d8f6ff' : config.color
    
    if (tower.type === 'lightning') {
      this.lightningAttack(tower, target, damageMultiplier)
    } else {
      const projectileBudget = this.performanceProfileKey === 'intense'
        ? 56
        : (this.performanceProfileKey === 'busy' ? 80 : 110)
      if (this.projectiles.length >= projectileBudget) {
        // 弹道预算满时直接结算，保留伤害但不再分配新对象/轨迹。
        this.applyDamage(target, shotDamage, tower.type)
        this.applyTowerEffect(target, tower.type, shotDamage, tower.level)
        this.playTowerAttackSound(tower)
        return
      }
      this.projectiles.push({
        x: tower.x,
        y: tower.y - 10,
        target,
        damage: shotDamage,
        towerType: tower.type,
        towerLevel: tower.level,
        color: shotColor,
        speed: tower.type === 'arcane' ? 10 : 7,
        piercing: tower.type === 'arcane' ? 2 + tower.level : 0,
        size: 4 + tower.level * 1.2 + (commanderBoosted ? 0.8 : 0),
        angle: 0,
        trail: [],
        commanderBoosted
      })
    }

    this.playTowerAttackSound(tower)
    if (this.monsters.length < 12 && this.performanceProfileKey === 'relaxed') {
      this.createParticles(tower.x, tower.y - 15, shotColor, commanderBoosted ? 4 : 2)
    }
  },

  lightningAttack(tower, target, damageMultiplier = 1) {
    const lv = tower.level || 1
    const chainCount = Math.min(3, 1 + Math.floor((lv + 1) / 2))
    
    this.applyDamage(target, tower.damage * damageMultiplier, 'lightning')
    
    // 闪电主链 - 等级影响颜色、粗细、持续时间
    const mainColor = lv >= 5 ? '#ffffff' : lv >= 4 ? '#ffffcc' : lv >= 3 ? '#ffff88' : lv >= 2 ? '#ffff44' : '#dddd00'
    const mainWidth = 2 + lv * 0.6
    this.lightningEffects.push({
      x1: tower.x,
      y1: tower.y - 10,
      x2: target.x,
      y2: target.y,
      life: 16 + lv * 2,
      maxLife: 16 + lv * 2,
      color: mainColor,
      width: mainWidth
    })
    
    // 电击光环 - 等级越高光环越大
    if (this.performanceProfileKey !== 'intense') {
      this.createElectricBurst(target.x, target.y, lv)
    }
    
    let lastTarget = target
    let hitTargets = [target]
    
    for (let i = 0; i < chainCount; i++) {
      let nearestMonster = null
      let nearestDist = 70 + lv * 5  // 等级越高链越远
      
      this.monsters.forEach(m => {
        if (hitTargets.includes(m)) return
        const dx = m.x - lastTarget.x
        const dy = m.y - lastTarget.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < nearestDist) {
          nearestDist = dist
          nearestMonster = m
        }
      })
      
      if (nearestMonster) {
        this.applyDamage(nearestMonster, tower.damage * damageMultiplier * (0.6 + lv * 0.05), 'lightning')
        
        const chainColor = lv >= 4 ? '#ffff88' : lv >= 3 ? '#ffff66' : lv >= 2 ? '#eeee33' : '#cccc00'
        if (this.performanceProfileKey !== 'intense' || i === 0) {
          this.lightningEffects.push({
            x1: lastTarget.x,
            y1: lastTarget.y,
            x2: nearestMonster.x,
            y2: nearestMonster.y,
            life: 14 + lv * 2,
            maxLife: 14 + lv * 2,
            color: chainColor,
            width: mainWidth * 0.75
          })
        }
        
        if (this.performanceProfileKey === 'relaxed') {
          this.createElectricBurst(nearestMonster.x, nearestMonster.y, lv)
        }
        
        hitTargets.push(nearestMonster)
        lastTarget = nearestMonster
      }
    }
  },

  createElectricBurst(x, y, level) {
    const lv = level || 1
    const burstCount = Math.min(4, 2 + Math.floor(lv / 2))
    const burstDist = 8 + lv * 2.2
    for (let i = 0; i < burstCount; i++) {
      const angle = (Math.PI * 2 / burstCount) * i
      this.lightningEffects.push({
        x1: x,
        y1: y,
        x2: x + Math.cos(angle) * burstDist,
        y2: y + Math.sin(angle) * burstDist,
        life: 8 + lv,
        maxLife: 8 + lv,
        color: lv >= 4 ? '#ffffff' : lv >= 2 ? '#ffffdd' : '#ffffaa',
        width: 1 + lv * 0.3
      })
    }
  },

  applyDamage(monster, damage, type) {
    monster.lastHitTowerType = type

    // 闪避判定（高机动怪：幽影等）—— 完全不受伤害
    if (monster.evasionChance && Math.random() < monster.evasionChance) {
      if (this.performanceProfileKey === 'relaxed' || monster.isBoss) {
        this.floatingTexts.push({
          x: monster.x + (Math.random() - 0.5) * 18,
          y: monster.y - 22,
          text: '闪避',
          color: '#aaaaff',
          life: 18,
          maxLife: 18,
          vy: -1.2,
          vx: (Math.random() - 0.5) * 0.6,
          scale: 0.85
        })
      }
      return
    }

    // 暴击判定（暴击先于抗性减伤，保证暴击能部分穿透高护甲）
    let isCrit = false
    const critRate = this.runCritBonus || 0
    if (critRate > 0 && Math.random() < critRate) {
      damage = Math.floor(damage * 2)
      isCrit = true
    }

    // 护甲/抗性减伤（精英/Boss/中后期怪自带 armor）
    let armoredDamage = damage
    if (monster.armor && monster.armor > 0) {
      armoredDamage = Math.floor(damage * (1 - monster.armor))
    }

    // Boss 在场时全场塔攻击力轻幅下降（update 动态维护 runBossDamagePenalty）
    const bossPenalty = this.runBossDamagePenalty || 1
    const bossPenalized = bossPenalty !== 1 ? Math.floor(armoredDamage * bossPenalty) : armoredDamage

    // 藤蔓易伤效果：增加受到的伤害
    let finalDamage = bossPenalized
    if (monster.vineVulnerability > 0) {
      finalDamage = bossPenalized * (1 + monster.vineVulnerability)
    }

    monster.hp -= finalDamage

    const colors = {
      fire: '#ff4400',
      ice: '#00ccff',
      nature: '#44ff44',
      arcane: '#aa44ff',
      lightning: '#ffff00',
      commander: '#9ee6ff'
    }

    const displayDamage = Math.floor(finalDamage)
    const stride = this.getDamageTextStride ? this.getDamageTextStride() : 1
    this._damageTextTick = (this._damageTextTick || 0) + 1
    const showText = isCrit || monster.isBoss || (this._damageTextTick % stride === 0)
    if (!showText) return

    const critPrefix = isCrit ? '暴击! ' : ''
    const text = isCrit ? `${critPrefix}-${displayDamage}💥` : (monster.vineVulnerability > 0 ? `-${displayDamage}!` : `-${displayDamage}`)

    this.floatingTexts.push({
      x: monster.x + (Math.random() - 0.5) * (monster.isBoss ? 12 : 20),
      y: monster.y - (monster.isBoss ? 26 : 20),
      text: text,
      color: colors[type] || '#fff',
      life: monster.isBoss ? 20 : 30,
      maxLife: monster.isBoss ? 20 : 30,
      vy: -1.5,
      vx: (Math.random() - 0.5) * (monster.isBoss ? 0.6 : 1),
      scale: monster.vineVulnerability > 0 ? 1.1 : 0.9
    })
  },

  updateProjectiles() {
    const monsters = this.monsters
    this.projectiles = this.projectiles.filter(proj => {
      let currentTarget = proj.target
      if (!currentTarget || currentTarget.hp <= 0) {
        currentTarget = null
        if (proj.piercing > 0) {
          let minDistSq = 60 * 60
          for (let i = 0; i < monsters.length; i++) {
            const m = monsters[i]
            const dx = m.x - proj.x
            const dy = m.y - proj.y
            const dSq = dx * dx + dy * dy
            if (dSq < minDistSq) {
              minDistSq = dSq
              currentTarget = m
            }
          }
          proj.target = currentTarget
        }
        if (!currentTarget) return false
      }
      
      const dx = currentTarget.x - proj.x
      const dy = currentTarget.y - proj.y
      const distSq = dx * dx + dy * dy
      
      if (distSq < 225) {
        this.applyDamage(currentTarget, proj.damage, proj.towerType)
        this.applyTowerEffect(currentTarget, proj.towerType, proj.damage, proj.towerLevel)
        if (monsters.length < 14 && this.performanceProfileKey === 'relaxed') {
          this.createHitEffect(currentTarget.x, currentTarget.y, proj.towerType, proj.towerLevel)
        }
        
        if (proj.piercing > 0) {
          proj.piercing--
          proj.target = null
          return true
        }
        return false
      }
      
      const dist = Math.sqrt(distSq)
      proj.angle = Math.atan2(dy, dx)
      proj.x += (dx / dist) * proj.speed
      proj.y += (dy / dist) * proj.speed
      
      if (!this.shouldUseSimplifiedProjectiles()) {
        if (!proj.trail) proj.trail = []
        proj.trail.push({ x: proj.x, y: proj.y })
        const trailLimit = this.getProjectileTrailLimit ? this.getProjectileTrailLimit() : 4
        if (proj.trail.length > trailLimit) proj.trail.shift()
      } else if (proj.trail && proj.trail.length) {
        proj.trail.length = 0
      }
      
      return true
    })
  },

  createHitEffect(x, y, type, level = 1) {
    // 根据等级调整特效规模
    const scale = 0.5 + level * 0.15  // 等级1=0.65, 等级5=1.25
    
    switch (type) {
      case 'fire':
        // 火焰爆发 - 精简版
        const fireCount = 3 + level
        for (let i = 0; i < fireCount; i++) {
          const angle = (Math.PI * 2 / fireCount) * i + Math.random() * 0.3
          const dist = 3 + Math.random() * 5 * scale
          this.fireEffects.push({
            x: x + Math.cos(angle) * dist,
            y: y + Math.sin(angle) * dist,
            size: (5 + Math.random() * 4) * scale,
            life: 15 + level * 2,
            maxLife: 15 + level * 2,
            vx: Math.cos(angle) * (1 + level * 0.3),
            vy: Math.sin(angle) * (1 + level * 0.3) - 1
          })
        }
        // 火花
        for (let i = 0; i < 2 + level; i++) {
          this.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4 - 2,
            size: (1 + Math.random() * 2) * scale,
            color: level >= 3 ? '#ffffff' : (Math.random() > 0.5 ? '#ffff00' : '#ff8800'),
            life: 15,
            maxLife: 15,
            alpha: 1
          })
        }
        break
      case 'ice':
        // 冰霜爆发 - 精简版
        const iceCount = 3 + Math.floor(level / 2)
        for (let i = 0; i < iceCount; i++) {
          const angle = (Math.PI * 2 / iceCount) * i
          this.iceEffects.push({
            x: x,
            y: y,
            size: (4 + level) * scale,
            life: 15 + level * 2,
            maxLife: 15 + level * 2,
            angle: angle,
            dist: 0
          })
        }
        break
      case 'nature':
        // 藤蔓缠绕爆发 - 藤蔓从地面伸出
        const vineCount = 3 + Math.floor(level / 2)
        for (let i = 0; i < vineCount; i++) {
          const angle = (Math.PI * 2 / vineCount) * i + Math.random() * 0.3
          this.poisonEffects.push({
            x: x + Math.cos(angle) * 8 * scale,
            y: y + 10,  // 从脚下伸出
            size: (4 + Math.random() * 3) * scale,
            life: 25 + level * 3,
            maxLife: 25 + level * 3,
            vy: -1.5 - Math.random() * 0.5,  // 向上生长
            vx: Math.cos(angle) * 0.3,
            isVine: true
          })
        }
        // 叶子飞溅
        for (let i = 0; i < 2 + level; i++) {
          this.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3 - 1,
            size: (2 + Math.random() * 2) * scale,
            color: '#66ff66',
            life: 20,
            maxLife: 20,
            alpha: 1
          })
        }
        break
      case 'arcane':
        // 奥术爆发 - 精简版
        const arcaneCount = 4 + level * 2
        for (let i = 0; i < arcaneCount; i++) {
          const angle = (Math.PI * 2 / arcaneCount) * i
          this.arcaneEffects.push({
            x: x,
            y: y,
            size: (2 + level) * scale,
            life: 12 + level * 2,
            maxLife: 12 + level * 2,
            angle: angle,
            dist: 0,
            speed: 2 + level * 0.5
          })
        }
        break
    }
  },

  applyTowerEffect(monster, type, damage, level) {
    switch (type) {
      case 'fire':
        // 灼烧按帧结算：旧版 damage×0.1×level 每帧会在高等级时放大数十倍。
        monster.burnTimer = 180
        monster.burnDamage = damage * (0.22 + Math.min(10, level) * 0.018) / 60
        break
      case 'ice':
        // 冰冻：减速50%
        monster.slowTimer = 120
        break
      case 'nature':
        // 藤蔓易伤缓慢随等级成长并封顶，避免高等级达到数倍伤害。
        monster.vineTimer = 180  // 3秒
        monster.vineVulnerability = Math.min(0.5, 0.22 + Math.max(1, level) * 0.03)
        break
    }
  },

  updateParticles() {
    this.particles = this.particles.filter(p => {
      p.x += p.vx || 0
      p.y += p.vy || 0
      p.vy = (p.vy || 0) + 0.08
      p.life--
      p.alpha = p.life / p.maxLife
      return p.life > 0
    })
  },

  updateFloatingTexts() {
    this.floatingTexts = this.floatingTexts.filter(t => {
      t.x += t.vx || 0
      t.y += t.vy || 0
      t.life--
      t.alpha = Math.min(1, t.life / (t.maxLife * 0.3))
      return t.life > 0
    })
  },

  updateLightningEffects() {
    this.lightningEffects = this.lightningEffects.filter(l => {
      l.life--
      l.alpha = l.life / l.maxLife
      return l.life > 0
    })
  },

  updateFireEffects() {
    this.fireEffects = this.fireEffects.filter(f => {
      f.x += f.vx || 0
      f.y += (f.vy || 0) - 0.5
      f.size *= 0.95
      f.life--
      f.alpha = f.life / f.maxLife
      return f.life > 0
    })
  },

  updateIceEffects() {
    this.iceEffects = this.iceEffects.filter(i => {
      if (i.dist !== undefined) {
        i.dist += 2
      }
      i.life--
      i.alpha = i.life / i.maxLife
      return i.life > 0
    })
  },

  updatePoisonEffects() {
    this.poisonEffects = this.poisonEffects.filter(p => {
      if (p.isVine) {
        // 藤蔓效果 - 向上生长
        p.y += p.vy || -1
        p.x += p.vx || 0
        p.size *= 0.98
      } else {
        // 普通雾气效果
        p.y += p.vy || -0.5
        p.x += (Math.random() - 0.5) * 0.5
        p.size *= 1.02
      }
      p.life--
      p.alpha = (p.life / p.maxLife) * 0.7
      return p.life > 0
    })
  },

  updateArcaneEffects() {
    this.arcaneEffects = this.arcaneEffects.filter(a => {
      a.dist += a.speed
      a.life--
      a.alpha = a.life / a.maxLife
      return a.life > 0
    })
  },

  updateMergeEffects() {
    this.mergeEffects = this.mergeEffects.filter(m => {
      m.radius += 2
      m.life--
      m.alpha = m.life / m.maxLife
      return m.life > 0
    })
  },

  createParticles(x, y, color, count) {
    const limit = (this.getDynamicEffectLimits && this.getDynamicEffectLimits().particles) || PERFORMANCE_LIMITS.particles
    const remaining = Math.max(0, limit - this.particles.length)
    if (remaining <= 0) return

    const crowdedScale = this.monsters && this.monsters.length >= 24 ? 0.35 : 0.55
    const particleCount = Math.min(remaining, Math.max(1, Math.ceil(count * crowdedScale)))
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5 - 1.6,
        size: Math.random() * 4 + 2.4,
        color,
        life: 26,
        maxLife: 26,
        alpha: 1
      })
    }
  },

  createMergeEffect(x, y, color) {
    // 圆环扩散
    this.mergeEffects.push({
      x, y,
      color: color,
      radius: 10,
      life: 30,
      maxLife: 30,
      alpha: 1
    })
    
    // 星星粒子
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 / 12) * i
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * 4,
        vy: Math.sin(angle) * 4,
        size: 6,
        color: '#ffd700',
        life: 40,
        maxLife: 40,
        alpha: 1
      })
    }
    
    // 向上的大星星
    for (let i = 0; i < 5; i++) {
      this.floatingTexts.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 20,
        text: '⭐',
        color: '#ffd700',
        life: 50,
        maxLife: 50,
        vy: -2 - Math.random(),
        vx: (Math.random() - 0.5) * 2,
        scale: 0.8 + Math.random() * 0.4
      })
    }
  },

  safeRender(step, fn) {
    try {
      fn.call(this)
    } catch (error) {
      if (!this._renderStepFailures) this._renderStepFailures = {}
      const rec = this._renderStepFailures[step] || (this._renderStepFailures[step] = { count: 0, firstMessage: '', firstStack: '' })
      rec.count += 1
      if (!rec.firstMessage) {
        rec.firstMessage = (error && error.message) || String(error)
        rec.firstStack = (error && error.stack) || rec.firstMessage
      }
      const now = Date.now()
      if (now - (this.lastRenderStepWarnAt || 0) >= 2000) {
        this.lastRenderStepWarnAt = now
        console.warn('render step failed: ' + step, rec.firstStack)
      }
      // 单步绘制失败不影响整帧，避免一处异常导致整块战场冻死
    }
  },

  getRenderDiagnostics() {
    return {
      renderFrameCount: this.renderFrameCount || 0,
      stepFailures: this._renderStepFailures || {},
      lastRenderWarnAt: this.lastRenderWarnAt || 0,
      lastRenderStepWarnAt: this.lastRenderStepWarnAt || 0,
      cachedBgGradientKey: this._cachedBgGradientKey || ''
    }
  },

  getUpdateDiagnostics() {
    return {
      stepFailures: this._updateStepFailures || {},
      lastUpdateStepWarnAt: this.lastUpdateStepWarnAt || 0,
      pendingWaveAdvance: this.pendingWaveAdvance ? JSON.stringify(this.pendingWaveAdvance) : null,
      pendingWaveStuckAt: this._pendingWaveStuckAt || 0,
      gameState: this.data.gameState,
      wave: this.data.wave,
      spawnIndex: this.spawnIndex,
      waveMonstersLen: (this.waveMonsters || []).length,
      monstersLen: (this.monsters || []).length,
      waveComplete: !!this.waveComplete
    }
  },

  render() {
    const ctx = this.ctx
    if (!ctx) return

    try {
      this.safeRender('battlefieldState', this.ensureBattlefieldState)
      this.needsRender = false
      this.renderFrameCount += 1

      // 真机 Canvas 跨帧残留清除：上一帧的 createRadialGradient 如果崩坏，
      // 不 clearRect 的话显存残留整屏 -> 变色 + 卡顿（iOS/Android 均存在）
      ctx.clearRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight)

      // 重置 ctx 状态避免泄漏
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      ctx.setLineDash([])

      // 背景渐变（按主题缓存，避免每帧重建 CanvasGradient）
      const themeKey = this.data.currentTheme || 'forest'
      const theme = MAP_THEMES[themeKey] || MAP_THEMES.forest
      if (!this._cachedBgGradientKey || this._cachedBgGradientKey !== themeKey) {
        this._cachedBgGradientKey = themeKey
        try {
          this._cachedBgGradient = ctx.createLinearGradient(0, 0, 0, CONFIG.canvasHeight)
          this._cachedBgGradient.addColorStop(0, theme.bgColors[0])
          this._cachedBgGradient.addColorStop(0.5, theme.bgColors[1])
          this._cachedBgGradient.addColorStop(1, theme.bgColors[2])
        } catch (gradErr) {
          // 渐变创建失败时降级为纯色填充，避免每帧抛错
          this._cachedBgGradient = null
        }
      }
      if (this._cachedBgGradient) {
        ctx.fillStyle = this._cachedBgGradient
      } else {
        ctx.fillStyle = theme.bgColors ? theme.bgColors[0] : '#0a1a0a'
      }
      ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight)

      this.safeRender('decorations', this.drawDecorations)
      this.safeRender('grid', this.drawGrid)
      this.safeRender('path', this.drawPath)
      this.safeRender('commanderZone', this.drawCommanderZone)
      this.safeRender('towers', this.drawTowers)
      this.safeRender('monsters', this.drawMonsters)
      this.safeRender('projectiles', this.drawProjectiles)
      this.safeRender('fireEffects', this.drawFireEffects)
      this.safeRender('iceEffects', this.drawIceEffects)
      this.safeRender('poisonEffects', this.drawPoisonEffects)
      this.safeRender('arcaneEffects', this.drawArcaneEffects)
      this.safeRender('lightningEffects', this.drawLightningEffects)
      this.safeRender('mergeEffects', this.drawMergeEffects)
      this.safeRender('particles', this.drawParticles)
      this.safeRender('floatingTexts', this.drawFloatingTexts)
      this.safeRender('draggingTower', this.drawDraggingTower)
      this.safeRender('waveHUD', this.drawWaveHUD)
    } catch (error) {
      const now = Date.now()
      if (now - (this.lastRenderWarnAt || 0) >= 2000) {
        this.lastRenderWarnAt = now
        console.warn('render outer failed (guarded)', (error && (error.stack || error.message)) || String(error))
      }
      // 自愈仅在战场状态真正损坏时发生，且 1s 内最多一次；杜绝异常态下每帧/每 240ms 无限重建导致内存堆积与 OOM
      const pathInvalid = !Array.isArray(this.pathPoints) || this.pathPoints.length < 2
      const gridInvalid = !Array.isArray(this.grid) || this.grid.length !== CONFIG.gridRows
      if ((pathInvalid || gridInvalid) && now - (this.lastRenderRecoveryAt || 0) >= 1000) {
        this.lastRenderRecoveryAt = now
        try {
          this.generatePath(this.data.currentTheme, {
            refreshDressing: false,
            rebuildSlots: false,
            relocateTowers: false
          })
          this.rebuildGridFromTowers()
        } catch (e2) {
          // 二次自愈失败则放弃，避免连环抛错
        }
      }
    }
  },

  drawDecorations() {
    const ctx = this.ctx
    const theme = MAP_THEMES[this.data.currentTheme] || MAP_THEMES.forest
    const profile = this.getActivePerformanceProfile()

    // 性能档位：skipDecorations=true（intense）时全部跳过；decorStride>1 时按 stride 抽样
    if (profile.skipDecorations) return

    // 背景纹理点
    ctx.fillStyle = theme.grassColor
    if (this.grassDots) {
      const stride = Math.max(1, profile.decorStride || 1)
      for (let i = 0; i < this.grassDots.length; i += stride) {
        const dot = this.grassDots[i]
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 小草丛绘制（busy 档下只画 1/2，跳过 sway 动画；intense 档上面已 return）
    if (this.grassTufts && profile.animatedDecorations) {
      const time = Date.now() * 0.002
      this.grassTufts.forEach(tuft => {
        ctx.save()
        ctx.strokeStyle = theme.grassColor.replace('0.15', '0.35').replace('0.1', '0.3').replace('0.08', '0.25')
        ctx.lineWidth = 1.2
        ctx.lineCap = 'round'
        for (let i = 0; i < tuft.blades; i++) {
          const angle = -Math.PI / 2 + (i - tuft.blades / 2) * 0.25
          const sway = Math.sin(time + tuft.sway + i * 0.5) * 2
          ctx.beginPath()
          ctx.moveTo(tuft.x, tuft.y)
          ctx.quadraticCurveTo(
            tuft.x + Math.cos(angle) * tuft.height * 0.5 + sway,
            tuft.y + Math.sin(angle) * tuft.height * 0.5,
            tuft.x + Math.cos(angle) * tuft.height + sway * 1.5,
            tuft.y + Math.sin(angle) * tuft.height
          )
          ctx.stroke()
        }
        ctx.restore()
      })
    }

    // 装饰物
    if (this.mapDecorations) {
      const stride = Math.max(1, profile.decorStride || 1)
      for (let i = 0; i < this.mapDecorations.length; i += stride) {
        this.drawDecoration(ctx, this.mapDecorations[i])
      }
    }
  },

  drawDecoration(ctx, d) {
    const s = d.size || 1
    
    switch (d.type) {
      case 'tree':
        ctx.fillStyle = '#4a3520'
        ctx.fillRect(d.x - 3 * s, d.y - 5 * s, 6 * s, 15 * s)
        ctx.fillStyle = '#2d5a2d'
        ctx.beginPath()
        ctx.arc(d.x, d.y - 20 * s, 14 * s, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#3a7a3a'
        ctx.beginPath()
        ctx.arc(d.x - 6 * s, d.y - 15 * s, 10 * s, 0, Math.PI * 2)
        ctx.arc(d.x + 6 * s, d.y - 15 * s, 10 * s, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#4a9a4a'
        ctx.beginPath()
        ctx.arc(d.x, d.y - 28 * s, 8 * s, 0, Math.PI * 2)
        ctx.fill()
        break
        
      case 'rock':
        ctx.fillStyle = '#4a4a4a'
        ctx.beginPath()
        ctx.ellipse(d.x, d.y, 14 * s, 10 * s, 0.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#5a5a5a'
        ctx.beginPath()
        ctx.ellipse(d.x - 3 * s, d.y - 3 * s, 10 * s, 7 * s, -0.2, 0, Math.PI * 2)
        ctx.fill()
        break
        
      case 'bush':
        ctx.fillStyle = '#2a6a2a'
        ctx.beginPath()
        ctx.arc(d.x, d.y, 10 * s, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#3a8a3a'
        ctx.beginPath()
        ctx.arc(d.x + 8 * s, d.y + 2 * s, 8 * s, 0, Math.PI * 2)
        ctx.arc(d.x - 7 * s, d.y + 3 * s, 9 * s, 0, Math.PI * 2)
        ctx.fill()
        break
        
      case 'flower':
        const colors = ['#ff8888', '#88ff88', '#ffff88', '#88aaff']
        ctx.fillStyle = colors[Math.floor(d.x) % colors.length]
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 / 5) * i
          ctx.beginPath()
          ctx.ellipse(d.x + Math.cos(angle) * 4 * s, d.y + Math.sin(angle) * 4 * s, 3 * s, 2 * s, angle, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = '#ffff00'
        ctx.beginPath()
        ctx.arc(d.x, d.y, 3 * s, 0, Math.PI * 2)
        ctx.fill()
        break
        
      case 'mushroom':
        ctx.fillStyle = '#e8d8c8'
        ctx.fillRect(d.x - 2 * s, d.y, 4 * s, 8 * s)
        ctx.fillStyle = '#cc4444'
        ctx.beginPath()
        ctx.ellipse(d.x, d.y, 8 * s, 5 * s, 0, Math.PI, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(d.x - 3 * s, d.y - 2 * s, 2 * s, 0, Math.PI * 2)
        ctx.fill()
        break
        
      // 沙漠装饰
      case 'cactus':
        ctx.fillStyle = '#2a6a2a'
        ctx.fillRect(d.x - 4 * s, d.y - 15 * s, 8 * s, 25 * s)
        ctx.fillRect(d.x - 12 * s, d.y - 8 * s, 8 * s, 4 * s)
        ctx.fillRect(d.x - 12 * s, d.y - 8 * s, 4 * s, 12 * s)
        ctx.fillRect(d.x + 4 * s, d.y - 5 * s, 8 * s, 4 * s)
        ctx.fillRect(d.x + 8 * s, d.y - 5 * s, 4 * s, 10 * s)
        break
        
      case 'skull':
        ctx.fillStyle = '#ddddcc'
        ctx.beginPath()
        ctx.arc(d.x, d.y, 8 * s, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#222'
        ctx.beginPath()
        ctx.arc(d.x - 3 * s, d.y - 2 * s, 2 * s, 0, Math.PI * 2)
        ctx.arc(d.x + 3 * s, d.y - 2 * s, 2 * s, 0, Math.PI * 2)
        ctx.fill()
        break
        
      case 'tumbleweed':
        ctx.strokeStyle = '#8a7a5a'
        ctx.lineWidth = 1.5
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i
          ctx.beginPath()
          ctx.arc(d.x, d.y, 8 * s, angle, angle + 0.3)
          ctx.stroke()
        }
        break
        
      // 冰原装饰
      case 'ice_crystal':
        ctx.fillStyle = 'rgba(150, 220, 255, 0.7)'
        ctx.beginPath()
        ctx.moveTo(d.x, d.y - 18 * s)
        ctx.lineTo(d.x + 8 * s, d.y)
        ctx.lineTo(d.x, d.y + 5 * s)
        ctx.lineTo(d.x - 8 * s, d.y)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = '#aaeeff'
        ctx.lineWidth = 2
        ctx.stroke()
        break
        
      case 'snow_pile':
        ctx.fillStyle = '#eeffff'
        ctx.beginPath()
        ctx.ellipse(d.x, d.y, 12 * s, 6 * s, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.ellipse(d.x - 3 * s, d.y - 2 * s, 8 * s, 4 * s, 0, 0, Math.PI * 2)
        ctx.fill()
        break
        
      case 'frozen_tree':
        ctx.fillStyle = '#667788'
        ctx.fillRect(d.x - 3 * s, d.y - 5 * s, 6 * s, 15 * s)
        ctx.fillStyle = 'rgba(180, 220, 255, 0.8)'
        ctx.beginPath()
        ctx.moveTo(d.x, d.y - 30 * s)
        ctx.lineTo(d.x + 12 * s, d.y - 5 * s)
        ctx.lineTo(d.x - 12 * s, d.y - 5 * s)
        ctx.closePath()
        ctx.fill()
        break
        
      // 火山装饰
      case 'lava_rock':
        ctx.fillStyle = '#333'
        ctx.beginPath()
        ctx.ellipse(d.x, d.y, 12 * s, 8 * s, 0.3, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ff4400'
        ctx.beginPath()
        ctx.arc(d.x - 3 * s, d.y + 2 * s, 3 * s, 0, Math.PI * 2)
        ctx.fill()
        break
        
      case 'fire_vent':
        ctx.fillStyle = '#222'
        ctx.beginPath()
        ctx.ellipse(d.x, d.y, 8 * s, 4 * s, 0, 0, Math.PI * 2)
        ctx.fill()
        // 火焰
        if (Math.random() > 0.3) {
          ctx.fillStyle = 'rgba(255, 150, 50, 0.8)'
          ctx.beginPath()
          ctx.moveTo(d.x, d.y - 15 * s)
          ctx.lineTo(d.x + 5 * s, d.y)
          ctx.lineTo(d.x - 5 * s, d.y)
          ctx.closePath()
          ctx.fill()
        }
        break
        
      case 'ash_pile':
        ctx.fillStyle = '#444'
        ctx.beginPath()
        ctx.ellipse(d.x, d.y, 10 * s, 5 * s, 0, 0, Math.PI * 2)
        ctx.fill()
        break
        
      case 'dead_tree':
        ctx.strokeStyle = '#333'
        ctx.lineWidth = 3 * s
        ctx.beginPath()
        ctx.moveTo(d.x, d.y + 10 * s)
        ctx.lineTo(d.x, d.y - 15 * s)
        ctx.moveTo(d.x, d.y - 8 * s)
        ctx.lineTo(d.x - 8 * s, d.y - 15 * s)
        ctx.moveTo(d.x, d.y - 5 * s)
        ctx.lineTo(d.x + 6 * s, d.y - 12 * s)
        ctx.stroke()
        break
    }
  },

  drawGrid() {
    // prep 状态由 WXML prep-slot-layer 渲染，playing 状态需要 canvas 绘制塔位圈
    if (this.data.gameState === 'prep') return

    const ctx = this.ctx
    const offsetX = this.getGridOffsetX()
    const offsetY = this.getGridOffsetY()

    this.getTowerSlots().forEach(slot => {
      if (this.isOnPath(slot.row, slot.col)) return
      const x = offsetX + slot.col * CONFIG.cellSize + CONFIG.cellSize / 2
      const y = offsetY + slot.row * CONFIG.cellSize + CONFIG.cellSize / 2
      const hasTower = this.grid[slot.row] && this.grid[slot.row][slot.col]

      if (!hasTower) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.arc(x, y, 12, 0, Math.PI * 2)
        ctx.stroke()

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    })
    ctx.setLineDash([])
  },

  drawPath() {
    const ctx = this.ctx
    ctx.save()
    // 防御：save 之后立即硬重置所有 ctx 状态——防止前帧 drawFireEffects/Boss 燃烧等泄漏的 globalAlpha/shadow
    // 残留导致路径变半透明 + 叠加下一帧时显黄色（alpha 0.3 棕色路径 × 绿色背景 = 黄绿）
    ctx.globalAlpha = 1
    ctx.shadowBlur = 0
    ctx.shadowColor = 'rgba(0,0,0,0)'
    ctx.setLineDash([])

    const theme = MAP_THEMES[this.data.currentTheme] || MAP_THEMES.forest
    const pathColors = theme.pathColors

    // 路径 3 层描边（线宽从 38/32/24 收紧到 30/26/20，overdraw 少 40%）
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.strokeStyle = pathColors[0]
    ctx.lineWidth = 30
    ctx.beginPath()
    ctx.moveTo(this.pathPoints[0].x, this.pathPoints[0].y)
    for (let i = 1; i < this.pathPoints.length; i++) {
      ctx.lineTo(this.pathPoints[i].x, this.pathPoints[i].y)
    }
    ctx.stroke()

    ctx.strokeStyle = pathColors[1]
    ctx.lineWidth = 26
    ctx.beginPath()
    ctx.moveTo(this.pathPoints[0].x, this.pathPoints[0].y)
    for (let i = 1; i < this.pathPoints.length; i++) {
      ctx.lineTo(this.pathPoints[i].x, this.pathPoints[i].y)
    }
    ctx.stroke()

    ctx.strokeStyle = pathColors[2]
    ctx.lineWidth = 20
    ctx.beginPath()
    ctx.moveTo(this.pathPoints[0].x, this.pathPoints[0].y)
    for (let i = 1; i < this.pathPoints.length; i++) {
      ctx.lineTo(this.pathPoints[i].x, this.pathPoints[i].y)
    }
    ctx.stroke()

    // 路径中心线（虚线）
    ctx.strokeStyle = pathColors[2]
    ctx.lineWidth = 3
    ctx.setLineDash([6, 6])
    ctx.beginPath()
    ctx.moveTo(this.pathPoints[0].x, this.pathPoints[0].y)
    for (let i = 1; i < this.pathPoints.length; i++) {
      ctx.lineTo(this.pathPoints[i].x, this.pathPoints[i].y)
    }
    ctx.stroke()
    ctx.setLineDash([])

    // 起点标记 - 怪物传送门
    const startX = this.pathPoints[0].x + 15
    const startY = this.pathPoints[0].y
    ctx.save()
    ctx.shadowBlur = 15
    ctx.shadowColor = '#ff00ff'
    ctx.strokeStyle = '#aa00aa'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(startX, startY, 12, 18, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = 'rgba(170, 0, 170, 0.3)'
    ctx.fill()
    ctx.restore()
    ctx.fillStyle = '#ff88ff'
    ctx.font = 'bold 10px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('👾', startX, startY)

    // 终点标记 - 城堡
    const endPoint = this.pathPoints[this.pathPoints.length - 1]
    const endX = endPoint.x - 15
    const endY = endPoint.y
    ctx.save()
    ctx.shadowBlur = 12
    ctx.shadowColor = '#ffaa00'
    ctx.fillStyle = '#8a7a6a'
    ctx.fillRect(endX - 12, endY - 8, 24, 20)
    ctx.fillStyle = '#4a3a2a'
    ctx.beginPath()
    ctx.arc(endX, endY + 4, 6, Math.PI, 0)
    ctx.fill()
    ctx.fillRect(endX - 6, endY + 4, 12, 8)
    ctx.fillStyle = '#7a6a5a'
    for (let i = -2; i <= 2; i++) {
      ctx.fillRect(endX + i * 8 - 3, endY - 14, 6, 8)
    }
    ctx.restore()
    ctx.restore()
  },


  drawWaveHUD() {
    const ctx = this.ctx
    ctx.save()
    const level = this.data.level
    const waveInLevel = this.data.waveInLevel
    const totalWaves = this.data.totalWavesInLevel
    const remaining = totalWaves - waveInLevel
    
    ctx.save()
    
    // 右上角波次信息面板
    const panelX = CONFIG.canvasWidth - 8
    const panelY = 6
    const panelW = 95
    const panelH = 38
    
    // 半透明背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
    ctx.beginPath()
    drawRoundRect(ctx, panelX - panelW, panelY, panelW, panelH, 6)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.lineWidth = 1
    ctx.stroke()
    
    // 关卡标题
    ctx.fillStyle = '#ffcc44'
    ctx.font = 'bold 11px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(`第${level}关`, panelX - panelW / 2, panelY + 3)
    
    // 波次进度
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.font = '9px Arial'
    ctx.fillText(`${waveInLevel}/${totalWaves}波  剩${remaining}波`, panelX - panelW / 2, panelY + 18)
    
    // 波次进度条
    const barX = panelX - panelW + 6
    const barY = panelY + 30
    const barW = panelW - 12
    const barH = 3
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.fillRect(barX, barY, barW, barH)
    ctx.fillStyle = '#ffcc44'
    ctx.fillRect(barX, barY, barW * (waveInLevel / totalWaves), barH)
    
    ctx.restore()
    ctx.restore()
  },

  getActivePerformanceProfile() {
    return this.activePerformanceProfile ||
      (PERFORMANCE_PROFILES && PERFORMANCE_PROFILES[this.performanceProfileKey]) ||
      (PERFORMANCE_PROFILES && PERFORMANCE_PROFILES.relaxed) || {
      renderInterval: 16, simplifyTowers: false, simplifyMonsters: false,
      simplifyBosses: false, simplifyProjectiles: false, skipDecorations: false,
      decorStride: 1, animatedDecorations: true, effectRenderStride: 1,
      projectileTrailPoints: 5, damageTextStride: 1, compactBossHp: false, bossDamageTextCooldown: 0
    }
  },



  isOnPath(row, col) {
    if (!Array.isArray(this.pathPoints) || this.pathPoints.length < 2) return false
    const offsetX = this.getGridOffsetX()
    const offsetY = this.getGridOffsetY()
    const cellCenterX = offsetX + col * CONFIG.cellSize + CONFIG.cellSize / 2
    const cellCenterY = offsetY + row * CONFIG.cellSize + CONFIG.cellSize / 2
    const clearance = this.getPathHalfWidth() + Math.max(2, CONFIG.cellSize * 0.08)
    
    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      const dist = this.pointToSegmentDist(
        cellCenterX, cellCenterY,
        this.pathPoints[i].x, this.pathPoints[i].y,
        this.pathPoints[i + 1].x, this.pathPoints[i + 1].y
      )
      if (dist < clearance) return true
    }
    return false
  },

  // 检查是否是有效的塔位
  isTowerSlot(row, col) {
    if (this.isOnPath(row, col)) return false
    return this.getTowerSlots().some(slot => slot.row === row && slot.col === col)
  },

  findNearestFreeSlot(row, col) {
    let best = null
    let bestDist = Infinity
    this.getTowerSlots().forEach((slot) => {
      if (this.isOnPath(slot.row, slot.col)) return
      if (this.grid[slot.row] && this.grid[slot.row][slot.col]) return
      const d = Math.abs(slot.row - row) + Math.abs(slot.col - col)
      if (d < bestDist) {
        bestDist = d
        best = slot
      }
    })
    return best
  },

  // 把落在路上 / 非塔位的塔挪到最近空位，否则退回仓库
  relocateInvalidTowers() {
    if (!Array.isArray(this.towers) || this.towers.length === 0) return
    if (!Array.isArray(this.grid) || this.grid.length !== CONFIG.gridRows) return

    const pending = this.towers.slice()
    this.towers = []
    for (let row = 0; row < CONFIG.gridRows; row++) {
      for (let col = 0; col < CONFIG.gridCols; col++) {
        this.grid[row][col] = null
      }
    }

    pending.forEach((t) => {
      let targetRow = t.row
      let targetCol = t.col
      const sameOk = Number.isInteger(targetRow) && Number.isInteger(targetCol) &&
        this.isTowerSlot(targetRow, targetCol) &&
        !(this.grid[targetRow] && this.grid[targetRow][targetCol])

      if (!sameOk) {
        const near = this.findNearestFreeSlot(
          Number.isInteger(t.row) ? t.row : 0,
          Number.isInteger(t.col) ? t.col : 0
        )
        if (!near) {
          if (this.inventory.length < INVENTORY_COLS * INVENTORY_ROWS) {
            this.inventory.push({
              id: t.id,
              type: t.type,
              level: t.level,
              damage: t.damage,
              range: t.range,
              attackSpeed: t.attackSpeed,
              specializationKey: t.specializationKey,
              lastAttack: 0
            })
          }
          return
        }
        targetRow = near.row
        targetCol = near.col
      }

      const moved = {
        ...t,
        row: targetRow,
        col: targetCol,
        x: this.getGridOffsetX() + targetCol * CONFIG.cellSize + CONFIG.cellSize / 2,
        y: this.getGridOffsetY() + targetRow * CONFIG.cellSize + CONFIG.cellSize / 2
      }
      this.towers.push(moved)
      this.grid[targetRow][targetCol] = moved
    })

    if (typeof this.updateInventoryDisplay === 'function') {
      this.updateInventoryDisplay()
    }
    if (typeof this.syncFieldTowerCount === 'function') {
      this.syncFieldTowerCount()
    }
  },

  pointToSegmentDist(px, py, x1, y1, x2, y2) {
    const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1
    const dot = A * C + B * D
    const lenSq = C * C + D * D
    let param = lenSq !== 0 ? dot / lenSq : -1
    
    let xx, yy
    if (param < 0) { xx = x1; yy = y1 }
    else if (param > 1) { xx = x2; yy = y2 }
    else { xx = x1 + param * C; yy = y1 + param * D }
    
    return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2)
  },

  // 召唤新塔
  _autoMergeInventory(silent = false, reserveGold = 0) {
    let availableGold = this.data.gold
    let mergeCount = 0
    let hasMergePair = false

    while (true) {
      let pair = null
      for (let i = 0; i < this.inventory.length && !pair; i++) {
        const first = this.inventory[i]
        if (!first || first.level >= MAX_TOWER_LEVEL) continue
        for (let j = i + 1; j < this.inventory.length; j++) {
          const second = this.inventory[j]
          if (!second || second.type !== first.type || second.level !== first.level) continue
          hasMergePair = true
          const nextLevel = first.level + 1
          const cost = TOWER_UPGRADE_GOLD_BASE + TOWER_UPGRADE_GOLD_PER_LEVEL_SQ * nextLevel * nextLevel
          if (availableGold - cost >= reserveGold) {
            pair = { targetIndex: i, sourceIndex: j, nextLevel, cost }
            break
          }
        }
      }
      if (!pair) break

      const target = this.inventory[pair.targetIndex]
      target.level = pair.nextLevel
      Object.assign(target, this.getTowerStatsForLevel(target.type, target.level, 'inventory'))
      this.inventory.splice(pair.sourceIndex, 1)
      availableGold -= pair.cost
      mergeCount++
    }

    if (mergeCount > 0) {
      this.setData({ gold: availableGold, selectedInventoryIndex: -1 })
      this.updateInventoryDisplay()
      this.playSound('merge', { cooldown: 0, volume: 0.58 })
      if (!silent) {
        wx.showToast({ title: `自动合成 ${mergeCount} 次`, icon: 'none' })
      }
    } else if (!silent) {
      wx.showToast({
        title: hasMergePair ? '金币不足，暂时无法整理' : '没有可合成的同类同级塔',
        icon: 'none'
      })
    }
    return mergeCount
  },

  autoMergeInventory() {
    this._autoMergeInventory(false, 0)
  },

  recycleInventoryTower(e) {
    const index = Number(e.currentTarget.dataset.index)
    const tower = this.inventory[index]
    if (!tower) return

    this._suppressNextTouchEnd = true
    this.resetDrag()
    const config = TOWER_TYPES[tower.type]
    const recycleGold = Math.max(6, Math.floor(8 * Math.pow(1.7, (tower.level || 1) - 1)))
    wx.showModal({
      title: `回收${config.name} Lv.${tower.level}`,
      content: `回收后获得 ${recycleGold} 金币，此操作无法撤销。`,
      confirmText: '确认回收',
      confirmColor: '#d88a2e',
      success: (result) => {
        if (!result.confirm || this.inventory[index] !== tower) return
        this.inventory.splice(index, 1)
        this.setData({
          gold: this.data.gold + recycleGold,
          selectedInventoryIndex: -1
        })
        this.updateInventoryDisplay()
        wx.showToast({ title: `回收获得 ${recycleGold} 金币`, icon: 'none' })
      }
    })
  },

  summonTower() {
    if (this.inventory.length >= INVENTORY_COLS * INVENTORY_ROWS) {
      this._autoMergeInventory(true, this.data.summonCost)
      if (this.inventory.length >= INVENTORY_COLS * INVENTORY_ROWS) {
        wx.showToast({ title: '仓库已满，请点整理或长按回收', icon: 'none' })
        return
      }
    }

    if (this.data.gold < this.data.summonCost) {
      wx.showToast({ title: '金币不足!', icon: 'none' })
      return
    }
    
    const types = Object.keys(TOWER_TYPES)
    // 仓库接近满时优先召出已有1级塔，降低8种塔导致的“永远凑不成一对”。
    const mergeFriendlyTypes = this.inventory.length >= 14
      ? [...new Set(this.inventory.filter((tower) => tower.level === 1).map((tower) => tower.type))]
      : []
    const summonPool = mergeFriendlyTypes.length > 0 ? mergeFriendlyTypes : types
    const type = summonPool[Math.floor(Math.random() * summonPool.length)]
    this.inventory.push(this.createTowerData(type))
    
    this.setData({ gold: this.data.gold - this.data.summonCost })
    this.updateInventoryDisplay()
    this.playSound('summon', { cooldown: 0 })
    
    wx.showToast({ title: `获得 ${TOWER_TYPES[type].name}!`, icon: 'none' })
  },

  // 从仓库开始拖动
  onInventoryTouchStart(e) {
    if (!this.canEditBattlefield()) return
    
    const index = e.currentTarget.dataset.index
    if (index === undefined || index >= this.inventory.length) return
    
    const touch = e.touches[0]
    const tower = this.inventory[index]
    const startClientX = touch.clientX
    const startClientY = touch.clientY

    if (!this.cachedCanvasRect) {
      this.refreshCanvasRect()
    }
    // 每次开始拖仓库塔都重测格子，避免居中布局/换行后命中偏移
    this.refreshInventoryRect()
    
    // 记录触摸信息
    this.pendingDragTower = { ...tower }
    this.draggingInventoryIndex = index
    this.draggingFromInventory = true
    this.hasMoved = false
    this.isDragging = true
    this.draggingTower = { ...tower }
    this.dragStartClientX = startClientX
    this.dragStartClientY = startClientY
    this.lastTouchClientX = startClientX
    this.lastTouchClientY = startClientY
    this.lastDragUiUpdateAt = 0
    this._stickyMerge = null
    
    // 初始拖动位置设为手指位置（相对于canvas逻辑坐标）
    if (this.cachedCanvasRect) {
      const cssX = startClientX - this.cachedCanvasRect.left
      const cssY = startClientY - this.cachedCanvasRect.top
      const scaleX = CONFIG.canvasWidth / this.cachedCanvasRect.width
      const scaleY = CONFIG.canvasHeight / this.cachedCanvasRect.height
      this.dragX = cssX * scaleX
      this.dragY = cssY * scaleY
    } else {
      this.dragX = -100
      this.dragY = -100
    }
    
    this.setData({ 
      draggingSlotIndex: index,
      selectedInventoryIndex: index,
      dragFloatingEmoji: TOWER_TYPES[tower.type].emoji,
      dragFloatingColor: TOWER_TYPES[tower.type].color,
      dragFloatingLevel: tower.level,
      dragFloatingType: tower.type
    })
  },

  // 从场上塔开始拖动
  onCanvasTouchStart(e) {
    if (!this.canEditBattlefield()) return
    
    const touch = e.touches[0]
    
    // 用 clientX/Y 换算 canvas 逻辑坐标
    let x, y
    if (this.cachedCanvasRect) {
      const cssX = touch.clientX - this.cachedCanvasRect.left
      const cssY = touch.clientY - this.cachedCanvasRect.top
      const scaleX = CONFIG.canvasWidth / this.cachedCanvasRect.width
      const scaleY = CONFIG.canvasHeight / this.cachedCanvasRect.height
      x = cssX * scaleX
      y = cssY * scaleY
    } else if (touch.x !== undefined && touch.y !== undefined) {
      x = touch.x
      y = touch.y
    } else {
      return
    }

    if (this.data.commanderAiming) {
      this.deployCommanderMark(x, y)
      return
    }
    
    // 检查是否点击了场上的塔
    for (const tower of this.towers) {
      const dx = x - tower.x
      const dy = y - tower.y
      if (Math.sqrt(dx * dx + dy * dy) < 24) {
        this.pendingDragTower = { ...tower }
        this.draggingTower = { ...tower }
        this.draggingFromInventory = false
        this.draggingInventoryIndex = -1
        this.draggingTowerId = tower.id
        this.hasMoved = false
        this.isDragging = true
        this.dragStartX = x
        this.dragStartY = y
        this.dragX = x
        this.dragY = y
        this.lastTouchClientX = touch.clientX
        this.lastTouchClientY = touch.clientY
        this.setData({
          dragFloatingEmoji: TOWER_TYPES[tower.type].emoji,
          dragFloatingColor: TOWER_TYPES[tower.type].color,
          dragFloatingLevel: tower.level,
          dragFloatingType: tower.type
        })
        return
      }
    }
  },

  onTouchMove(e) {
    this.handleTouchMove(e)
  },

  // 全局触摸移动（用于跨区域拖动）
  onGlobalTouchMove(e) {
    this.handleTouchMove(e)
  },

  // 全局触摸结束
  onGlobalTouchEnd(e) {
    this.handleTouchEnd(e)
  },

  // 统一处理触摸移动
  handleTouchMove(e) {
    if (!this.pendingDragTower) return
    
    const touch = e.touches[0]
    this.hasMoved = true
    
    if (!this.isDragging || !this.draggingTower) return
    
    // 保存当前触摸的 clientX/Y（用于仓库合并检测）
    this.lastTouchClientX = touch.clientX
    this.lastTouchClientY = touch.clientY
    
    // 统一使用 clientX/Y 计算 canvas 内坐标
    if (this.cachedCanvasRect) {
      const cssX = touch.clientX - this.cachedCanvasRect.left
      const cssY = touch.clientY - this.cachedCanvasRect.top
      const scaleX = CONFIG.canvasWidth / this.cachedCanvasRect.width
      const scaleY = CONFIG.canvasHeight / this.cachedCanvasRect.height
      this.dragX = cssX * scaleX
      this.dragY = cssY * scaleY
    }
    
    // 更新浮层位置（节流，避免 touchmove 期间疯狂 setData）
    const now = Date.now()
    if (now - this.lastDragUiUpdateAt >= DRAG_UI_INTERVAL) {
      this.lastDragUiUpdateAt = now
      this.setData({
        dragFloating: true,
        dragFloatingX: touch.clientX,
        dragFloatingY: touch.clientY
      })
    }
    
    // 检查合成目标
    this.checkMergeTarget(touch)
  },

  // 检查合成目标
  checkMergeTarget(touch) {
    this.mergeTarget = null
    this.mergeTargetInventoryIndex = -1
    this.mergeTargetType = null

    // 检查场上的塔（合成目标）- 不能和自己合成
    let bestFieldDist = FIELD_MERGE_RADIUS
    for (const tower of this.towers) {
      if (!this.draggingFromInventory && tower.id === this.draggingTower.id) continue
      if (tower.type !== this.draggingTower.type || tower.level !== this.draggingTower.level || tower.level >= MAX_TOWER_LEVEL) continue

      const dx = this.dragX - tower.x
      const dy = this.dragY - tower.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < bestFieldDist) {
        bestFieldDist = dist
        this.mergeTarget = tower
        this.mergeTargetType = 'tower'
      }
    }

    // 仓库合并：按真实格子中心吸附（兼容居中布局），并放宽半径
    if (!this.mergeTarget) {
      const targetIndex = this.findInventoryMergeIndex(touch.clientX, touch.clientY, INVENTORY_MERGE_RADIUS)
      if (targetIndex !== null) {
        const targetTower = this.inventory[targetIndex]
        this.mergeTargetInventoryIndex = targetIndex
        this.mergeTarget = targetTower
        this.mergeTargetType = 'inventory'
      }
    }

    if (this.mergeTarget) {
      this._stickyMerge = {
        type: this.mergeTargetType,
        inventoryIndex: this.mergeTargetInventoryIndex,
        towerId: this.mergeTargetType === 'tower' ? this.mergeTarget.id : null,
        at: Date.now()
      }
    }

    const showMergeHint = !!this.mergeTarget
    const nextLevel = showMergeHint ? (this.mergeTarget.level || 1) + 1 : 0
    const mergeCost = showMergeHint
      ? TOWER_UPGRADE_GOLD_BASE + TOWER_UPGRADE_GOLD_PER_LEVEL_SQ * nextLevel * nextLevel
      : 0

    if (showMergeHint !== this.lastMergeHintVisible ||
        this.mergeTargetInventoryIndex !== this.lastMergeHintSlotIndex ||
        mergeCost !== this.lastMergeCost ||
        nextLevel !== this.lastMergeTargetNextLevel) {
      this.lastMergeHintVisible = showMergeHint
      this.lastMergeHintSlotIndex = this.mergeTargetInventoryIndex
      this.lastMergeCost = mergeCost
      this.lastMergeTargetNextLevel = nextLevel
      this.setData({
        showMergeHint,
        mergeTargetSlotIndex: this.mergeTargetInventoryIndex,
        mergeCost,
        mergeTargetNextLevel: nextLevel
      })
    }
  },

  // 用实测格子矩形找最近可合并目标（解决 flex 居中导致的格子错位）
  findInventoryMergeIndex(clientX, clientY, baseRadius = INVENTORY_MERGE_RADIUS) {
    const slots = this.inventorySlotRects
    if (!Array.isArray(slots) || slots.length === 0) {
      this.refreshInventoryRect()
      return this.getInventorySlotIndexFallback(clientX, clientY)
    }

    let bestIdx = null
    let bestDist = Infinity
    const dragType = this.draggingTower && this.draggingTower.type
    const dragLevel = this.draggingTower && this.draggingTower.level

    for (let i = 0; i < slots.length; i++) {
      if (this.draggingFromInventory && i === this.draggingInventoryIndex) continue
      if (i >= this.inventory.length) continue
      const targetTower = this.inventory[i]
      if (!targetTower ||
          targetTower.type !== dragType ||
          targetTower.level !== dragLevel ||
          targetTower.level >= MAX_TOWER_LEVEL) {
        continue
      }

      const slot = slots[i]
      if (!slot || !Number.isFinite(slot.left)) continue
      const cx = slot.left + slot.width / 2
      const cy = slot.top + slot.height / 2
      const dx = clientX - cx
      const dy = clientY - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const hitR = Math.max(baseRadius, Math.max(slot.width, slot.height) * INVENTORY_MERGE_CORE_RATIO)
      if (dist <= hitR && dist < bestDist) {
        bestDist = dist
        bestIdx = i
      }
    }
    return bestIdx
  },

  // 回退：旧网格估算（仅在尚未量到格子时使用）
  getInventorySlotIndexFallback(clientX, clientY) {
    if (!this.inventoryRect) return null

    const rect = this.inventoryRect
    const tolerance = INVENTORY_HIT_TOLERANCE
    const relX = clientX - rect.left
    const relY = clientY - rect.top
    if (relX < -tolerance || relY < -tolerance ||
        relX > rect.width + tolerance || relY > rect.height + tolerance) {
      return null
    }

    const scale = (this.windowWidth || 375) / 375
    const slotSize = 50 * scale
    const gap = 3 * scale
    const cellTotal = slotSize + gap
    // 居中布局：估算左侧空白
    const rowWidth = INVENTORY_COLS * slotSize + (INVENTORY_COLS - 1) * gap
    const padX = Math.max(0, (rect.width - rowWidth) / 2)
    const col = Math.floor((relX - padX + gap / 2) / cellTotal)
    const row = Math.floor((relY + gap / 2) / cellTotal)
    if (col < 0 || col >= INVENTORY_COLS || row < 0 || row >= INVENTORY_ROWS) return null
    const index = row * INVENTORY_COLS + col
    if (index === this.draggingInventoryIndex || index >= this.inventory.length) return null
    const targetTower = this.inventory[index]
    if (!targetTower ||
        targetTower.type !== this.draggingTower.type ||
        targetTower.level !== this.draggingTower.level ||
        targetTower.level >= MAX_TOWER_LEVEL) {
      return null
    }
    return index
  },

  getInventorySlotIndex(clientX, clientY) {
    return this.findInventoryMergeIndex(clientX, clientY, INVENTORY_MERGE_RADIUS)
  },

  resolveStickyMergeTarget(touch) {
    if (this.mergeTarget) return true

    const clientX = (touch && touch.clientX) || this.lastTouchClientX
    const clientY = (touch && touch.clientY) || this.lastTouchClientY
    if (Number.isFinite(clientX) && Number.isFinite(clientY)) {
      const idx = this.findInventoryMergeIndex(clientX, clientY, INVENTORY_MERGE_COMMIT_RADIUS)
      if (idx !== null) {
        this.mergeTargetInventoryIndex = idx
        this.mergeTarget = this.inventory[idx]
        this.mergeTargetType = 'inventory'
        return true
      }

      let bestField = null
      let bestDist = FIELD_MERGE_RADIUS * 1.08
      for (const tower of this.towers) {
        if (!this.draggingFromInventory && this.draggingTower && tower.id === this.draggingTower.id) continue
        if (!this.draggingTower ||
            tower.type !== this.draggingTower.type ||
            tower.level !== this.draggingTower.level ||
            tower.level >= MAX_TOWER_LEVEL) continue
        const dx = this.dragX - tower.x
        const dy = this.dragY - tower.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < bestDist) {
          bestDist = dist
          bestField = tower
        }
      }
      if (bestField) {
        this.mergeTarget = bestField
        this.mergeTargetType = 'tower'
        return true
      }
    }

    // 卡顿时松手瞬间可能丢命中：短窗口粘滞上次合法目标
    const sticky = this._stickyMerge
    if (sticky && Date.now() - sticky.at <= 120) {
      if (sticky.type === 'inventory' &&
          sticky.inventoryIndex >= 0 &&
          sticky.inventoryIndex < this.inventory.length) {
        const t = this.inventory[sticky.inventoryIndex]
        if (t && this.draggingTower &&
            t.type === this.draggingTower.type &&
            t.level === this.draggingTower.level) {
          this.mergeTarget = t
          this.mergeTargetInventoryIndex = sticky.inventoryIndex
          this.mergeTargetType = 'inventory'
          return true
        }
      }
      if (sticky.type === 'tower' && sticky.towerId != null) {
        const t = this.towers.find((tower) => tower.id === sticky.towerId)
        if (t && this.draggingTower &&
            t.type === this.draggingTower.type &&
            t.level === this.draggingTower.level) {
          this.mergeTarget = t
          this.mergeTargetType = 'tower'
          return true
        }
      }
    }
    return false
  },

  onTouchEnd(e) {
    this.handleTouchEnd(e)
  },

  // 统一处理触摸结束
  handleTouchEnd(e) {
    if (this._suppressNextTouchEnd) {
      this._suppressNextTouchEnd = false
      this.resetDrag()
      return
    }
    // 如果没有待拖动的塔，直接返回
    if (!this.pendingDragTower) {
      this.resetDrag()
      return
    }
    
    // 如果没有真正开始拖动（没移动足够距离），直接重置
    if (!this.isDragging || !this.hasMoved) {
      this.resetDrag()
      return
    }
    
    const offsetX = this.getGridOffsetX()
    const offsetY = this.getGridOffsetY()
    const endTouch = (e && e.changedTouches && e.changedTouches[0]) || null
    this.resolveStickyMergeTarget(endTouch)
    
    if (this.mergeTarget) {
      // 合成操作
      if (this.mergeTargetType === 'inventory') {
        if (this.draggingFromInventory) {
          // 仓库内合成
          this.mergeInventoryTowers(this.draggingInventoryIndex, this.mergeTargetInventoryIndex)
        } else {
          // 场上塔合成到仓库塔
          this.mergeFieldToInventory(this.draggingTowerId, this.mergeTargetInventoryIndex)
        }
      } else {
        // 场上合成
        this.mergeTowers(this.draggingTower, this.mergeTarget)
      }
    } else if (this.draggingFromInventory) {
      // 从仓库拖到场上放置 - 只能放在塔位上
      const col = Math.floor((this.dragX - offsetX) / CONFIG.cellSize)
      const row = Math.floor((this.dragY - offsetY) / CONFIG.cellSize)
      
      if (row >= 0 && row < CONFIG.gridRows && col >= 0 && col < CONFIG.gridCols) {
        // 检查是否是有效塔位且没有塔
        if (this.isTowerSlot(row, col) && !this.grid[row][col]) {
          this.placeTowerFromInventory(row, col)
        }
      }
    } else {
      // 场上塔拖动到新位置 - 只能放在塔位上
      const col = Math.floor((this.dragX - offsetX) / CONFIG.cellSize)
      const row = Math.floor((this.dragY - offsetY) / CONFIG.cellSize)
      
      if (row >= 0 && row < CONFIG.gridRows && col >= 0 && col < CONFIG.gridCols) {
        // 检查是否是有效塔位且没有塔
        if (this.isTowerSlot(row, col) && !this.grid[row][col]) {
          const actualTower = this.towers.find(t => t.id === this.pendingDragTower.id)
          if (actualTower) {
            // 清除旧位置
            const oldRow = actualTower.row
            const oldCol = actualTower.col
            if (oldRow !== undefined && oldCol !== undefined) {
              this.grid[oldRow][oldCol] = null
            }
            
            // 更新塔位置
            actualTower.row = row
            actualTower.col = col
            actualTower.x = offsetX + col * CONFIG.cellSize + CONFIG.cellSize / 2
            actualTower.y = offsetY + row * CONFIG.cellSize + CONFIG.cellSize / 2
            this.grid[row][col] = actualTower
            
            this.createParticles(actualTower.x, actualTower.y, TOWER_TYPES[actualTower.type].color, 8)
          }
        }
      }
    }
    
    this.resetDrag()
  },

  // 仓库内合成
  mergeInventoryTowers(fromIndex, toIndex) {
    const tower1 = this.inventory[fromIndex]
    const tower2 = this.inventory[toIndex]

    if (tower2.level >= MAX_TOWER_LEVEL) {
      wx.showToast({ title: `已达最高等级(Lv.${MAX_TOWER_LEVEL})!`, icon: 'none' })
      return
    }

    const nextLevel = tower2.level + 1
    const upgradeCost = TOWER_UPGRADE_GOLD_BASE + TOWER_UPGRADE_GOLD_PER_LEVEL_SQ * nextLevel * nextLevel
    if (this.data.gold < upgradeCost) {
      wx.showToast({ title: `金币不足! 需要 ${upgradeCost}`, icon: 'none' })
      return
    }

    const config = TOWER_TYPES[tower1.type]

    // 升级tower2
    tower2.level = nextLevel
    Object.assign(tower2, this.getTowerStatsForLevel(tower1.type, tower2.level, 'inventory'))

    // 移除tower1
    if (fromIndex > toIndex) {
      this.inventory.splice(fromIndex, 1)
    } else {
      this.inventory.splice(fromIndex, 1)
    }

    this.setData({ gold: this.data.gold - upgradeCost })
    this.updateInventoryDisplay()

    this.setData({ score: this.data.score + 300 * tower2.level })

    // 震动反馈
    wx.vibrateShort({ type: 'medium' }).catch(() => {})
    this.playSound('merge', { cooldown: 0 })

    wx.showToast({ title: `合成成功! Lv.${tower2.level}`, icon: 'none' })
  },

  // 场上塔合成到仓库塔
  mergeFieldToInventory(towerId, inventoryIndex) {
    const fieldTower = this.towers.find(t => t.id === towerId)
    const invTower = this.inventory[inventoryIndex]

    if (!fieldTower || !invTower) return

    if (invTower.level >= MAX_TOWER_LEVEL) {
      wx.showToast({ title: `已达最高等级(Lv.${MAX_TOWER_LEVEL})!`, icon: 'none' })
      return
    }

    const nextLevel = invTower.level + 1
    const upgradeCost = TOWER_UPGRADE_GOLD_BASE + TOWER_UPGRADE_GOLD_PER_LEVEL_SQ * nextLevel * nextLevel
    if (this.data.gold < upgradeCost) {
      wx.showToast({ title: `金币不足! 需要 ${upgradeCost}`, icon: 'none' })
      return
    }

    const config = TOWER_TYPES[invTower.type]

    // 升级仓库塔
    invTower.level = nextLevel
    Object.assign(invTower, this.getTowerStatsForLevel(invTower.type, invTower.level, 'inventory'))

    // 移除场上塔
    const towerIndex = this.towers.indexOf(fieldTower)
    if (towerIndex !== -1) {
      this.towers.splice(towerIndex, 1)
      this.syncFieldTowerCount()
    }
    // 清除格子
    if (fieldTower.row !== undefined && fieldTower.col !== undefined) {
      this.grid[fieldTower.row][fieldTower.col] = null
    }
    
    this.updateInventoryDisplay()
    this.createParticles(this.dragX, this.dragY, config.color, 15)

    this.setData({ gold: this.data.gold - upgradeCost, score: this.data.score + 300 * invTower.level })

    wx.vibrateShort({ type: 'medium' }).catch(() => {})
    this.playSound('merge', { cooldown: 0 })
    wx.showToast({ title: `合成成功! Lv.${invTower.level}`, icon: 'none' })
  },

  resetDrag() {
    this.isDragging = false
    this.draggingTower = null
    this.pendingDragTower = null
    this.draggingFromInventory = false
    this.draggingInventoryIndex = -1
    this.draggingTowerId = null  // 重置拖动的塔ID
    this.mergeTarget = null
    this.mergeTargetType = null
    this.mergeTargetInventoryIndex = -1
    this.hasMoved = false
    this.lastDragUiUpdateAt = 0
    this.lastMergeHintVisible = false
    this.lastMergeHintSlotIndex = -1
    this._stickyMerge = null
    this.setData({ 
      showMergeHint: false, 
      draggingSlotIndex: -1,
      mergeTargetSlotIndex: -1,
      dragFloating: false
    })
  },

  placeTowerFromInventory(row, col, inventoryIndex = this.draggingInventoryIndex) {
    const towerData = this.inventory[inventoryIndex]
    if (!towerData) return

    const config = TOWER_TYPES[towerData.type]
    
    const placedTower = {
      ...towerData,
      row, col,
      x: this.getGridOffsetX() + col * CONFIG.cellSize + CONFIG.cellSize / 2,
      y: this.getGridOffsetY() + row * CONFIG.cellSize + CONFIG.cellSize / 2,
      lastAttack: 0
    }
    
    this.towers.push(placedTower)
    this.grid[row][col] = placedTower
    
    const nextSelectedInventoryIndex = this.getNextSelectedInventoryIndex(inventoryIndex)

    // 从仓库移除
    this.inventory.splice(inventoryIndex, 1)
    this.setData({ selectedInventoryIndex: nextSelectedInventoryIndex })
    this.updateInventoryDisplay()
    this.syncFieldTowerCount()
    
    this.createParticles(placedTower.x, placedTower.y, config.color, 15)
    this.playSound('place', { cooldown: 0 })
    
    // 放置音效提示
    wx.showToast({ title: '放置成功!', icon: 'none', duration: 800 })
  },

  mergeTowers(tower1, tower2) {
    // tower2 是场上的目标塔（需要找到实际对象）
    const actualTarget = this.towers.find(t => t.id === tower2.id)
    if (!actualTarget) return

    if (actualTarget.level >= MAX_TOWER_LEVEL) {
      wx.showToast({ title: `已达最高等级(Lv.${MAX_TOWER_LEVEL})!`, icon: 'none' })
      return
    }

    const nextLevel = actualTarget.level + 1
    const upgradeCost = TOWER_UPGRADE_GOLD_BASE + TOWER_UPGRADE_GOLD_PER_LEVEL_SQ * nextLevel * nextLevel
    if (this.data.gold < upgradeCost) {
      wx.showToast({ title: `金币不足! 需要 ${upgradeCost}`, icon: 'none' })
      return
    }

    const config = TOWER_TYPES[tower1.type]

    // 升级目标塔
    actualTarget.level = nextLevel
    Object.assign(actualTarget, this.getTowerStatsForLevel(tower1.type, actualTarget.level, 'field'))
    
    // 移除tower1
    if (this.draggingFromInventory) {
      this.inventory.splice(this.draggingInventoryIndex, 1)
      this.updateInventoryDisplay()
    } else {
      // 从场上移除拖动的塔
      const sourceTower = this.towers.find(t => t.id === tower1.id)
      if (sourceTower && sourceTower.row !== undefined) {
        this.grid[sourceTower.row][sourceTower.col] = null
      }
      this.towers = this.towers.filter(t => t.id !== tower1.id)
      this.syncFieldTowerCount()
    }
    
    // 合成特效
    this.createMergeEffect(actualTarget.x, actualTarget.y, config.color)
    this.createParticles(actualTarget.x, actualTarget.y, config.color, 15)
    this.createParticles(actualTarget.x, actualTarget.y, '#ffd700', 10)

    this.setData({ gold: this.data.gold - upgradeCost, score: this.data.score + 300 * actualTarget.level })
    
    // 升级文字
    this.floatingTexts.push({
      x: actualTarget.x,
      y: actualTarget.y - 30,
      text: `⬆️ Lv.${actualTarget.level}!`,
      color: '#ffd700',
      life: 80,
      maxLife: 80,
      vy: -1.5,
      vx: 0,
      scale: 1.5,
      isBold: true
    })
    
    this.playSound('merge', { cooldown: 0 })
    wx.showToast({ title: `合成成功! Lv.${actualTarget.level}`, icon: 'none' })
  },

  nextWave() {
    this.playSound('wave', { cooldown: 0, volume: 0.58 })
    const completedWave = this.data.wave
    const newWave = completedWave + 1
    const waveBonus = 20 + newWave * 10
    const shouldOfferSupply = completedWave % 3 === 0
    const shouldOfferThreatChain = this.canOfferThreatChain(completedWave)

    // 计算关卡和关内波次
    const newLevel = Math.ceil(newWave / 10)
    const newWaveInLevel = ((newWave - 1) % 10) + 1
    // 进入新关卡时进入 prep 阶段，让玩家有时间布阵
    const isNewLevel = newLevel > this.data.level

    this.setData({ 
      gold: this.data.gold + waveBonus,
      score: this.data.score + waveBonus * 5
    })
    
    this.floatingTexts.push({
      x: CONFIG.canvasWidth / 2,
      y: CONFIG.canvasHeight / 2 - 30,
      text: `🎉 第${completedWave}波完成!`,
      color: '#50ff50',
      life: 100,
      maxLife: 100,
      vy: -0.5,
      vx: 0,
      scale: 1.5,
      isBold: true
    })
    
    this.floatingTexts.push({
      x: CONFIG.canvasWidth / 2,
      y: CONFIG.canvasHeight / 2,
      text: `+${waveBonus} 💰`,
      color: '#ffd700',
      life: 100,
      maxLife: 100,
      vy: -0.3,
      vx: 0,
      scale: 1.8,
      isBold: true
    })
    
    // 每10波进入一个全新的程序化地形，不再循环四张固定地图
    if (newWave % 10 === 1 && newWave > 1) {
      const nextTheme = this.ensureProceduralTheme(newLevel)
      
      this.scheduleTimeout(() => {
        this.floatingTexts.push({
          x: CONFIG.canvasWidth / 2,
          y: CONFIG.canvasHeight / 2 - 60,
          text: `🌍 进入${MAP_THEMES[nextTheme].name}地形!`,
          color: '#ff88ff',
          life: 120,
          maxLife: 120,
          vy: -0.3,
          vx: 0,
          scale: 1.8,
          isBold: true
        })
        
        this.changeTheme(nextTheme)
        this.requestRender()
      }, 900)
    }

    if (shouldOfferThreatChain || shouldOfferSupply) {
      this.pendingWaveAdvance = {
        wave: newWave,
        level: newLevel,
        waveInLevel: newWaveInLevel
      }

      this.scheduleTimeout(() => {
        try {
          if (shouldOfferThreatChain) {
            this.openChoiceOverlay({
              mode: 'threatChain',
              panelTitle: '威胁连锁',
              title: `压制成功：改写第${newWave}波的战场规则`,
              hint: '先决定下一波怎么来，再决定自己怎么扛。',
              options: this.buildThreatChainOptions(newWave),
              returnState: 'playing'
            })
            return
          }

          this.openChoiceOverlay({
            mode: 'supply',
            panelTitle: '战术补给',
            title: `第${newWave}波前，选 1 个战术补给`,
            hint: '稳一手资源，还是赌更快成型。',
            options: this.buildWaveChoiceOptions(),
            returnState: 'playing'
          })
        } catch (e) {
          console.warn('advanceWave choice open failed, force advancing', (e && e.stack) || e)
          const pw = this.pendingWaveAdvance
          this.pendingWaveAdvance = null
          this._pendingWaveStuckAt = 0
          this.setData({
            showWaveChoice: false,
            waveChoiceMode: '',
            waveChoicePanelTitle: '战术补给',
            waveChoiceTitle: '',
            waveChoiceHint: '',
            waveChoiceOptions: [],
            pendingSpecializationTowerId: null,
            pendingSpecializationSource: '',
            choiceReturnState: 'playing',
            wave: pw ? pw.wave : newWave,
            level: pw ? pw.level : newLevel,
            waveInLevel: pw ? pw.waveInLevel : newWaveInLevel,
            totalWavesInLevel: 10,
            nextSupplyWave: this.getNextSupplyWave(pw ? pw.wave : newWave),
            gameState: isNewLevel ? 'prep' : 'playing',
            commanderAiming: false
          }, () => {
            this.generateWave(pw ? pw.wave : newWave)
            this.lastSpawnTime = isNewLevel ? Date.now() + 60000 : Date.now() + 300
            this.requestRender()
          })
        }
      }, 850)
      return
    }
    
    this.scheduleTimeout(() => {
      this.setData({ 
        wave: newWave,
        level: newLevel,
        waveInLevel: newWaveInLevel,
        totalWavesInLevel: 10,
        nextSupplyWave: this.getNextSupplyWave(newWave),
        gameState: isNewLevel ? 'prep' : 'playing',
        commanderAiming: false
      })
      this.generateWave(newWave)
      if (isNewLevel) {
        this.lastSpawnTime = Date.now() + 60000
      }
      this.requestRender()
    }, 1800)
  },

  // 切换地形主题
  changeTheme(themeKey) {
    const theme = MAP_THEMES[themeKey] || MAP_THEMES.forest
    
    // 保存塔的信息
    const savedTowers = this.towers.map(t => ({
      ...t,
      relRow: t.row,
      relCol: t.col
    }))
    
    // 清除塔的格子占用
    for (let row = 0; row < CONFIG.gridRows; row++) {
      for (let col = 0; col < CONFIG.gridCols; col++) {
        this.grid[row][col] = null
      }
    }
    this.towers = []
    
    // 更新主题
    this.setData({ currentTheme: themeKey, commanderAiming: false })
    this.syncAmbientTrack(themeKey)
    
    // 换图：完整重建路径、塔位与装饰
    this.generatePath(themeKey, {
      refreshDressing: true,
      rebuildSlots: true,
      relocateTowers: false
    })
    this.syncPrepTowerSlots(themeKey)
    
    // 重新放置塔：原位仍合法则保留，否则吸附到最近空塔位，再不行退回仓库
    savedTowers.forEach(t => {
      let targetRow = t.relRow
      let targetCol = t.relCol
      const sameSlotOk = this.isTowerSlot(targetRow, targetCol) &&
        !(this.grid[targetRow] && this.grid[targetRow][targetCol])

      if (!sameSlotOk) {
        const near = this.findNearestFreeSlot(t.relRow, t.relCol)
        if (near) {
          targetRow = near.row
          targetCol = near.col
        } else {
          if (this.inventory.length < INVENTORY_COLS * INVENTORY_ROWS) {
            this.inventory.push({
              id: t.id,
              type: t.type,
              level: t.level,
              damage: t.damage,
              range: t.range,
              attackSpeed: t.attackSpeed,
              lastAttack: 0
            })
            this.updateInventoryDisplay()
            
            this.floatingTexts.push({
              x: CONFIG.canvasWidth / 2,
              y: CONFIG.canvasHeight / 2 + 20,
              text: `${TOWER_TYPES[t.type].emoji} 塔已退回仓库`,
              color: '#ffaa00',
              life: 80,
              maxLife: 80,
              vy: -0.5,
              vx: 0,
              scale: 1
            })
          }
          return
        }
      }

      const newTower = {
        ...t,
        row: targetRow,
        col: targetCol,
        x: this.getGridOffsetX() + targetCol * CONFIG.cellSize + CONFIG.cellSize / 2,
        y: this.getGridOffsetY() + targetRow * CONFIG.cellSize + CONFIG.cellSize / 2
      }
      this.towers.push(newTower)
      this.grid[targetRow][targetCol] = newTower
    })
    this.syncFieldTowerCount()
    this.syncPrepTowerSlots(themeKey)
    
    // 地形切换特效
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: Math.random() * CONFIG.canvasWidth,
        y: Math.random() * CONFIG.canvasHeight,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        size: 3 + Math.random() * 5,
        color: themeKey === 'volcano' ? '#ff6600' : 
               themeKey === 'ice' ? '#aaeeff' :
               themeKey === 'desert' ? '#ffcc66' : '#66ff66',
        life: 40,
        maxLife: 40,
        alpha: 0.8
      })
    }
    this.enforcePerformanceCaps()
    this.requestRender()
  },

  gameOver() {
    this.disableLeaveGuard()
    this.clearRunProgress()
    this.stopAllSounds()
    this.stopGame()
    this.playSound('gameover', { cooldown: 0 })
    
    const highScore = wx.getStorageSync('highScore') || 0
    const maxWave = wx.getStorageSync('maxWave') || 1
    const isNewRecord = this.data.score > highScore
    
    if (isNewRecord) wx.setStorageSync('highScore', this.data.score)
    if (this.data.wave > maxWave) wx.setStorageSync('maxWave', this.data.wave)
    
    this.setData({ gameState: 'gameover', isNewRecord, commanderAiming: false })
  },

  togglePause() {
    if (this.data.gameState === 'prep') {
      wx.showToast({ title: '布阵阶段无需暂停', icon: 'none' })
      return
    }

    if (this.data.gameState === 'choice') {
      wx.showToast({ title: '先选 1 个战术补给', icon: 'none' })
      return
    }

    if (this.data.gameState === 'playing') {
      this.playSound('ui', { cooldown: 0, volume: 0.32 })
      this.stopAmbientTrack()
      this.setData({ gameState: 'paused', commanderAiming: false })
      this.persistRunProgress({ immediate: true })
      this.requestRender()
      return
    }

    if (this.data.gameState === 'paused') {
      this.resumeGame()
    }
  },

  resumeGame() {
    this.playSound('ui', { cooldown: 0, volume: 0.32 })
    this.syncAmbientTrack()
    // 暂停过久/回前台后，避免波次卡在 complete 或出怪时间戳异常
    const noMonsters = !this.monsters || this.monsters.length === 0
    const spawnDone = !this.waveMonsters || !this.waveMonsters.length ||
      this.spawnIndex >= this.waveMonsters.length
    if (noMonsters && (this.waveComplete || spawnDone)) {
      this.waveComplete = false
      this.pendingWaveAdvance = null
      this.generateWave(this.data.wave || 1)
    }
    this.lastSpawnTime = Math.min(this.lastSpawnTime || Date.now(), Date.now())
    this.setData({ gameState: 'playing' })
    if (!this.gameLoop) {
      this.startGame()
    }
    this.requestRender()
  },

  restartGame() {
    this.enableLeaveGuard()
    this.clearRunProgress()
    this.stopGame()
    this.initGame()
    this.startGame()
  },

  backToMenu() {
    this.persistRunProgress({ immediate: true })
    this.stopGame()
    this.disableLeaveGuard()
    wx.navigateBack()
  }
}, renderTowers, renderMonsters, renderEffects))
