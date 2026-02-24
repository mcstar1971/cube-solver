// pages/scan/scan.js - 魔方扫描页面

const colorDetector = require('../../utils/color-detector')

Page({
  data: {
    statusText: '准备扫描',
    hintText: '将魔方对准框内，缓慢转动',
    isScanning: false,
    scannedCount: 0,
    scanned: {
      U: false, D: false, F: false, B: false, L: false, R: false
    },
    cubeColors: {},
    debugInfo: ''  // 调试信息
  },

  faceNames: {
    U: '白色面', D: '黄色面', F: '红色面',
    B: '橙色面', L: '绿色面', R: '蓝色面'
  },

  lastDetectedFace: null,
  faceStableCount: 0,
  frameCount: 0,
  lastConfirmTime: 0,

  onLoad() {
    this.checkCameraAuth()
  },

  onUnload() {
    this.stopScanning()
  },

  checkCameraAuth() {
    wx.authorize({
      scope: 'scope.camera',
      success: () => console.log('摄像头授权成功'),
      fail: () => {
        wx.showModal({
          title: '需要摄像头权限',
          content: '请在设置中开启摄像头权限',
          showCancel: false
        })
      }
    })
  },

  startScan() {
    if (this.data.scannedCount >= 6) {
      this.goToSolve()
      return
    }

    this.lastDetectedFace = null
    this.faceStableCount = 0
    this.frameCount = 0
    this.lastConfirmTime = 0

    this.setData({ 
      isScanning: true,
      statusText: '扫描中...',
      hintText: '请将魔方的白色中心块对准框内'
    })

    this.cameraContext = wx.createCameraContext()
    
    this.listener = this.cameraContext.onCameraFrame((frame) => {
      this.processFrame(frame)
    })

    this.listener.start({
      success: () => console.log('帧监听启动成功'),
      fail: (err) => {
        console.error('帧监听启动失败:', err)
        wx.showToast({ title: '启动扫描失败', icon: 'none' })
        this.setData({ isScanning: false })
      }
    })
  },

  processFrame(frame) {
    if (!this.data.isScanning) return

    this.frameCount++
    
    // 每3帧处理一次
    if (this.frameCount % 3 !== 0) return

    // 防止连续确认太快（至少间隔1秒）
    const now = Date.now()
    if (now - this.lastConfirmTime < 1000) return

    try {
      const result = this.extractColorsFromFrame(frame)
      
      if (!result) return
      
      const { colors, centerColor, avgRgb, hsv } = result
      
      // 更新调试信息
      const debugInfo = `中心: ${centerColor} | RGB: ${avgRgb.join(',')} | HSV: ${Math.round(hsv.h)}°, ${Math.round(hsv.s)}%, ${Math.round(hsv.v)}%`
      this.setData({ debugInfo })
      
      // 如果这个面已经扫描过，跳过
      if (this.data.scanned[centerColor]) {
        this.setData({ hintText: `${this.faceNames[centerColor]}已扫描，请转动展示其他面` })
        return
      }
      
      // 稳定性检测：同一个面连续检测3次
      if (centerColor === this.lastDetectedFace) {
        this.faceStableCount++
        
        this.setData({ 
          hintText: `检测到${this.faceNames[centerColor]}，请保持稳定 (${this.faceStableCount}/3)` 
        })
        
        if (this.faceStableCount >= 3) {
          this.confirmFace(centerColor, colors)
        }
      } else {
        this.lastDetectedFace = centerColor
        this.faceStableCount = 1
        this.setData({ hintText: `检测到${this.faceNames[centerColor]}，请保持稳定` })
      }
    } catch (err) {
      console.error('帧处理错误:', err)
    }
  },

  extractColorsFromFrame(frame) {
    const { data, width, height } = frame
    
    const centerX = Math.floor(width / 2)
    const centerY = Math.floor(height / 2)
    const scanSize = Math.min(width, height) * 0.35
    const cellSize = scanSize / 3
    
    const colors = []
    
    // 先取中心块的颜色来判断是哪个面
    const centerSampleX = Math.floor(centerX)
    const centerSampleY = Math.floor(centerY)
    const centerAvg = this.getAverageColor(data, width, height, centerSampleX, centerSampleY, 15)
    const hsv = colorDetector.rgbToHsv(centerAvg[0], centerAvg[1], centerAvg[2])
    
    // 识别中心块颜色
    const centerColor = colorDetector.detectColor(centerAvg)
    
    if (!centerColor) {
      return null
    }
    
    // 然后取9个格子的颜色
    for (let row = 0; row < 3; row++) {
      colors[row] = []
      for (let col = 0; col < 3; col++) {
        const sampleX = Math.floor(centerX - scanSize / 2 + col * cellSize + cellSize / 2)
        const sampleY = Math.floor(centerY - scanSize / 2 + row * cellSize + cellSize / 2)
        const avgColor = this.getAverageColor(data, width, height, sampleX, sampleY, 10)
        colors[row][col] = colorDetector.detectColor(avgColor) || centerColor
      }
    }
    
    // 确保中心块颜色正确
    colors[1][1] = centerColor
    
    return { colors, centerColor, avgRgb: centerAvg, hsv }
  },

  getAverageColor(data, width, height, centerX, centerY, radius) {
    let r = 0, g = 0, b = 0, count = 0
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx
        const y = centerY + dy
        
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = (y * width + x) * 4
          r += data[idx]
          g += data[idx + 1]
          b += data[idx + 2]
          count++
        }
      }
    }
    
    return [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
  },

  confirmFace(face, colors) {
    const scanned = { ...this.data.scanned }
    const cubeColors = { ...this.data.cubeColors }
    
    scanned[face] = true
    cubeColors[face] = colors
    
    const newCount = this.data.scannedCount + 1
    this.lastConfirmTime = Date.now()
    
    this.setData({ 
      scanned,
      scannedCount: newCount,
      cubeColors,
      statusText: `✓ ${this.faceNames[face]}`,
      hintText: newCount < 6 ? '继续转动，展示其他面' : '扫描完成！'
    })

    // 重置检测状态
    this.lastDetectedFace = null
    this.faceStableCount = 0

    wx.vibrateShort({ type: 'medium' })
    console.log(`确认面 ${face}:`, colors)
    
    if (newCount >= 6) {
      this.stopScanning()
    }
  },

  stopScanning() {
    if (this.listener) {
      this.listener.stop()
      this.listener = null
    }
    this.setData({ isScanning: false })
  },

  resetScan() {
    this.stopScanning()
    this.lastDetectedFace = null
    this.faceStableCount = 0
    this.frameCount = 0
    this.lastConfirmTime = 0
    this.setData({
      statusText: '准备扫描',
      hintText: '将魔方对准框内，缓慢转动',
      isScanning: false,
      scannedCount: 0,
      scanned: { U: false, D: false, F: false, B: false, L: false, R: false },
      cubeColors: {},
      debugInfo: ''
    })
  },

  toggleFace(e) {
    const face = e.currentTarget.dataset.face
    const scanned = { ...this.data.scanned }
    
    if (scanned[face]) {
      scanned[face] = false
      this.setData({ scanned, scannedCount: this.data.scannedCount - 1 })
    } else {
      scanned[face] = true
      const newCount = this.data.scannedCount + 1
      this.setData({ scanned, scannedCount: newCount })
      if (newCount >= 6) {
        this.setData({ statusText: '扫描完成', hintText: '点击继续开始还原' })
      }
    }
  },

  onCameraError(e) {
    console.error('摄像头错误:', e.detail)
    wx.showToast({ title: '摄像头错误', icon: 'none' })
  },

  goToSolve() {
    const app = getApp()
    app.globalData.cubeState = this.data.cubeColors
    
    if (!colorDetector.validateCubeState(this.data.cubeColors)) {
      wx.showModal({
        title: '扫描异常',
        content: '魔方状态验证失败，请重新扫描',
        showCancel: false
      })
      return
    }
    
    wx.navigateTo({ url: '/pages/solve/solve' })
  }
})
