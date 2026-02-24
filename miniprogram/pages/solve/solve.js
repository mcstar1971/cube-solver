// pages/solve/solve.js - 魔方还原引导页面

Page({
  data: {
    currentStep: 1,
    totalSteps: 20,
    currentMove: 'R',
    moveHint: '右侧顺时针 90°',
    guideText: '握住魔方，绿色面朝向你，执行右侧顺时针转动',
    progress: 5
  },

  // 还原步骤（示例，实际由算法生成）
  solution: [],
  
  // 魔方状态
  cubeState: null,

  onLoad() {
    const app = getApp()
    this.cubeState = app.globalData.cubeState
    
    // 生成还原步骤
    this.generateSolution()
  },

  onReady() {
    // 初始化3D魔方
    this.initCube3D()
  },

  // 生成还原步骤
  generateSolution() {
    // TODO: 集成Kociemba算法
    // 这里先用示例步骤
    this.solution = [
      { move: 'R', hint: '右侧顺时针 90°', guide: '握住魔方，绿色面朝向你，执行右侧顺时针转动' },
      { move: 'U', hint: '顶面顺时针 90°', guide: '保持握持姿势，转动顶层' },
      { move: "R'", hint: '右侧逆时针 90°', guide: '右侧往回转' },
      { move: "U'", hint: '顶面逆时针 90°', guide: '顶层往回转' },
      { move: 'R', hint: '右侧顺时针 90°', guide: '继续右侧顺时针' },
      { move: 'U', hint: '顶面顺时针 90°', guide: '转动顶层' },
      { move: "R'", hint: '右侧逆时针 90°', guide: '右侧逆时针' },
      { move: "U'", hint: '顶面逆时针 90°', guide: '顶层逆时针' },
    ]

    this.setData({ 
      totalSteps: this.solution.length 
    })
    this.updateStep(1)
  },

  // 初始化3D魔方渲染
  initCube3D() {
    // TODO: 使用 three-platformize 渲染3D魔方
    // 小程序WebGL适配
    console.log('初始化3D魔方...')
  },

  // 更新当前步骤
  updateStep(step) {
    if (step < 1 || step > this.solution.length) return

    const move = this.solution[step - 1]
    const progress = (step / this.solution.length) * 100

    this.setData({
      currentStep: step,
      currentMove: move.move,
      moveHint: move.hint,
      guideText: move.guide,
      progress
    })

    // 更新3D魔方动画
    this.animateMove(move.move)
  },

  // 播放转动动画
  animateMove(move) {
    // TODO: 3D动画实现
    console.log('执行动作:', move)
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
        title: '恭喜！',
        content: '魔方已还原',
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
    // TODO: 旋转3D视角
  }
})
