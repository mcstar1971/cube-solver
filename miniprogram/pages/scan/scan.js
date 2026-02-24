// pages/scan/scan.js - 魔方扫描页面

Page({
  data: {
    statusText: '准备扫描',
    hintText: '将魔方对准框内，缓慢转动',
    isScanning: false,
    scannedCount: 0,
    scanned: {
      U: false, D: false, F: false, B: false, L: false, R: false
    },
    cubeColors: {}  // 存储各面颜色
  },

  onLoad() {
    this.checkCameraAuth()
  },

  // 检查摄像头权限
  checkCameraAuth() {
    wx.authorize({
      scope: 'scope.camera',
      success: () => {
        console.log('摄像头授权成功')
      },
      fail: () => {
        wx.showModal({
          title: '需要摄像头权限',
          content: '请在设置中开启摄像头权限',
          showCancel: false
        })
      }
    })
  },

  // 开始扫描
  startScan() {
    if (this.data.scannedCount >= 6) {
      this.goToSolve()
      return
    }

    this.setData({ 
      isScanning: true,
      statusText: '扫描中...',
      hintText: '请缓慢转动魔方，展示每个面'
    })

    // 创建相机上下文
    this.cameraContext = wx.createCameraContext()
    this.listener = this.cameraContext.onCameraFrame((frame) => {
      this.processFrame(frame)
    })

    this.listener.start()
  },

  // 处理视频帧
  processFrame(frame) {
    // TODO: 实现颜色识别逻辑
    // 1. 从frame.data中提取像素
    // 2. 分析魔方各位置的颜色
    // 3. 判断是否为新的一面
    // 4. 更新扫描状态

    console.log('Frame received:', frame.width, frame.height)
  },

  // 手动标记当前面（MVP简化版）
  markCurrentFace(e) {
    const face = e.currentTarget.dataset.face
    const scanned = { ...this.data.scanned }
    
    if (!scanned[face]) {
      scanned[face] = true
      this.setData({ 
        scanned,
        scannedCount: this.data.scannedCount + 1
      })
    }

    if (this.data.scannedCount >= 6) {
      this.setData({
        statusText: '扫描完成',
        hintText: '点击继续开始还原'
      })
    }
  },

  // 重置扫描
  resetScan() {
    this.setData({
      statusText: '准备扫描',
      hintText: '将魔方对准框内，缓慢转动',
      isScanning: false,
      scannedCount: 0,
      scanned: {
        U: false, D: false, F: false, B: false, L: false, R: false
      },
      cubeColors: {}
    })
    
    if (this.listener) {
      this.listener.stop()
    }
  },

  // 摄像头错误
  onCameraError(e) {
    console.error('摄像头错误:', e.detail)
    wx.showToast({
      title: '摄像头错误',
      icon: 'none'
    })
  },

  // 进入还原页面
  goToSolve() {
    const app = getApp()
    app.globalData.cubeState = this.data.cubeColors
    
    wx.navigateTo({
      url: '/pages/solve/solve'
    })
  }
})
