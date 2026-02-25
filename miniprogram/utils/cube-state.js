/**
 * cube-state.js - 魔方状态解析和求解
 * 
 * 完整实现从颜色状态到解法的转换
 */

// ============================================================
// 魔方结构定义
// ============================================================

/**
 * 角块定义
 * 每个角块由3个面的颜色组成
 * 位置索引：
 *   0: URF (顶-右-前)
 *   1: UFL (顶-前-左)
 *   2: ULB (顶-左-后)
 *   3: UBR (顶-后-右)
 *   4: DFR (底-前-右)
 *   5: DLF (底-左-前)
 *   6: DBL (底-后-左)
 *   7: DRB (底-右-后)
 */
const CORNERS = [
  { name: 'URF', faces: ['U', 'R', 'F'], positions: [[0,2], [0,0], [0,0]] },
  { name: 'UFL', faces: ['U', 'F', 'L'], positions: [[0,0], [0,2], [0,2]] },
  { name: 'ULB', faces: ['U', 'L', 'B'], positions: [[0,0], [0,0], [0,2]] },
  { name: 'UBR', faces: ['U', 'B', 'R'], positions: [[0,2], [0,0], [0,2]] },
  { name: 'DFR', faces: ['D', 'F', 'R'], positions: [[2,2], [2,0], [2,2]] },
  { name: 'DLF', faces: ['D', 'L', 'F'], positions: [[2,0], [2,2], [2,0]] },
  { name: 'DBL', faces: ['D', 'B', 'L'], positions: [[2,0], [2,2], [2,0]] },
  { name: 'DRB', faces: ['D', 'R', 'B'], positions: [[2,2], [2,2], [2,0]] }
]

/**
 * 棱块定义
 * 每个棱块由2个面的颜色组成
 * 位置索引：
 *   0: UR (顶-右)
 *   1: UF (顶-前)
 *   2: UL (顶-左)
 *   3: UB (顶-后)
 *   4: DR (底-右)
 *   5: DF (底-前)
 *   6: DL (底-左)
 *   7: DB (底-后)
 *   8: FR (前-右)
 *   9: FL (前-左)
 *   10: BL (后-左)
 *   11: BR (后-右)
 */
const EDGES = [
  { name: 'UR', faces: ['U', 'R'], uPos: [1,2], rPos: [0,1] },
  { name: 'UF', faces: ['U', 'F'], uPos: [0,1], fPos: [0,1] },
  { name: 'UL', faces: ['U', 'L'], uPos: [1,0], lPos: [0,1] },
  { name: 'UB', faces: ['U', 'B'], uPos: [1,0], bPos: [0,1] },
  { name: 'DR', faces: ['D', 'R'], dPos: [1,2], rPos: [2,1] },
  { name: 'DF', faces: ['D', 'F'], dPos: [0,1], fPos: [2,1] },
  { name: 'DL', faces: ['D', 'L'], dPos: [1,0], lPos: [2,1] },
  { name: 'DB', faces: ['D', 'B'], dPos: [1,2], bPos: [2,1] },
  { name: 'FR', faces: ['F', 'R'], fPos: [1,2], rPos: [1,0] },
  { name: 'FL', faces: ['F', 'L'], fPos: [1,0], lPos: [1,2] },
  { name: 'BL', faces: ['B', 'L'], bPos: [1,0], lPos: [1,0] },
  { name: 'BR', faces: ['B', 'R'], bPos: [1,2], rPos: [1,2] }
]

// 棱块在各个面上的位置
const EDGE_FACE_POSITIONS = {
  U: [
    { edge: 3, pos: [0,1] }, // UB
    { edge: 2, pos: [1,0] }, // UL
    { edge: 0, pos: [1,2] }, // UR
    { edge: 1, pos: [2,1] }  // UF (实际是row 0, col 1)
  ],
  R: [
    { edge: 0, pos: [0,1] }, // UR
    { edge: 11, pos: [1,2] }, // BR
    { edge: 4, pos: [2,1] }, // DR
    { edge: 8, pos: [1,0] }  // FR
  ],
  F: [
    { edge: 1, pos: [0,1] }, // UF
    { edge: 8, pos: [1,2] }, // FR
    { edge: 5, pos: [2,1] }, // DF
    { edge: 9, pos: [1,0] }  // FL
  ],
  D: [
    { edge: 5, pos: [0,1] }, // DF
    { edge: 6, pos: [1,0] }, // DL
    { edge: 4, pos: [1,2] }, // DR
    { edge: 7, pos: [2,1] }  // DB
  ],
  L: [
    { edge: 2, pos: [0,1] }, // UL
    { edge: 9, pos: [1,2] }, // FL
    { edge: 6, pos: [2,1] }, // DL
    { edge: 10, pos: [1,0] } // BL
  ],
  B: [
    { edge: 3, pos: [0,1] }, // UB
    { edge: 10, pos: [1,0] }, // BL
    { edge: 7, pos: [2,1] }, // DB
    { edge: 11, pos: [1,2] } // BR
  ]
}

