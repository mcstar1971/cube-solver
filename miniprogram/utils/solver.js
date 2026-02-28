/**
 * solver.js - 魔方求解算法（实用版）
 * 
 * 策略：直接用IDA*配合强启发式
 * 不搞复杂的分阶段，专注把启发式做好
 */

const MOVES = ['U', "U'", 'U2', 'D', "D'", 'D2', 'R', "R'", 'R2', 'L', "L'", 'L2', 'F', "F'", 'F2', 'B', "B'", 'B2']

// 角块转动表
const CORNER_PERM_TABLE = [
  [1, 0, 4, 5], [0, 3, 7, 4], [0, 1, 2, 3],
  [5, 4, 7, 6], [2, 1, 5, 6], [3, 2, 6, 7]
]

const CORNER_ORI_TABLE = [
  [0, 0, 0, 0], [2, 1, 2, 1], [1, 2, 1, 2],
  [0, 0, 0, 0], [1, 2, 1, 2], [1, 2, 1, 2]
]

const EDGE_PERM_TABLE = [
  [0, 1, 2, 3], [0, 8, 4, 11], [1, 9, 5, 8],
  [5, 4, 7, 6], [2, 10, 6, 9], [3, 11, 7, 10]
]

const EDGE_ORI_TABLE = [
  [0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1],
  [0, 0, 0, 0], [1, 1, 1, 1], [1, 1, 1, 1]
]

// 相对面映射
const OPPOSITE_FACE = { 0: 1, 1: 0, 2: 3, 3: 2, 4: 5, 5: 4 }

class CubeState {
  constructor(cp, co, ep, eo) {
    this.cp = cp || [0, 1, 2, 3, 4, 5, 6, 7]
    this.co = co || [0, 0, 0, 0, 0, 0, 0, 0]
    this.ep = ep || [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    this.eo = eo || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  }
  
  clone() {
    return new CubeState(this.cp.slice(), this.co.slice(), this.ep.slice(), this.eo.slice())
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
    // 角块
    const cpCycle = CORNER_PERM_TABLE[face]
    const coDelta = CORNER_ORI_TABLE[face]
    const newCp = this.cp.slice()
    const newCo = this.co.slice()
    
    newCp[cpCycle[0]] = this.cp[cpCycle[3]]
    newCp[cpCycle[1]] = this.cp[cpCycle[0]]
    newCp[cpCycle[2]] = this.cp[cpCycle[1]]
    newCp[cpCycle[3]] = this.cp[cpCycle[2]]
    
    newCo[cpCycle[0]] = (this.co[cpCycle[3]] + coDelta[3]) % 3
    newCo[cpCycle[1]] = (this.co[cpCycle[0]] + coDelta[0]) % 3
    newCo[cpCycle[2]] = (this.co[cpCycle[1]] + coDelta[1]) % 3
    newCo[cpCycle[3]] = (this.co[cpCycle[2]] + coDelta[2]) % 3
    
    this.cp = newCp
    this.co = newCo
    
    // 棱块
    const epCycle = EDGE_PERM_TABLE[face]
    const eoDelta = EDGE_ORI_TABLE[face]
    const newEp = this.ep.slice()
    const newEo = this.eo.slice()
    
    newEp[epCycle[0]] = this.ep[epCycle[3]]
    newEp[epCycle[1]] = this.ep[epCycle[0]]
    newEp[epCycle[2]] = this.ep[epCycle[1]]
    newEp[epCycle[3]] = this.ep[epCycle[2]]
    
    newEo[epCycle[0]] = (this.eo[epCycle[3]] + eoDelta[3]) % 2
    newEo[epCycle[1]] = (this.eo[epCycle[0]] + eoDelta[0]) % 2
    newEo[epCycle[2]] = (this.eo[epCycle[1]] + eoDelta[1]) % 2
    newEo[epCycle[3]] = (this.eo[epCycle[2]] + eoDelta[2]) % 2
    
    this.ep = newEp
    this.eo = newEo
    return this
  }
  
  /**
   * 强启发式：组合多个下界估计
   */
  heuristic() {
    // 1. 角块排列的循环计数
    let cpCycles = 0
    const cpVisited = [false, false, false, false, false, false, false, false]
    for (let i = 0; i < 8; i++) {
      if (!cpVisited[i]) {
        let j = i, len = 0
        while (!cpVisited[j]) {
          cpVisited[j] = true
          j = this.cp[j]
          len++
        }
        if (len > 1) cpCycles += len - 1
      }
    }
    
    // 2. 棱块排列的循环计数
    let epCycles = 0
    const epVisited = [false, false, false, false, false, false, false, false, false, false, false, false]
    for (let i = 0; i < 12; i++) {
      if (!epVisited[i]) {
        let j = i, len = 0
        while (!epVisited[j]) {
          epVisited[j] = true
          j = this.ep[j]
          len++
        }
        if (len > 1) epCycles += len - 1
      }
    }
    
    // 3. 方向错误计数
    let coWrong = 0, eoWrong = 0
    for (let i = 0; i < 8; i++) if (this.co[i] !== 0) coWrong++
    for (let i = 0; i < 12; i++) if (this.eo[i] !== 0) eoWrong++
    
    // 一次转动最多影响：4个角块位置，4个棱块位置，4个角块方向，4个棱块方向
    // 所以下界是各维度独立估计的最大值
    const h1 = Math.ceil(cpCycles / 4)
    const h2 = Math.ceil(epCycles / 4)
    const h3 = Math.ceil(coWrong / 4)
    const h4 = Math.ceil(eoWrong / 4)
    
    return Math.max(h1, h2, h3, h4)
  }
  
  toString() {
    return `${this.cp.join('')}.${this.co.join('')}.${this.ep.join('')}.${this.eo.join('')}`
  }
}

/**
 * IDA* 求解器
 */
class IDASolver {
  constructor(maxDepth = 20, maxNodes = 1000000) {
    this.maxDepth = maxDepth
    this.maxNodes = maxNodes
    this.nodeCount = 0
  }
  
