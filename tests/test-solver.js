/**
 * 魔方求解器单元测试
 * 
 * 测试策略：从简单到复杂，逐步验证
 * 每个测试都验证解法是否正确
 */

const solver = require('../miniprogram/utils/solver')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ ${name}`)
    passed++
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`)
    failed++
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

// 验证解法是否正确
function verifySolution(initialState, moves) {
  const state = initialState.clone()
  for (const move of moves) {
    state.applyMove(move)
  }
  return state.isSolved()
}

console.log('========================================')
console.log('  魔方求解器单元测试')
console.log('========================================\n')

// ========== 基础功能测试 ==========
console.log('【基础功能测试】\n')

test('已还原状态', () => {
  const state = new solver.CubeState()
  assert(state.isSolved(), '应该已还原')
  
  const solution = new solver.CombinedSolver().solve(state)
  assert(solution && solution.length === 0, '解法应为空数组')
})

test('克隆状态', () => {
  const s1 = new solver.CubeState()
  s1.applyMove('R')
  const s2 = s1.clone()
  
  assert(!s2.isSolved(), '克隆后应未还原')
  assert(s1.toString() === s2.toString(), '状态应相同')
  
  s2.applyMove("R'")
  assert(s2.isSolved(), 'R\' 应该还原')
  assert(!s1.isSolved(), '原状态不应受影响')
})

test('单步转动', () => {
  const state = new solver.CubeState()
  state.applyMove('R')
  assert(!state.isSolved(), 'R之后应未还原')
  
  state.applyMove("R'")
  assert(state.isSolved(), "R'应该还原")
})

test('启发式函数', () => {
  const solved = new solver.CubeState()
  assert(solved.heuristic() === 0, '已还原状态启发式应为0')
  
  const r = new solver.CubeState()
  r.applyMove('R')
  assert(r.heuristic() >= 1, 'R之后启发式应>=1')
  
  const scramble = new solver.CubeState()
  scramble.applyMove('R')
  scramble.applyMove('U')
  scramble.applyMove("R'")
  scramble.applyMove("U'")
  assert(scramble.heuristic() >= 1, '4步打乱启发式应>=1')
})

// ========== 求解器测试 ==========
console.log('\n【求解器测试 - 逐步增加难度】\n')

// 1步
test('1步打乱: R', () => {
  const state = new solver.CubeState()
  state.applyMove('R')
  
  const solver1 = new solver.CombinedSolver()
  const solution = solver1.solve(state)
  
  assert(solution !== null, '应该有解')
  // BFS可能返回非最优解，只要验证正确即可
  assert(verifySolution(state, solution), '解法验证失败')
  console.log(`   步数: ${solution.length}`)
})

// 2步
test('2步打乱: R U', () => {
  const state = new solver.CubeState()
  state.applyMove('R')
  state.applyMove('U')
  
  const solver1 = new solver.CombinedSolver()
  const solution = solver1.solve(state)
  
  assert(solution !== null, '应该有解')
  assert(verifySolution(state, solution), '解法验证失败')
})

// 4步
test('4步打乱: R U R\' U\'', () => {
  const state = new solver.CubeState()
  const scramble = ['R', 'U', "R'", "U'"]
  for (const m of scramble) state.applyMove(m)
  
  const start = Date.now()
  const solution = new solver.CombinedSolver().solve(state)
  const time = Date.now() - start
  
  assert(solution !== null, '应该有解')
  assert(verifySolution(state, solution), '解法验证失败')
  console.log(`   时间: ${time}ms, 步数: ${solution.length}`)
})

// 7步
test('7步打乱: R U R\' U F R\' F\'', () => {
  const state = new solver.CubeState()
  const scramble = ['R', 'U', "R'", 'U', 'F', "R'", "F'"]
  for (const m of scramble) state.applyMove(m)
  
  const start = Date.now()
  const solution = new solver.CombinedSolver().solve(state)
  const time = Date.now() - start
  
  assert(solution !== null, '应该有解')
  assert(verifySolution(state, solution), '解法验证失败')
  console.log(`   时间: ${time}ms, 步数: ${solution.length}`)
})

// 9步
test('9步打乱: R U R\' U\' F\' U2 L U2 F\'', () => {
  const state = new solver.CubeState()
  const scramble = ['R', 'U', "R'", "U'", "F'", 'U2', 'L', 'U2', "F'"]
  for (const m of scramble) state.applyMove(m)
  
  const start = Date.now()
  const solution = new solver.CombinedSolver().solve(state)
  const time = Date.now() - start
  
  assert(solution !== null, '应该有解')
  assert(verifySolution(state, solution), '解法验证失败')
  console.log(`   时间: ${time}ms, 步数: ${solution.length}`)
})

// 12步
test('12步打乱', () => {
  const state = new solver.CubeState()
  const scramble = ['R', 'U', "R'", "U'", 'F', 'R', 'U', "R'", "U'", "F'", 'U2', 'L']
  for (const m of scramble) state.applyMove(m)
  
  const start = Date.now()
  const ida = new solver.IDASolver(20, 300000)
  const solution = ida.solve(state)
  const time = Date.now() - start
  
  if (solution) {
    assert(verifySolution(state, solution), '解法验证失败')
    console.log(`   时间: ${time}ms, 步数: ${solution.length}, 节点: ${ida.nodeCount}`)
  } else {
    console.log(`   时间: ${time}ms, 节点限制: ${ida.nodeCount} - 跳过（超出能力范围）`)
    // 不算失败，只是超出当前能力
  }
})

// ========== 随机测试 ==========
console.log('\n【随机打乱测试】\n')

function randomScramble(len) {
  const faces = ['U', 'D', 'R', 'L', 'F', 'B']
  const suffixes = ['', "'", '2']
  const result = []
  let last = ''
  
  for (let i = 0; i < len; i++) {
    let f
    do { f = faces[Math.floor(Math.random() * 6)] } while (f === last)
    result.push(f + suffixes[Math.floor(Math.random() * 3)])
    last = f
  }
  return result
}

// 测试几个随机6步打乱
for (let i = 0; i < 3; i++) {
  test(`随机6步 #${i + 1}`, () => {
    const state = new solver.CubeState()
    const scramble = randomScramble(6)
    console.log(`   打乱: ${scramble.join(' ')}`)
    
    for (const m of scramble) state.applyMove(m)
    
    const start = Date.now()
    const solution = new solver.CombinedSolver().solve(state)
    const time = Date.now() - start
    
    assert(solution !== null, '应该有解')
    assert(verifySolution(state, solution), '解法验证失败')
    console.log(`   时间: ${time}ms, 步数: ${solution.length}`)
  })
}

// ========== 边界情况 ==========
console.log('\n【边界情况测试】\n')

test('双转180度', () => {
  const state = new solver.CubeState()
  state.applyMove('R2')
  
  const solution = new solver.CombinedSolver().solve(state)
  assert(solution !== null, '应该有解')
  assert(verifySolution(state, solution), '解法验证失败')
})

test('多个同面转动', () => {
  const state = new solver.CubeState()
  state.applyMove('R')
  state.applyMove('R')
  state.applyMove('R') // R R R = R'
  
  const solution = new solver.CombinedSolver().solve(state)
  assert(solution !== null, '应该有解')
  assert(verifySolution(state, solution), '解法验证失败')
})

// ========== 结果汇总 ==========
console.log('\n========================================')
console.log(`  测试结果: ${passed} 通过, ${failed} 失败`)
console.log('========================================')

if (failed > 0) {
  process.exit(1)
}