// 角块在各个面上的位置
const CORNER_FACE_POSITIONS = {
  U: [
    { corner: 1, pos: [0,0] }, // UFL
    { corner: 2, pos: [0,2] }, // ULB
    { corner: 3, pos: [2,2] }, // UBR
    { corner: 0, pos: [2,0] }  // URF
  ],
  R: [
    { corner: 0, pos: [0,0] }, // URF
    { corner: 3, pos: [0,2] }, // UBR
    { corner: 7, pos: [2,2] }, // DRB
    { corner: 4, pos: [2,0] }  // DFR
  ],
  F: [
    { corner: 0, pos: [0,2] }, // URF
    { corner: 1, pos: [0,0] }, // UFL
    { corner: 5, pos: [2,0] }, // DLF
    { corner: 4, pos: [2,2] }  // DFR
  ],
  D: [
    { corner: 5, pos: [0,0] }, // DLF
    { corner: 6, pos: [0,2] }, // DBL
    { corner: 7, pos: [2,2] }, // DRB
    { corner: 4, pos: [2,0] }  // DFR
  ],
  L: [
    { corner: 2, pos: [0,0] }, // ULB
    { corner: 1, pos: [0,2] }, // UFL
    { corner: 5, pos: [2,2] }, // DLF
    { corner: 6, pos: [2,0] }  // DBL
  ],
  B: [
    { corner: 3, pos: [0,0] }, // UBR
    { corner: 2, pos: [0,2] }, // ULB
    { corner: 6, pos: [2,2] }, // DBL
    { corner: 7, pos: [2,0] }  // DRB
  ]
}

// ============================================================
// 状态解析
// ============================================================

/**
 * 从颜色状态解析魔方内部状态
 * 
 * @param {Object} colorState - 颜色状态 {U: [...], R: [...], ...}
 * @returns {Object} 内部状态 {cp, co, ep, eo}
 */
function parseState(colorState) {
  // 检测配色方案（颜色到面的映射）
  const scheme = detectScheme(colorState)
  
  // 解析角块
  const { cp, co } = parseCorners(colorState, scheme)
  
  // 解析棱块
  const { ep, eo } = parseEdges(colorState, scheme)
  
  return { cp, co, ep, eo, scheme }
}

/**
 * 检测配色方案
 */
function detectScheme(state) {
  const scheme = {}
  for (const [face, grid] of Object.entries(state)) {
    const centerColor = grid[1][1]
    scheme[centerColor] = face
  }
  return scheme
}

/**
 * 解析角块状态
 */
