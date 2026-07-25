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
  particles: 52,
  floatingTexts: 12,
  lightningEffects: 30,
  fireEffects: 34,
  iceEffects: 28,
  poisonEffects: 30,
  arcaneEffects: 30,
  mergeEffects: 12,
  trailPoints: 4
}

const DRAG_UI_INTERVAL = 32
const IDLE_RENDER_INTERVAL = 120
const MIN_SUMMON_COST = 10
const DRAG_START_THRESHOLD = 10
const FIELD_DRAG_PICK_RADIUS = 28
// 场上合成：需更贴近目标塔才吸附，避免路过旁边空位时误触发合并
const FIELD_MERGE_RADIUS = 42
const TOWER_SLOT_SNAP_RADIUS = 34
const INVENTORY_HIT_TOLERANCE = 16
// 仓库合并：略收紧，仍保留松手时稍宽的提交半径
const INVENTORY_MERGE_RADIUS = 40
const INVENTORY_MERGE_COMMIT_RADIUS = 52
const INVENTORY_MERGE_CORE_RATIO = 0.58
// Boss 不再额外抬场景压力：出场不应切换 busy/intense，避免草地/弹道/特效被精简
const BOSS_PRESSURE_BONUS = 0
const BOSS_PROFILE_GRACE_MS = 520
const PERFORMANCE_PROFILE_INTERVALS = {
  relaxed: 180,
  elevated: 80
}
const PERFORMANCE_PROFILE_HYSTERESIS = {
  // 不要在十来只怪时就骤降帧率；外形不变，优先削减特效。
  busyEnter: 52,
  busyExit: 38,
  intenseEnter: 115,
  intenseExit: 88,
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

// 压力升高时：降帧 + 精简弹道/特效；怪/塔外形始终完整绘制，避免战斗中突然切简化版
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
    renderInterval: 33,
    simplifyTowers: false,
    simplifyMonsters: false,
    simplifyBosses: false,
    simplifyProjectiles: true,
    skipDecorations: false,
    decorStride: 1,
    animatedDecorations: false,
    effectRenderStride: 4,
    projectileTrailPoints: 1,
    damageTextStride: 3,
    compactBossHp: false,
    bossDamageTextCooldown: 60
  },
  intense: {
    renderInterval: 50,
    simplifyTowers: false,
    simplifyMonsters: false,
    simplifyBosses: false,
    simplifyProjectiles: true,
    skipDecorations: false,
    decorStride: 1,
    animatedDecorations: false,
    effectRenderStride: 6,
    projectileTrailPoints: 1,
    damageTextStride: 5,
    compactBossHp: true,
    bossDamageTextCooldown: 100
  }
}

// 塔最高等级（合并/升级上限）
const MAX_TOWER_LEVEL = 10

// 塔升级金币消耗公式：base + perLevelSq × level²
const TOWER_UPGRADE_GOLD_BASE = 15
const TOWER_UPGRADE_GOLD_PER_LEVEL_SQ = 5

// 免疫细胞配置（内部 key 保持不变，避免影响战斗与存档）
const TOWER_TYPES = {
  fire: {
    id: 'fire',
    name: '胃壁细胞',
    color: '#ff4400',
    glowColor: 'rgba(255, 68, 0, 0.6)',
    emoji: '🔬',
    baseDamage: 5,
    baseRange: 70,
    baseAttackSpeed: 1200,
    description: '胞内小管泌酸：持续腐蚀坏菌3秒',
    projectileType: 'fireball'
  },
  ice: {
    id: 'ice',
    name: '嗜中性粒细胞',
    color: '#00ccff',
    glowColor: 'rgba(0, 204, 255, 0.6)',
    emoji: '⚪',
    baseDamage: 4,
    baseRange: 80,
    baseAttackSpeed: 1400,
    description: '颗粒吞噬：减速50%持续2秒',
    projectileType: 'iceball'
  },
  nature: {
    id: 'nature',
    name: '乳酸杆菌群',
    color: '#44ff44',
    glowColor: 'rgba(68, 255, 68, 0.6)',
    emoji: '🦠',
    baseDamage: 4,
    baseRange: 65,
    baseAttackSpeed: 1300,
    description: '短链定植：减速30%并使受伤加深25%',
    projectileType: 'vineball'
  },
  arcane: {
    id: 'arcane',
    name: '腺泡细胞',
    color: '#aa44ff',
    glowColor: 'rgba(170, 68, 255, 0.6)',
    emoji: '🧬',
    baseDamage: 8,
    baseRange: 90,
    baseAttackSpeed: 1600,
    description: '酶原释放：可穿透多个菌体',
    projectileType: 'arcaneball'
  },
  lightning: {
    id: 'lightning',
    name: '树突细胞',
    color: '#ffff00',
    glowColor: 'rgba(255, 255, 0, 0.6)',
    emoji: '⚡',
    baseDamage: 6,
    baseRange: 85,
    baseAttackSpeed: 1100,
    description: '抗原呈递：连锁攻击周围3个菌体',
    projectileType: 'lightning'
  }
}

