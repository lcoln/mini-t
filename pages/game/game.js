// 绘制圆角矩形的辅助函数（兼容小程序）
function drawRoundRect(ctx, x, y, width, height, radius) {
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.arcTo(x + width, y, x + width, y + radius, radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius)
  ctx.lineTo(x + radius, y + height)
  ctx.arcTo(x, y + height, x, y + height - radius, radius)
  ctx.lineTo(x, y + radius)
  ctx.arcTo(x, y, x + radius, y, radius)
}

// 游戏配置
const CONFIG = {
  canvasWidth: 375,
  canvasHeight: 550,
  gridCols: 11,
  gridRows: 10,
  cellSize: 32,
  spawnInterval: 1800
}

// 塔类型配置
const TOWER_TYPES = {
  fire: {
    id: 'fire',
    name: '火焰塔',
    color: '#ff4400',
    glowColor: 'rgba(255, 68, 0, 0.6)',
    emoji: '🔥',
    baseDamage: 5,
    baseRange: 70,
    baseAttackSpeed: 1200,
    description: '灼烧：持续烧伤3秒',
    projectileType: 'fireball'
  },
  ice: {
    id: 'ice',
    name: '寒冰塔',
    color: '#00ccff',
    glowColor: 'rgba(0, 204, 255, 0.6)',
    emoji: '❄️',
    baseDamage: 4,
    baseRange: 80,
    baseAttackSpeed: 1400,
    description: '冰冻：减速50%持续2秒',
    projectileType: 'iceball'
  },
  nature: {
    id: 'nature',
    name: '自然塔',
    color: '#44ff44',
    glowColor: 'rgba(68, 255, 68, 0.6)',
    emoji: '🌿',
    baseDamage: 4,
    baseRange: 65,
    baseAttackSpeed: 1300,
    description: '藤蔓：缠绕减速30%+受伤加深25%',
    projectileType: 'vineball'
  },
  arcane: {
    id: 'arcane',
    name: '奥术塔',
    color: '#aa44ff',
    glowColor: 'rgba(170, 68, 255, 0.6)',
    emoji: '🔮',
    baseDamage: 8,
    baseRange: 90,
    baseAttackSpeed: 1600,
    description: '穿透：可穿透多个敌人',
    projectileType: 'arcaneball'
  },
  lightning: {
    id: 'lightning',
    name: '闪电塔',
    color: '#ffff00',
    glowColor: 'rgba(255, 255, 0, 0.6)',
    emoji: '⚡',
    baseDamage: 6,
    baseRange: 85,
    baseAttackSpeed: 1100,
    description: '连锁：电击周围3个敌人',
    projectileType: 'lightning'
  }
}

// 怪物类型配置 - 添加独特外观
const MONSTER_TYPES = {
  slime: { 
    name: '史莱姆', 
    emoji: '🟢',
    bodyColor: '#66ff66', 
    outlineColor: '#33aa33',
    eyeColor: '#000',
    baseHp: 80, 
    speed: 0.8, 
    goldDrop: 5,
    shape: 'blob',
    unlockWave: 1
  },
  bat: {
    name: '蝙蝠',
    emoji: '🦇',
    bodyColor: '#555566',
    outlineColor: '#333344',
    eyeColor: '#ff0000',
    baseHp: 50,
    speed: 1.5,
    goldDrop: 6,
    shape: 'bat',
    unlockWave: 2
  },
  skeleton: { 
    name: '骷髅', 
    emoji: '💀',
    bodyColor: '#eeeeee', 
    outlineColor: '#999999',
    eyeColor: '#ff0000',
    baseHp: 120, 
    speed: 1.0, 
    goldDrop: 8,
    shape: 'skeleton',
    unlockWave: 3
  },
  ghost: { 
    name: '幽灵', 
    emoji: '👻',
    bodyColor: 'rgba(180, 180, 255, 0.7)', 
    outlineColor: '#8888ff',
    eyeColor: '#ff00ff',
    baseHp: 100, 
    speed: 1.3, 
    goldDrop: 10,
    shape: 'ghost',
    unlockWave: 4
  },
  orc: {
    name: '兽人',
    emoji: '👹',
    bodyColor: '#558844',
    outlineColor: '#336622',
    eyeColor: '#ffff00',
    baseHp: 200,
    speed: 0.9,
    goldDrop: 15,
    shape: 'orc',
    unlockWave: 5
  },
  golem: { 
    name: '石魔', 
    emoji: '🗿',
    bodyColor: '#777777', 
    outlineColor: '#444444',
    eyeColor: '#ff6600',
    baseHp: 350, 
    speed: 0.6, 
    goldDrop: 25,
    shape: 'golem',
    unlockWave: 7
  },
  demon: {
    name: '恶魔',
    emoji: '😈',
    bodyColor: '#aa2222',
    outlineColor: '#660000',
    eyeColor: '#ffff00',
    baseHp: 280,
    speed: 1.1,
    goldDrop: 30,
    shape: 'demon',
    unlockWave: 9
  },
  dragon: { 
    name: '巨龙', 
    emoji: '🐉',
    bodyColor: '#ff4400', 
    outlineColor: '#aa0000',
    eyeColor: '#ffff00',
    baseHp: 800, 
    speed: 0.5, 
    goldDrop: 100, 
    isBoss: true,
    shape: 'dragon',
    unlockWave: 5
  }
}

// 底部格子配置
const INVENTORY_COLS = 5
const INVENTORY_ROWS = 3

