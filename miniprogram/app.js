// app.js - 魔方求解器小程序入口
App({
  globalData: {
    cubeState: null,      // 魔方状态
    solution: null,       // 还原步骤
    currentStep: 0        // 当前步骤
  },

  onLaunch() {
    console.log('Cube Solver 启动')
  }
})
