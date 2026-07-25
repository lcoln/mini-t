/**
 * mini-t 小游戏入口 (compileType: game)
 *
 * 迁移策略：当前 pages/game/game.js 是小程序 Page() 架构（依赖 WXML/setData/SelectorQuery）。
 * 本文件作为小游戏入口，提供运行时 shim，让现有游戏逻辑在 mini-game 环境直接跑起来，
 * 战场 canvas 渲染完全复用，后续阶段再把 WXML UI 逐块替换为 canvas 绘制。
 *
 * Phase 0 目标：战场渲染 + 主循环跑通。WXML UI 暂不可交互（后续阶段替换）。
 */

const G = (typeof GameGlobal !== 'undefined') ? GameGlobal : (typeof global !== 'undefined' ? global : this)

// ---------- 1. 创建主 canvas ----------
const canvas = wx.createCanvas()
const ctx = canvas.getContext('2d')
const sysInfo = wx.getWindowInfo()
const DPR = sysInfo.pixelRatio || 2
const VIEW_W = sysInfo.windowWidth || 375
const VIEW_H = sysInfo.windowHeight || 667

// 刘海 / 状态栏 / 微信胶囊 / Home 条（逻辑像素）
// 小游戏全屏时必须以胶囊为准排顶栏，否则会和右上角 ... 重叠
let MENU_RECT = null
try {
  if (typeof wx.getMenuButtonBoundingClientRect === 'function') {
    const rect = wx.getMenuButtonBoundingClientRect()
    if (rect && Number.isFinite(rect.left) && Number.isFinite(rect.top) && rect.width > 0) {
      MENU_RECT = rect
    }
  }
} catch (e) { MENU_RECT = null }

function resolveSafeInsets(info, menu) {
  const statusBar = Number.isFinite(info.statusBarHeight) ? info.statusBarHeight : 0
  let safeTop = statusBar
  if (info.safeArea && Number.isFinite(info.safeArea.top)) {
    safeTop = Math.max(safeTop, info.safeArea.top)
  }

  // 微信标准：顶栏总高 = 状态栏 + (胶囊上间距*2 + 胶囊高)，内容与胶囊垂直居中
  let hudBottom = safeTop + 44
  if (menu && Number.isFinite(menu.top) && Number.isFinite(menu.height)) {
    const gap = Math.max(4, menu.top - statusBar)
    hudBottom = Math.ceil(statusBar + gap * 2 + menu.height)
    // 若 safeArea.top 比 statusBar 更大，至少盖到胶囊下沿
    hudBottom = Math.max(hudBottom, Math.ceil(menu.bottom + gap))
  }

  let safeBottom = 0
  if (info.safeArea && Number.isFinite(info.safeArea.bottom)) {
    safeBottom = Math.max(0, (info.windowHeight || VIEW_H) - info.safeArea.bottom)
  }
  return {
    safeTop: Math.max(0, Math.round(safeTop)),
    safeBottom: Math.max(0, Math.round(safeBottom)),
    hudBottom: Math.max(Math.round(safeTop + 40), Math.round(hudBottom))
  }
}
const SAFE = resolveSafeInsets(sysInfo, MENU_RECT)
console.log('[mini-game] safeInsets', SAFE, 'menu', MENU_RECT)

canvas.width = Math.floor(VIEW_W * DPR)
canvas.height = Math.floor(VIEW_H * DPR)
ctx.setTransform(DPR, 0, 0, DPR, 0, 0)