// 地形主题配置
const MAP_THEMES = {
  forest: {
    name: '森林',
    bgColors: ['#0a1a0a', '#152515', '#0a1a0a'],
    pathColors: ['#2a1a0a', '#5a4030', '#7a5a40'],
    grassColor: 'rgba(60, 120, 60, 0.15)',
    gridColor: 'rgba(80, 180, 80, 0.2)',
    decorTypes: ['tree', 'bush', 'flower', 'mushroom', 'rock'],
    // 塔位放在路径两侧，不在路上
    towerSlots: [
      {row: 0, col: 1}, {row: 0, col: 4}, {row: 0, col: 7}, {row: 0, col: 10},
      {row: 2, col: 2}, {row: 2, col: 9},
      {row: 4, col: 0}, {row: 4, col: 5}, {row: 4, col: 10},
      {row: 6, col: 2}, {row: 6, col: 7},
      {row: 8, col: 0}, {row: 8, col: 4}, {row: 8, col: 10},
      {row: 9, col: 6}
    ]
  },
  desert: {
    name: '沙漠',
    bgColors: ['#2a200a', '#3a3015', '#2a200a'],
    pathColors: ['#4a3a1a', '#8a7040', '#aa9060'],
    grassColor: 'rgba(180, 150, 80, 0.1)',
    gridColor: 'rgba(200, 180, 100, 0.2)',
    decorTypes: ['cactus', 'rock', 'skull', 'tumbleweed'],
    towerSlots: [
      {row: 0, col: 1}, {row: 0, col: 5}, {row: 0, col: 9},
      {row: 2, col: 3}, {row: 2, col: 7},
      {row: 4, col: 0}, {row: 4, col: 10},
      {row: 6, col: 2}, {row: 6, col: 5}, {row: 6, col: 8},
      {row: 8, col: 0}, {row: 8, col: 4}, {row: 8, col: 10},
      {row: 9, col: 7}
    ]
  },
  ice: {
    name: '冰原',
    bgColors: ['#0a1a2a', '#152535', '#0a1a2a'],
    pathColors: ['#1a2a3a', '#3a5a7a', '#5a7a9a'],
    grassColor: 'rgba(150, 200, 255, 0.1)',
    gridColor: 'rgba(100, 180, 255, 0.2)',
    decorTypes: ['ice_crystal', 'snow_pile', 'frozen_tree', 'rock'],
    towerSlots: [
      {row: 0, col: 2}, {row: 0, col: 8},
      {row: 2, col: 0}, {row: 2, col: 5}, {row: 2, col: 10},
      {row: 4, col: 3}, {row: 4, col: 7},
      {row: 6, col: 0}, {row: 6, col: 5}, {row: 6, col: 10},
      {row: 8, col: 2}, {row: 8, col: 8},
      {row: 9, col: 5}
    ]
  },
  volcano: {
    name: '火山',
    bgColors: ['#1a0a0a', '#2a1510', '#1a0a0a'],
    pathColors: ['#2a1a1a', '#5a3030', '#7a4040'],
    grassColor: 'rgba(255, 100, 50, 0.08)',
    gridColor: 'rgba(255, 150, 100, 0.15)',
    decorTypes: ['lava_rock', 'fire_vent', 'ash_pile', 'dead_tree'],
    towerSlots: [
      {row: 0, col: 0}, {row: 0, col: 5}, {row: 0, col: 10},
      {row: 2, col: 2}, {row: 2, col: 8},
      {row: 4, col: 0}, {row: 4, col: 4}, {row: 4, col: 10},
      {row: 6, col: 2}, {row: 6, col: 6}, {row: 6, col: 9},
      {row: 8, col: 0}, {row: 8, col: 5}, {row: 8, col: 10}
    ]
  }
}

