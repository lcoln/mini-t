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
  gridRows: 12,
  cellSize: 32,
  spawnInterval: 1800
}

const PERFORMANCE_LIMITS = {
  particles: 110,
  floatingTexts: 26,
  lightningEffects: 70,
  fireEffects: 90,
  iceEffects: 60,
  poisonEffects: 70,
  arcaneEffects: 70,
  mergeEffects: 24,
  trailPoints: 5
}

const DRAG_UI_INTERVAL = 32
const IDLE_RENDER_INTERVAL = 120
const MIN_SUMMON_COST = 10
const DRAG_START_THRESHOLD = 10
const FIELD_DRAG_PICK_RADIUS = 28
const FIELD_MERGE_RADIUS = 58
const TOWER_SLOT_SNAP_RADIUS = 34
const INVENTORY_HIT_TOLERANCE = 8
const INVENTORY_MERGE_RADIUS = 22
const INVENTORY_MERGE_COMMIT_RADIUS = 12
const INVENTORY_MERGE_CORE_RATIO = 0.24
// Boss 不再额外抬场景压力：出场不应切换 busy/intense，避免草地/弹道/特效被精简
const BOSS_PRESSURE_BONUS = 0
const BOSS_PROFILE_GRACE_MS = 520
const PERFORMANCE_PROFILE_INTERVALS = {
  relaxed: 180,
  elevated: 80
}
const PERFORMANCE_PROFILE_HYSTERESIS = {
  // 怪一多早点进 busy：只砍弹道/特效频率，不砍地图与外形
  busyEnter: 40,
  busyExit: 28,
  intenseEnter: 88,
  intenseExit: 64,
  // 保留字段兼容旧逻辑，但数值对齐普通档位，Boss 不再单独降画质
  bossBusyFloor: 52,
  bossIntenseEnter: 94,
  bossIntenseExit: 72
}

