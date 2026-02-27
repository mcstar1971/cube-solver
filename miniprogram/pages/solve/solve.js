// pages/solve/solve.js - 魔方还原引导页面

const kociemba = require('../../utils/kociemba')

// 面信息
const FACE_INFO = {
  U: { name: '顶面', color: '白色', emoji: '⬜' },
  D: { name: '底面', color: '黄色', emoji: '🟨' },
  F: { name: '前面', color: '红色', emoji: '🟥' },
  B: { name: '后面', color: '橙色', emoji: '🟧' },
  L: { name: '左面', color: '绿色', emoji: '🟩' },
  R: { name: '右面', color: '蓝色', emoji: '🟦' }
}

Page({
  data: {
    currentStep: 1,
    totalSteps: 0,
    currentMove: '--',
    moveHint: '准备开始',
    guideText: '握住魔方，绿色面（左面）朝向自己',
    progress: 0,
    solution: [],
    cubeState: null,
    moveGuide: {
      faceName: '',
      faceColor: '',
      directionDesc: '',
      arrow: ''
    }
  },

  onLoad() {
    const app = getApp()
    const state = app.globalData.cubeState
    
    console.log('接收到的魔方状态:', state)
    
    if (!state) {
      wx.showToast({ title: '魔方状态无效', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    
    this.setData({ cubeState: state })
    this.cubeState = state
    
    this.generateSolution()
  },

  generateSolution() {
    const solver = kociemba.simpleSolver
    solver.setState(this.cubeState)
    
    if (solver.isSolved()) {
      wx.showModal({
        title: '魔方已还原',
        content: '这个魔方已经是还原状态',
        showCancel: false,
        success: () => wx.navigateBack()
      })
      return
    }

    console.log('开始求解...')
    const moves = solver.solve()
    console.log('解法:', moves)
    
    if (!moves || moves.length === 0) {
      wx.showModal({
        title: '求解失败',
        content: '无法找到解法，请重新扫描',
        showCancel: false,
        success: () => wx.navigateBack()
      })
      return
    }
    
    const solution = kociemba.parseSolution(moves)
    console.log('解析后的步骤:', solution)
    
    this.setData({ 
      solution,
      totalSteps: solution.length
    })
    
    if (solution.length > 0) {
      this.updateStep(1)
    }
  },

  updateStep(step) {
    if (step < 1 || step > this.data.solution.length) return

    const moveData = this.data.solution[step - 1]
    const progress = (step / this.data.solution.length) * 100

    // 生成详细的操作指南
    const moveGuide = this.generateMoveGuide(moveData.move)
    
    this.setData({
      currentStep: step,
      currentMove: moveData.move,
      moveHint: moveData.hint,
      guideText: moveData.guide,
      progress,
      moveGuide
    })
    
    console.log(`步骤 ${step}: ${moveData.move} - ${moveGuide.directionDesc}`)
  },

  // 生成详细操作指南
  generateMoveGuide(move) {
    const face = move[0]  // U, D, F, B, L, R
    const suffix = move.slice(1)  // '', ', 2
    
    const faceInfo = FACE_INFO[face]
    
    let directionDesc = ''
    let arrow = ''
    
    if (suffix === '2') {
      directionDesc = '转180度（转两次）'
      arrow = '↻↻'
    } else if (suffix === "'") {
      directionDesc = '逆时针转90度'
      arrow = '↺'
    } else {
      directionDesc = '顺时针转90度'
      arrow = '↻'
    }
    
    // 添加视角提示
    let viewHint = ''
    if (face === 'U') {
      viewHint = '从上往下看'
    } else if (face === 'D') {
      viewHint = '从下往上看（把魔方倒过来）'
    } else if (face === 'F') {
      viewHint = '正对前面看'
    } else if (face === 'B') {
      viewHint = '从后面看（把魔方转过来）'
    } else if (face === 'L') {
      viewHint = '正对左面看'
    } else if (face === 'R') {
      viewHint = '正对右面看'
    }
    
    return {
      faceName: faceInfo.name,
      faceColor: faceInfo.color,
      directionDesc: `${viewHint}，${directionDesc}`,
      arrow: `${faceInfo.emoji} ${arrow}`
    }
  },

  prevStep() {
    if (this.data.currentStep > 1) {
      this.updateStep(this.data.currentStep - 1)
    }
  },

  nextStep() {
    if (this.data.currentStep < this.data.totalSteps) {
      this.updateStep(this.data.currentStep + 1)
    } else {
      wx.showModal({
        title: '🎉 恭喜！',
        content: `魔方已还原，共 ${this.data.totalSteps} 步`,
        showCancel: false,
        success: () => wx.navigateBack()
      })
    }
  }
})
