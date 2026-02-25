/**
 * cube-solver-core.js - Kociemba算法核心实现
 * 从 cube-solver (https://github.com/torjusti/cube-solver) 移植
 * 适配微信小程序
 */

// ============================================================
// 基础工具函数
// ============================================================

const G = [] // 阶乘缓存
function factorial(t) {
  if (t === 0 || t === 1) return 1
  if (G[t]) return G[t]
  G[t] = factorial(t - 1) * t
  return G[t]
}

const J = [] // 组合数缓存
function binomial(e, t) {
  if (e < t) return 0
  for (; e >= J.length;) {
    for (var n = J.length, r = [], o = r[0] = 1, i = n - 1; o < n; o++) 
      r[o] = J[i][o - 1] + J[i][o]
    r[n] = 1
    J.push(r)
  }
  return J[e][t]
}

function shuffle(arr, times) {
  const result = arr.slice()
  for (let i = 0; i < times; i++) {
    const tmp = result[0]
    for (let j = 0; j < arr.length - 1; j++) result[j] = result[j + 1]
    result[arr.length - 1] = tmp
  }
  return result
}

function applyCycle(e, t) {
  var n = e.slice(0)
  n[t[0]] = e[t[t.length - 1]]
  for (var r = 1; r < t.length; r += 1) n[t[r]] = e[t[r - 1]]
  return n
}

function encodePermutation(e, t, n) {
  for (var r = e.length - 1, o = 0, i = 1, a = [], u = 2 < arguments.length && void 0 !== arguments[2] && arguments[2], 
       f = u ? e.length - 1 : 0; u ? 0 <= f : f < e.length; u ? f-- : f++) {
    if (0 <= t.indexOf(e[f])) {
      r = Math.min(r, e[f])
      o += binomial(u ? e.length - 1 - f : f, i)
      a[u ? "unshift" : "push"](e[f])
      i += 1
    }
  }
  for (var l = 0, s = a.length - 1; 0 < s; s--) {
    for (var c = 0; a[s] !== t[s];) {
      const tmp = a[0]
      for (let j = 0; j < s; j++) a[j] = a[j + 1]
      a[s] = tmp
      c++
    }
    l = (s + 1) * l + c
  }
  return factorial(t.length) * o + l
}

function decodePermutation(e, t, n, r) {
  for (var o = factorial(t.length), i = Math.floor(e / o), a = e % o, u = [], f = 0; f < n; f++) u.push(-1)
  for (var l = 1; l < t.length; l++) {
    for (var s = a % (l + 1), a = Math.floor(a / (l + 1)); 0 < s;) {
      const tmp = t[0]
      for (let j = 0; j < l; j++) t[j] = t[j + 1]
      t[l] = tmp
      s--
    }
  }
  var c = t.length - 1
  if (r) {
    for (var h = 0; h < n; h++) {
      var v = binomial(n - 1 - h, c + 1)
      if (0 <= i - v) {
        u[h] = t[t.length - 1 - c]
        i -= v
        c--
      }
    }
  } else {
    for (var d = n - 1; 0 <= d; d--) {
      var g = binomial(d, c + 1)
      if (0 <= i - g) {
        u[d] = t[c]
        i -= g
        c--
      }
    }
  }
  return u
}

function encodeOrientation(e, t) {
  for (var n = 0, r = 0; r < e.length - 1; r++) n = t * n + e[r]
  return n
}

function decodeOrientation(e, t, n) {
  for (var r = [], o = 0, i = t - 2; 0 <= i; i--) {
    var a = e % n
    e = Math.floor(e / n)
    o += r[i] = a
  }
  return r[t - 1] = (n - o % n) % n, r
}

// ============================================================
// 魔方转动定义
// ============================================================

const MOVE_SUFFIXES = { '': 0, '2': 1, "'": 2 }
const MOVE_NAMES = {
  'R': '右面', 'L': '左面', 'U': '顶面',
  'D': '底面', 'F': '前面', 'B': '后面'
}