const AUDIO_SETTING_KEY = 'miniTSoundEnabled'
const RUN_PROGRESS_KEY = 'miniTRunProgress'
const RUN_PROGRESS_VERSION = 1
const RUN_PROGRESS_INTERVAL = 1500
const COMMANDER_COST = 3
const COMMANDER_MARK_DURATION = 5600
const COMMANDER_MARK_RADIUS = 76
const COMMANDER_PULSE_INTERVAL = 420
const COMMANDER_PULSE_DAMAGE = 12
const COMMANDER_ZONE_DAMAGE_BONUS = 0.45
const COMMANDER_ZONE_ATTACK_SPEED_FACTOR = 0.72
const SOUND_ASSETS = {
  ui: '/assets/audio/ui-tap.wav',
  blessing: '/assets/audio/blessing.wav',
  summon: '/assets/audio/summon.wav',
  place: '/assets/audio/place.wav',
  merge: '/assets/audio/merge.wav',
  reward: '/assets/audio/reward.wav',
  wave: '/assets/audio/wave-start.wav',
  boss: '/assets/audio/boss-spawn.wav',
  chainReady: '/assets/audio/chain-ready.wav',
  specialize: '/assets/audio/specialize.wav',
  commander: '/assets/audio/commander.wav',
  fireAttack: '/assets/audio/fire-shot.wav',
  fireAttackAlt: '/assets/audio/fire-shot-alt.wav',
  iceAttack: '/assets/audio/ice-shot.wav',
  iceAttackAlt: '/assets/audio/ice-shot-alt.wav',
  natureAttack: '/assets/audio/nature-shot.wav',
  natureAttackAlt: '/assets/audio/nature-shot-alt.wav',
  arcaneAttack: '/assets/audio/arcane-shot.wav',
  arcaneAttackAlt: '/assets/audio/arcane-shot-alt.wav',
  lightningAttack: '/assets/audio/lightning-shot.wav',
  lightningAttackAlt: '/assets/audio/lightning-shot-alt.wav',
  forestAmbience: '/assets/audio/forest-ambience.wav',
  desertAmbience: '/assets/audio/desert-ambience.wav',
  iceAmbience: '/assets/audio/ice-ambience.wav',
  volcanoAmbience: '/assets/audio/volcano-ambience.wav',
  gameover: '/assets/audio/game-over.wav'
}
const SOUND_POOL_SIZES = {
  ui: 2,
  blessing: 2,
  summon: 2,
  place: 2,
  merge: 2,
  reward: 2,
  wave: 2,
  boss: 1,
  chainReady: 1,
  specialize: 1,
  commander: 1,
  fireAttack: 3,
  fireAttackAlt: 3,
  iceAttack: 3,
  iceAttackAlt: 3,
  natureAttack: 3,
  natureAttackAlt: 3,
  arcaneAttack: 3,
  arcaneAttackAlt: 3,
  lightningAttack: 2,
  lightningAttackAlt: 2,
  gameover: 1
}
const SOUND_VOLUMES = {
  ui: 0.34,
  blessing: 0.55,
  summon: 0.45,
  place: 0.42,
  merge: 0.62,
  reward: 0.48,
  wave: 0.56,
  boss: 0.68,
  chainReady: 0.62,
  specialize: 0.66,
  commander: 0.58,
  fireAttack: 0.2,
  fireAttackAlt: 0.18,
  iceAttack: 0.18,
  iceAttackAlt: 0.18,
  natureAttack: 0.19,
  natureAttackAlt: 0.18,
  arcaneAttack: 0.22,
  arcaneAttackAlt: 0.22,
  lightningAttack: 0.22,
  lightningAttackAlt: 0.22,
  forestAmbience: 0.16,
  desertAmbience: 0.14,
  iceAmbience: 0.14,
  volcanoAmbience: 0.17,
  gameover: 0.62
}
const SOUND_COOLDOWNS = {
  fireAttack: 82,
  fireAttackAlt: 82,
  iceAttack: 96,
  iceAttackAlt: 96,
  natureAttack: 92,
  natureAttackAlt: 92,
  arcaneAttack: 110,
  arcaneAttackAlt: 110,
  lightningAttack: 110,
  lightningAttackAlt: 110,
  merge: 140,
  chainReady: 420,
  specialize: 400,
  commander: 260,
  boss: 420,
  gameover: 800
}
const AMBIENT_TRACKS = {
  forest: 'forestAmbience',
  desert: 'desertAmbience',
  ice: 'iceAmbience',
  volcano: 'volcanoAmbience'
}
const TOWER_ATTACK_SOUNDS = {
  fire: { keys: ['fireAttack', 'fireAttackAlt'], cooldownKey: 'fireAttack', levelBoost: 0.018 },
  ice: { keys: ['iceAttack', 'iceAttackAlt'], cooldownKey: 'iceAttack', levelBoost: 0.016 },
  nature: { keys: ['natureAttack', 'natureAttackAlt'], cooldownKey: 'natureAttack', levelBoost: 0.014 },
  arcane: { keys: ['arcaneAttack', 'arcaneAttackAlt'], cooldownKey: 'arcaneAttack', levelBoost: 0.02 },
  lightning: { keys: ['lightningAttack', 'lightningAttackAlt'], cooldownKey: 'lightningAttack', levelBoost: 0.018 }
}

// 压力升高时：降帧 + 精简弹道/特效；地图装饰与怪/塔外形始终保留（不压成圆点、不抽稀草地）
const PERFORMANCE_PROFILES = {
  relaxed: {
    renderInterval: 16,
    simplifyTowers: false,
    simplifyMonsters: false,
    simplifyBosses: false,
    simplifyProjectiles: false,
    skipDecorations: false,
    decorStride: 1,
    animatedDecorations: true,
    effectRenderStride: 1,
    projectileTrailPoints: 5,
    damageTextStride: 1,
    compactBossHp: false,
    bossDamageTextCooldown: 0
  },
  busy: {
    renderInterval: 30,
    simplifyTowers: false,
    simplifyMonsters: false,
    simplifyBosses: false,
    simplifyProjectiles: true,
    skipDecorations: false,
    decorStride: 1,
    animatedDecorations: false,
    effectRenderStride: 2,
    projectileTrailPoints: 2,
    damageTextStride: 2,
    compactBossHp: false,
    bossDamageTextCooldown: 60
  },
  intense: {
    renderInterval: 42,
    simplifyTowers: false,
    simplifyMonsters: false,
    simplifyBosses: false,
    simplifyProjectiles: true,
    skipDecorations: false,
    decorStride: 1,
    animatedDecorations: false,
    effectRenderStride: 3,
    projectileTrailPoints: 1,
    damageTextStride: 3,
    compactBossHp: true,
    bossDamageTextCooldown: 100
  }
}

