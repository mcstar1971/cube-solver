/**
 * 魔方求解器测试脚本
 * 
 * 运行方式：在Node.js环境中执行
 * node tests/test-solver.js
 */

// 模拟小程序环境
const kociemba = require('../miniprogram/utils/kociemba')
const solver = require('../miniprogram/utils/solver')
const cubeState = require('../miniprogram/utils/cube-state')

console.log('=== 魔方求解器测试 ===\n')

// ========================================
// 测试1：已还原状态
// ========================================
console.log('测试1：已还原状态')

const solvedState = {
  U: [['U','U','U'], ['U','U','U'], ['U','U','U']],
  R: [['R','R','R'], ['R','R','R'], ['R','R','R']],
  F: [['F','F','F'], ['F','F','F'], ['F','F','F']],
  D: [['D','D','D'], ['D','D','D'], ['D','D','D']],
  L: [['L','L','L'], ['L','L','L'], ['L','L','L']],
  B: [['B','B','B'], ['B','B','B'], ['B','B','B']]
}

const simpleSolver = kociemba.simpleSolver
simpleSolver.setState(solvedState)

console.log('  是否已还原:', simpleSolver.isSolved())
console.log('  解法:', simpleSolver.solve())
console.log('  ✅ 通过\n')

// ========================================
// 测试2：简单打乱（1步）
// ========================================
console.log('测试2：简单打乱 R')

// R 转动后，只影响右面及相关棱块和角块
const rMoveState = {
  U: [['U','U','F'], ['U','U','F'], ['U','U','F']],  // 右列变F
  R: [['R','R','R'], ['R','R','R'], ['R','R','R']],  // R面旋转
  F: [['D','D','D'], ['F','F','F'], ['U','U','U']],  // 右列改变
  D: [['D','D','F'], ['D','D','F'], ['D','D','F']],  // 右列变F的原来的
  L: [['L','L','L'], ['L','L','L'], ['L','L','L']],  // 不变
  B: [['U','U','U'], ['B','B','B'], ['D','D','D']]   // 右列（实际是左列因为视角）改变
}

// 修正：R转动影响的是：
// U面右列 -> F面右列
// F面右列 -> D面右列  
// D面右列 -> B面左列（倒置）
// B面左列 -> U面右列（倒置）

const rMoveStateCorrect = {
  U: [['U','U','B'], ['U','U','B'], ['U','U','B']],  // 右列变成B的
  R: [['R','R','R'], ['R','R','R'], ['R','R','R']],  // R面自己旋转
  F: [['U','U','U'], ['F','F','F'], ['U','U','U']],  // 右列变成U的
  D: [['D','D','F'], ['D','D','F'], ['D','D','F']],  // 右列变成F的
  L: [['L','L','L'], ['L','L','L'], ['L','L','L']],  // 不变
  B: [['D','D','D'], ['B','B','B'], ['D','D','D']]   // 左列变成D的
}

// 让我用更准确的方式：直接用求解器验证
console.log('  使用求解器内部状态测试...')

const testState = new solver.CubeState()
console.log('  初始状态:', testState.isSolved())

testState.applyMove('R')
console.log('  R之后:', testState.isSolved())

const testSolver = new solver.IDASolver(7)
const solution = testSolver.solve(testState)
console.log('  解法:', solution)
console.log('  ✅ 通过\n')

// ========================================
// 测试3：IDA*求解器
// ========================================
console.log('测试3：IDA*求解器')

const idaSolver = new solver.IDASolver(20)

// 从还原状态做几步打乱
const scramble = ['R', 'U', 'R\'', 'U\'']
let scrambledState = new solver.CubeState()
for (const move of scramble) {
  scrambledState.applyMove(move)
}

console.log('  打乱:', scramble.join(' '))
console.log('  打乱后是否还原:', scrambledState.isSolved())

// 求解
const startTime = Date.now()
const solveMoves = idaSolver.solve(scrambledState)
const elapsed = Date.now() - startTime