// ---------- 2. shim: 全局 Page() ----------
// 小程序用 Page({data, methods}) 注册页面；小游戏没有页面系统，
// 这里把 Page 调用的 options 收敛成一个控制器实例，并补上 setData（同步合并到 data）。
function createPageController(options) {
  const inst = {}
  Object.keys(options).forEach((k) => { inst[k] = options[k] })
  // data 深拷贝，避免多个实例共享引用
  inst.data = (options.data && typeof options.data === 'object')
    ? JSON.parse(JSON.stringify(options.data))
    : {}
  // 必须支持第二参数 callback：原 Page 逻辑大量依赖 setData 完成后同步波次/塔位
  inst.setData = function (patch, cb) {
    if (patch && typeof patch === 'object') {
      Object.keys(patch).forEach((k) => { inst.data[k] = patch[k] })
      inst.needsRender = true
      if (typeof inst._onDataPatched === 'function') {
        try { inst._onDataPatched(patch) } catch (e) { console.error('[mini-game] _onDataPatched', e) }
      }
    }
    if (typeof cb === 'function') {
      try { cb.call(inst) } catch (e) { console.error('[mini-game] setData callback', e) }
    }
  }
  return inst
}

let pageInstance = null
G.Page = function (options) {
  pageInstance = createPageController(options)
}

// ---------- 3. shim: wx.createSelectorQuery ----------
// 原代码通过 SelectorQuery 取 WXML 里的节点。小游戏没有 WXML，
// 这里直接把查询结果映射为真实 canvas 尺寸，使其余逻辑无需改动。
//
// 支持的调用模式（从原代码中提取）：
//   .select('#gameCanvas').fields({node:true, size:true}).exec(cb)     ← initCanvas / remeasureCanvasLayout
//   .select('#gameCanvas').boundingClientRect(cb).exec()               ← refreshCanvasRect
//   .select('.inventory-grid').boundingClientRect().selectAll('.inventory-slot').boundingClientRect().exec(cb) ← refreshInventoryRect
function makeSelectorQuery() {
  // 统一返回值：canvas 占满全屏（小游戏没有 WXML 布局）
  const FULL_RECT = { left: 0, top: 0, right: VIEW_W, bottom: VIEW_H, width: VIEW_W, height: VIEW_H }
  // 链式容器：任何方法调用后都返回自身，支持 .exec(cb) 收集结果
  const chain = {
    _results: [],
    fields(opts) { this._results.push([{ node: canvas, width: VIEW_W, height: VIEW_H }]); return this },
    boundingClientRect(cb) {
      if (typeof cb === 'function') cb(FULL_RECT)
      else this._results.push(FULL_RECT)
      return this
    },
    scrollOffset(cb) {
      if (typeof cb === 'function') cb({ scrollTop: 0, scrollLeft: 0 })
      else this._results.push({ scrollTop: 0, scrollLeft: 0 })
      return this
    },
    selectAll(selector) {
      // selectAll 返回多元素数组；Phase 0 不区分具体元素，统一给全屏 rect
      this._results.push([FULL_RECT])
      return this
    },
    exec(cb) {
      if (typeof cb === 'function') cb(this._results.length > 0 ? this._results : [FULL_RECT])
      return this
    }
  }
  return {
    select() { return chain },
    selectViewport() { return chain }
  }
}
wx.createSelectorQuery = makeSelectorQuery

// nextTick 在部分基础库缺失，补齐为直接执行
if (typeof wx.nextTick !== 'function') {
  wx.nextTick = function (fn) { fn() }
}

// ---------- 4. 载入现有游戏逻辑（会触发上面的 Page()） ----------
try {
  require('./pages/game/game.js')
} catch (err) {
  console.error('[mini-game] 载入 pages/game/game.js 失败:', err)
}