// 塔最高等级（合并/升级上限）
const MAX_TOWER_LEVEL = 10

// 塔升级金币消耗公式：base + perLevelSq × level²
const TOWER_UPGRADE_GOLD_BASE = 15
const TOWER_UPGRADE_GOLD_PER_LEVEL_SQ = 5

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

const BLESSINGS = {
  ember: {
    key: 'ember',
    icon: '🔥',
    name: '烈焰纹章',
    subtitle: '高爆发开局',
    description: '额外获得 1 座火焰塔，所有火焰塔伤害 +2，开局金币 +20。',
    towerType: 'fire',
    extraTowerType: 'fire',
    damageBonus: 2,
    bonusGold: 20,
    color: '#ff8a3d'
  },
  storm: {
    key: 'storm',
    icon: '⚡',
    name: '风暴线圈',
    subtitle: '快节奏清场',
    description: '额外获得 1 座闪电塔，所有闪电塔攻速提升，开局金币 +15。',
    towerType: 'lightning',
    extraTowerType: 'lightning',
    attackSpeedBonus: 180,
    bonusGold: 15,
    color: '#ffe066'
  },
  grove: {
    key: 'grove',
    icon: '🌿',
    name: '森灵古种',
    subtitle: '稳健续航开局',
    description: '额外获得 1 座自然塔，所有自然塔射程 +12，生命 +4。',
    towerType: 'nature',
    extraTowerType: 'nature',
    rangeBonus: 12,
    bonusLives: 4,
    color: '#69f0ae'
  }
}

const SUPPLY_REWARDS = {
  forge: {
    key: 'forge',
    icon: '🔧',
    title: '火力铸造',
    description: '全塔伤害 +1，本局持续生效。',
    type: 'damage',
    amount: 1
  },
  overclock: {
    key: 'overclock',
    icon: '⚙️',
    title: '超频线圈',
    description: '全塔攻速提升，攻击间隔 -90ms。',
    type: 'attackSpeed',
    amount: 90
  },
  radar: {
    key: 'radar',
    icon: '📡',
    title: '追猎雷达',
    description: '全塔射程 +8，补足压线能力。',
    type: 'range',
    amount: 8
  },
  cache: {
    key: 'cache',
    icon: '💰',
    title: '金币补给',
    description: '立刻获得 80 金币，快速补经济。',
    type: 'gold',
    amount: 80
  },
  repair: {
    key: 'repair',
    icon: '❤️',
    title: '紧急修复',
    description: '立刻恢复 3 点生命。',
    type: 'lives',
    amount: 3
  },
  airdrop: {
    key: 'airdrop',
    icon: '📦',
    title: '元素空投',
    description: '获得 1 座与当前祝福同流派的塔。',
    type: 'tower'
  },
  discount: {
    key: 'discount',
    icon: '🛒',
    title: '招募折扣',
    description: '召唤价格 -2，最低 8 金币。',
    type: 'summonCost',
    amount: 2
  }
}

const SUPPLY_SYNERGY = {
  ember: 'forge',
  storm: 'overclock',
  grove: 'radar'
}