Page({
  data: {
    wave: 1,
    score: 0,
    gold: 100,
    lives: 20,
    gameState: 'playing',
    showMergeHint: false,
    isNewRecord: false,
    gridOffsetX: 0,
    gridOffsetY: 60,
    // 底部仓库
    inventorySlots: [],
    summonCost: 15,
    inventoryFull: false,
    canvasRect: null,
    draggingSlotIndex: -1,
    mergeTargetSlotIndex: -1,
    // 当前地形主题
    currentTheme: 'forest'
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
  
  waveMonsters: [],
  spawnIndex: 0,
  lastSpawnTime: 0,
  waveComplete: false,
  
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
    this.initCanvas()
  },

  onUnload() {
    this.stopGame()
  },

  initCanvas() {
    const query = wx.createSelectorQuery()
    query.select('#gameCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return
        
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        
        const systemInfo = wx.getWindowInfo()
        const dpr = systemInfo.pixelRatio || 2
        canvas.width = res[0].width * dpr
        canvas.height = res[0].height * dpr
        ctx.scale(dpr, dpr)
        
        this.canvas = canvas
        this.ctx = ctx
        CONFIG.canvasWidth = res[0].width
        CONFIG.canvasHeight = res[0].height
        
        const gridWidth = CONFIG.gridCols * CONFIG.cellSize
        const gridHeight = CONFIG.gridRows * CONFIG.cellSize
        this.setData({
          gridOffsetX: (CONFIG.canvasWidth - gridWidth) / 2,
          gridOffsetY: (CONFIG.canvasHeight - gridHeight) / 2  // 垂直居中
        })
        
        // 获取canvas在页面中的位置
        wx.createSelectorQuery().select('#gameCanvas').boundingClientRect((rect) => {
          this.setData({ canvasRect: rect })
          this.cachedCanvasRect = rect  // 缓存供拖动使用
        }).exec()
        
        this.initGame()
        this.startGame()
      })
  },

  initGame() {
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
    
    // 初始化仓库 - 给5个随机塔
    this.inventory = []
    const types = Object.keys(TOWER_TYPES)
    for (let i = 0; i < 5; i++) {
      const type = types[Math.floor(Math.random() * types.length)]
      this.inventory.push(this.createTowerData(type))
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
      gameState: 'playing'
    })
  },

  createTowerData(type) {
    const config = TOWER_TYPES[type]
    return {
      id: Date.now() + Math.random(),
      type: type,
      level: 1,
      damage: config.baseDamage,
      range: config.baseRange,
      attackSpeed: config.baseAttackSpeed,
      lastAttack: 0
    }
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
    this.setData({ 
      inventorySlots: slots,
      inventoryFull: this.inventory.length >= INVENTORY_COLS * INVENTORY_ROWS
    })
  },

  generatePath(themeKey = 'forest') {
    const offsetX = this.data.gridOffsetX
    const offsetY = this.data.gridOffsetY
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
    
    this.pathPoints = pathLayouts[themeKey] || pathLayouts.forest
    
    // 预生成路径装饰（小石子）
    this.pathDecorations = []
    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      const p1 = this.pathPoints[i]
      const p2 = this.pathPoints[i + 1]
      const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
      const stoneCount = Math.floor(dist / 15)
      
      for (let j = 0; j < stoneCount; j++) {
        const t = j / stoneCount
        this.pathDecorations.push({
          x: p1.x + (p2.x - p1.x) * t + (Math.random() - 0.5) * 18,
          y: p1.y + (p2.y - p1.y) * t + (Math.random() - 0.5) * 18,
          size: 1 + Math.random() * 2.5
        })
      }
    }
    
    // 根据主题生成装饰物
    this.generateMapDecorations(themeKey)
    
    // 预生成背景纹理点
    this.grassDots = []
    for (let i = 0; i < 100; i++) {
      this.grassDots.push({
        x: Math.random() * CONFIG.canvasWidth,
        y: Math.random() * CONFIG.canvasHeight,
        size: 1 + Math.random() * 2
      })
    }
  },

  generateMapDecorations(themeKey) {
    const theme = MAP_THEMES[themeKey] || MAP_THEMES.forest
    this.mapDecorations = []
    
    // 边缘装饰
    const edgePositions = [
      { x: 15, y: 40 }, { x: 12, y: 100 }, { x: 20, y: 160 },
      { x: 10, y: 220 }, { x: 18, y: 280 }, { x: 25, y: 340 },
      { x: CONFIG.canvasWidth - 18, y: 35 }, { x: CONFIG.canvasWidth - 15, y: 90 },
      { x: CONFIG.canvasWidth - 22, y: 150 }, { x: CONFIG.canvasWidth - 12, y: 210 },
      { x: CONFIG.canvasWidth - 20, y: 270 }, { x: CONFIG.canvasWidth - 25, y: 330 },
      { x: CONFIG.canvasWidth / 2 - 60, y: 20 }, { x: CONFIG.canvasWidth / 2 + 50, y: 15 },
      { x: CONFIG.canvasWidth / 2, y: CONFIG.canvasHeight - 40 }
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
    
    // 基础怪物数量随波次增加
    const baseCount = 5 + Math.floor(wave * 1.5)
    
    // 获取当前波次可用的怪物类型
    const availableTypes = Object.keys(MONSTER_TYPES).filter(t => {
      const config = MONSTER_TYPES[t]
      return !config.isBoss && config.unlockWave <= wave
    })
    
    // 怪物生命值倍率：每波增加20%
    const hpMultiplier = 1 + (wave - 1) * 0.2
    
    for (let i = 0; i < baseCount; i++) {
      // 高级怪物出现概率随波次增加
      let type
      if (availableTypes.length === 1) {
        type = availableTypes[0]
      } else {
        // 优先生成较新解锁的怪物
        const weights = availableTypes.map(t => {
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
        goldDrop: Math.floor(config.goldDrop * (1 + (wave - 1) * 0.1))
      })
    }
    
    // 每5波出Boss
    if (wave % 5 === 0) {
      const bossConfig = MONSTER_TYPES.dragon
      const bossHpMultiplier = 1 + (wave - 1) * 0.3
      this.waveMonsters.push({
        type: 'dragon',
        ...bossConfig,
        hp: Math.floor(bossConfig.baseHp * bossHpMultiplier),
        maxHp: Math.floor(bossConfig.baseHp * bossHpMultiplier),
        goldDrop: bossConfig.goldDrop * Math.ceil(wave / 5)
      })
    }
    
    // 随机打乱顺序
    this.waveMonsters.sort(() => Math.random() - 0.5)
    
    this.spawnIndex = 0
    this.waveComplete = false
    this.lastSpawnTime = Date.now()
  },

  startGame() {
    this.gameLoop = setInterval(() => {
      this.update()
      this.render()
    }, 1000 / 60)
  },

  stopGame() {
    if (this.gameLoop) {
      clearInterval(this.gameLoop)
      this.gameLoop = null
    }
  },

  update() {
    if (this.data.gameState !== 'playing') return
    
    const now = Date.now()
    
    if (this.spawnIndex < this.waveMonsters.length) {
      if (now - this.lastSpawnTime > CONFIG.spawnInterval) {
        this.spawnMonster(this.waveMonsters[this.spawnIndex])
        this.spawnIndex++
        this.lastSpawnTime = now
      }
    }
    
    this.updateMonsters()
    this.updateTowers(now)
    this.updateProjectiles()
    this.updateParticles()
    this.updateFloatingTexts()
    this.updateLightningEffects()
    this.updateFireEffects()
    this.updateIceEffects()
    this.updatePoisonEffects()
    this.updateArcaneEffects()
    this.updateMergeEffects()
    
    if (this.spawnIndex >= this.waveMonsters.length && this.monsters.length === 0 && !this.waveComplete) {
      this.waveComplete = true
      this.nextWave()
    }
    
    if (this.data.lives <= 0) {
      this.gameOver()
    }
  },

  spawnMonster(template) {
    this.monsters.push({
      ...template,
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
      animTimer: 0
    })
  },

  updateMonsters() {
    this.monsters = this.monsters.filter(monster => {
      // 动画计时
      monster.animTimer++
      if (monster.animTimer > 10) {
        monster.animTimer = 0
        monster.animFrame = (monster.animFrame + 1) % 4
      }
      
      // 灼烧效果
      if (monster.burnTimer > 0) {
        monster.hp -= monster.burnDamage
        monster.burnTimer--
        if (monster.burnTimer % 10 === 0) {
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
        if (monster.slowTimer % 15 === 0) {
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
        if (monster.vineTimer % 12 === 0) {
          // 藤蔓缠绕特效
          this.poisonEffects.push({
            x: monster.x + (Math.random() - 0.5) * 15,
            y: monster.y + 5,
            size: 4 + Math.random() * 3,
            life: 20,
            maxLife: 20,
            vy: 0.2,  // 向下蔓延
            isVine: true
          })
        }
        // 易伤结束时清除
        if (monster.vineTimer <= 0) {
          monster.vineVulnerability = 0
        }
      }
      
      const target = this.pathPoints[monster.pathIndex + 1]
      if (!target) {
        this.setData({ lives: this.data.lives - (monster.isBoss ? 5 : 1) })
        this.createParticles(monster.x, monster.y, '#ff0000', 20)
        return false
      }
      
      const dx = target.x - monster.x
      const dy = target.y - monster.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist < 5) {
        monster.pathIndex++
      } else {
        const moveSpeed = monster.speed * speedMod * 1.5
        monster.x += (dx / dist) * moveSpeed
        monster.y += (dy / dist) * moveSpeed
      }
      
      if (monster.hp <= 0) {
        this.onMonsterKilled(monster)
        return false
      }
      
      return true
    })
  },

  onMonsterKilled(monster) {
    const gold = monster.goldDrop
    this.setData({ 
      gold: this.data.gold + gold,
      score: this.data.score + gold * 10
    })
    
    // 金币飘字动画 - 多个金币图标散开
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 / 5) * i + Math.random() * 0.5
      this.floatingTexts.push({
        x: monster.x,
        y: monster.y,
        text: '💰',
        color: '#ffd700',
        life: 45 + i * 5,
        maxLife: 45 + i * 5,
        vy: -2 - Math.random(),
        vx: Math.cos(angle) * 2,
        scale: 1.0
      })
    }
    
    // 金额显示
    this.floatingTexts.push({
      x: monster.x,
      y: monster.y - 20,
      text: `+${gold}`,
      color: '#ffd700',
      life: 60,
      maxLife: 60,
      vy: -1.5,
      vx: 0,
      scale: 1.5,
      isBold: true
    })
    
    // 根据怪物类型创建差异化死亡特效
    this.createMonsterDeathEffect(monster)
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
        // 巨龙Boss：大型火焰爆炸 + 龙鳞飞散
        for (let i = 0; i < 30; i++) {
          const angle = (Math.PI * 2 / 30) * i
          const dist = 5 + Math.random() * 15
          this.fireEffects.push({
            x: monster.x + Math.cos(angle) * dist,
            y: monster.y + Math.sin(angle) * dist,
            size: 15 + Math.random() * 15,
            life: 40,
            maxLife: 40,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3 - 1
          })
        }
        // 龙鳞
        for (let i = 0; i < 15; i++) {
          const angle = Math.random() * Math.PI * 2
          this.particles.push({
            x: monster.x, y: monster.y,
            vx: Math.cos(angle) * (3 + Math.random() * 3),
            vy: Math.sin(angle) * (3 + Math.random() * 3) - 2,
            size: 5 + Math.random() * 5,
            color: Math.random() > 0.5 ? '#ff4400' : '#aa2200',
            life: 50,
            maxLife: 50,
            alpha: 1
          })
        }
        // Boss击杀特效
        this.floatingTexts.push({
          x: monster.x, y: monster.y - 20,
          text: '🐉', color: '#ff6600', life: 80, maxLife: 80,
          vy: -1.5, vx: 0, scale: 2
        })
        this.floatingTexts.push({
          x: monster.x, y: monster.y + 10,
          text: '💥 BOSS DOWN! 💥', color: '#ffaa00', life: 100, maxLife: 100,
          vy: -1, vx: 0, scale: 1.2, isBold: true
        })
        // 屏幕震动效果（通过大量粒子模拟）
        for (let i = 0; i < 40; i++) {
          this.particles.push({
            x: Math.random() * CONFIG.canvasWidth,
            y: Math.random() * CONFIG.canvasHeight,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            size: 2 + Math.random() * 3,
            color: '#ffd700',
            life: 20,
            maxLife: 20,
            alpha: 0.5
          })
        }
        break
        
      default:
        // 默认死亡特效
        this.createParticles(monster.x, monster.y, monster.bodyColor, 20)
        break
    }
  },

  updateTowers(now) {
    this.towers.forEach(tower => {
      if (now - tower.lastAttack < tower.attackSpeed) return
      
      let target = null
      
      this.monsters.forEach(monster => {
        const dx = monster.x - tower.x
        const dy = monster.y - tower.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist < tower.range) {
          if (!target || monster.pathIndex > target.pathIndex) {
            target = monster
          }
        }
      })
      
      if (target) {
        this.towerAttack(tower, target)
        tower.lastAttack = now
      }
    })
  },

  towerAttack(tower, target) {
    const config = TOWER_TYPES[tower.type]
    
    if (tower.type === 'lightning') {
      this.lightningAttack(tower, target)
    } else {
      this.projectiles.push({
        x: tower.x,
        y: tower.y - 10,
        targetId: this.monsters.indexOf(target),
        damage: tower.damage,
        towerType: tower.type,
        towerLevel: tower.level,
        color: config.color,
        speed: tower.type === 'arcane' ? 10 : 7,
        piercing: tower.type === 'arcane' ? 2 + tower.level : 0,
        size: 4 + tower.level * 1.2,
        angle: 0,
        trail: []
      })
    }
    
    this.createParticles(tower.x, tower.y - 15, config.color, 4)
  },

  lightningAttack(tower, target) {
    const lv = tower.level || 1
    const chainCount = 1 + lv  // lv1=2链, lv5=6链
    
    this.applyDamage(target, tower.damage, 'lightning')
    
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
    this.createElectricBurst(target.x, target.y, lv)
    
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
        this.applyDamage(nearestMonster, tower.damage * (0.6 + lv * 0.05), 'lightning')
        
        const chainColor = lv >= 4 ? '#ffff88' : lv >= 3 ? '#ffff66' : lv >= 2 ? '#eeee33' : '#cccc00'
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
        
        this.createElectricBurst(nearestMonster.x, nearestMonster.y, lv)
        
        hitTargets.push(nearestMonster)
        lastTarget = nearestMonster
      }
    }
  },

  createElectricBurst(x, y, level) {
    const lv = level || 1
    const burstCount = 3 + lv  // lv1=4, lv5=8
    const burstDist = 8 + lv * 2.5
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
    // 藤蔓易伤效果：增加受到的伤害
    let finalDamage = damage
    if (monster.vineVulnerability > 0) {
      finalDamage = damage * (1 + monster.vineVulnerability)
    }
    
    monster.hp -= finalDamage
    
    const colors = {
      fire: '#ff4400',
      ice: '#00ccff',
      nature: '#44ff44',
      arcane: '#aa44ff',
      lightning: '#ffff00'
    }
    
    // 如果有易伤加成，显示额外伤害
    const displayDamage = Math.floor(finalDamage)
    const text = monster.vineVulnerability > 0 ? `-${displayDamage}!` : `-${displayDamage}`
    
    this.floatingTexts.push({
      x: monster.x + (Math.random() - 0.5) * 20,
      y: monster.y - 20,
      text: text,
      color: colors[type] || '#fff',
      life: 30,
      maxLife: 30,
      vy: -1.5,
      vx: (Math.random() - 0.5) * 1,
      scale: monster.vineVulnerability > 0 ? 1.1 : 0.9  // 易伤伤害显示更大
    })
  },

  updateProjectiles() {
    this.projectiles = this.projectiles.filter(proj => {
      const target = this.monsters[proj.targetId]
      if (!target && proj.piercing <= 0) return false
      
      let currentTarget = target
      if (!target && proj.piercing > 0) {
        let minDist = 60
        this.monsters.forEach((m, i) => {
          const d = Math.sqrt((m.x - proj.x) ** 2 + (m.y - proj.y) ** 2)
          if (d < minDist) {
            minDist = d
            currentTarget = m
            proj.targetId = i
          }
        })
        if (!currentTarget) return false
      }
      
      const dx = currentTarget.x - proj.x
      const dy = currentTarget.y - proj.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist < 15) {
        this.applyDamage(currentTarget, proj.damage, proj.towerType)
        this.applyTowerEffect(currentTarget, proj.towerType, proj.damage, proj.towerLevel)
        this.createHitEffect(currentTarget.x, currentTarget.y, proj.towerType, proj.towerLevel)
        
        if (proj.piercing > 0) {
          proj.piercing--
          proj.targetId = -1
          return true
        }
        return false
      }
      
      proj.angle = Math.atan2(dy, dx)
      proj.x += (dx / dist) * proj.speed
      proj.y += (dy / dist) * proj.speed
      
      // 记录轨迹
      proj.trail.push({ x: proj.x, y: proj.y })
      if (proj.trail.length > 8) proj.trail.shift()
      
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
        // 灼烧：持续伤害
        monster.burnTimer = 180
        monster.burnDamage = damage * 0.1 * level
        break
      case 'ice':
        // 冰冻：减速50%
        monster.slowTimer = 120
        break
      case 'nature':
        // 藤蔓：减速30% + 受伤加深25%（易伤效果）
        monster.vineTimer = 180  // 3秒
        monster.vineVulnerability = 0.25 * level  // 每级增加25%易伤
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
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 - 2,
        size: Math.random() * 6 + 3,
        color,
        life: 35,
        maxLife: 35,
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

  render() {
    const ctx = this.ctx
    if (!ctx) return
    
    const theme = MAP_THEMES[this.data.currentTheme] || MAP_THEMES.forest
    
    // 背景渐变（根据主题）
    const bgGradient = ctx.createLinearGradient(0, 0, 0, CONFIG.canvasHeight)
    bgGradient.addColorStop(0, theme.bgColors[0])
    bgGradient.addColorStop(0.5, theme.bgColors[1])
    bgGradient.addColorStop(1, theme.bgColors[2])
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight)
    
    this.drawDecorations()
    this.drawGrid()
    this.drawPath()
    this.drawTowers()
    this.drawMonsters()
    this.drawProjectiles()
    this.drawFireEffects()
    this.drawIceEffects()
    this.drawPoisonEffects()
    this.drawArcaneEffects()
    this.drawLightningEffects()
    this.drawMergeEffects()
    this.drawParticles()
    this.drawFloatingTexts()
    this.drawDraggingTower()
  },

  drawDecorations() {
    const ctx = this.ctx
    const theme = MAP_THEMES[this.data.currentTheme] || MAP_THEMES.forest
    
    // 背景纹理点（使用预生成的）
    ctx.fillStyle = theme.grassColor
    if (this.grassDots) {
      this.grassDots.forEach(dot => {
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2)
        ctx.fill()
      })
    }
    
    // 装饰物（使用预生成的）
    if (this.mapDecorations) {
      this.mapDecorations.forEach(d => {
        this.drawDecoration(ctx, d)
      })
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
    const ctx = this.ctx
    const offsetX = this.data.gridOffsetX
    const offsetY = this.data.gridOffsetY
    const theme = MAP_THEMES[this.data.currentTheme] || MAP_THEMES.forest
    
    // 只绘制空的塔位
    theme.towerSlots.forEach(slot => {
      const x = offsetX + slot.col * CONFIG.cellSize + CONFIG.cellSize / 2
      const y = offsetY + slot.row * CONFIG.cellSize + CONFIG.cellSize / 2
      const hasTower = this.grid[slot.row] && this.grid[slot.row][slot.col]
      
      if (!hasTower) {
        // 简洁的塔位标记 - 圆形虚线边框
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.arc(x, y, 12, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
        
        // 中心小点
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    })
  },

  drawPath() {
    const ctx = this.ctx
    const theme = MAP_THEMES[this.data.currentTheme] || MAP_THEMES.forest
    const pathColors = theme.pathColors
    
    // 路径外边框（深色）
    ctx.strokeStyle = pathColors[0]
    ctx.lineWidth = 38
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    ctx.beginPath()
    ctx.moveTo(this.pathPoints[0].x, this.pathPoints[0].y)
    for (let i = 1; i < this.pathPoints.length; i++) {
      ctx.lineTo(this.pathPoints[i].x, this.pathPoints[i].y)
    }
    ctx.stroke()
    
    // 路径主体
    ctx.strokeStyle = pathColors[1]
    ctx.lineWidth = 32
    ctx.beginPath()
    ctx.moveTo(this.pathPoints[0].x, this.pathPoints[0].y)
    for (let i = 1; i < this.pathPoints.length; i++) {
      ctx.lineTo(this.pathPoints[i].x, this.pathPoints[i].y)
    }
    ctx.stroke()
    
    // 路径内部（浅色）
    ctx.strokeStyle = pathColors[2]
    ctx.lineWidth = 24
    ctx.beginPath()
    ctx.moveTo(this.pathPoints[0].x, this.pathPoints[0].y)
    for (let i = 1; i < this.pathPoints.length; i++) {
      ctx.lineTo(this.pathPoints[i].x, this.pathPoints[i].y)
    }
    ctx.stroke()
    
    // 路径装饰：小石子（使用预生成的）
    ctx.fillStyle = pathColors[1]
    if (this.pathDecorations) {
      this.pathDecorations.forEach(stone => {
        ctx.beginPath()
        ctx.arc(stone.x, stone.y, stone.size, 0, Math.PI * 2)
        ctx.fill()
      })
    }
    
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
  },

  drawTowers() {
    this.towers.forEach(tower => {
      // 如果正在拖动这个塔（从场上拖动），用半透明显示原位置
      if (this.isDragging && !this.draggingFromInventory && 
          this.draggingTowerId === tower.id && this.hasMoved) {
        this.drawSingleTower(this.ctx, tower.x, tower.y, tower.type, tower.level, 0.3)
      } else {
        this.drawSingleTower(this.ctx, tower.x, tower.y, tower.type, tower.level)
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

  drawMonsters() {
    this.monsters.forEach(monster => {
      const ctx = this.ctx
      const config = MONSTER_TYPES[monster.type]
      const size = monster.isBoss ? 22 : 14
      
      // 阴影
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.beginPath()
      ctx.ellipse(monster.x, monster.y + size + 4, size * 0.8, size * 0.3, 0, 0, Math.PI * 2)
      ctx.fill()
      
      // 状态光环
      if (monster.slowTimer > 0) {
        ctx.save()
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)'
        ctx.lineWidth = 3
        ctx.shadowBlur = 15
        ctx.shadowColor = '#00ccff'
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
        ctx.shadowBlur = 10
        ctx.shadowColor = '#44ff44'
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

  // 绘制燃烧效果 - 更逼真的火焰
  drawBurningEffect(ctx, monster, size) {
    ctx.save()
    
    const intensity = Math.min(1, monster.burnTimer / 120) // 燃烧强度
    const time = Date.now()
    const flameCount = monster.isBoss ? 10 : 6
    
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
    const bounce = Math.sin(monster.animFrame * 0.5) * 2
    
    switch (monster.type) {
      case 'slime':
        // 史莱姆 - 弹性球体
        ctx.fillStyle = config.bodyColor
        ctx.beginPath()
        ctx.ellipse(monster.x, monster.y + bounce, size, size - bounce * 0.3, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = config.outlineColor
        ctx.lineWidth = 2
        ctx.stroke()
        // 眼睛
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(monster.x - 4, monster.y - 3, 4, 0, Math.PI * 2)
        ctx.arc(monster.x + 4, monster.y - 3, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#000'
        ctx.beginPath()
        ctx.arc(monster.x - 3, monster.y - 3, 2, 0, Math.PI * 2)
        ctx.arc(monster.x + 5, monster.y - 3, 2, 0, Math.PI * 2)
        ctx.fill()
        // 高光
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.beginPath()
        ctx.ellipse(monster.x - 5, monster.y - 6, 3, 2, -0.5, 0, Math.PI * 2)
        ctx.fill()
        break
      
      case 'bat':
        // 蝙蝠 - 飞行的小怪
        const batY = monster.y + Math.sin(monster.animFrame * 0.6) * 4
        const wingFlap = Math.sin(monster.animFrame * 0.8) * 0.4
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
        ctx.globalAlpha = 0.7 + Math.sin(monster.animFrame * 0.3) * 0.2
        const ghostY = monster.y + Math.sin(monster.animFrame * 0.4) * 3
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
        // 眼睛
        ctx.fillStyle = config.eyeColor
        ctx.shadowBlur = 8
        ctx.shadowColor = config.eyeColor
        ctx.beginPath()
        ctx.arc(monster.x - 7, monster.y - dragonSize * 0.35, 4, 0, Math.PI * 2)
        ctx.arc(monster.x + 7, monster.y - dragonSize * 0.35, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        // 鼻孔喷火
        if (monster.animFrame % 2 === 0) {
          ctx.fillStyle = '#ff6600'
          ctx.beginPath()
          ctx.moveTo(monster.x - 3, monster.y - dragonSize * 0.1)
          ctx.lineTo(monster.x, monster.y + 5)
          ctx.lineTo(monster.x + 3, monster.y - dragonSize * 0.1)
          ctx.closePath()
          ctx.fill()
        }
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

  drawProjectiles() {
    this.projectiles.forEach(proj => {
      const ctx = this.ctx
      const lv = proj.towerLevel || 1
      
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
    this.fireEffects.forEach(f => {
      const ctx = this.ctx
      ctx.save()
      ctx.globalAlpha = f.alpha
      
      const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size)
      gradient.addColorStop(0, '#fff')
      gradient.addColorStop(0.3, '#ffaa00')
      gradient.addColorStop(0.7, '#ff4400')
      gradient.addColorStop(1, 'rgba(255, 68, 0, 0)')
      
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.restore()
    })
  },

  drawIceEffects() {
    this.iceEffects.forEach(i => {
      const ctx = this.ctx
      ctx.save()
      ctx.globalAlpha = i.alpha
      
      if (i.dist !== undefined) {
        // 扩散冰晶
        const x = i.x + Math.cos(i.angle) * i.dist
        const y = i.y + Math.sin(i.angle) * i.dist
        
        ctx.strokeStyle = '#aaeeff'
        ctx.lineWidth = 2
        ctx.beginPath()
        // 雪花形状
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
    })
  },

  drawPoisonEffects() {
    this.poisonEffects.forEach(p => {
      const ctx = this.ctx
      ctx.save()
      ctx.globalAlpha = p.alpha
      
      if (p.isVine) {
        // 藤蔓效果 - 绘制为弯曲的藤蔓
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
        
        // 藤蔓顶部的小叶子
        ctx.fillStyle = '#66ff66'
        ctx.beginPath()
        ctx.ellipse(p.x - 3, p.y - 2, 4, 2, -0.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(p.x + 3, p.y - 2, 4, 2, 0.5, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // 普通绿色雾气效果
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
        gradient.addColorStop(0, 'rgba(100, 255, 100, 0.8)')
        gradient.addColorStop(0.5, 'rgba(68, 200, 68, 0.5)')
        gradient.addColorStop(1, 'rgba(68, 255, 68, 0)')
        
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      
      ctx.restore()
    })
  },

  drawArcaneEffects() {
    this.arcaneEffects.forEach(a => {
      const ctx = this.ctx
      ctx.save()
      ctx.globalAlpha = a.alpha
      
      const x = a.x + Math.cos(a.angle) * a.dist
      const y = a.y + Math.sin(a.angle) * a.dist
      
      ctx.fillStyle = '#aa44ff'
      ctx.shadowBlur = 10
      ctx.shadowColor = '#aa44ff'
      ctx.beginPath()
      ctx.arc(x, y, a.size, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.restore()
    })
  },

  drawLightningEffects() {
    this.lightningEffects.forEach(l => {
      const ctx = this.ctx
      ctx.save()
      ctx.globalAlpha = l.alpha
      
      // 外发光
      ctx.strokeStyle = l.color
      ctx.lineWidth = l.width + 4
      ctx.shadowBlur = 25
      ctx.shadowColor = l.color
      ctx.lineCap = 'round'
      
      // 绘制锯齿状闪电
      ctx.beginPath()
      ctx.moveTo(l.x1, l.y1)
      
      const segments = 6
      const dx = (l.x2 - l.x1) / segments
      const dy = (l.y2 - l.y1) / segments
      
      for (let i = 1; i < segments; i++) {
        const x = l.x1 + dx * i + (Math.random() - 0.5) * 20
        const y = l.y1 + dy * i + (Math.random() - 0.5) * 20
        ctx.lineTo(x, y)
      }
      ctx.lineTo(l.x2, l.y2)
      ctx.stroke()
      
      // 内部亮线
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = l.width * 0.5
      ctx.shadowBlur = 0
      ctx.stroke()
      
      ctx.restore()
    })
  },

  drawMergeEffects() {
    this.mergeEffects.forEach(m => {
      const ctx = this.ctx
      ctx.save()
      ctx.globalAlpha = m.alpha
      
      // 扩散圆环
      ctx.strokeStyle = m.color
      ctx.lineWidth = 4
      ctx.shadowBlur = 20
      ctx.shadowColor = m.color
      ctx.beginPath()
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2)
      ctx.stroke()
      
      // 内圈
      ctx.strokeStyle = '#ffd700'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(m.x, m.y, m.radius * 0.7, 0, Math.PI * 2)
      ctx.stroke()
      
      ctx.restore()
    })
  },

  drawParticles() {
    this.particles.forEach(p => {
      const ctx = this.ctx
      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = p.color
      ctx.shadowBlur = 5
      ctx.shadowColor = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })
  },

  drawFloatingTexts() {
    this.floatingTexts.forEach(t => {
      const ctx = this.ctx
      ctx.save()
      ctx.globalAlpha = t.alpha
      ctx.fillStyle = t.color
      ctx.font = `${t.isBold ? 'bold ' : ''}${14 * (t.scale || 1)}px Arial`
      ctx.textAlign = 'center'
      ctx.shadowBlur = 8
      ctx.shadowColor = t.color
      ctx.fillText(t.text, t.x, t.y)
      ctx.restore()
    })
  },

  isOnPath(row, col) {
    const offsetX = this.data.gridOffsetX
    const offsetY = this.data.gridOffsetY
    const cellCenterX = offsetX + col * CONFIG.cellSize + CONFIG.cellSize / 2
    const cellCenterY = offsetY + row * CONFIG.cellSize + CONFIG.cellSize / 2
    
    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      const dist = this.pointToSegmentDist(
        cellCenterX, cellCenterY,
        this.pathPoints[i].x, this.pathPoints[i].y,
        this.pathPoints[i + 1].x, this.pathPoints[i + 1].y
      )
      if (dist < 28) return true
    }
    return false
  },

  // 检查是否是有效的塔位
  isTowerSlot(row, col) {
    const theme = MAP_THEMES[this.data.currentTheme] || MAP_THEMES.forest
    return theme.towerSlots.some(slot => slot.row === row && slot.col === col)
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
  summonTower() {
    if (this.data.gold < this.data.summonCost) {
      wx.showToast({ title: '金币不足!', icon: 'none' })
      return
    }
    
    if (this.inventory.length >= INVENTORY_COLS * INVENTORY_ROWS) {
      wx.showToast({ title: '仓库已满!', icon: 'none' })
      return
    }
    
    const types = Object.keys(TOWER_TYPES)
    const type = types[Math.floor(Math.random() * types.length)]
    this.inventory.push(this.createTowerData(type))
    
    this.setData({ gold: this.data.gold - this.data.summonCost })
    this.updateInventoryDisplay()
    
    wx.showToast({ title: `获得 ${TOWER_TYPES[type].name}!`, icon: 'none' })
  },

  // 从仓库开始拖动
  onInventoryTouchStart(e) {
    if (this.data.gameState !== 'playing') return
    
    const index = e.currentTarget.dataset.index
    if (index === undefined || index >= this.inventory.length) return
    
    const touch = e.touches[0]
    const tower = this.inventory[index]
    const startClientX = touch.clientX
    const startClientY = touch.clientY
    
    // 同步获取 canvasRect 和 inventoryRect（使用回调确保获取后再设置拖动状态）
    wx.createSelectorQuery().selectAll('#gameCanvas, .inventory-grid').boundingClientRect((rects) => {
      if (rects && rects[0]) {
        this.cachedCanvasRect = rects[0]
        this.setData({ canvasRect: rects[0] })
      }
      if (rects && rects[1]) {
        this.inventoryRect = rects[1]
      }
      
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
        dragFloatingEmoji: TOWER_TYPES[tower.type].emoji,
        dragFloatingColor: TOWER_TYPES[tower.type].color,
        dragFloatingLevel: tower.level,
        dragFloatingType: tower.type
      })
    }).exec()
  },

  // 从场上塔开始拖动
  onCanvasTouchStart(e) {
    if (this.data.gameState !== 'playing') return
    
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
    // 注意：需要将 CSS 像素坐标换算为 canvas 逻辑坐标
    if (this.cachedCanvasRect) {
      const cssX = touch.clientX - this.cachedCanvasRect.left
      const cssY = touch.clientY - this.cachedCanvasRect.top
      // CSS 坐标 -> canvas 逻辑坐标（CONFIG.canvasWidth/Height 可能与 CSS 尺寸不同）
      const scaleX = CONFIG.canvasWidth / this.cachedCanvasRect.width
      const scaleY = CONFIG.canvasHeight / this.cachedCanvasRect.height
      this.dragX = cssX * scaleX
      this.dragY = cssY * scaleY
    }
    
    // 更新浮层位置（始终跟随手指，不受 canvas 坐标系影响）
    this.setData({
      dragFloating: true,
      dragFloatingX: touch.clientX,
      dragFloatingY: touch.clientY
    })
    
    // 检查合成目标
    this.checkMergeTarget(touch)
  },

  // 检查合成目标
  checkMergeTarget(touch) {
    this.mergeTarget = null
    this.mergeTargetInventoryIndex = -1
    this.mergeTargetType = null
    
    // 检查场上的塔（合成目标）- 不能和自己合成
    for (const tower of this.towers) {
      // 如果是从场上拖动的塔，跳过自己
      if (!this.draggingFromInventory && tower.id === this.draggingTower.id) continue
      
      const dx = this.dragX - tower.x
      const dy = this.dragY - tower.y
      if (Math.sqrt(dx * dx + dy * dy) < 35) {
        if (tower.type === this.draggingTower.type && 
            tower.level === this.draggingTower.level && 
            tower.level < 5) {
          this.mergeTarget = tower
          this.mergeTargetType = 'tower'
          break
        }
      }
    }
    
    // 检查仓库内其他塔（合成目标）- 无论从哪里拖动都检查
    if (!this.mergeTarget) {
      const targetIndex = this.getInventorySlotIndex(touch.clientX, touch.clientY)
      if (targetIndex !== null && 
          targetIndex !== this.draggingInventoryIndex && 
          targetIndex < this.inventory.length) {
        const targetTower = this.inventory[targetIndex]
        if (targetTower && 
            targetTower.type === this.draggingTower.type && 
            targetTower.level === this.draggingTower.level && 
            targetTower.level < 5) {
          this.mergeTargetInventoryIndex = targetIndex
          this.mergeTarget = targetTower
          this.mergeTargetType = 'inventory'
        }
      }
    }
    
    this.setData({ 
      showMergeHint: !!this.mergeTarget,
      mergeTargetSlotIndex: this.mergeTargetInventoryIndex
    })
  },

  // 获取仓库格子索引
  getInventorySlotIndex(clientX, clientY) {
    // 使用缓存的仓库位置，如果没有则尝试获取
    if (!this.inventoryRect) {
      wx.createSelectorQuery().select('.inventory-grid').boundingClientRect((rect) => {
        if (rect) this.inventoryRect = rect
      }).exec()
      return null  // 第一次调用时返回null，等待获取
    }
    
    const rect = this.inventoryRect
    const relX = clientX - rect.left
    const relY = clientY - rect.top
    
    if (relX < 0 || relY < 0 || relX > rect.width || relY > rect.height) {
      return null
    }
    
    // 根据 wxss 样式计算：slot 100rpx = 50px@375, gap 6rpx = 3px@375
    const windowWidth = wx.getWindowInfo().windowWidth
    const scale = windowWidth / 375
    const slotSize = 50 * scale  // 100rpx
    const gap = 3 * scale        // 6rpx
    
    const col = Math.floor(relX / (slotSize + gap))
    const row = Math.floor(relY / (slotSize + gap))
    
    if (col < 0 || col >= INVENTORY_COLS || row < 0 || row >= INVENTORY_ROWS) {
      return null
    }
    
    return row * INVENTORY_COLS + col
  },

  onTouchEnd(e) {
    this.handleTouchEnd(e)
  },

  // 统一处理触摸结束
  handleTouchEnd(e) {
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
    
    const offsetX = this.data.gridOffsetX
    const offsetY = this.data.gridOffsetY
    
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
    
    if (tower2.level >= 5) {
      wx.showToast({ title: '已达最高等级!', icon: 'none' })
      return
    }
    
    const config = TOWER_TYPES[tower1.type]
    
    // 升级tower2
    tower2.level++
    tower2.damage = Math.floor(config.baseDamage * Math.pow(1.8, tower2.level - 1))
    tower2.range = config.baseRange + (tower2.level - 1) * 12
    tower2.attackSpeed = Math.max(300, config.baseAttackSpeed - (tower2.level - 1) * 100)
    
    // 移除tower1（注意：如果fromIndex > toIndex，删除后toIndex不变；否则toIndex要-1）
    if (fromIndex > toIndex) {
      this.inventory.splice(fromIndex, 1)
    } else {
      this.inventory.splice(fromIndex, 1)
    }
    
    this.updateInventoryDisplay()
    
    this.setData({ score: this.data.score + 300 * tower2.level })
    
    // 震动反馈
    wx.vibrateShort({ type: 'medium' }).catch(() => {})
    
    wx.showToast({ title: `合成成功! Lv.${tower2.level}`, icon: 'none' })
  },

  // 场上塔合成到仓库塔
  mergeFieldToInventory(towerId, inventoryIndex) {
    const fieldTower = this.towers.find(t => t.id === towerId)
    const invTower = this.inventory[inventoryIndex]
    
    if (!fieldTower || !invTower) return
    
    if (invTower.level >= 5) {
      wx.showToast({ title: '已达最高等级!', icon: 'none' })
      return
    }
    
    const config = TOWER_TYPES[invTower.type]
    
    // 升级仓库塔
    invTower.level++
    invTower.damage = Math.floor(config.baseDamage * Math.pow(1.8, invTower.level - 1))
    invTower.range = config.baseRange + (invTower.level - 1) * 12
    invTower.attackSpeed = Math.max(300, config.baseAttackSpeed - (invTower.level - 1) * 100)
    
    // 移除场上塔
    const towerIndex = this.towers.indexOf(fieldTower)
    if (towerIndex !== -1) {
      this.towers.splice(towerIndex, 1)
    }
    // 清除格子
    if (fieldTower.row !== undefined && fieldTower.col !== undefined) {
      this.grid[fieldTower.row][fieldTower.col] = null
    }
    
    this.updateInventoryDisplay()
    this.createParticles(this.dragX, this.dragY, config.color, 15)
    
    this.setData({ score: this.data.score + 300 * invTower.level })
    
    wx.vibrateShort({ type: 'medium' }).catch(() => {})
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
    this.setData({ 
      showMergeHint: false, 
      draggingSlotIndex: -1,
      mergeTargetSlotIndex: -1,
      dragFloating: false
    })
  },

  placeTowerFromInventory(row, col) {
    const towerData = this.inventory[this.draggingInventoryIndex]
    const config = TOWER_TYPES[towerData.type]
    
    const placedTower = {
      ...towerData,
      row, col,
      x: this.data.gridOffsetX + col * CONFIG.cellSize + CONFIG.cellSize / 2,
      y: this.data.gridOffsetY + row * CONFIG.cellSize + CONFIG.cellSize / 2,
      lastAttack: 0
    }
    
    this.towers.push(placedTower)
    this.grid[row][col] = placedTower
    
    // 从仓库移除
    this.inventory.splice(this.draggingInventoryIndex, 1)
    this.updateInventoryDisplay()
    
    this.createParticles(placedTower.x, placedTower.y, config.color, 15)
    
    // 放置音效提示
    wx.showToast({ title: '放置成功!', icon: 'none', duration: 800 })
  },

  mergeTowers(tower1, tower2) {
    // tower2 是场上的目标塔（需要找到实际对象）
    const actualTarget = this.towers.find(t => t.id === tower2.id)
    if (!actualTarget) return
    
    if (actualTarget.level >= 5) {
      wx.showToast({ title: '已达最高等级!', icon: 'none' })
      return
    }
    
    const config = TOWER_TYPES[tower1.type]
    
    // 升级目标塔
    actualTarget.level++
    actualTarget.damage = Math.floor(config.baseDamage * Math.pow(1.5, actualTarget.level - 1))
    actualTarget.range = config.baseRange + (actualTarget.level - 1) * 8
    actualTarget.attackSpeed = Math.max(400, config.baseAttackSpeed - (actualTarget.level - 1) * 80)
    
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
    }
    
    // 合成特效
    this.createMergeEffect(actualTarget.x, actualTarget.y, config.color)
    this.createParticles(actualTarget.x, actualTarget.y, config.color, 15)
    this.createParticles(actualTarget.x, actualTarget.y, '#ffd700', 10)
    
    this.setData({ score: this.data.score + 300 * actualTarget.level })
    
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
    
    wx.showToast({ title: `合成成功! Lv.${actualTarget.level}`, icon: 'none' })
  },

  nextWave() {
    const newWave = this.data.wave + 1
    const waveBonus = 30 + newWave * 15
    
    this.setData({ 
      gold: this.data.gold + waveBonus,
      score: this.data.score + waveBonus * 5
    })
    
    this.floatingTexts.push({
      x: CONFIG.canvasWidth / 2,
      y: CONFIG.canvasHeight / 2 - 30,
      text: `🎉 第${this.data.wave}波完成!`,
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
    
    // 每10波切换地形
    if (newWave % 10 === 1 && newWave > 1) {
      const themes = Object.keys(MAP_THEMES)
      const currentIndex = themes.indexOf(this.data.currentTheme)
      const nextTheme = themes[(currentIndex + 1) % themes.length]
      
      // 显示地形切换提示
      setTimeout(() => {
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
        
        // 切换地形（保留塔的位置）
        this.changeTheme(nextTheme)
      }, 1500)
    }
    
    setTimeout(() => {
      this.setData({ wave: newWave })
      this.generateWave(newWave)
    }, 3500)
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
    
    // 更新主题
    this.setData({ currentTheme: themeKey })
    
    // 重新生成路径和装饰
    this.generatePath(themeKey)
    
    // 重新放置塔（检查新位置是否是有效塔位）
    this.towers = []
    savedTowers.forEach(t => {
      // 检查是否在新主题的塔位上
      const isValidSlot = theme.towerSlots.some(slot => slot.row === t.relRow && slot.col === t.relCol)
      
      if (isValidSlot) {
        const newTower = {
          ...t,
          row: t.relRow,
          col: t.relCol,
          x: this.data.gridOffsetX + t.relCol * CONFIG.cellSize + CONFIG.cellSize / 2,
          y: this.data.gridOffsetY + t.relRow * CONFIG.cellSize + CONFIG.cellSize / 2
        }
        this.towers.push(newTower)
        this.grid[t.relRow][t.relCol] = newTower
      } else {
        // 塔位置无效，退回仓库
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
      }
    })
    
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
  },

  gameOver() {
    this.stopGame()
    
    const highScore = wx.getStorageSync('highScore') || 0
    const maxWave = wx.getStorageSync('maxWave') || 1
    const isNewRecord = this.data.score > highScore
    
    if (isNewRecord) wx.setStorageSync('highScore', this.data.score)
    if (this.data.wave > maxWave) wx.setStorageSync('maxWave', this.data.wave)
    
    this.setData({ gameState: 'gameover', isNewRecord })
  },

  togglePause() {
    this.setData({ gameState: 'paused' })
  },

  resumeGame() {
    this.setData({ gameState: 'playing' })
  },

  restartGame() {
    this.initGame()
    this.startGame()
  },

  backToMenu() {
    this.stopGame()
    wx.navigateBack()
  }
})
