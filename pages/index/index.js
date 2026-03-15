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


  startGame() {
    wx.navigateTo({
      url: '/pages/game/game'
    })
  }
})