const THREAT_CHAIN_RULES = {
  blitz: {
    key: 'blitz',
    icon: '⚡',
    title: '闪电突袭',
    description: '敌人又快又脆，适合高攻速点杀流。',
    detail: '数量 -28% · 速度 +30% · 血量 ×0.75 · 金币 +15%',
    countMultiplier: 0.72,
    speedMultiplier: 1.30,
    hpMultiplier: 0.75,
    goldMultiplier: 1.15
  },
  greed: {
    key: 'greed',
    icon: '💎',
    title: '黄金潮汐',
    description: '海量弱怪涌来，守住了就是一波肥。',
    detail: '数量 +42% · 精英 +1 · 金币 +50% · 战术点 +1/精英',
    countMultiplier: 1.42,
    goldMultiplier: 1.50,
    extraEliteCount: 1,
    eliteRewardPoints: 1
  },
  fortress: {
    key: 'fortress',
    icon: '🛡️',
    title: '钢铁堡垒',
    description: '重甲慢速强敌，打穿一个就回本。',
    detail: '血量 ×1.85 · 速度 -25% · 金币 +40% · 精英 +2 · 精英血量 ×1.5',
    hpMultiplier: 1.85,
    speedMultiplier: 0.75,
    goldMultiplier: 1.40,
    extraEliteCount: 2,
    eliteHpMultiplier: 1.5
  }
}

const SPECIALIZATION_OPTIONS = {
  fire: [
    {
      key: 'inferno',
      icon: '🔥',
      title: '炼狱焦芯',
      description: '灼烧更久更痛，对精英/Boss 灼烧+60%，专烧硬骨头。',
      shortName: '炼狱',
      burnDurationBonus: 150,
      burnDamageMultiplier: 1.85,
      damageBonus: 5
    },
    {
      key: 'volatile',
      icon: '💥',
      title: '爆燃弹芯',
      description: '命中大范围溅射，攻速更快，专清虫潮。',
      shortName: '爆燃',
      splashRadius: 62,
      splashRatio: 0.75,
      rangeBonus: 2,
      attackSpeedBonus: -50
    }
  ],
  ice: [
    {
      key: 'frostlock',
      icon: '🧊',
      title: '霜锁线圈',
      description: '连续命中后可短暂冻结目标。',
      shortName: '霜锁',
      freezeHits: 3,
      freezeDuration: 34,
      rangeBonus: 8
    },
    {
      key: 'shatter',
      icon: '💠',
      title: '碎晶协议',
      description: '对减速目标造成更高伤害。',
      shortName: '碎晶',
      shatterMultiplier: 1.38,
      damageBonus: 2,
      attackSpeedBonus: 40
    }
  ],
  nature: [
    {
      key: 'overgrowth',
      icon: '🌱',
      title: '荆棘蔓延',
      description: '藤蔓缠绕时间延长，易伤效果增强。',
      shortName: '荆棘',
      vineDurationBonus: 40,
      vineVulnerabilityBonus: 0.12,
      rangeBonus: 5
    },
    {
      key: 'toxic',
      icon: '☠️',
      title: '毒沼之种',
      description: '命中附带持续毒素伤害。',
      shortName: '毒沼',
      poisonPerSec: 5,
      poisonDuration: 42,
      damageBonus: 2,
      attackSpeedBonus: 30
    }
  ],
  arcane: [
    {
      key: 'astral',
      icon: '⭐',
      title: '星空棱镜',
      description: '穿透数量增加，射程更远。',
      shortName: '星空',
      piercingExtra: 2,
      rangeBonus: 12,
      damageBonus: 3
    },
    {
      key: 'converge',
      icon: '🌀',
      title: '聚力法阵',
      description: '单目标伤害大幅提升，穿透能力减弱。',
      shortName: '聚力',
      damageBonus: 10,
      attackSpeedBonus: -60,
      piercingExtra: -1
    }
  ],
  lightning: [
    {
      key: 'stormchain',
      icon: '⛓️',
      title: '雷霆锁链',
      description: '连锁数量增加，连锁伤害提高。',
      shortName: '雷霆',
      chainExtraTargets: 2,
      chainDamageBonus: 0.15,
      damageBonus: 4
    },
    {
      key: 'overcharge',
      icon: '🔋',
      title: '电涌核心',
      description: '攻击频率更高，电弧更快。',
      shortName: '电涌',
      attackSpeedBonus: -120,
      damageBonus: 1,
      rangeBonus: 3
    }
  ]
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
  wraith: {
    name: '幽影',
    emoji: '👤',
    bodyColor: '#6644aa',
    outlineColor: '#332266',
    eyeColor: '#ff66ff',
    baseHp: 90,
    speed: 1.7,
    goldDrop: 20,
    shape: 'wraith',
    unlockWave: 12,
    evasionChance: 0.3
  },
  troll: {
    name: '巨魔',
    emoji: '🧌',
    bodyColor: '#556644',
    outlineColor: '#334422',
    eyeColor: '#ffaa00',
    baseHp: 600,
    speed: 0.7,
    goldDrop: 45,
    shape: 'troll',
    unlockWave: 15,
    regenPerSec: 14
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
  },
  treant: {
    name: '树人王',
    emoji: '🌳',
    bodyColor: '#3a6622',
    outlineColor: '#1a4400',
    eyeColor: '#ffff00',
    baseHp: 1000,
    speed: 0.35,
    goldDrop: 120,
    isBoss: true,
    shape: 'treant',
    unlockWave: 10
  },
  lich: {
    name: '巫妖',
    emoji: '💀',
    bodyColor: '#5522aa',
    outlineColor: '#330066',
    eyeColor: '#00ffff',
    baseHp: 900,
    speed: 0.55,
    goldDrop: 130,
    isBoss: true,
    shape: 'lich',
    unlockWave: 15
  },
  phoenix: {
    name: '凤凰',
    emoji: '🔥',
    bodyColor: '#ff8800',
    outlineColor: '#cc4400',
    eyeColor: '#ffffff',
    baseHp: 750,
    speed: 0.7,
    goldDrop: 140,
    isBoss: true,
    shape: 'phoenix',
    unlockWave: 20
  }
}

