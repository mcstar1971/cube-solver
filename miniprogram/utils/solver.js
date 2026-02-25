/**
 * solver.js - 魔方求解算法
 * 
 * 使用IDA*搜索算法
 * 适用于小程序环境，无需预计算表
 */

// 移动定义
const MOVES = ['U', "U'", 'U2', 'D', "D'", 'D2', 'R', "R'", 'R2', 'L', "L'", 'L2', 'F', "F'", 'F2', 'B', "B'", 'B2']

// 角块转动表
const CORNER_PERM_TABLE = [
  [1, 0, 4, 5], // U: URF->UFL->DLF->DFR
  [0, 3, 7, 4], // R: URF->UBR->DRB->DFR
  [0, 1, 2, 3], // F: URF->UFL->ULB->UBR
  [5, 4, 7, 6], // D: DLF->DFR->DRB->DBL
  [2, 1, 5, 6], // L: ULB->UFL->DLF->DBL
  [3, 2, 6, 7]  // B: UBR->ULB->DBL->DRB
]

const CORNER_ORI_TABLE = [
  [0, 0, 0, 0], // U
  [2, 1, 2, 1], // R
  [1, 2, 1, 2], // F
  [0, 0, 0, 0], // D
  [1, 2, 1, 2], // L
  [1, 2, 1, 2]  // B
]

// 棱块转动表
const EDGE_PERM_TABLE = [
  [0, 1, 2, 3],   // U: UR->UF->UL->UB
  [0, 8, 4, 11],  // R: UR->FR->DR->BR
  [1, 9, 5, 8],   // F: UF->FL->DF->FR
  [5, 4, 7, 6],   // D: DF->DR->DB->DL
  [2, 10, 6, 9],  // L: UL->BL->DL->FL
  [3, 11, 7, 10]  // B: UB->BR->DB->BL
]

const EDGE_ORI_TABLE = [
  [0, 0, 0, 0],   // U
  [0, 0, 0, 0],   // R
  [1, 1, 1, 1],   // F
  [0, 0, 0, 0],   // D
  [1, 1, 1, 1],   // L
  [1, 1, 1, 1]    // B
]

/**
 * 魔方状态类
 */
class CubeState {
  constructor(cp, co, ep, eo) {
    this.cp = cp || [0, 1, 2, 3, 4, 5, 6, 7]
    this.co = co || [0, 0, 0, 0, 0, 0, 0, 0]
    this.ep = ep || [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    this.eo = eo || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  }
  
  clone() {
    return new CubeState(
      this.cp.slice(),
      this.co.slice(),
      this.ep.slice(),
      this.eo.slice()
    )
  }
  
  isSolved() {
    for (let i = 0; i < 8; i++) {
      if (this.cp[i] !== i || this.co[i] !== 0) return false
    }
    for (let i = 0; i < 12; i++) {
      if (this.ep[i] !== i || this.eo[i] !== 0) return false
    }
    return true
  }
  
  applyMove(moveStr) {
    const face = 'UDRLFB'.indexOf(moveStr[0])
    const times = moveStr.includes('2') ? 2 : (moveStr.includes("'") ? 3 : 1)
    
    for (let t = 0; t < times; t++) {
      this.applySingleMove(face)
    }
    
    return this
  }
  
  applySingleMove(face) {
    // 应用角块变换
    const cpCycle = CORNER_PERM_TABLE[face]
    const coDelta = CORNER_ORI_TABLE[face]
    
    const newCp = this.cp.slice()
    const newCo = this.co.slice()
    
    // 循环排列
    newCp[cpCycle[0]] = this.cp[cpCycle[3]]
    newCp[cpCycle[1]] = this.cp[cpCycle[0]]
    newCp[cpCycle[2]] = this.cp[cpCycle[1]]
    newCp[cpCycle[3]] = this.cp[cpCycle[2]]
    
    // 方向变化
    newCo[cpCycle[0]] = (this.co[cpCycle[3]] + coDelta[3]) % 3
    newCo[cpCycle[1]] = (this.co[cpCycle[0]] + coDelta[0]) % 3
    newCo[cpCycle[2]] = (this.co[cpCycle[1]] + coDelta[1]) % 3
    newCo[cpCycle[3]] = (this.co[cpCycle[2]] + coDelta[2]) % 3
    
    this.cp = newCp
    this.co = newCo
    
    // 应用棱块变换
    const epCycle = EDGE_PERM_TABLE[face]
    const eoDelta = EDGE_ORI_TABLE[face]
    
    const newEp = this.ep.slice()
    const newEo = this.eo.slice()
    
    // 循环排列
    newEp[epCycle[0]] = this.ep[epCycle[3]]
    newEp[epCycle[1]] = this.ep[epCycle[0]]
    newEp[epCycle[2]] = this.ep[epCycle[1]]
    newEp[epCycle[3]] = this.ep[epCycle[2]]
    
    // 方向变化
    newEo[epCycle[0]] = (this.eo[epCycle[3]] + eoDelta[3]) % 2
    newEo[epCycle[1]] = (this.eo[epCycle[0]] + eoDelta[0]) % 2
    newEo[epCycle[2]] = (this.eo[epCycle[1]] + eoDelta[1]) % 2
    newEo[epCycle[3]] = (this.eo[epCycle[2]] + eoDelta[2]) % 2
    
    this.ep = newEp
    this.eo = newEo
    
    return this
  }
  
  // 启发式估计
  heuristic() {
    // 计算角块和棱块的曼哈顿距离估计
    let h = 0
    
    // 角块
    for (let i = 0; i < 8; i++) {
      if (this.cp[i] !== i) h++
      if (this.co[i] !== 0) h++
    }
    
    // 棱块
    for (let i = 0; i < 12; i++) {
      if (this.ep[i] !== i) h++
      if (this.eo[i] !== 0) h++
    }
    
    // 每步最多影响约8个块，所以除以8
    return Math.ceil(h / 8)
  }
  
  // 序列化（用于去重）
  toString() {
    return this.cp.join(',') + '|' + this.co.join(',') + '|' + this.ep.join(',') + '|' + this.eo.join(',')
  }
}

/**
 * IDA* 求解器
 */
class IDASolver {
  constructor(maxDepth = 22) {
    this.maxDepth = maxDepth
    this.solution = null
    this.nodeCount = 0
  }
  
