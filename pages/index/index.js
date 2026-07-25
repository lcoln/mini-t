Page({
  data: {
    highScore: 0,
    maxWave: 1
  },

  onLoad() {
    const highScore = wx.getStorageSync('highScore') || 0
    const maxWave = wx.getStorageSync('maxWave') || 1
    this.setData({ highScore, maxWave })
  },

  onShow() {
    // 每次显示时刷新数据
    const highScore = wx.getStorageSync('highScore') || 0
    const maxWave = wx.getStorageSync('maxWave') || 1
    this.setData({ highScore, maxWave })
  },

  onShareAppMessage() {
    return {
      title: '塔防: 肠道保卫战｜合成免疫细胞，清剿坏菌！',
      path: '/pages/index/index'
    }
  },

  startGame() {
    wx.navigateTo({
      url: '/pages/game/game'
    })
  }
})