// 底部格子配置
const INVENTORY_COLS = 5
const INVENTORY_ROWS = 4

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
      {row: 1, col: 1}, {row: 1, col: 4}, {row: 1, col: 7}, {row: 1, col: 10},
      {row: 2, col: 2}, {row: 2, col: 9},
      {row: 4, col: 0}, {row: 4, col: 5}, {row: 4, col: 10},
      {row: 6, col: 2}, {row: 6, col: 7},
      {row: 8, col: 0}, {row: 8, col: 4}, {row: 8, col: 10},
      {row: 9, col: 6},
      {row: 10, col: 7}, {row: 10, col: 9}, {row: 10, col: 10}, {row: 11, col: 8}
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
      {row: 1, col: 2}, {row: 1, col: 4}, {row: 1, col: 6}, {row: 1, col: 8}, {row: 1, col: 10},
      {row: 3, col: 0}, {row: 3, col: 6},
      {row: 5, col: 2}, {row: 5, col: 8},
      {row: 6, col: 0}, {row: 6, col: 4}, {row: 6, col: 10},
      {row: 7, col: 2}, {row: 7, col: 8},
      {row: 8, col: 5},
      {row: 10, col: 7}, {row: 10, col: 9}, {row: 11, col: 8}
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
      {row: 1, col: 1}, {row: 1, col: 3}, {row: 1, col: 6}, {row: 1, col: 9},
      {row: 3, col: 1}, {row: 3, col: 7},
      {row: 4, col: 0}, {row: 4, col: 5}, {row: 4, col: 10},
      {row: 6, col: 3}, {row: 6, col: 9},
      {row: 7, col: 1}, {row: 7, col: 7},
      {row: 8, col: 0}, {row: 8, col: 5}, {row: 8, col: 10},
      {row: 10, col: 5}, {row: 10, col: 7}, {row: 11, col: 6}
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
      {row: 1, col: 0}, {row: 1, col: 2}, {row: 1, col: 5}, {row: 1, col: 8}, {row: 1, col: 10},
      {row: 3, col: 3}, {row: 3, col: 7},
      {row: 4, col: 0}, {row: 4, col: 10},
      {row: 5, col: 5},
      {row: 6, col: 2}, {row: 6, col: 8},
      {row: 7, col: 0}, {row: 7, col: 6}, {row: 7, col: 10},
      {row: 8, col: 3}, {row: 8, col: 9},
      {row: 10, col: 6}, {row: 10, col: 8}, {row: 11, col: 7}
    ]
  }
}

module.exports = {
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
}