  solve(state) {
    if (state.isSolved()) return []
    
    const h0 = state.heuristic()
    
    for (let depth = h0; depth <= this.maxDepth; depth++) {
      this.nodeCount = 0
      const path = []
      
      if (this.search(state, depth, -1, path)) {
        return path
      }
      
      if (this.nodeCount > this.maxNodes) {
        console.log(`IDA* 深度${depth}节点超限:`, this.nodeCount)
        return null
      }
    }
    return null
  }
  
  search(state, depth, lastFace, path) {
    this.nodeCount++
    
    if (state.isSolved()) return true
    if (depth <= 0) return false
    
    const h = state.heuristic()
    if (h > depth) return false
    
    for (const move of MOVES) {
      const face = 'UDRLFB'.indexOf(move[0])
      
      // 剪枝：避免连续同面或相对面
      if (lastFace >= 0) {
        if (face === lastFace) continue
        if (OPPOSITE_FACE[face] === lastFace) continue
      }
      
      path.push(move)
      if (this.search(state.clone().applyMove(move), depth - 1, face, path)) {
        return true
      }
      path.pop()
    }
    
    return false
  }
}

/**
 * 双向BFS求解器（限制深度）
 */
class BidirectionalBFSSolver {
  constructor(maxDepth = 12) {
    this.maxDepth = maxDepth
  }
  
  solve(state) {
    if (state.isSolved()) return []
    
    const forward = new Map()
    const backward = new Map()
    forward.set(state.toString(), [])
    backward.set(new CubeState().toString(), [])
    
    let fQueue = [{ s: state.clone(), p: [] }]
    let bQueue = [{ s: new CubeState(), p: [] }]
    const halfDepth = Math.floor(this.maxDepth / 2)
    
    for (let d = 0; d <= this.maxDepth; d++) {
      // 检查相遇
      for (const { s, p } of fQueue) {
        const k = s.toString()
        if (backward.has(k)) {
          return p.concat(this.inverse(backward.get(k)))
        }
      }
      
      // 限制深度
      if (fQueue.length > 0 && fQueue[0].p.length >= halfDepth) {
        // 只扩展反向
        bQueue = this.expand(bQueue, backward, forward, halfDepth)
      } else if (bQueue.length > 0 && bQueue[0].p.length >= halfDepth) {
        // 只扩展正向
        fQueue = this.expand(fQueue, forward, backward, halfDepth)
      } else {
        // 双向扩展
        fQueue = this.expand(fQueue, forward, backward, halfDepth)
        bQueue = this.expand(bQueue, backward, forward, halfDepth)
      }
      
      if (fQueue.length === 0 && bQueue.length === 0) break
    }
    
    return null
  }
  
  expand(queue, visited, other, maxLen) {
    const newQueue = []
    for (const { s, p } of queue) {
      if (p.length >= maxLen) continue
      
      for (const move of MOVES) {
        if (p.length > 0 && move[0] === p[p.length - 1][0]) continue
        
        const ns = s.clone().applyMove(move)
        const k = ns.toString()
        
        if (!visited.has(k)) {
          const np = [...p, move]
          visited.set(k, np)
          newQueue.push({ s: ns, p: np })
        }
      }
    }
    return newQueue
  }
  
  inverse(path) {
    return path.map(m => m.includes('2') ? m : (m.includes("'") ? m[0] : m + "'")).reverse()
  }
}

/**
 * 组合求解器：先BFS，再IDA*
 */
class CombinedSolver {
  solve(state) {
    if (state.isSolved()) return []
    
    // 先试BFS（快但内存大）
    const bfs = new BidirectionalBFSSolver(12)
    let solution = bfs.solve(state)
    if (solution) {
      console.log('BFS求解:', solution.length, '步')
      return solution
    }
    
    // BFS失败，用IDA*
    console.log('切换IDA*...')
    const ida = new IDASolver(20, 500000)
    solution = ida.solve(state)
    if (solution) {
      console.log('IDA*求解:', solution.length, '步, 节点:', ida.nodeCount)
    }
    return solution
  }
}

function solveCube(cp, co, ep, eo, method = 'combined') {
  const state = new CubeState(cp, co, ep, eo)
  if (method === 'bfs') return new BidirectionalBFSSolver(12).solve(state)
  if (method === 'ida') return new IDASolver(20).solve(state)
  return new CombinedSolver().solve(state)
}

module.exports = {
  CubeState,
  IDASolver,
  BidirectionalBFSSolver,
  CombinedSolver,
  solveCube,
  MOVES
}