  solve(state) {
    if (state.isSolved()) return []
    
    this.solution = null
    this.nodeCount = 0
    
    // 迭代加深
    for (let depth = 0; depth <= this.maxDepth; depth++) {
      this.nodeCount = 0
      const path = []
      
      if (this.search(state, depth, -1, path)) {
        return this.solution
      }
      
      // 如果搜索节点过多，可能无解
      if (this.nodeCount > 1000000) {
        console.warn('搜索节点过多')
        break
      }
    }
    
    return null
  }
  
  search(state, depth, lastFace, path) {
    this.nodeCount++
    
    if (state.isSolved()) {
      this.solution = path.slice()
      return true
    }
    
    if (depth <= 0) return false
    
    // 启发式剪枝
    const h = state.heuristic()
    if (h > depth) return false
    
    // 尝试所有可能的移动
    for (const move of MOVES) {
      // 剪枝：避免连续同面或相对面
      const face = 'UDRLFB'.indexOf(move[0])
      if (lastFace >= 0) {
        // 同一面
        if (face === lastFace) continue
        // 相对面 (U-D, R-L, F-B)
        if ((face === 0 && lastFace === 1) || (face === 1 && lastFace === 0)) continue
        if ((face === 2 && lastFace === 3) || (face === 3 && lastFace === 2)) continue
        if ((face === 4 && lastFace === 5) || (face === 5 && lastFace === 4)) continue
      }
      
      // 应用移动
      const newState = state.clone().applyMove(move)
      path.push(move)
      
      if (this.search(newState, depth - 1, face, path)) {
        return true
      }
      
      path.pop()
    }
    
    return false
  }
}

/**
 * 双向BFS求解器
 * 更快但内存消耗更大
 */
class BidirectionalBFSSolver {
  constructor(maxDepth = 14) {
    this.maxDepth = maxDepth
  }
  
  solve(state) {
    if (state.isSolved()) return []
    
    const startState = state.toString()
    const goalState = new CubeState().toString()
    
    // 从起点和终点同时搜索
    const forward = { [startState]: [] }
    const backward = { [goalState]: [] }
    
    const forwardQueue = [{ state: state.clone(), path: [] }]
    const backwardQueue = [{ state: new CubeState(), path: [] }]
    
    for (let depth = 0; depth <= this.maxDepth; depth++) {
      // 扩展正向
      const newForwardQueue = []
      for (const { state: s, path } of forwardQueue) {
        const key = s.toString()
        
        // 检查是否与反向相遇
        if (backward[key]) {
          return path.concat(this.inversePath(backward[key]))
        }
        
        if (path.length >= Math.ceil(this.maxDepth / 2)) continue
        
        // 扩展
        for (const move of MOVES) {
          if (path.length > 0 && move[0] === path[path.length - 1][0]) continue
          
          const newState = s.clone().applyMove(move)
          const newKey = newState.toString()
          
          if (!forward[newKey]) {
            forward[newKey] = [...path, move]
            newForwardQueue.push({ state: newState, path: forward[newKey] })
          }
        }
      }
      forwardQueue.length = 0
      forwardQueue.push(...newForwardQueue)
      
      // 扩展反向
      const newBackwardQueue = []
      for (const { state: s, path } of backwardQueue) {
        const key = s.toString()
        
        // 检查是否与正向相遇
        if (forward[key]) {
          return forward[key].concat(this.inversePath(path))
        }
        
        if (path.length >= Math.ceil(this.maxDepth / 2)) continue
        
        // 扩展
        for (const move of MOVES) {
          if (path.length > 0 && move[0] === path[path.length - 1][0]) continue
          
          const newState = s.clone().applyMove(move)
          const newKey = newState.toString()
          
          if (!backward[newKey]) {
            backward[newKey] = [...path, move]
            newBackwardQueue.push({ state: newState, path: backward[newKey] })
          }
        }
      }
      backwardQueue.length = 0
      backwardQueue.push(...newBackwardQueue)
    }
    
    return null
  }
  
  inversePath(path) {
    return path.map(m => {
      if (m.includes('2')) return m
      if (m.includes("'")) return m[0]
      return m + "'"
    }).reverse()
  }
}

/**
 * 主求解接口
 */
function solveCube(cp, co, ep, eo, method = 'ida') {
  const state = new CubeState(cp, co, ep, eo)
  
  if (method === 'bfs') {
    const solver = new BidirectionalBFSSolver(14)
    return solver.solve(state)
  } else {
    const solver = new IDASolver(22)
    return solver.solve(state)
  }
}

// 导出
module.exports = {
  CubeState,
  IDASolver,
  BidirectionalBFSSolver,
  solveCube,
  MOVES
}