function parseCorners(state, scheme) {
  const cp = new Array(8).fill(-1) // 角块排列
  const co = new Array(8).fill(0)  // 角块方向
  
  // 标准角块颜色组合
  const standardCorners = [
    { index: 0, colors: ['U', 'R', 'F'] }, // URF
    { index: 1, colors: ['U', 'F', 'L'] }, // UFL
    { index: 2, colors: ['U', 'L', 'B'] }, // ULB
    { index: 3, colors: ['U', 'B', 'R'] }, // UBR
    { index: 4, colors: ['D', 'F', 'R'] }, // DFR
    { index: 5, colors: ['D', 'L', 'F'] }, // DLF
    { index: 6, colors: ['D', 'B', 'L'] }, // DBL
    { index: 7, colors: ['D', 'R', 'B'] }  // DRB
  ]
  
  // 角块在面网格中的位置
  const cornerPositions = {
    U: [[0,0], [0,2], [2,2], [2,0]], // UFL, ULB, UBR, URF
    R: [[0,0], [0,2], [2,2], [2,0]], // URF, UBR, DRB, DFR
    F: [[0,2], [0,0], [2,0], [2,2]], // URF, UFL, DLF, DFR
    D: [[0,0], [0,2], [2,2], [2,0]], // DLF, DBL, DRB, DFR
    L: [[0,0], [0,2], [2,2], [2,0]], // ULB, UFL, DLF, DBL
    B: [[0,0], [0,2], [2,2], [2,0]]  // UBR, ULB, DBL, DRB
  }
  
  // 角块映射
  const cornerMap = {
    'URF': { faces: ['U', 'R', 'F'], positions: { U: [0,2], R: [0,0], F: [0,2] } },
    'UFL': { faces: ['U', 'F', 'L'], positions: { U: [0,0], F: [0,0], L: [0,2] } },
    'ULB': { faces: ['U', 'L', 'B'], positions: { U: [0,2], L: [0,0], B: [0,2] } },
    'UBR': { faces: ['U', 'B', 'R'], positions: { U: [2,2], B: [0,0], R: [0,2] } },
    'DFR': { faces: ['D', 'F', 'R'], positions: { D: [2,0], F: [2,2], R: [2,0] } },
    'DLF': { faces: ['D', 'L', 'F'], positions: { D: [0,0], L: [2,2], F: [2,0] } },
    'DBL': { faces: ['D', 'B', 'L'], positions: { D: [0,2], B: [2,2], L: [2,0] } },
    'DRB': { faces: ['D', 'R', 'B'], positions: { D: [2,2], R: [2,2], B: [2,0] } }
  }
  
  // 对于每个角块位置，读取三个颜色
  for (let i = 0; i < 8; i++) {
    const corner = cornerMap[Object.keys(cornerMap)[i]]
    const colors = corner.faces.map((face, idx) => {
      const pos = corner.positions[face]
      const grid = state[face]
      if (!grid) return null
      return scheme[grid[pos[0]][pos[1]]]
    })
    
    // 确定是哪个角块
    const matchedCorner = findCornerByColors(colors, standardCorners)
    if (matchedCorner) {
      cp[i] = matchedCorner.index
      // 确定方向
      co[i] = getCornerOrientation(colors, matchedCorner.colors)
    }
  }
  
  return { cp, co }
}

/**
 * 根据颜色找到对应的角块
 */
function findCornerByColors(colors, standardCorners) {
  for (const corner of standardCorners) {
    // 检查是否颜色匹配（考虑旋转）
    for (let rot = 0; rot < 3; rot++) {
      const rotatedColors = [
        colors[rot],
        colors[(rot + 1) % 3],
        colors[(rot + 2) % 3]
      ]
      if (arraysEqual(rotatedColors, corner.colors)) {
        return corner
      }
    }
  }
  return null
}

/**
 * 获取角块方向
 */
function getCornerOrientation(actualColors, standardColors) {
  // 找到U或D颜色的位置
  for (let i = 0; i < 3; i++) {
    if (actualColors[i] === 'U' || actualColors[i] === 'D') {
      return i
    }
  }
  return 0
}

/**
 * 解析棱块状态
 */
