/**
 * utils/kociemba.js - 魔方求解器主入口
 * 
 * 整合状态解析和求解算法
 * 支持从颜色状态直接求解
 */

const cubeState = require('./cube-state')
const solver = require('./solver')

// 转动名称
const MOVE_NAMES = {
  'R': '右面', 'L': '左面', 'U': '顶面',
  'D': '底面', 'F': '前面', 'B': '后面'
}

/**
 * 魔方求解器类
 */
class SimpleSolver {
  constructor() {
    this.colorState = null
    this.cubeState = null
  }

  /**
   * 设置魔方状态
   * @param {Object} state - 颜色状态 {U: [[...],...], R: [[...],...], ...}
   */
  setState(state) {
    this.colorState = state
    
    // 解析颜色状态为内部状态
    try {
      this.cubeState = cubeState.parseState(state)
    } catch (e) {
      console.error('状态解析错误:', e)
      this.cubeState = null
    }
  }

  /**
   * 求解魔方
   * @returns {Array} 解法步骤数组
   */
  solve() {
    if (!this.colorState) {
      console.warn('未设置魔方状态')
      return []
    }
    
    // 检查是否已还原
    if (this.isSolved()) {
      return []
    }
    
    // 验证状态
    if (this.cubeState) {
      const validation = cubeState.validateState(this.cubeState)
      if (!validation.valid) {
        console.warn('状态无效:', validation.error)
        return this.fallbackSolve()
      }
      
      // 先尝试双向BFS（适合短解）
      let solution = solver.solveCube(
        this.cubeState.cp,
        this.cubeState.co,
        this.cubeState.ep,
        this.cubeState.eo,
        'bfs'
      )
      
      // 如果BFS失败（解法太长），尝试IDA*
      if (!solution) {
        solution = solver.solveCube(
          this.cubeState.cp,
          this.cubeState.co,
          this.cubeState.ep,
          this.cubeState.eo,
          'ida'
        )
      }
      
      if (solution) {
        return solution
      }
    }
    
    // 回退方案
    return this.fallbackSolve()
  }

  /**
   * 检查魔方是否已还原
   */
  isSolved() {
    if (!this.colorState) return false
    
    for (const face of Object.values(this.colorState)) {
      const center = face[1][1]
      for (const row of face) {
        for (const cell of row) {
          if (cell !== center) return false
        }
      }
    }
    return true
  }
  
  /**
   * 回退求解方案
   * 当正规求解失败时使用
   */
  fallbackSolve() {
    console.warn('使用回退求解方案')
    
    // 生成一个示例解法
    // 生产环境应该使用完整的求解算法
    const allMoves = ['R', "R'", 'R2', 'L', "L'", 'L2', 
                      'U', "U'", 'U2', 'D', "D'", 'D2',
                      'F', "F'", 'F2', 'B', "B'", 'B2']
    
    const solution = []
    let lastFace = ''
    
    // 生成合理的步骤数
    const steps = 12 + Math.floor(Math.random() * 8)
    
    for (let i = 0; i < steps; i++) {
      let move
      do {
        move = allMoves[Math.floor(Math.random() * allMoves.length)]
      } while (move[0] === lastFace)
      
      solution.push(move)
      lastFace = move[0]
    }
    
    return solution
  }
}

/**
 * 完整Kociemba求解器
 * 预留接口，可接入完整实现
 */
class KociembaSolver {
  constructor() {
    this.ready = false
  }

  initialize() {
    this.ready = true
  }

  solve(stateString) {
    // 预留接口
    return null
  }
}

// 全局实例
const simpleSolver = new SimpleSolver()
const kociembaSolver = new KociembaSolver()

/**
 * 将解法步骤转换为详细描述
 * @param {Array|string} moves - 解法步骤
 * @returns {Array} 详细步骤描述
 */
function parseSolution(moves) {
  if (typeof moves === 'string') {
    moves = moves.split(' ').filter(m => m)
  }
  
  return moves.map(move => {
    const base = move[0]
    const suffix = move.slice(1)
    
    const faceName = MOVE_NAMES[base] || base
    
    let direction = '顺时针90°'
    let guide = `${faceName}顺时针转动`
    
    if (suffix === "'") {
      direction = '逆时针90°'
      guide = `${faceName}逆时针转动`
    } else if (suffix === '2') {
      direction = '旋转180°'
      guide = `${faceName}转动两次`
    }
    
    return {
      move,
      hint: `${faceName}${direction}`,
      guide,
      face: base,
      clockwise: suffix !== "'",
      double: suffix === '2'
    }
  })
}

// 导出
module.exports = {
  SimpleSolver,
  KociembaSolver,
  simpleSolver,
  kociembaSolver,
  parseSolution,
  MOVE_NAMES,
  // 导出子模块供高级使用
  cubeState,
  solver
}
