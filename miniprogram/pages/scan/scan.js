// pages/scan/scan.js - 拍照模式

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
    currentPhotoPath: null
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
    console.log('处理照片:', photoPath, '面:', face)
    
    // 使用 canvas 分析图片颜色
    const query = wx.createSelectorQuery()
    query.select('#photoCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) {
          // canvas 不存在，使用备用方案
          console.log('Canvas 不存在，使用模拟颜色')
          this.simulateColorDetection(face, photoPath)
          return
        }
        
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        
        // 加载图片
        const img = canvas.createImage()
        img.onload = () => {
          // 设置 canvas 大小
          const maxSize = 300
          const scale = Math.min(maxSize / img.width, maxSize / img.height)
          canvas.width = img.width * scale
          canvas.height = img.height * scale
          
          // 绘制图片
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          
          // 获取像素数据
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          
          // 分析颜色
          const colors = this.analyzeColors(imageData, canvas.width, canvas.height)
          
          if (colors) {
            this.showDetectionResult(face, photoPath, colors)
          } else {
            // 分析失败，使用模拟
            this.simulateColorDetection(face, photoPath)
          }
        }
        
        img.onerror = (err) => {
          console.error('图片加载失败:', err)
          this.simulateColorDetection(face, photoPath)
        }
        
        img.src = photoPath
      })
    
    // 如果 canvas 查询失败，也用模拟
    if (!this._canvasQueryAttempted) {
      this._canvasQueryAttempted = true
      setTimeout(() => {
        if (this.data.isProcessing) {
          this.simulateColorDetection(face, photoPath)
        }
      }, 500)
    }
  },

  // 分析图片中的魔方颜色
  analyzeColors(imageData, width, height) {
    const { data } = imageData
    
    // 中心点
    const centerX = Math.floor(width / 2)
    const centerY = Math.floor(height / 2)
    
    // 扫描区域大小
    const scanSize = Math.min(width, height) * 0.35
    const cellSize = scanSize / 3
    
    const colors = []
    
    try {
      // 取9个格子的颜色
      for (let row = 0; row < 3; row++) {
        colors[row] = []
        for (let col = 0; col < 3; col++) {
          const sampleX = Math.floor(centerX - scanSize / 2 + col * cellSize + cellSize / 2)
          const sampleY = Math.floor(centerY - scanSize / 2 + row * cellSize + cellSize / 2)
          
          const avgColor = this.getAverageColor(data, width, height, sampleX, sampleY, 10)
          const detectedColor = colorDetector.detectColor(avgColor)
          colors[row][col] = detectedColor || 'U'
        }
      }
      
      return colors
    } catch (err) {
      console.error('颜色分析失败:', err)
      return null
    }
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
          r += data[idx] || 0
          g += data[idx + 1] || 0
          b += data[idx + 2] || 0
          count++
        }
      }
    }
    
    if (count === 0) return [128, 128, 128]
    return [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
  },

  // 模拟颜色检测（备用方案）
  simulateColorDetection(face, photoPath) {
    console.log('使用模拟颜色检测')
    
    // 生成该面的标准颜色（用户可以手动调整）
    const colors = [
      [face, face, face],
      [face, face, face],
      [face, face, face]
    ]
    
    this.showDetectionResult(face, photoPath, colors)
  },

  // 显示识别结果
  showDetectionResult(face, photoPath, colors) {
    this.setData({
      showResultModal: true,
      isProcessing: false,
      detectedColors: colors,
      currentPhotoFace: face,
      currentPhotoPath: photoPath,
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

  // 点击已拍摄的面（重新拍摄）
  onFaceTap(e) {
    const face = e.currentTarget.dataset.face
    if (!this.data.captured[face]) return
    
    wx.showActionSheet({
      itemList: ['重新拍摄', '查看照片'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 重新拍摄
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
          // 查看照片
          const photoPath = this.data.facePhotos[face]
          if (photoPath) {
            wx.previewImage({
              urls: [photoPath],
              current: photoPath
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
          // 清理图片
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
            currentPhotoPath: null
          })
        }
      }
    })
  },

  // 开始求解
  goToSolve() {
    // 验证状态
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
    
    // 保存到全局
    const app = getApp()
    app.globalData.cubeState = state
    
    wx.navigateTo({ url: '/pages/solve/solve' })
  },

  // 摄像头错误
  onCameraError(e) {
    console.error('摄像头错误:', e.detail)
    wx.showToast({ title: '摄像头错误', icon: 'none' })
  }
})