function parseEdges(state, scheme) {
  const ep = new Array(12).fill(-1) // 棱块排列
  const eo = new Array(12).fill(0)  // 棱块方向
  
  // 标准棱块颜色组合
  const standardEdges = [
    { index: 0, colors: ['U', 'R'] }, // UR
    { index: 1, colors: ['U', 'F'] }, // UF
    { index: 2, colors: ['U', 'L'] }, // UL
    { index: 3, colors: ['U', 'B'] }, // UB
    { index: 4, colors: ['D', 'R'] }, // DR
    { index: 5, colors: ['D', 'F'] }, // DF
    { index: 6, colors: ['D', 'L'] }, // DL
    { index: 7, colors: ['D', 'B'] }, // DB
    { index: 8, colors: ['F', 'R'] }, // FR
    { index: 9, colors: ['F', 'L'] }, // FL
    { index: 10, colors: ['B', 'L'] }, // BL
    { index: 11, colors: ['B', 'R'] }  // BR
  ]
  
  // 棱块映射
  const edgeMap = {
    'UR': { faces: ['U', 'R'], positions: { U: [1,2], R: [0,1] } },
    'UF': { faces: ['U', 'F'], positions: { U: [0,1], F: [0,1] } },
    'UL': { faces: ['U', 'L'], positions: { U: [1,0], L: [0,1] } },
    'UB': { faces: ['U', 'B'], positions: { U: [0,1], B: [0,1] } },
    'DR': { faces: ['D', 'R'], positions: { D: [1,2], R: [2,1] } },
    'DF': { faces: ['D', 'F'], positions: { D: [0,1], F: [2,1] } },
    'DL': { faces: ['D', 'L'], positions: { D: [1,0], L: [2,1] } },
    'DB': { faces: ['D', 'B'], positions: { D: [2,1], B: [2,1] } },
    'FR': { faces: ['F', 'R'], positions: { F: [1,2], R: [1,0] } },
    'FL': { faces: ['F', 'L'], positions: { F: [1,0], L: [1,2] } },
    'BL': { faces: ['B', 'L'], positions: { B: [1,0], L: [1,0] } },
    'BR': { faces: ['B', 'R'], positions: { B: [1,2], R: [1,2] } }
  }
  
  // 对于每个棱块位置，读取两个颜色
  const edgeKeys = Object.keys(edgeMap)
  for (let i = 0; i < 12; i++) {
    const edge = edgeMap[edgeKeys[i]]
    const colors = edge.faces.map(face => {
      const pos = edge.positions[face]
      const grid = state[face]
      if (!grid) return null
      return scheme[grid[pos[0]][pos[1]]]
    })
    
    // 确定是哪个棱块
    const matchedEdge = findEdgeByColors(colors, standardEdges)
    if (matchedEdge) {
      ep[i] = matchedEdge.index
      // 确定方向
      eo[i] = getEdgeOrientation(colors, matchedEdge.colors)
    }
  }
  
  return { ep, eo }
}

/**
 * 根据颜色找到对应的棱块
 */
function findEdgeByColors(colors, standardEdges) {
  for (const edge of standardEdges) {
    if (arraysEqual(colors, edge.colors) || arraysEqual(colors.reverse(), edge.colors)) {
      return edge
    }
  }
  return null
}

/**
 * 获取棱块方向
 */
function getEdgeOrientation(actualColors, standardColors) {
  // 如果第一个颜色在正确位置，方向为0
  // 否则方向为1
  if (actualColors[0] === standardColors[0]) {
    return 0
  }
  return 1
}

/**
 * 数组比较
 */
function arraysEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

// ============================================================
// 状态验证
// ============================================================

/**
 * 验证状态是否有效且可解
 */
function validateState(state) {
  // 检查角块
  if (!validateCorners(state.cp, state.co)) {
    return { valid: false, error: '角块状态无效' }
  }
  
  // 检查棱块
  if (!validateEdges(state.ep, state.eo)) {
    return { valid: false, error: '棱块状态无效' }
  }
  
  // 检查奇偶性
  if (!validateParity(state.cp, state.ep)) {
    return { valid: false, error: '奇偶性错误，魔方不可解' }
  }
  
  return { valid: true }
}

function validateCorners(cp, co) {
  // 检查排列
  const seen = new Set()
  for (const c of cp) {
    if (c < 0 || c > 7 || seen.has(c)) return false
    seen.add(c)
  }
  
  // 检查方向和
  let sum = 0
  for (const o of co) sum += o
  return sum % 3 === 0
}

function validateEdges(ep, eo) {
  // 检查排列
  const seen = new Set()
  for (const e of ep) {
    if (e < 0 || e > 11 || seen.has(e)) return false
    seen.add(e)
  }
  
  // 检查方向和
  let sum = 0
  for (const o of eo) sum += o
  return sum % 2 === 0
}

function validateParity(cp, ep) {
  // 计算角块排列的逆序数
  const cpInversions = countInversions(cp)
  // 计算棱块排列的逆序数
  const epInversions = countInversions(ep)
  
  // 总逆序数必须是偶数
  return (cpInversions + epInversions) % 2 === 0
}

function countInversions(arr) {
  let count = 0
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] > arr[j]) count++
    }
  }
  return count
}

// ============================================================
// 导出
// ============================================================

module.exports = {
  parseState,
  detectScheme,
  parseCorners,
  parseEdges,
  validateState,
  CORNERS,
  EDGES
}