if (!pageInstance) {
  console.error('[mini-game] 未捕获到 Page 实例，请检查 pages/game/game.js 是否调用了 Page()')
} else {
  // 注入 canvas / ctx
  pageInstance.canvas = canvas
  pageInstance.ctx = ctx
  pageInstance._canvasDpr = DPR
  pageInstance.windowWidth = VIEW_W

  // Phase 0 安全开关：小游戏模式下跳过存档恢复，
  // 避免 tryRestoreRunProgress 读到小程序时代的不兼容脏数据导致空画面。
  pageInstance._skipRestoreRunProgress = true
  // 冷启动先进首页；点「开始守护」后再进布阵（initCanvas 异步完成后也要落在 menu）
  pageInstance._openMenuAfterInit = true
  // 劫持 tryRestoreRunProgress：小游戏模式强制返回 false → 走 initGame() 新局
  var _origTryRestore = null
  if (typeof pageInstance.tryRestoreRunProgress === 'function') {
    _origTryRestore = pageInstance.tryRestoreRunProgress.bind(pageInstance)
    pageInstance.tryRestoreRunProgress = function () {
      if (this._skipRestoreRunProgress) {
        console.log('[mini-game] 跳过存档恢复，强制走 initGame 新局')
        return false
      }
      return _origTryRestore()
    }.bind(pageInstance)
  }
  var _origInitGame = null
  if (typeof pageInstance.initGame === 'function') {
    _origInitGame = pageInstance.initGame.bind(pageInstance)
    pageInstance.initGame = function () {
      _origInitGame()
      if (this._openMenuAfterInit) {
        if (typeof this.refreshMenuStats === 'function') this.refreshMenuStats()
        this.setData({ gameState: 'menu', showWaveChoice: false, commanderAiming: false })
        console.log('[mini-game] 启动停在首页 menu')
      }
    }.bind(pageInstance)
  }

  // 触发生命周期（小程序框架原本会自动调用）
  try { if (typeof pageInstance.onLoad === 'function') pageInstance.onLoad() } catch (e) { console.error('[mini-game] onLoad 异常:', e) }
  try { if (typeof pageInstance.onShow === 'function') pageInstance.onShow() } catch (e) { console.error('[mini-game] onShow 异常:', e) }

  // ---------- 5. canvas UI 层（HUD/准备条/塔位圈/仓库/弹窗）----------
  // 小游戏没有 WXML 渲染层，原界面全靠 canvas 手绘。用独立模块承载，不动 game.js 业务逻辑。
  var CONFIG = null
  try { CONFIG = require('./pages/game/config') } catch (e) { console.error('[mini-game] 载入 config 失败:', e) }

  var ui = null
  try {
    var CanvasUI = require('./canvas-ui')
    ui = CanvasUI.create(pageInstance, ctx, {
      W: VIEW_W, H: VIEW_H, DPR: DPR,
      CONFIG: CONFIG || {},
      TOWER_TYPES: (CONFIG && CONFIG.TOWER_TYPES) || {},
      SAFE_TOP: SAFE.safeTop,
      SAFE_BOTTOM: SAFE.safeBottom,
      HUD_BOTTOM: SAFE.hudBottom,
      MENU_RECT: MENU_RECT
    })
    // 让战场网格给上下 UI 带让出空间（含刘海 + 胶囊对齐后的顶栏高度）
    pageInstance._uiBottomInset = ui.invH + SAFE.safeBottom
    pageInstance._syncUiTopInset = function () {
      const gs = this.data && this.data.gameState
      // menu 全屏首页；prep / playing 再给战场让位
      let nextTop = ui.hudH + ui.bannerH
      if (gs === 'prep') nextTop = ui.hudH + ui.prepH
      else if (gs === 'menu') nextTop = ui.hudH
      if (this._uiTopInset === nextTop) return
      this._uiTopInset = nextTop
      if (typeof this.updateCanvasMetrics === 'function') {
        try { this.updateCanvasMetrics(VIEW_W, VIEW_H) } catch (err) {}
      }
    }
    pageInstance._onDataPatched = function (patch) {
      if (patch && Object.prototype.hasOwnProperty.call(patch, 'gameState')) {
        this._syncUiTopInset()
      }
    }
    pageInstance._syncUiTopInset()

    // 若 initCanvas 已跑完，这里再确保一次停在首页
    if (pageInstance._openMenuAfterInit) {
      if (typeof pageInstance.refreshMenuStats === 'function') pageInstance.refreshMenuStats()
      pageInstance.setData({ gameState: 'menu' })
    }
  } catch (e) {
    console.error('[mini-game] canvas-ui 初始化失败:', e)
  }

  // 包一层 render：战场渲染后叠加 UI 层
  var _origRender = (typeof pageInstance.render === 'function') ? pageInstance.render.bind(pageInstance) : null
  if (_origRender) {
    pageInstance.render = function () {
      try { _origRender() } catch (e) { console.error('[mini-game] render 异常:', e) }
      if (ui) { try { ui.draw() } catch (e) { console.error('[mini-game] ui.draw 异常:', e) } }
    }
  }

  // ---------- 6. 触摸路由 ----------
  // 先给 UI 层命中（HUD/按钮/仓库/弹窗/塔位圈），未命中再转战场（拖拽场上塔）。
  // 仓库格特殊：UI 命中后返回 {invSlotIndex}，由此启动原拖拽链（onInventoryTouchStart→move→end），
  // 保留"按住拖到塔位/合成"的原生手感，而不是点选式。
  function safeWrap(fn) {
    return function (e) {
      try { if (typeof fn === 'function') fn.call(pageInstance, e) } catch (err) { console.error('[mini-game] touch handler 异常:', err) }
    }
  }

  // 小游戏 canvas 占满全屏，坐标即逻辑像素；原拖拽逻辑用 cachedCanvasRect 换算，这里给它一个全屏 rect（scale=1）
  pageInstance.cachedCanvasRect = { left: 0, top: 0, right: VIEW_W, bottom: VIEW_H, width: VIEW_W, height: VIEW_H }
  pageInstance.refreshCanvasRect = function () {
    this.cachedCanvasRect = { left: 0, top: 0, right: VIEW_W, bottom: VIEW_H, width: VIEW_W, height: VIEW_H }
  }
  // 仓库格矩形由 canvas-ui 每帧写入 pageInstance.inventorySlotRects；这里禁用原 WXML 版本避免覆盖
  pageInstance.refreshInventoryRect = function () { /* rects come from canvas-ui.draw() */ }

  // 记录本次 touchStart 是否命中仓库格（决定 move/end 是否走拖拽链）
  var _uiConsumedNonDrag = false

  wx.onTouchStart(function (e) {
    _uiConsumedNonDrag = false
    var t = e && e.touches && e.touches[0]
    if (ui && t) {
      var hit = false
      try { hit = ui.handleTouchStart(t.clientX, t.clientY) } catch (err) { console.error('[mini-game] ui touch 异常:', err) }
      if (hit === true) {
        // 纯 UI 按钮（祝福/开始/暂停/空投/塔位圈/弹窗），已消费，不启动拖拽
        _uiConsumedNonDrag = true
        return
      }
      if (hit && typeof hit === 'object' && hit.invSlotIndex !== undefined) {
        // 命中仓库格 → 启动原拖拽链
        safeWrap(pageInstance.onInventoryTouchStart)({
          currentTarget: { dataset: { index: hit.invSlotIndex } },
          touches: [t]
        })
        return
      }
    }
    // 未命中 UI → 战场（拖拽场上已有的塔）
    safeWrap(pageInstance.onCanvasTouchStart)(e)
  })
  wx.onTouchMove(function (e) {
    if (_uiConsumedNonDrag) return
    safeWrap(pageInstance.onGlobalTouchMove)(e)
  })
  wx.onTouchEnd(function (e) {
    if (_uiConsumedNonDrag) { _uiConsumedNonDrag = false; return }
    safeWrap(pageInstance.onGlobalTouchEnd)(e)
  })
  wx.onTouchCancel(function (e) {
    _uiConsumedNonDrag = false
    safeWrap(pageInstance.onGlobalTouchEnd)(e)
  })

  console.log('[mini-game] 入口初始化完成，UI 层已接入。VIEW=' + VIEW_W + 'x' + VIEW_H + ' DPR=' + DPR)
}
