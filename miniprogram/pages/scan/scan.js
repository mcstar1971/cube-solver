// pages/scan/scan.js - 拍照模式（调试版）

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
    debugInfo: ''
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
    
    // 获取图片信息
    wx.getImageInfo({
      src: photoPath,
      success: (info) => {
        console.log('图片信息:', info.width, 'x', info.height)
        
        // 创建离屏 canvas
        const canvas = wx.createOffscreenCanvas({
          type: '2d',
          width: Math.min(info.width, 600),
          height: Math.min(info.height, 600)
        })
        const ctx = canvas.getContext('2d')
        
        // 创建图片对象
        const img = canvas.createImage()
        img.onload = () => {
          // 计算缩放
          const scale = Math.min(canvas.width / info.width, canvas.height / info.height)
          const drawWidth = info.width * scale
          const drawHeight = info.height * scale
          
          canvas.width = drawWidth
          canvas.height = drawHeight
          
          // 绘制图片
          ctx.drawImage(img, 0, 0, drawWidth, drawHeight)
          
          // 获取像素数据
          const imageData = ctx.getImageData(0, 0, drawWidth, drawHeight)
          
          // 分析颜色
          const result = this.analyzeColors(imageData, drawWidth, drawHeight, face)
          
          this.showDetectionResult(face, photoPath, result.colors, result.debug)
        }
        
        img.onerror = (err) => {
          console.error('图片加载失败:', err)
          // 使用模拟数据
          this.showDetectionResult(face, photoPath, this.simulateColors(face), '图片加载失败')
        }
        
        img.src = photoPath
      },
      fail: (err) => {
        console.error('获取图片信息失败:', err)
        this.showDetectionResult(face, photoPath, this.simulateColors(face), '获取图片信息失败')
      }
    })
  },

  // 分析图片中的魔方颜色
  analyzeColors(imageData, width, height, expectedFace) {
    const { data } = imageData
    
    // 中心点
    const centerX = Math.floor(width / 2)
    const centerY = Math.floor(height / 2)
    
    // 扫描区域大小（假设魔方占画面中心70%）
    const scanSize = Math.min(width, height) * 0.5
    const cellSize = scanSize / 3
    
    const colors = []
    const debugRows = []
    
    // 取9个格子的颜色
    for (let row = 0; row < 3; row++) {
      colors[row] = []
      debugRows[row] = []
      
      for (let col = 0; col < 3; col++) {
        const sampleX = Math.floor(centerX - scanSize / 2 + col * cellSize + cellSize / 2)
        const sampleY = Math.floor(centerY - scanSize / 2 + row * cellSize + cellSize / 2)
        
        // 获取平均颜色
        const avgColor = this.getAverageColor(data, width, height, sampleX, sampleY, Math.floor(cellSize / 4))
        const [r, g, b] = avgColor
        
        // 识别颜色
        const detected = colorDetector.detectColor(avgColor)
        colors[row][col] = detected || expectedFace
        
        // 调试信息
        debugRows[row][col] = `RGB(${r},${g},${b})→${detected || '?'}`
      }
    }
    
    const debug = debugRows.map(row => row.join(' | ')).join('\n')
    
    return { colors, debug }
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

  // 模拟颜色（备用）
  simulateColors(face) {
    return [
      [face, face, face],
      [face, face, face],
      [face, face, face]
    ]
  },

  // 显示识别结果
  showDetectionResult(face, photoPath, colors, debug = '') {
    this.setData({
      showResultModal: true,
      isProcessing: false,
      detectedColors: colors,
      currentPhotoFace: face,
      currentPhotoPath: photoPath,
      debugInfo: debug,
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
      itemList: ['重新拍摄', '查看照片', '查看识别结果'],
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
        } else if (res.tapIndex === 2) {
          // 查看识别结果
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
            currentPhotoPath: null,
            debugInfo: ''
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