// 棱块排列转动表
const EDGE_PERM_MOVES = [
  [1, 8, 5, 9],   // U
  [0, 11, 4, 8],  // R
  [1, 2, 3, 0],   // F
  [3, 10, 7, 11], // D
  [2, 9, 6, 10],  // L
  [5, 4, 7, 6]    // B
]

// 角块排列转动表
const CORNER_PERM_MOVES = [
  [1, 0, 4, 5], // U
  [0, 3, 7, 4], // R
  [0, 1, 2, 3], // F
  [3, 2, 6, 7], // D
  [2, 1, 5, 6], // L
  [5, 4, 7, 6]  // B
]

// 棱块方向影响
function edgeOrientationMove(orientation, moveIndex) {
  const cycle = EDGE_PERM_MOVES[moveIndex]
  const result = orientation.slice()
  // U and D moves
  if ((moveIndex === 0 || moveIndex === 3)) {
    for (let i = 0; i < 4; i++) {
      result[cycle[i]] = (result[cycle[i]] + 1) % 2
    }
  }
  return result
}

// 角块方向影响
function cornerOrientationMove(orientation, moveIndex) {
  const cycle = CORNER_PERM_MOVES[moveIndex]
  const result = orientation.slice()
  // R, L, F, B affect corner orientation
  if (moveIndex !== 2 && moveIndex !== 5) {
    for (let i = 0; i < 4; i++) {
      result[cycle[i]] = (result[cycle[i]] + (i + 1) % 2 + 1) % 3
    }
  }
  return result
}

// ============================================================
// 移动表
// ============================================================

class MoveTable {
  constructor(config) {
    this.name = config.name
    this.size = config.size || factorial(8) / factorial(8 - config.affected.length)
    this.defaultIndex = config.defaultIndex || 0
    this.affected = config.affected
    this.reversed = config.reversed || false
    this.table = []
    
    if (config.table) {
      this.table = config.table
    } else {
      this.createTable(config.getVector, config.cubieMove, config.getIndex, config.moves)
    }
  }
  
  createTable(getVector, cubieMove, getIndex, moves) {
    const allMoves = moves || [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
    
    for (let i = 0; i < this.size; i++) {
      this.table.push([])
    }
    
    for (let i = 0; i < this.size; i++) {
      for (const move of allMoves) {
        if (!this.table[i][move]) {
          const vec = getVector(i)
          const newVec = cubieMove(vec, move)
          const newIndex = getIndex(newVec)
          this.table[i][move] = newIndex
          // 逆操作
          const inverseMove = move - move % 3 * 2 + 2
          this.table[newIndex][inverseMove] = i
        }
      }
    }
  }
  
  doMove(index, move) {
    return this.table[index][move]
  }
}

// ============================================================
// 剪枝表
// ============================================================

class PruningTable {
  constructor(moveTables, moves) {
    const size = moveTables.reduce((acc, t) => acc * t.size, 1)
    this.table = new Array(Math.ceil(size / 8)).fill(-1)
    
    const multipliers = [1]
    for (let i = 1; i < moveTables.length; i++) {
      multipliers.push(moveTables[i-1].size * multipliers[i-1])
    }
    
    // 初始化已还原状态
    let count = 0
    const solvedStates = this.getSolvedStates(moveTables)
    for (const state of solvedStates) {
      let index = 0
      for (let i = 0; i < state.length; i++) {
        index += multipliers[i] * state[i]
      }
      this.setValue(index, 0)
      count++
    }
    
    // BFS填充剪枝表
    let depth = 0
    while (count < size) {
      const target = depth
      depth++
      
      for (let idx = 0; idx < size; idx++) {
        if (this.getValue(idx) === target) {
          for (const move of moves) {
            // 计算新索引
            let newIndex = 0
            let temp = idx
            for (let i = moveTables.length - 1; i >= 0; i--) {
              const tableIndex = Math.floor(temp / multipliers[i])
              const newIndex_i = moveTables[i].doMove(tableIndex, move)
              newIndex += newIndex_i * multipliers[i]
              temp %= multipliers[i]
            }
            
            if (this.getValue(newIndex) === 15) {
              this.setValue(newIndex, depth)
              count++
            }
          }
        }
      }
    }
  }
  