const BLESSINGS = {
  ember: {
    key: 'ember',
    icon: '🧪',
    name: '高酸反应',
    subtitle: '强力酸蚀开局',
    description: '额外获得 1 个胃壁细胞，所有胃壁细胞伤害 +2，开局营养点 +20。',
    towerType: 'fire',
    extraTowerType: 'fire',
    damageBonus: 2,
    bonusGold: 20,
    color: '#ff8a3d'
  },
  storm: {
    key: 'storm',
    icon: '⚡',
    name: '免疫脉冲',
    subtitle: '快速清菌开局',
    description: '额外获得 1 个树突细胞，同类细胞攻速提升，开局营养点 +15。',
    towerType: 'lightning',
    extraTowerType: 'lightning',
    attackSpeedBonus: 180,
    bonusGold: 15,
    color: '#ffe066'
  },
  grove: {
    key: 'grove',
    icon: '🦠',
    name: '乳酸杆菌定植',
    subtitle: '稳健屏障开局',
    description: '额外获得 1 个乳酸杆菌群，同类菌群射程 +12，健康度 +4。',
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
    title: '免疫强化',
    description: '全体免疫细胞伤害 +1，本局持续生效。',
    type: 'damage',
    amount: 1
  },
  overclock: {
    key: 'overclock',
    icon: '⚙️',
    title: '反应加速',
    description: '全体免疫细胞反应加快，攻击间隔 -90ms。',
    type: 'attackSpeed',
    amount: 90
  },
  radar: {
    key: 'radar',
    icon: '📡',
    title: '感知延伸',
    description: '全体免疫细胞射程 +8，扩大清菌范围。',
    type: 'range',
    amount: 8
  },
  cache: {
    key: 'cache',
    icon: '💰',
    title: '营养点补给',
    description: '立刻获得 80 营养点，快速部署细胞。',
    type: 'gold',
    amount: 80
  },
  repair: {
    key: 'repair',
    icon: '❤️',
    title: '屏障修复',
    description: '立刻恢复 3 点肠道健康度。',
    type: 'lives',
    amount: 3
  },
  airdrop: {
    key: 'airdrop',
    icon: '📦',
    title: '细胞增殖',
    description: '获得 1 个与当前增益同类型的免疫细胞。',
    type: 'tower'
  },
  discount: {
    key: 'discount',
    icon: '🛒',
    title: '增殖折扣',
    description: '细胞增殖价格 -2，最低 8 营养点。',
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
    title: '快攻菌潮',
    description: '坏菌又快又脆，适合高攻速清除。',
    detail: '数量 -28% · 速度 +30% · 血量 ×0.75 · 营养点 +15%',
    countMultiplier: 0.72,
    speedMultiplier: 1.30,
    hpMultiplier: 0.75,
    goldMultiplier: 1.15
  },
  greed: {
    key: 'greed',
    icon: '💎',
    title: '繁殖高峰',
    description: '海量弱菌快速繁殖，清完可获得大量营养点。',
    detail: '数量 +42% · 精英 +1 · 营养点 +50% · 免疫能量 +1/精英',
    countMultiplier: 1.42,
    goldMultiplier: 1.50,
    extraEliteCount: 1,
    eliteRewardPoints: 1
  },
  fortress: {
    key: 'fortress',
    icon: '🛡️',
    title: '厚壁菌团',
    description: '厚壁慢速菌体，击穿后可获得更多营养点。',
    detail: '血量 ×1.85 · 速度 -25% · 营养点 +40% · 精英 +2 · 精英血量 ×1.5',
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
      title: '强酸核心',
      description: '酸蚀更久更强，对精英/Boss 酸蚀+60%。',
      shortName: '强酸',
      burnDurationBonus: 150,
      burnDamageMultiplier: 1.85,
      damageBonus: 5
    },
    {
      key: 'volatile',
      icon: '💥',
      title: '扩散酶囊',
      description: '命中大范围扩散，反应更快，专清菌潮。',
      shortName: '扩散',
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
      title: '低温锁菌',
      description: '连续命中后可短暂冻结菌体。',
      shortName: '锁菌',
      freezeHits: 3,
      freezeDuration: 34,
      rangeBonus: 8
    },
    {
      key: 'shatter',
      icon: '💠',
      title: '结晶裂解',
      description: '对被抑制菌体造成更高伤害。',
      shortName: '裂解',
      shatterMultiplier: 1.38,
      damageBonus: 2,
      attackSpeedBonus: 40
    }
  ],
  nature: [
    {
      key: 'overgrowth',
      icon: '🌱',
      title: '菌群包裹',
      description: '益生菌包裹时间延长，易伤效果增强。',
      shortName: '包裹',
      vineDurationBonus: 40,
      vineVulnerabilityBonus: 0.12,
      rangeBonus: 5
    },
    {
      key: 'toxic',
      icon: '☠️',
      title: '抑菌代谢',
      description: '命中附带持续抑菌伤害。',
      shortName: '代谢',
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
      title: '多酶棱镜',
      description: '酶解穿透数量增加，作用范围更远。',
      shortName: '多酶',
      piercingExtra: 2,
      rangeBonus: 12,
      damageBonus: 3
    },
    {
      key: 'converge',
      icon: '🌀',
      title: '靶向酶解',
      description: '单个菌体伤害大幅提升，穿透能力减弱。',
      shortName: '靶向',
      damageBonus: 10,
      attackSpeedBonus: -60,
      piercingExtra: -1
    }
  ],
  lightning: [
    {
      key: 'stormchain',
      icon: '⛓️',
      title: '链式免疫',
      description: '连锁菌体数量增加，连锁伤害提高。',
      shortName: '链式',
      chainExtraTargets: 2,
      chainDamageBonus: 0.15,
      damageBonus: 4
    },
    {
      key: 'overcharge',
      icon: '🔋',
      title: '脉冲过载',
      description: '免疫反应频率更高，脉冲更快。',
      shortName: '过载',
      attackSpeedBonus: -120,
      damageBonus: 1,
      rangeBonus: 3
    }
  ]
}

