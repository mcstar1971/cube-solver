// pages/solve/solve.js - 魔方还原引导页面

const kociemba = require('../../utils/kociemba')

Page({
  data: {
    currentStep: 1,
    totalSteps: 0,
    currentMove: '--',
    moveHint: '准备开始',
    guideText: '握住魔方，绿色面朝向自己',
    progress: 0,
    solution: [],
    cubeState: null
  },

  onLoad() {
    const app = getApp()
    this.cubeState = app.globalData.cubeState
    
    // 生成还原步骤
    this.generateSolution()
  },

  onReady() {
    // 初始化Canvas绘制
    this.drawCube()
  },

  // 生成还原步骤
  generateSolution() {
    if (!this.cubeState) {
      wx.showToast({ title: '魔方状态无效', icon: 'none' })
      return
    }

    // 使用求解器
    const solver = kociemba.simpleSolver
    solver.setState(this.cubeState)
    
    // 检查是否已还原
    if (solver.isSolved()) {
      wx.showModal({
        title: '魔方已还原',
        content: '这个魔方不需要还原',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
      return
    }

    // 获取解法
    const moves = solver.solve()
    const solution = kociemba.parseSolution(moves)
    
    this.setData({ 
      solution,
      totalSteps: solution.length
    })
    
    if (solution.length > 0) {
      this.updateStep(1)
    }
  },

  // 绘制魔方（简化2D版本）
  drawCube() {
    const query = wx.createSelectorQuery()
    query.select('#cubeCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return
        
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        
        canvas.width = res[0].width * 2
        canvas.height = res[0].height * 2
        ctx.scale(2, 2)
        
        this.canvas = canvas
        this.ctx = ctx
        
        this.renderCube()
      })
  },

  // 渲染魔方
  renderCube() {
    if (!this.ctx) return
    
    const ctx = this.ctx
    const width = this.canvas.width / 2
    const height = this.canvas.height / 2
    
    // 清空画布
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, width, height)
    
    // 绘制等距视角的魔方
    this.drawIsometricCube(ctx, width / 2, height / 2, 80)
  },

  // 绘制等距魔方
  drawIsometricCube(ctx, cx, cy, size) {
    const state = this.cubeState
    if (!state) return
    
    // 颜色映射
    const colorMap = {
      'U': '#FFFFFF', 'D': '#FFFF00',
      'F': '#FF0000', 'B': '#FFA500',
      'L': '#00FF00', 'R': '#0000FF'
    }
    
    const cellSize = size / 3
    const angle = Math.PI / 6  // 30度
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    
    // 绘制三个可见面：顶面(U)、前面(F)、右面(R)
    
    // 顶面
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const color = state.U ? colorMap[state.U[row][col]] : '#888'
        this.drawIsoCell(ctx, cx, cy - size * 0.5, row, col, cellSize, color, 'top', cos, sin)
      }
    }
    
    // 前面
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const color = state.F ? colorMap[state.F[row][col]] : '#888'
        this.drawIsoCell(ctx, cx, cy + size * 0.2, row, col, cellSize, color, 'front', cos, sin)
      }
    }
    
    // 右面
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const color = state.R ? colorMap[state.R[row][col]] : '#888'
        this.drawIsoCell(ctx, cx + size * 0.7, cy, row, col, cellSize, color, 'right', cos, sin)
      }
    }
  },

  // 绘制等距格子
  drawIsoCell(ctx, baseX, baseY, row, col, size, color, face, cos, sin) {
    ctx.fillStyle = color
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    
    const x = col * size
    const y = row * size
    
    ctx.beginPath()
    
    if (face === 'top') {
      // 菱形
      const cx = baseX + (x - 1.5 * size) * cos - (y - 1.5 * size) * cos
      const cy = baseY - (x - 1.5 * size) * sin - (y - 1.5 * size) * sin
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + size * cos, cy - size * sin)
      ctx.lineTo(cx, cy - size * 2 * sin)
      ctx.lineTo(cx - size * cos, cy - size * sin)
    } else if (face === 'front') {
      // 平行四边形
      const cx = baseX + (x - 1.5 * size)
      const cy = baseY + (y - 1.5 * size)
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + size, cy)
      ctx.lineTo(cx + size, cy + size)
      ctx.lineTo(cx, cy + size)
    } else if (face === 'right') {
      // 平行四边形（斜的）
      const cx = baseX + (y - 1.5 * size) * cos
      const cy = baseY + (x - 1.5 * size) * sin + (y - 1.5 * size) * sin
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + size * cos, cy - size * sin)
      ctx.lineTo(cx + size * cos, cy + size - size * sin)
      ctx.lineTo(cx, cy + size)
    }
    
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  },

  // 更新当前步骤
  updateStep(step) {
    if (step < 1 || step > this.data.solution.length) return

    const moveData = this.data.solution[step - 1]
    const progress = (step / this.data.solution.length) * 100

    this.setData({
      currentStep: step,
      currentMove: moveData.move,
      moveHint: moveData.hint,
      guideText: moveData.guide,
      progress
    })

    // 绘制当前转动指示
    this.highlightFace(moveData.face)
  },

  // 高亮要转动的面
  highlightFace(face) {
    // TODO: 在3D魔方上高亮显示
    console.log('高亮面:', face)
  },

  // 上一步
  prevStep() {
    if (this.data.currentStep > 1) {
      this.updateStep(this.data.currentStep - 1)
    }
  },

  // 下一步
  nextStep() {
    if (this.data.currentStep < this.data.totalSteps) {
      this.updateStep(this.data.currentStep + 1)
    } else {
      // 完成
      const app = getApp()
      app.globalData.solution = this.data.solution
      
      wx.showModal({
        title: '🎉 恭喜！',
        content: `魔方已还原，共 ${this.data.totalSteps} 步`,
        showCancel: false,
        success: () => {
          wx.redirectTo({
            url: '/pages/result/result'
          })
        }
      })
    }
  },

  // 触摸旋转魔方视角
  onTouchStart(e) {
    this.touchStartX = e.touches[0].clientX
    this.touchStartY = e.touches[0].clientY
  },

  onTouchMove(e) {
    // TODO: 旋转视角
  }
})
