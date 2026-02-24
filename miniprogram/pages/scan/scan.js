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
    cubeColors: {},  // 存储各面颜色
    lastDetectedFace: null,
    faceStableCount: 0
  },

  // 面名称映射
  faceNames: {
    U: '顶面（白色）',
    D: '底面（黄色）',
    F: '前面（红色）',
    B: '后面（橙色）',
    L: '左面（绿色）',
    R: '右面（蓝色）'
  },

  onLoad() {
    this.checkCameraAuth()
  },

  onUnload() {
    this.stopScanning()
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
    
    // 监听摄像头帧
    this.listener = this.cameraContext.onCameraFrame((frame) => {
      this.processFrame(frame)
    })

    this.listener.start({
      success: () => {
        console.log('帧监听启动成功')
      },
      fail: (err) => {
        console.error('帧监听启动失败:', err)
        wx.showToast({
          title: '启动扫描失败',
          icon: 'none'
        })
        this.setData({ isScanning: false })
      }
    })
  },

  // 处理视频帧
  processFrame(frame) {
    if (!this.data.isScanning) return

    try {
      // 从帧数据中提取颜色
      const faceColors = this.extractColorsFromFrame(frame)
      
      if (faceColors) {
        // 检测这是哪个面（根据中心块颜色）
        const detectedFace = this.detectFaceByCenter(faceColors)
        
        // 稳定性检测：同一个面连续检测3次才确认
        if (detectedFace === this.data.lastDetectedFace) {
          this.faceStableCount++
          
          if (this.faceStableCount >= 3 && !this.data.scanned[detectedFace]) {
            // 确认新的一面
            this.confirmFace(detectedFace, faceColors)
          }
        } else {
          // 检测到不同的面，重置计数
          this.setData({ lastDetectedFace: detectedFace })
          this.faceStableCount = 1
        }
      }
    } catch (err) {
      console.error('帧处理错误:', err)
    }
  },

  // 从帧数据提取颜色
  extractColorsFromFrame(frame) {
    const { data, width, height } = frame
    
    // 计算扫描区域（画面中心）
    const centerX = Math.floor(width / 2)
    const centerY = Math.floor(height / 2)
    const scanSize = Math.min(width, height) * 0.4  // 扫描区域大小
    const cellSize = scanSize / 3
    
    const colors = []
    
    for (let row = 0; row < 3; row++) {
      colors[row] = []
      for (let col = 0; col < 3; col++) {
        // 每个格子的中心点
        const sampleX = Math.floor(centerX - scanSize / 2 + col * cellSize + cellSize / 2)
        const sampleY = Math.floor(centerY - scanSize / 2 + row * cellSize + cellSize / 2)
        
        // 取周围区域的平均颜色
        const avgColor = this.getAverageColor(data, width, height, sampleX, sampleY, 5)
        
        // 识别颜色
        const colorName = colorDetector.detectColor(avgColor)
        colors[row][col] = colorName
      }
    }
    
    return colors
  },

  // 获取区域平均颜色
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
    
    return [
      Math.round(r / count),
      Math.round(g / count),
      Math.round(b / count)
    ]
  },

  // 根据中心块颜色判断是哪个面
  detectFaceByCenter(faceColors) {
    const centerColor = faceColors[1][1]  // 中心块
    // 中心块颜色即为该面的标识
    return centerColor
  },

  // 确认扫描到一个面
  confirmFace(face, colors) {
    const scanned = { ...this.data.scanned }
    const cubeColors = { ...this.data.cubeColors }
    
    scanned[face] = true
    cubeColors[face] = colors
    
    const newCount = this.data.scannedCount + 1
    
    this.setData({ 
      scanned,
      scannedCount: newCount,
      cubeColors,
      statusText: `已识别: ${this.faceNames[face]}`,
      hintText: newCount < 6 ? '继续转动，展示其他面' : '扫描完成！'
    })

    // 震动反馈
    wx.vibrateShort({ type: 'medium' })
    
    if (newCount >= 6) {
      this.stopScanning()
      setTimeout(() => {
        this.setData({
          statusText: '扫描完成',
          hintText: '点击继续开始还原'
        })
      }, 500)
    }
  },

  // 停止扫描
  stopScanning() {
    if (this.listener) {
      this.listener.stop()
      this.listener = null
    }
    this.setData({ isScanning: false })
  },

  // 重置扫描
  resetScan() {
    this.stopScanning()
    this.setData({
      statusText: '准备扫描',
      hintText: '将魔方对准框内，缓慢转动',
      isScanning: false,
      scannedCount: 0,
      scanned: {
        U: false, D: false, F: false, B: false, L: false, R: false
      },
      cubeColors: {},
      lastDetectedFace: null,
      faceStableCount: 0
    })
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
    
    // 验证魔方状态
    if (!colorDetector.validateCubeState(this.data.cubeColors)) {
      wx.showModal({
        title: '扫描异常',
        content: '魔方状态验证失败，请重新扫描',
        showCancel: false
      })
      return
    }
    
    wx.navigateTo({
      url: '/pages/solve/solve'
    })
  }
})
