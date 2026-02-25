/**
 * state-converter.js - 魔方状态转换器
 * 将扫描得到的颜色状态转换为求解器格式
 */

// 魔方标准配色
const STANDARD_COLORS = {
  U: 'W', // 白色
  R: 'B', // 蓝色
  F: 'R', // 红色
  D: 'Y', // 黄色
  L: 'G', // 绿色
  B: 'O'  // 橙色
}

// 颜色名称映射
const COLOR_NAMES = {
  'W': 'white', 'B': 'blue', 'R': 'red',
  'Y': 'yellow', 'G': 'green', 'O': 'orange',
  'WHT': 'white', 'BLU': 'blue', 'RED': 'red',
  'YEL': 'yellow', 'GRN': 'green', 'ORG': 'orange'
}

/**
 * 检测魔方配色方案
 * 根据中心块确定每个面对应的颜色
 */
function detectColorScheme(state) {
  const scheme = {}
  
  for (const [face, grid] of Object.entries(state)) {
    // 中心块在 3x3 网格的 [1][1] 位置
    scheme[grid[1][1]] = face
  }
  
  return scheme
}

/**
 * 将颜色状态转换为 URFDLB 顺序的字符串
 * Kociemba 算法使用这个格式
 */
function stateToKociembaString(state) {
  // 首先检测配色方案
  const scheme = detectColorScheme(state)
  
  // URFDLB 顺序
  const faceOrder = ['U', 'R', 'F', 'D', 'L', 'B']
  let result = ''
  
  for (const face of faceOrder) {
    const grid = state[face]
    if (!grid) return null
    
    for (const row of grid) {
      for (const color of row) {
        // 将颜色转换为对应的面
        result += scheme[color] || '?'
      }
    }
  }
  
  return result
}

/**
 * 将颜色状态转换为求解器可处理的格式
 * 
 * 输入格式：
 * {
 *   U: [['W','W','W'], ['W','W','W'], ['W','W','W']],
 *   R: [['B','B','B'], ['B','B','B'], ['B','B','B']],
 *   ...
 * }
 * 
 * 输出：能产生该状态的打乱序列
 */
function stateToScramble(state) {
  const kociembaStr = stateToKociembaString(state)
  
  if (!kociembaStr || kociembaStr.includes('?')) {
    console.error('Invalid state:', kociembaStr)
    return null
  }
  
  // 检查是否已还原
  if (isSolved(kociembaStr)) {
    return ''
  }
  
  // 这是一个复杂的逆向问题
  // 简化方案：从标准状态开始，搜索能到达目标状态的序列
  
  // 由于完整逆向搜索很慢，我们使用一个技巧：
  // 1. 生成随机打乱
  // 2. 比较状态
  // 3. 逐步优化
  
  // 这在生产环境需要更高效的实现
  return null
}

/**
 * 检查状态是否已还原
 */
function isSolved(kociembaStr) {
  if (!kociembaStr || kociembaStr.length !== 54) return false
  
  // 每个面的9个色块应该相同
  const faces = ['U', 'R', 'F', 'D', 'L', 'B']
  for (let i = 0; i < 6; i++) {
    const start = i * 9
    const faceStr = kociembaStr.slice(start, start + 9)
    const center = faceStr[4] // 中心块
    for (const c of faceStr) {
      if (c !== center) return false
    }
  }
  
  return true
}

/**
 * 简化的求解接口
 * 接受颜色状态，返回解法
 * 
 * 由于完整的逆向搜索很复杂，这里使用启发式方法
 */