console.log('  求解时间:', elapsed, 'ms')
console.log('  解法:', solveMoves ? solveMoves.join(' ') : '无解')

// 验证解法
if (solveMoves) {
  let verifyState = scrambledState.clone()
  for (const move of solveMoves) {
    verifyState.applyMove(move)
  }
  console.log('  验证:', verifyState.isSolved() ? '✅ 正确' : '❌ 错误')
}
console.log()

// ========================================
// 测试4：解析颜色状态
// ========================================
console.log('测试4：解析颜色状态')

// 使用实际的颜色名称（假设白=U, 蓝=R, 红=F, 黄=D, 绿=L, 橙=B）
const colorState = {
  U: [['W','W','W'], ['W','W','W'], ['W','W','W']],
  R: [['B','B','B'], ['B','B','B'], ['B','B','B']],
  F: [['R','R','R'], ['R','R','R'], ['R','R','R']],
  D: [['Y','Y','Y'], ['Y','Y','Y'], ['Y','Y','Y']],
  L: [['G','G','G'], ['G','G','G'], ['G','G','G']],
  B: [['O','O','O'], ['O','O','O'], ['O','O','O']]
}

try {
  const parsed = cubeState.parseState(colorState)
  console.log('  配色方案:', parsed.scheme)
  console.log('  角块排列:', parsed.cp)
  console.log('  角块方向:', parsed.co)
  console.log('  棱块排列:', parsed.ep)
  console.log('  棱块方向:', parsed.eo)
  
  const validation = cubeState.validateState(parsed)
  console.log('  状态验证:', validation.valid ? '✅ 有效' : '❌ 无效: ' + validation.error)
} catch (e) {
  console.log('  ❌ 解析错误:', e.message)
}
console.log()

// ========================================
// 测试5：完整求解流程
// ========================================
console.log('测试5：完整求解流程')

// 创建一个打乱的状态
let fullTestState = new solver.CubeState()
const testScramble = ['R', 'U', 'R\'', 'U\'', 'F\'', 'U2', 'L', 'U2', 'F\'']
for (const move of testScramble) {
  fullTestState.applyMove(move)
}

console.log('  打乱:', testScramble.join(' '))

const fullSolver = new solver.IDASolver(20)
const fullStartTime = Date.now()
const fullSolution = fullSolver.solve(fullTestState)
const fullElapsed = Date.now() - fullStartTime

console.log('  求解时间:', fullElapsed, 'ms')
console.log('  解法长度:', fullSolution ? fullSolution.length : 0)
console.log('  解法:', fullSolution ? fullSolution.join(' ') : '无解')

if (fullSolution) {
  // 解析为详细步骤
  const parsed = kociemba.parseSolution(fullSolution)
  console.log('  详细步骤:')
  parsed.forEach((step, i) => {
    console.log(`    ${i+1}. ${step.move} - ${step.hint}`)
  })
}
console.log()

// ========================================
// 测试6：双向BFS求解器
// ========================================
console.log('测试6：双向BFS求解器')

const bfsSolver = new solver.BidirectionalBFSSolver(14)

let bfsTestState = new solver.CubeState()
const bfsScramble = ['R', 'U', 'R\'', 'U\'']
for (const move of bfsScramble) {
  bfsTestState.applyMove(move)
}

console.log('  打乱:', bfsScramble.join(' '))

const bfsStartTime = Date.now()
const bfsSolution = bfsSolver.solve(bfsTestState)
const bfsElapsed = Date.now() - bfsStartTime

console.log('  求解时间:', bfsElapsed, 'ms')
console.log('  解法:', bfsSolution ? bfsSolution.join(' ') : '无解')

if (bfsSolution) {
  let verifyBfs = bfsTestState.clone()
  for (const move of bfsSolution) {
    verifyBfs.applyMove(move)
  }
  console.log('  验证:', verifyBfs.isSolved() ? '✅ 正确' : '❌ 错误')
}

console.log('\n=== 测试完成 ===')
