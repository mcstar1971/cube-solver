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
    const state = app.globalData.cubeState
    
    console.log('接收到的魔方状态:', state)
    
    if (!state) {
      wx.showToast({ title: '魔方状态无效', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    
    this.setData({ cubeState: state })
    this.cubeState = state
    
    // 生成还原步骤
    this.generateSolution()
  },

  // 生成还原步骤
  generateSolution() {
    const solver = kociemba.simpleSolver
    solver.setState(this.cubeState)
    
    // 检查是否已还原
    if (solver.isSolved()) {
      wx.showModal({
        title: '魔方已还原',
        content: '这个魔方已经是还原状态',
        showCancel: false,
        success: () => wx.navigateBack()
      })
      return
    }

    // 获取解法
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
    
    console.log(`步骤 ${step}: ${moveData.move} - ${moveData.hint}`)
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
      wx.showModal({
        title: '🎉 恭喜！',
        content: `魔方已还原，共 ${this.data.totalSteps} 步`,
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
    }
  }
})
