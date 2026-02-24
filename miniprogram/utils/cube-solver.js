/**
 * utils/cube-solver.js - 魔方还原算法
 * 
 * 使用Kociemba两阶段算法求解魔方
 * MVP阶段：简化实现，后续可接入完整算法
 */

// 基本转动定义
const MOVES = ['R', 'L', 'U', 'D', 'F', 'B']
const MOVE_SUFFIXES = ['', "'", '2']

/**
 * 魔方求解器类
 */
class CubeSolver {
  constructor() {
    this.state = null
  }

  /**
   * 设置魔方状态
   * @param {Object} state - 各面颜色状态 {U: [[...],...], D: [...], ...}
   */
  setState(state) {
    this.state = state
  }

  /**
   * 求解魔方
   * @returns {Array} 还原步骤数组
   */
  solve() {
    if (!this.state) {
      throw new Error('请先设置魔方状态')
    }

    // 检查是否已还原
    if (this.isSolved()) {
      return []
    }

    // TODO: 实现完整的Kociemba算法
    // MVP阶段：返回示例解法
    // 完整实现需要：
    // 1. 将颜色状态转换为位置状态
    // 2. 运行两阶段算法
    // 3. 优化解法（20步以内）

    return this.getDemoSolution()
  }

  /**
   * 检查是否已还原
   */
  isSolved() {
    if (!this.state) return false
    
    for (const face of Object.values(this.state)) {
      const centerColor = face[1][1]
      for (const row of face) {
        for (const cell of row) {
          if (cell !== centerColor) return false
        }
      }
    }
    return true
  }

  /**
   * 生成步骤说明
   * @param {string} move - 步骤符号 (R, R', R2)
   * @returns {Object} {hint: '...', guide: '...'}
   */
  getMoveDescription(move) {
    const base = move[0]
    const suffix = move.slice(1)
    
    const faceNames = {
      R: '右面',
      L: '左面',
      U: '顶面',
      D: '底面',
      F: '前面',
      B: '后面'
    }

    const directionMap = {
      '': '顺时针 90°',
      "'": '逆时针 90°',
      '2': '旋转 180°'
    }

    const guideMap = {
      '': `${faceNames[base]}往你的方向转动`,
      "'": `${faceNames[base]}往远离你的方向转动`,
      '2': `${faceNames[base]}转动两次`
    }

    return {
      hint: faceNames[base] + directionMap[suffix],
      guide: guideMap[suffix]
    }
  }

  /**
   * 示例解法（MVP阶段）
   */
  getDemoSolution() {
    const moves = ['R', 'U', "R'", "U'", 'R', 'U', "R'", "U'"]
    return moves.map(move => {
      const desc = this.getMoveDescription(move)
      return {
        move,
        hint: desc.hint,
        guide: desc.guide
      }
    })
  }
}

/**
 * 将颜色矩阵转换为Kociemba格式字符串
 * @param {Object} state - 颜色状态
 * @returns {string} Kociemba格式状态字符串
 */
function stateToString(state) {
  // Kociemba使用 URFDLB 顺序
  const faceOrder = ['U', 'R', 'F', 'D', 'L', 'B']
  let str = ''
  
  for (const face of faceOrder) {
    const faceData = state[face]
    for (const row of faceData) {
      for (const cell of row) {
        str += cell
      }
    }
  }
  
  return str
}

// 单例实例
const solver = new CubeSolver()

module.exports = {
  CubeSolver,
  solver,
  stateToString
}
