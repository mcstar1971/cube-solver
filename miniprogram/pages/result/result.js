// pages/result/result.js

Page({
  data: {
    totalSteps: 0,
    timeUsed: '0:00'
  },

  onLoad() {
    const app = getApp()
    // 从全局数据获取统计信息
    this.setData({
      totalSteps: app.globalData.solution?.length || 20
    })
  },

  scanAgain() {
    wx.redirectTo({
      url: '/pages/scan/scan'
    })
  },

  shareResult() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  onShareAppMessage() {
    return {
      title: '我用 Cube Solver 在 ' + this.data.totalSteps + ' 步内还原了魔方！',
      path: '/pages/scan/scan'
    }
  }
})
