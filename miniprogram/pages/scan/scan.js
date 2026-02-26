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

  // 滑动窗口记录最近的颜色检测结果
  colorHistory: [],  // 最近N帧的颜色
  colorHistoryMax: 10,  // 窗口大小

  lastDetectedFace: null,
  faceStableCount: 0,
  frameCount: 0,
  lastConfirmTime: 0,
  listener: null,

  onLoad() {
    this.checkCameraAuth()
  },

  onUnload() {
    console.log('=== onUnload 被调用 ===')
    this.stopScanning()
  },

  onHide() {
    console.log('=== onHide 被调用 ===')
    this.stopScanning()
  },

  onShow() {
    console.log('=== onShow 被调用 ===')
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
    console.log('=== startScan 被调用 ===')
    
    // 防止重复调用
    if (this.data.isScanning) {
      console.log('已经在扫描中，忽略重复调用')
      return
    }
    
    if (this.data.scannedCount >= 6) {
      this.goToSolve()
      return
    }

    // 先停止之前的监听（以防万一）
    this.stopScanning()

    this.lastDetectedFace = null
    this.faceStableCount = 0
    this.frameCount = 0
    this.lastConfirmTime = 0
    this.colorHistory = []  // 清空颜色历史
    this._frameTotalCount = 0

    console.log('准备 setData...')
    this.setData({ 
      isScanning: true,
      statusText: '扫描中...',
      hintText: '请将魔方的白色中心块对准框内'
    }, () => {
      console.log('setData 完成，isScanning:', this.data.isScanning)
    })

    this.cameraContext = wx.createCameraContext()
    
    this.listener = this.cameraContext.onCameraFrame((frame) => {
      // 简单计数，确认回调在工作
      if (!this._frameTotalCount) this._frameTotalCount = 0
      this._frameTotalCount++
      if (this._frameTotalCount % 20 === 0) {
        console.log('onCameraFrame 回调总数:', this._frameTotalCount)
      }
      this.processFrame(frame)
    })

    console.log('准备启动帧监听...')
    this.listener.start({
      success: () => {
        console.log('帧监听启动成功！')
      },
      fail: (err) => {
        console.error('帧监听启动失败:', err)
        wx.showToast({ title: '启动扫描失败', icon: 'none' })
        this.setData({ isScanning: false })
      }
    })
  },

  processFrame(frame) {
    // 检查扫描状态
    if (!this.data.isScanning) {
      console.log('processFrame: isScanning 为 false，跳过')
      return
    }

    this.frameCount++
    
    // 每帧都打印关键信息（调试用）
    if (this.frameCount <= 20 || this.frameCount % 10 === 0) {
      console.log('processFrame:', this.frameCount, 'isScanning:', this.data.isScanning)
    }

    try {
      // 每帧都检测颜色（快速累积历史）
      const result = this.extractColorsFromFrame(frame)
      
      // 检查是否返回有效结果
      if (!result) {
        console.log(`帧${this.frameCount}: extractColorsFromFrame 返回 null`)
        if (this.frameCount % 5 === 0) {
          this.setData({ hintText: '未检测到有效颜色，请调整角度' })
        }
        return
      }
      
      const { colors, centerColor, avgRgb, hsv } = result
      
      if (!centerColor) {
        console.log(`帧${this.frameCount}: centerColor 为 null, avgRgb: ${avgRgb}`)
        if (this.frameCount % 5 === 0) {
          this.setData({ hintText: '未识别到颜色，请检查光照' })
        }
        return
      }
      
      // 更新调试信息（每5帧）
      if (this.frameCount % 5 === 0) {
        const debugInfo = `中心: ${centerColor || '未知'} | RGB: (${avgRgb.join(',')}) | HSV: ${Math.round(hsv.h)}°, ${Math.round(hsv.s)}%, ${Math.round(hsv.v)}%`
        this.setData({ debugInfo })
      }
      
      // 如果这个面已经扫描过，清空历史，提示用户
      if (this.data.scanned[centerColor]) {
        this.colorHistory = []
        if (this.frameCount % 5 === 0) {
          this.setData({ hintText: `${this.faceNames[centerColor]}已扫描，请转动展示其他面` })
        }
        return
      }
      
      // 滑动窗口统计：记录最近的检测结果
      this.colorHistory.push(centerColor)
      if (this.colorHistory.length > this.colorHistoryMax) {
        this.colorHistory.shift()  // 移除最旧的
      }
      
      // 每帧都打印进度（调试用）
      console.log(`帧${this.frameCount}: 检测到${centerColor}, 历史[${this.colorHistory.length}]: ${this.colorHistory.join(',')}`)
      
      // 统计各颜色出现次数
      const colorCounts = {}
      for (const c of this.colorHistory) {
        colorCounts[c] = (colorCounts[c] || 0) + 1
      }
      
      // 找出出现次数最多的颜色
      let maxColor = null
      let maxCount = 0
      for (const [c, count] of Object.entries(colorCounts)) {
        if (count > maxCount) {
          maxColor = c
          maxCount = count
        }
      }
      
      const threshold = Math.floor(this.colorHistoryMax * 0.6)  // 60%阈值
      const progress = Math.min(maxCount, threshold)
      
      // 每5帧打印一次日志
      if (this.frameCount % 5 === 0) {
        console.log(`颜色历史[${this.colorHistory.length}]: ${this.colorHistory.slice(-5).join(',')} | 最多: ${maxColor}=${maxCount} | 进度: ${progress}/${threshold}`)
      }
      
      if (maxCount >= threshold && this.colorHistory.length >= this.colorHistoryMax * 0.8) {
        // 稳定检测到某个颜色
        const stableColor = maxColor
        
        if (!this.data.scanned[stableColor]) {
          // 确认这个面
          console.log(`=== 确认面: ${stableColor} ===`)
          this.confirmFace(stableColor, colors)
          this.colorHistory = []  // 清空历史，准备检测下一个面
        }
      } else {
        // 还不够稳定，继续检测（每5帧更新UI）
        if (this.frameCount % 5 === 0) {
          const hintColor = maxColor || centerColor
          this.setData({ 
            hintText: `检测到${this.faceNames[hintColor]}... (${progress}/${threshold})` 
          })
        }
      }
    } catch (err) {
      console.error('帧处理错误:', err)
    }
  },

  extractColorsFromFrame(frame) {
    const { data, width, height } = frame
    
    // 检查数据有效性
    if (!data || !width || !height || width <= 0 || height <= 0) {
      console.log('帧数据无效:', { data: !!data, width, height })
      return null
    }
    
    // 关键：data是ArrayBuffer，需要转成Uint8Array
    const pixels = new Uint8Array(data)
    console.log('帧数据:', { width, height, pixelsLength: pixels.length, firstFew: [pixels[0], pixels[1], pixels[2], pixels[3]] })
    
    const centerX = Math.floor(width / 2)
    const centerY = Math.floor(height / 2)
    const scanSize = Math.min(width, height) * 0.35
    const cellSize = scanSize / 3
    
    const colors = []
    
    // 先取中心块的颜色来判断是哪个面
    const centerAvg = this.getAverageColor(pixels, width, height, centerX, centerY, 20)
    
    // 检查颜色值有效性
    if (!centerAvg || isNaN(centerAvg[0])) {
      console.log('颜色计算失败:', centerAvg)
      return { colors: null, centerColor: null, avgRgb: [0, 0, 0], hsv: { h: 0, s: 0, v: 0 } }
    }
    
    const hsv = colorDetector.rgbToHsv(centerAvg[0], centerAvg[1], centerAvg[2])
    
    // 识别中心块颜色
    const centerColor = colorDetector.detectColor(centerAvg)
    
    // 即使检测不到颜色，也返回结果（用于调试）
    if (!centerColor) {
      return { colors: null, centerColor: null, avgRgb: centerAvg, hsv }
    }
    
    // 取9个格子的颜色
    for (let row = 0; row < 3; row++) {
      colors[row] = []
      for (let col = 0; col < 3; col++) {
        const sampleX = Math.floor(centerX - scanSize / 2 + col * cellSize + cellSize / 2)
        const sampleY = Math.floor(centerY - scanSize / 2 + row * cellSize + cellSize / 2)
        const avgColor = this.getAverageColor(pixels, width, height, sampleX, sampleY, 12)
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
          // 检查索引是否有效
          if (idx >= 0 && idx + 2 < data.length) {
            r += data[idx] || 0
            g += data[idx + 1] || 0
            b += data[idx + 2] || 0
            count++
          }
        }
      }
    }
    
    if (count === 0) {
      return [128, 128, 128] // 返回灰色而不是NaN
    }
    
    return [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
  },

  confirmFace(face, colors) {
    console.log('确认面:', face, colors)
    
    const scanned = { ...this.data.scanned }
    const cubeColors = { ...this.data.cubeColors }
    
    scanned[face] = true
    cubeColors[face] = colors
    
    const newCount = this.data.scannedCount + 1
    
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
    
    if (newCount >= 6) {
      this.stopScanning()
      this.setData({ 
        statusText: '扫描完成',
        hintText: '点击"开始还原"继续'
      })
    }
  },

  stopScanning() {
    console.log('=== stopScanning 被调用 ===')
    console.trace('stopScanning 调用栈')  // 打印调用栈
    if (this.listener) {
      try {
        this.listener.stop()
        console.log('帧监听已停止')
      } catch (e) {
        console.log('停止帧监听时出错:', e)
      }
      this.listener = null
    }
    this.setData({ isScanning: false })
  },

  resetScan() {
    console.log('=== resetScan 被调用 ===')
    console.trace('resetScan 调用栈')
    this.stopScanning()
    this.lastDetectedFace = null
    this.faceStableCount = 0
    this.frameCount = 0
    this.colorHistory = []  // 清空颜色历史
    this._frameTotalCount = 0
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
      const cubeColors = { ...this.data.cubeColors }
      delete cubeColors[face]
      this.setData({ scanned, scannedCount: this.data.scannedCount - 1, cubeColors })
    }
  },

  onCameraError(e) {
    console.error('摄像头错误:', e.detail)
    wx.showToast({ title: '摄像头错误', icon: 'none' })
  },

  goToSolve() {
    // 验证状态
    const state = this.data.cubeColors
    const faces = ['U', 'D', 'F', 'B', 'L', 'R']
    
    for (const face of faces) {
      if (!state[face]) {
        wx.showModal({
          title: '扫描不完整',
          content: `缺少 ${this.faceNames[face]} 的数据`,
          showCancel: false
        })
        return
      }
    }
    
    const app = getApp()
    app.globalData.cubeState = state
    
    wx.navigateTo({ url: '/pages/solve/solve' })
  }
})