function solveFromState(state, solver) {
  const kociembaStr = stateToKociembaString(state)
  
  if (!kociembaStr) {
    return { error: '无效的魔方状态' }
  }
  
  // 检查是否已还原
  if (isSolved(kociembaStr)) {
    return { solution: '', moves: [] }
  }
  
  // 验证状态有效性
  if (!isValidState(kociembaStr)) {
    return { error: '魔方状态不可解，请重新扫描' }
  }
  
  // 尝试逆向求解
  // 这是一个简化实现，完整版需要更复杂的算法
  const scramble = findScrambleForState(kociembaStr, solver)
  
  if (scramble) {
    // 解法是打乱的逆
    const solution = inverseScramble(scramble)
    return { solution, scramble }
  }
  
  // 回退到层先法
  return { error: '需要完整实现', fallback: true }
}

/**
 * 验证状态是否有效
 * 检查色块数量和可解性
 */
function isValidState(kociembaStr) {
  if (kociembaStr.length !== 54) return false
  
  // 统计每个面的色块数量
  const counts = {}
  for (const c of kociembaStr) {
    counts[c] = (counts[c] || 0) + 1
  }
  
  // 每个面应该有恰好9个色块
  for (const face of ['U', 'R', 'F', 'D', 'L', 'B']) {
    if (counts[face] !== 9) return false
  }
  
  // TODO: 检查角块和棱块的有效性
  
  return true
}

/**
 * 查找能产生目标状态的打乱序列
 * 使用迭代加深搜索
 */
function findScrambleForState(targetStr, solver) {
  // 这是一个复杂的搜索问题
  // 简化实现：使用BFS在有限深度内搜索
  
  const targetState = parseKociembaString(targetStr)
  
  // BFS搜索
  const maxDepth = 7 // 限制深度
  const queue = [{ state: getSolvedState(), path: [] }]
  const visited = new Set()
  
  while (queue.length > 0) {
    const { state, path } = queue.shift()
    
    if (path.length > maxDepth) continue
    
    const stateStr = stateToString(state)
    if (visited.has(stateStr)) continue
    visited.add(stateStr)
    
    // 检查是否到达目标
    if (stateEquals(state, targetState)) {
      return path.join(' ')
    }
    
    // 扩展
    const moves = ['R', "R'", 'R2', 'L', "L'", 'L2', 
                   'U', "U'", 'U2', 'D', "D'", 'D2',
                   'F', "F'", 'F2', 'B', "B'", 'B2']
    
    for (const move of moves) {
      // 避免连续同面
      if (path.length > 0 && move[0] === path[path.length - 1][0]) continue
      
      const newState = applyMove(state, move)
      queue.push({ state: newState, path: [...path, move] })
    }
  }
  
  return null
}

/**
 * 获取已还原状态
 */
function getSolvedState() {
  return {
    cp: [0, 1, 2, 3, 4, 5, 6, 7], // 角块排列
    co: [0, 0, 0, 0, 0, 0, 0, 0], // 角块方向
    ep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // 棱块排列
    eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]  // 棱块方向
  }
}

/**
 * 解析Kociemba字符串为内部状态
 */
function parseKociembaString(str) {
  // 简化实现
  // 完整实现需要解析角块和棱块的位置和方向
  return { raw: str }
}

/**
 * 状态转字符串（用于去重）
 */
function stateToString(state) {
  return JSON.stringify(state)
}

/**
 * 比较两个状态是否相同
 */
function stateEquals(s1, s2) {
  return JSON.stringify(s1) === JSON.stringify(s2)
}

/**
 * 应用一个转动
 */
function applyMove(state, move) {
  // 简化实现
  return state
}

/**
 * 反转打乱序列
 */
function inverseScramble(scramble) {
  const moves = scramble.split(' ')
  return moves.map(m => {
    const base = m[0]
    const suffix = m.slice(1)
    if (suffix === '') return base + "'"
    if (suffix === "'") return base
    return m // '2' 不变
  }).reverse().join(' ')
}

// ============================================================
// 导出
// ============================================================

module.exports = {
  detectColorScheme,
  stateToKociembaString,
  stateToScramble,
  solveFromState,
  isSolved,
  isValidState,
  inverseScramble,
  STANDARD_COLORS,
  COLOR_NAMES
}