// 有害菌类型配置（保留 shape 以兼容现有程序化绘制）
const MONSTER_TYPES = {
  slime: { 
    name: '有害球菌',
    emoji: '🦠',
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
    name: '飞散菌',
    emoji: '🦠',
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
    name: '坏死菌团',
    emoji: '🦠',
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
    name: '潜伏孢子',
    emoji: '🦠',
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
    name: '耐药菌',
    emoji: '🦠',
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
    name: '生物膜块',
    emoji: '🦠',
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
    name: '毒素菌',
    emoji: '🦠',
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
    name: '隐匿菌',
    emoji: '🦠',
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
    name: '再生菌',
    emoji: '🦠',
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
  scarab: {
    name: '装甲球菌',
    emoji: '🦠',
    bodyColor: '#8a6a24',
    outlineColor: '#4d3510',
    eyeColor: '#ffdd44',
    baseHp: 105,
    speed: 1.05,
    goldDrop: 9,
    shape: 'generic',
    unlockWave: 1,
    armor: 0.06
  },
  direwolf: {
    name: '侵袭杆菌',
    emoji: '🦠',
    bodyColor: '#667080',
    outlineColor: '#303844',
    eyeColor: '#66ddff',
    baseHp: 165,
    speed: 1.55,
    goldDrop: 16,
    shape: 'generic',
    unlockWave: 11
  },
  shaman: {
    name: '变异菌群',
    emoji: '🧫',
    bodyColor: '#477a55',
    outlineColor: '#20482c',
    eyeColor: '#aaff66',
    baseHp: 260,
    speed: 0.92,
    goldDrop: 24,
    shape: 'generic',
    unlockWave: 31,
    regenPerSec: 6
  },
  darkKnight: {
    name: '重甲菌',
    emoji: '🦠',
    bodyColor: '#3f4455',
    outlineColor: '#171923',
    eyeColor: '#ff3344',
    baseHp: 480,
    speed: 0.72,
    goldDrop: 36,
    shape: 'generic',
    unlockWave: 51,
    armor: 0.16
  },
  spider: {
    name: '织网菌',
    emoji: '🦠',
    bodyColor: '#713c88',
    outlineColor: '#351844',
    eyeColor: '#ff88ff',
    baseHp: 250,
    speed: 1.62,
    goldDrop: 34,
    shape: 'generic',
    unlockWave: 71,
    evasionChance: 0.12
  },
  elemental: {
    name: '混合菌群',
    emoji: '🧫',
    bodyColor: '#2c9aaa',
    outlineColor: '#14505c',
    eyeColor: '#ffffff',
    baseHp: 520,
    speed: 1.0,
    goldDrop: 48,
    shape: 'generic',
    unlockWave: 91,
    armor: 0.1
  },
  assassin: {
    name: '突进菌',
    emoji: '🦠',
    bodyColor: '#29243f',
    outlineColor: '#0e0b18',
    eyeColor: '#dd66ff',
    baseHp: 340,
    speed: 1.85,
    goldDrop: 52,
    shape: 'generic',
    unlockWave: 111,
    evasionChance: 0.22
  },
  mammoth: {
    name: '巨型杆菌',
    emoji: '🦠',
    bodyColor: '#7993a3',
    outlineColor: '#3c5665',
    eyeColor: '#cfffff',
    baseHp: 920,
    speed: 0.58,
    goldDrop: 68,
    shape: 'generic',
    unlockWave: 131,
    armor: 0.2
  },
  harpy: {
    name: '飞散孢子',
    emoji: '🦠',
    bodyColor: '#8d7a52',
    outlineColor: '#493b25',
    eyeColor: '#ffee66',
    baseHp: 480,
    speed: 1.72,
    goldDrop: 64,
    shape: 'generic',
    unlockWave: 151,
    evasionChance: 0.16
  },
  voidling: {
    name: '吞噬菌',
    emoji: '🦠',
    bodyColor: '#42205f',
    outlineColor: '#190a2b',
    eyeColor: '#ff44ee',
    baseHp: 760,
    speed: 1.18,
    goldDrop: 78,
    shape: 'generic',
    unlockWave: 171,
    regenPerSec: 10
  },
  colossus: {
    name: '巨型生物膜',
    emoji: '🧫',
    bodyColor: '#685d4d',
    outlineColor: '#30291f',
    eyeColor: '#ffb52e',
    baseHp: 1450,
    speed: 0.48,
    goldDrop: 105,
    shape: 'generic',
    unlockWave: 191,
    armor: 0.26,
    regenPerSec: 8
  },
  dragon: { 
    name: '腐败巨菌',
    emoji: '🦠',
    bodyColor: '#ff4400', 
    outlineColor: '#aa0000',
    eyeColor: '#ffff00',
    baseHp: 620, 
    speed: 0.5, 
    goldDrop: 100, 
    isBoss: true,
    shape: 'dragon',
    unlockWave: 5
  },
  treant: {
    name: '根须菌王',
    emoji: '🧫',
    bodyColor: '#3a6622',
    outlineColor: '#1a4400',
    eyeColor: '#ffff00',
    baseHp: 760,
    speed: 0.35,
    goldDrop: 120,
    isBoss: true,
    shape: 'treant',
    unlockWave: 10
  },
  lich: {
    name: '毒素母体',
    emoji: '☣️',
    bodyColor: '#5522aa',
    outlineColor: '#330066',
    eyeColor: '#00ffff',
    baseHp: 700,
    speed: 0.55,
    goldDrop: 130,
    isBoss: true,
    shape: 'lich',
    unlockWave: 15
  },
  phoenix: {
    name: '复燃孢子',
    emoji: '🦠',
    bodyColor: '#ff8800',
    outlineColor: '#cc4400',
    eyeColor: '#ffffff',
    baseHp: 580,
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

// 肠道分段主题（内部 key 保持不变）
const MAP_THEMES = {
  forest: {
    name: '十二指肠',
    bgColors: ['#32151c', '#51232e', '#2a1118'],
    pathColors: ['#6b343b', '#b96b70', '#e5a0a0'],
    grassColor: 'rgba(255, 170, 175, 0.12)',
    gridColor: 'rgba(255, 190, 195, 0.16)',
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
    name: '空肠',
    bgColors: ['#3a1820', '#642d38', '#32141b'],
    pathColors: ['#753d45', '#c8787d', '#edaaa8'],
    grassColor: 'rgba(255, 180, 185, 0.1)',
    gridColor: 'rgba(255, 195, 200, 0.16)',
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
    name: '回肠',
    bgColors: ['#30172b', '#542748', '#291323'],
    pathColors: ['#67405e', '#ae7197', '#dfa9c5'],
    grassColor: 'rgba(225, 165, 210, 0.1)',
    gridColor: 'rgba(240, 180, 220, 0.16)',
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
    name: '结肠',
    bgColors: ['#291318', '#472127', '#211014'],
    pathColors: ['#593036', '#98545b', '#c97d82'],
    grassColor: 'rgba(220, 130, 140, 0.08)',
    gridColor: 'rgba(235, 155, 165, 0.14)',
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
