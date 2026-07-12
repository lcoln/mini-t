const RUN_PROGRESS_KEY = 'miniTRunProgress'

Page({
  data: {
    highScore: 0,
    maxWave: 1,
    hasSavedRun: false,
    savedRunLabel: ''
  },

  refreshMeta() {
    const highScore = wx.getStorageSync('highScore') || 0
    const maxWave = wx.getStorageSync('maxWave') || 1
    const savedRun = wx.getStorageSync(RUN_PROGRESS_KEY)
    const hasSavedRun = !!(savedRun && savedRun.data && savedRun.data.wave)
    const savedRunLabel = hasSavedRun
      ? `已保存到 第${savedRun.data.level}-${savedRun.data.waveInLevel}关 · 💰${savedRun.data.gold} · ❤️${savedRun.data.lives}`
      : ''

    this.setData({ highScore, maxWave, hasSavedRun, savedRunLabel })
  },

  onLoad() {
    this.refreshMeta()
  },

  onShow() {
    this.refreshMeta()
  },

  startGame() {
    wx.navigateTo({
      url: '/pages/game/game'
    })
  },

  startNewGame() {
    wx.removeStorageSync(RUN_PROGRESS_KEY)
    this.startGame()
  }
})
