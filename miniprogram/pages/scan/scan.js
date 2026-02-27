// pages/scan/scan.js - 拍照模式（调试版 v3）

const colorDetector = require('../../utils/color-detector')

Page({
  data: {
    // 当前状态
    statusText: '准备拍摄',
    hintText: '请按顺序拍摄魔方的6个面',
    isProcessing: false,
    showResultModal: false,
    
    // 面的顺序：白、黄、红、橙、绿、蓝
    faceOrder: ['U', 'D', 'F', 'B', 'L', 'R'],
    
    // 面的信息
    faceNames: {
      U: '白色面（顶面）',
      D: '黄色面（底面）', 
      F: '红色面（前面）',
      B: '橙色面（后面）',
      L: '绿色面（左面）',
      R: '蓝色面（右面）'
    },
    
    faceShortNames: {
      U: '白', D: '黄', F: '红', B: '橙', L: '绿', R: '蓝'
    },
    
    faceIcons: {
      U: '⬜', D: '🟨', F: '🟥', B: '🟧', L: '🟩', R: '🟦'
    },
    
    colorLabels: {
      U: '白', D: '黄', F: '红', B: '橙', L: '绿', R: '蓝'
    },
    
    // 当前要拍的面
    currentFaceIndex: 0,
    currentFaceName: '白色面（顶面）',
    
    // 已拍摄的照片
    facePhotos: {},
    captured: {},
    capturedCount: 0,
    
    // 魔方颜色状态
    cubeColors: {},
    
    // 当前识别的颜色
    detectedColors: null,
    currentPhotoFace: null,
    currentPhotoPath: null,
    
    // 调试信息
    cellDebugInfo: [],
    
    // canvas 相关
    canvasWidth: 300,
    canvasHeight: 300
  },

  onLoad() {
    this.checkCameraAuth()
    this.cameraContext = wx.createCameraContext()
  },

  onReady() {
    // 初始化 canvas
    this.initCanvas()
  },

  onUnload() {
    for (const path of Object.values(this.data.facePhotos)) {
      if (path.startsWith(wx.env.USER_DATA_PATH)) {
        wx.removeSavedFile({ filePath: path }).catch(() => {})
      }
    }
  },

  initCanvas() {
    const query = wx.createSelectorQuery()
    query.select('#photoCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res && res[0]) {
          this.canvas = res[0].node
          this.ctx = this.canvas.getContext('2d')
          console.log('Canvas 初始化成功')
        } else {
          console.warn('Canvas 初始化失败')
        }
      })
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

  // 拍照
  takePhoto() {
    if (this.data.isProcessing) return
    
    const nextFace = this.getNextFaceToCapture()
    if (!nextFace) {
      this.goToSolve()
      return
    }
    
    this.setData({ 
      isProcessing: true,
      statusText: '拍照中...'
    })
    
    this.cameraContext.takePhoto({
      quality: 'high',
      success: (res) => {
        console.log('拍照成功:', res.tempImagePath)
        this.processPhoto(res.tempImagePath, nextFace)
      },
      fail: (err) => {
        console.error('拍照失败:', err)
        wx.showToast({ title: '拍照失败', icon: 'none' })
        this.setData({ isProcessing: false, statusText: '拍照失败，请重试' })
      }
    })
  },

  getNextFaceToCapture() {
    for (const face of this.data.faceOrder) {
      if (!this.data.captured[face]) {
        return face
      }
    }
    return null
  },

  // 处理照片
  processPhoto(photoPath, face) {
    console.log('=== 开始处理照片 ===')
    console.log('照片:', photoPath, '面:', face)
    
    // 获取图片信息
    wx.getImageInfo({
      src: photoPath,
      success: (info) => {
        console.log('图片尺寸:', info.width, 'x', info.height)
        this.loadImageToCanvas(photoPath, info, face)
      },
      fail: (err) => {
        console.error('获取图片信息失败:', err)
        this.showFallbackResult(face, photoPath)
      }
    })
  },

  // 加载图片到canvas
  loadImageToCanvas(photoPath, info, face) {
    if (!this.canvas) {
      console.error('Canvas 未初始化')
      this.showFallbackResult(face, photoPath)
      return
    }
    
    const canvas = this.canvas
    const ctx = this.ctx
    
    // 计算缩放后的尺寸
    const maxSize = 400
    const scale = Math.min(maxSize / info.width, maxSize / info.height)
    const width = Math.floor(info.width * scale)
    const height = Math.floor(info.height * scale)
    
    canvas.width = width
    canvas.height = height
    
    console.log('Canvas尺寸:', width, 'x', height)
    
    // 创建图片对象
    const img = canvas.createImage()
    
    img.onload = () => {
      console.log('图片加载成功，开始绘制')
      
      // 清空画布
      ctx.clearRect(0, 0, width, height)
      
      // 绘制图片
      ctx.drawImage(img, 0, 0, width, height)
      
      console.log('图片绘制完成，开始读取像素')
      
      // 获取像素数据
      try {
        const imageData = ctx.getImageData(0, 0, width, height)
        console.log('像素数据:', imageData.width, 'x', imageData.height, '长度:', imageData.data.length)
        
        // 分析颜色
        const result = this.analyzeColors(imageData, width, height, face)
        
        if (result && result.colors) {
          this.setData({
            showResultModal: true,
            isProcessing: false,
            detectedColors: result.colors,
            currentPhotoFace: face,
            currentPhotoPath: photoPath,
            cellDebugInfo: result.cellInfo,
            statusText: '请确认识别结果'
          })
        } else {
          this.showFallbackResult(face, photoPath)
        }
      } catch (err) {
        console.error('读取像素失败:', err)
        this.showFallbackResult(face, photoPath)
      }
    }
    
    img.onerror = (err) => {
      console.error('图片加载失败:', err)
      this.showFallbackResult(face, photoPath)
    }
    
    img.src = photoPath
  },

  // 分析颜色
  analyzeColors(imageData, width, height, expectedFace) {
    const { data } = imageData
    
    console.log('=== 分析颜色 ===')
    console.log('图像尺寸:', width, 'x', height)
    
    // 验证数据有效性
    if (!data || data.length === 0) {
      console.error('像素数据无效')
      return null
    }
    
    // 检查数据前几个像素
    console.log('前几个像素:', 
      `R=${data[0]} G=${data[1]} B=${data[2]} A=${data[3]}`,
      `R=${data[4]} G=${data[5]} B=${data[6]} A=${data[7]}`
    )
    
    // 中心点
    const centerX = Math.floor(width / 2)
    const centerY = Math.floor(height / 2)
    
    // 扫描区域
    const scanSize = Math.min(width, height) * 0.55
    const cellSize = scanSize / 3
    
    const colors = []
    const cellInfo = []
    
    console.log('扫描区域:', scanSize, '格子大小:', cellSize)
    
    for (let row = 0; row < 3; row++) {
      colors[row] = []
      cellInfo[row] = []
      
      for (let col = 0; col < 3; col++) {
        const sampleX = Math.floor(centerX - scanSize / 2 + col * cellSize + cellSize / 2)
        const sampleY = Math.floor(centerY - scanSize / 2 + row * cellSize + cellSize / 2)
        const radius = Math.max(8, Math.floor(cellSize / 5))
        
        // 获取平均颜色
        const avgColor = this.getAverageColor(data, width, height, sampleX, sampleY, radius)
        const [r, g, b] = avgColor
        
        // 计算HSV
        const hsv = colorDetector.rgbToHsv(r, g, b)
        
        // 识别颜色
        const detected = colorDetector.detectColor(avgColor)
        colors[row][col] = detected || expectedFace
        
        // 保存调试信息
        cellInfo[row][col] = {
          rgb: avgColor,
          hsv: hsv,
          detected: detected || expectedFace
        }
        
        console.log(`格子[${row}][${col}] RGB(${r},${g},${b}) HSV(${Math.round(hsv.h)},${Math.round(hsv.s)},${Math.round(hsv.v)}) → ${detected}`)
      }
    }
    
    return { colors, cellInfo }
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
          if (idx >= 0 && idx + 2 < data.length) {
            r += data[idx]
            g += data[idx + 1]
            b += data[idx + 2]
            count++
          }
        }
      }
    }
    
    if (count === 0) {
      return [128, 128, 128]
    }
    
    return [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
  },

  // 备用方案：直接显示照片让用户手动输入
  showFallbackResult(face, photoPath) {
    // 生成该面的默认颜色（全部是当前面）
    const colors = [
      [face, face, face],
      [face, face, face],
      [face, face, face]
    ]
    
    const cellInfo = colors.map(row => 
      row.map(() => ({
        rgb: [0, 0, 0],
        hsv: { h: 0, s: 0, v: 0 },
        detected: face
      }))
    )
    
    this.setData({
      showResultModal: true,
      isProcessing: false,
      detectedColors: colors,
      currentPhotoFace: face,
      currentPhotoPath: photoPath,
      cellDebugInfo: cellInfo,
      statusText: '自动识别失败，请确认为当前面'
    })
  },

  // 确认
  confirmPhoto() {
    const face = this.data.currentPhotoFace
    const colors = this.data.detectedColors
    const photoPath = this.data.currentPhotoPath
    
    const facePhotos = { ...this.data.facePhotos }
    const captured = { ...this.data.captured }
    const cubeColors = { ...this.data.cubeColors }
    
    facePhotos[face] = photoPath
    captured[face] = true
    cubeColors[face] = colors
    
    const newCount = this.data.capturedCount + 1
    
    this.setData({
      showResultModal: false,
      facePhotos,
      captured,
      capturedCount: newCount,
      cubeColors,
      detectedColors: null,
      currentPhotoFace: null,
      currentPhotoPath: null,
      cellDebugInfo: [],
      statusText: newCount >= 6 ? '扫描完成！' : '继续拍摄下一面',
      hintText: newCount >= 6 ? '点击"开始还原"继续' : this.getNextHint()
    })
    
    wx.vibrateShort({ type: 'medium' })
    this.updateCurrentFaceHint()
  },

  // 重拍
  retryPhoto() {
    this.setData({
      showResultModal: false,
      isProcessing: false,
      detectedColors: null,
      currentPhotoFace: null,
      currentPhotoPath: null,
      cellDebugInfo: [],
      statusText: '请重新拍摄'
    })
  },

  updateCurrentFaceHint() {
    const nextFace = this.getNextFaceToCapture()
    if (nextFace) {
      this.setData({
        currentFaceName: this.data.faceNames[nextFace]
      })
    }
  },

  getNextHint() {
    const nextFace = this.getNextFaceToCapture()
    if (!nextFace) return ''
    return `请拍摄${this.data.faceNames[nextFace]}`
  },

  onFaceTap(e) {
    const face = e.currentTarget.dataset.face
    if (!this.data.captured[face]) return
    
    wx.showActionSheet({
      itemList: ['重新拍摄', '查看照片', '查看识别结果'],
      success: (res) => {
        if (res.tapIndex === 0) {
          const captured = { ...this.data.captured }
          const cubeColors = { ...this.data.cubeColors }
          delete captured[face]
          delete cubeColors[face]
          
          this.setData({
            captured,
            cubeColors,
            capturedCount: this.data.capturedCount - 1,
            currentFaceName: this.data.faceNames[face],
            statusText: '请重新拍摄',
            hintText: this.data.faceNames[face]
          })
        } else if (res.tapIndex === 1) {
          const photoPath = this.data.facePhotos[face]
          if (photoPath) {
            wx.previewImage({ urls: [photoPath], current: photoPath })
          }
        } else if (res.tapIndex === 2) {
          const colors = this.data.cubeColors[face]
          if (colors) {
            const colorStr = colors.map(row => row.join(' ')).join('\n')
            wx.showModal({
              title: this.data.faceNames[face],
              content: colorStr,
              showCancel: false
            })
          }
        }
      }
    })
  },

  resetScan() {
    wx.showModal({
      title: '确认重置',
      content: '将清除所有已拍摄的照片，确定吗？',
      success: (res) => {
        if (res.confirm) {
          for (const path of Object.values(this.data.facePhotos)) {
            if (path.startsWith(wx.env.USER_DATA_PATH)) {
              wx.removeSavedFile({ filePath: path }).catch(() => {})
            }
          }
          
          this.setData({
            statusText: '准备拍摄',
            hintText: '请按顺序拍摄魔方的6个面',
            isProcessing: false,
            showResultModal: false,
            currentFaceIndex: 0,
            currentFaceName: '白色面（顶面）',
            facePhotos: {},
            captured: {},
            capturedCount: 0,
            cubeColors: {},
            detectedColors: null,
            currentPhotoFace: null,
            currentPhotoPath: null,
            cellDebugInfo: []
          })
        }
      }
    })
  },

  goToSolve() {
    const state = this.data.cubeColors
    const faces = this.data.faceOrder
    
    for (const face of faces) {
      if (!state[face]) {
        wx.showModal({
          title: '扫描不完整',
          content: `缺少 ${this.data.faceNames[face]} 的数据`,
          showCancel: false
        })
        return
      }
    }
    
    const app = getApp()
    app.globalData.cubeState = state
    
    wx.navigateTo({ url: '/pages/solve/solve' })
  },

  onCameraError(e) {
    console.error('摄像头错误:', e.detail)
    wx.showToast({ title: '摄像头错误', icon: 'none' })
  }
})