  getSolvedStates(moveTables) {
    const result = []
    const solved = moveTables.map(t => t.defaultIndex)
    
    // 处理多个还原状态
    if (moveTables.some(t => t.solvedIndexes)) {
      // TODO: 多还原状态
    }
    result.push(solved)
    return result
  }
  
  setValue(index, value) {
    const pos = index >> 3
    const shift = (index & 7) << 2
    this.table[pos] = (this.table[pos] & ~(15 << shift)) | (value << shift)
  }
  
  getValue(index) {
    return (this.table[index >> 3] >> ((index & 7) << 2)) & 15
  }
}

// ============================================================
// 求解器
// ============================================================

class Solver {
  constructor(config) {
    this.createTables = config.createTables
    this.moves = config.moves || [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
    this.initialized = false
    this.maxDepth = 22
  }
  
  initialize() {
    if (this.initialized) return
    this.initialized = true
    
    const { moveTables, pruningTables } = this.createTables()
    this.moveTables = moveTables
    this.pruningTables = []
    
    for (const pt of pruningTables) {
      const tableIndexes = pt.map(name => 
        this.moveTables.findIndex(t => t.name === name)
      ).sort((a, b) => this.moveTables[a].size - this.moveTables[b].size)
      
      const tables = tableIndexes.map(i => this.moveTables[i])
      this.pruningTables.push({
        pruningTable: new PruningTable(tables, this.moves),
        moveTableIndexes: tableIndexes
      })
    }
  }
  
  solve(scramble) {
    this.initialize()
    
    const moves = this.parseScramble(scramble)
    let indexes = this.moveTables.map(t => t.defaultIndex)
    
    for (const move of moves) {
      for (let i = 0; i < indexes.length; i++) {
        indexes[i] = this.moveTables[i].doMove(indexes[i], move)
      }
    }
    
    // IDA*搜索
    for (let depth = 0; depth <= this.maxDepth; depth++) {
      const result = this.search(indexes, depth, -1, [])
      if (result) return this.formatSolution(result)
    }
    
    return null
  }
  
  search(indexes, depth, lastMove, path) {
    // 计算启发式值
    let heuristic = 0
    for (const pt of this.pruningTables) {
      let index = 0
      let mult = 1
      for (let i = 0; i < pt.moveTableIndexes.length; i++) {
        index += indexes[pt.moveTableIndexes[i]] * mult
        mult *= this.moveTables[pt.moveTableIndexes[i - 1]]?.size || 1
      }
      const h = pt.pruningTable.getValue(index)
      if (depth < h) return null
      heuristic = Math.max(heuristic, h)
    }
    
    if (heuristic === 0) return path
    
    if (depth <= 0) return null
    
    for (const move of this.moves) {
      // 剪枝：避免连续同面或对面
      const lastFace = Math.floor(lastMove / 3)
      const face = Math.floor(move / 3)
      if (lastMove >= 0 && (face === lastFace || face === lastFace - 3)) continue
      
      const newIndexs = indexes.map((idx, i) => this.moveTables[i].doMove(idx, move))
      const result = this.search(newIndexs, depth - 1, move, [...path, move])
      if (result) return result
    }
    
    return null
  }
  
  parseScramble(scramble) {
    const moves = []
    const tokens = scramble.match(/[FRUBLD][2']?/g) || []
    
    for (const token of tokens) {
      const face = token[0]
      const suffix = token.slice(1) || ''
      const faceIndex = 'URFDLB'.indexOf(face)
      const modifier = MOVE_SUFFIXES[suffix] || 0
      moves.push(faceIndex * 3 + modifier)
    }
    
    return moves
  }
  
  formatSolution(moves) {
    const result = []
    for (const move of moves) {
      const face = 'URFDLB'[Math.floor(move / 3)]
      const mod = move % 3
      if (mod === 0) result.push(face)
      else if (mod === 1) result.push(face + '2')
      else result.push(face + "'")
    }
    return result.join(' ')
  }
}

// ============================================================
// Kociemba两阶段求解器
// ============================================================

// 创建角块排列移动表
function createCornerPermutationTable(name, affected) {
  return new MoveTable({
    name,
    affected,
    moves: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
    defaultIndex: encodePermutation([0, 1, 2, 3, 4, 5, 6, 7], affected, false),
    size: factorial(8) / factorial(8 - affected.length),
    getVector: (e) => decodePermutation(e, [0, 1, 2, 3, 4, 5, 6, 7], 8, false),
    cubieMove: (e, t) => applyCycle(e, CORNER_PERM_MOVES[Math.floor(t / 3)]),
    getIndex: (e) => encodePermutation(e, affected, false)
  })
}

// 创建棱块排列移动表
function createEdgePermutationTable(name, affected, reversed) {
  return new MoveTable({
    name,
    affected,
    moves: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
    defaultIndex: encodePermutation([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], affected, reversed),
    size: factorial(12) / factorial(12 - affected.length),
    getVector: (e) => decodePermutation(e, affected.slice(), 12, reversed),
    cubieMove: (e, t) => applyCycle(e, EDGE_PERM_MOVES[Math.floor(t / 3)]),
    getIndex: (e) => encodePermutation(e, affected, reversed)
  })
}

// 创建角块方向移动表
function createCornerOrientationTable(name, affected) {
  return new MoveTable({
    name,
    size: 2187, // 3^7
    affected,
    defaultIndex: 0,
    getVector: (e) => decodeOrientation(e, 8, 3),
    cubieMove: (e, t) => cornerOrientationMove(e, Math.floor(t / 3)),
    getIndex: (e) => encodeOrientation(e, 3)
  })
}

// 创建棱块方向移动表
function createEdgeOrientationTable(name, affected) {
  return new MoveTable({
    name,
    size: 2048, // 2^11
    affected,
    defaultIndex: 0,
    getVector: (e) => decodeOrientation(e, 12, 2),
    cubieMove: (e, t) => edgeOrientationMove(e, Math.floor(t / 3)),
    getIndex: (e) => encodeOrientation(e, 2)
  })
}

// 全局求解器实例
let kociembaSolver = null

function getKociembaSolver() {
  if (!kociembaSolver) {
    kociembaSolver = new Solver({
      createTables: () => {
        const sliceSorted = createEdgePermutationTable('sliceSorted', [8, 9, 10, 11], true)
        const twist = createCornerOrientationTable('twist', [0, 1, 2, 3, 4, 5, 6, 7])
        const flip = createEdgeOrientationTable('flip', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
        const parity = new MoveTable({ name: 'parity', size: 2, table: [[1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1], [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]] })
        const URFToDLF = createCornerPermutationTable('URFToDLF', [0, 1, 2, 3, 4, 5])
        const URToUL = createEdgePermutationTable('URToUL', [0, 1, 2], false)
        const UBToDF = createEdgePermutationTable('UBToDF', [3, 4, 5], false)
        
        return {
          moveTables: [
            new MoveTable({ name: 'slicePosition', size: 495, table: sliceSorted.table, doMove: (t, m) => Math.floor(t.table[24 * m] / 24) }),
            twist,
            flip,
            sliceSorted,
            parity,
            URFToDLF,
            URToUL,
            UBToDF
          ],
          pruningTables: [
            ['slicePosition', 'flip'],
            ['slicePosition', 'twist']
          ]
        }
      },
      moves: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
    })
  }
  return kociembaSolver
}

// ============================================================
// 导出接口
// ============================================================

function solve(scramble) {
  const solver = getKociembaSolver()
  return solver.solve(scramble)
}

function parseSolution(moves) {
  const tokens = moves.split(' ')
  return tokens.map(move => {
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

// 从颜色状态生成scramble（逆向问题）
// 这是一个复杂问题，简化实现
function stateToScramble(state) {
  // TODO: 实现从颜色状态到scramble的转换
  // 需要确定每个色块的位置和方向
  return null
}

module.exports = {
  solve,
  parseSolution,
  MOVE_NAMES,
  getKociembaSolver,
  Solver,
  MoveTable,
  PruningTable
}
