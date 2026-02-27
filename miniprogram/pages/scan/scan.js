// pages/scan/scan.js - 拍照模式（调试版 v2）

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
    
    // 当前识别的颜色（用于弹窗预览）
    detectedColors: null,
    currentPhotoFace: null,
    currentPhotoPath: null,
    
    // 调试信息
    debugInfo: '',
    
    // 详细调试：每个格子的RGB值
    cellDebugInfo: []
  },

  onLoad() {
    this.checkCameraAuth()
    this.cameraContext = wx.createCameraContext()
  },

  onUnload() {
    // 清理临时图片
    for (const path of Object.values(this.data.facePhotos)) {
      if (path.startsWith(wx.env.USER_DATA_PATH)) {
        wx.removeSavedFile({ filePath: path }).catch(() => {})
      }
    }
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
    
    // 找到下一个未拍摄的面
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

  // 获取下一个要拍摄的面
  getNextFaceToCapture() {
    for (const face of this.data.faceOrder) {
      if (!this.data.captured[face]) {
        return face
      }
    }
    return null
  },

  // 处理照片 - 识别颜色
  processPhoto(photoPath, face) {
    console.log('=== 开始处理照片 ===')
    console.log('照片路径:', photoPath)
    console.log('目标面:', face)
    
    // 获取图片信息
    wx.getImageInfo({
      src: photoPath,
      success: (info) => {
        console.log('图片尺寸:', info.width, 'x', info.height)
        
        // 方法1：尝试离屏canvas
        this.tryOffscreenCanvas(photoPath, info, face)
      },
      fail: (err) => {
        console.error('获取图片信息失败:', err)
        this.useSimulatedResult(face, photoPath, '获取图片信息失败')
      }
    })
  },

  // 尝试离屏canvas
  tryOffscreenCanvas(photoPath, info, face) {
    try {
      const canvas = wx.createOffscreenCanvas({
        type: '2d',
        width: 300,
        height: 300
      })
      const ctx = canvas.getContext('2d')
      
      const img = canvas.createImage()
      img.onload = () => {
        console.log('离屏canvas图片加载成功')
        
        // 缩放绘制
        const scale = Math.min(300 / info.width, 300 / info.height)
        const w = info.width * scale
        const h = info.height * scale
        canvas.width = w
        canvas.height = h
        
        ctx.drawImage(img, 0, 0, w, h)
        
        const imageData = ctx.getImageData(0, 0, w, h)
        console.log('获取到像素数据:', imageData.width, 'x', imageData.height)
        
        const result = this.analyzeColors(imageData, w, h, face)
        this.showDetectionResult(face, photoPath, result.colors, result.debug, result.cellInfo)
      }
      
      img.onerror = (err) => {
        console.error('离屏canvas图片加载失败:', err)
        this.useSimulatedResult(face, photoPath, '图片加载失败')
      }
      
      img.src = photoPath
      
      // 超时保护
      setTimeout(() => {
        if (this.data.isProcessing) {
          console.log('离屏canvas超时，使用备用方案')
          this.useSimulatedResult(face, photoPath, '处理超时')
        }
      }, 3000)
      
    } catch (err) {
      console.error('离屏canvas创建失败:', err)
      this.useSimulatedResult(face, photoPath, 'canvas不支持: ' + err.message)
    }
  },

  // 分析图片中的魔方颜色
  analyzeColors(imageData, width, height, expectedFace) {
    const { data } = imageData
    
    console.log('=== 分析颜色 ===')
    console.log('图像尺寸:', width, 'x', height)
    
    // 中心点
    const centerX = Math.floor(width / 2)
    const centerY = Math.floor(height / 2)
    
    // 扫描区域大小
    const scanSize = Math.min(width, height) * 0.6
    const cellSize = scanSize / 3
    
    const colors = []
    const cellInfo = []
    const debugRows = []
    
    console.log('扫描区域:', scanSize, '格子大小:', cellSize)
    console.log('中心点:', centerX, centerY)
    
    // 取9个格子的颜色
    for (let row = 0; row < 3; row++) {
      colors[row] = []
      cellInfo[row] = []
      debugRows[row] = []
      
      for (let col = 0; col < 3; col++) {
        // 计算采样中心点
        const sampleX = Math.floor(centerX - scanSize / 2 + col * cellSize + cellSize / 2)
        const sampleY = Math.floor(centerY - scanSize / 2 + row * cellSize + cellSize / 2)
        
        // 采样半径
        const radius = Math.max(5, Math.floor(cellSize / 4))
        
        // 获取平均颜色
        const avgColor = this.getAverageColor(data, width, height, sampleX, sampleY, radius)
        const [r, g, b] = avgColor
        
        // RGB转HSV
        const hsv = colorDetector.rgbToHsv(r, g, b)
        
        // 识别颜色
        const detected = colorDetector.detectColor(avgColor)
        colors[row][col] = detected || expectedFace
        
        // 保存详细信息
        cellInfo[row][col] = {
          pos: { x: sampleX, y: sampleY },
          rgb: avgColor,
          hsv: hsv,
          detected: detected || expectedFace
        }
        
        debugRows[row][col] = `(${r},${g},${b}) H${Math.round(hsv.h)}→${detected}`
        
        console.log(`格子[${row}][${col}] 位置(${sampleX},${sampleY}) RGB(${r},${g},${b}) HSV(${Math.round(hsv.h)},${Math.round(hsv.s)},${Math.round(hsv.v)}) → ${detected}`)
      }
    }
    
    const debug = debugRows.map(row => row.join(' | ')).join('\n')
    
    return { colors, debug, cellInfo }
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
            r += data[idx] || 0
            g += data[idx + 1] || 0
            b += data[idx + 2] || 0
            count++
          }
        }
      }
    }
    
    if (count === 0) {
      console.warn('采样区域无效:', centerX, centerY, radius)
      return [128, 128, 128]
    }
    
    return [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
  },

  // 使用模拟结果（备用）
  useSimulatedResult(face, photoPath, reason) {
    console.log('使用模拟结果:', reason)
    
    // 生成模拟数据（调试用：假设该面全是同一颜色）
    const colors = [
      [face, face, face],
      [face, face, face],
      [face, face, face]
    ]
    
    const cellInfo = colors.map((row, ri) => 
      row.map((_, ci) => ({
        pos: { x: 0, y: 0 },
        rgb: [0, 0, 0],
        hsv: { h: 0, s: 0, v: 0 },
        detected: face
      }))
    )
    
    this.showDetectionResult(face, photoPath, colors, `备用方案: ${reason}`, cellInfo)
  },

  // 显示识别结果
  showDetectionResult(face, photoPath, colors, debug = '', cellInfo = []) {
    this.setData({
      showResultModal: true,
      isProcessing: false,
      detectedColors: colors,
      currentPhotoFace: face,
      currentPhotoPath: photoPath,
      debugInfo: debug,
      cellDebugInfo: cellInfo,
      statusText: '请确认识别结果'
    })
  },

  // 确认照片
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
      debugInfo: '',
      cellDebugInfo: [],
      statusText: newCount >= 6 ? '扫描完成！' : '继续拍摄下一面',
      hintText: newCount >= 6 ? '点击"开始还原"继续' : this.getNextHint()
    })
    
    wx.vibrateShort({ type: 'medium' })
    
    // 更新当前面提示
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
      debugInfo: '',
      cellDebugInfo: [],
      statusText: '请重新拍摄'
    })
  },

  // 更新当前面提示
  updateCurrentFaceHint() {
    const nextFace = this.getNextFaceToCapture()
    if (nextFace) {
      this.setData({
        currentFaceName: this.data.faceNames[nextFace]
      })
    }
  },

  // 获取下一个提示
  getNextHint() {
    const nextFace = this.getNextFaceToCapture()
    if (!nextFace) return ''
    return `请拍摄${this.data.faceNames[nextFace]}`
  },

  // 点击已拍摄的面
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
            wx.previewImage({
              urls: [photoPath],
              current: photoPath
            })
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

  // 重置
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
            debugInfo: '',
            cellDebugInfo: []
          })
        }
      }
    })
  },

  // 开始求解
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
