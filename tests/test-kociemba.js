// 测试 kociemba 库
const kociemba = require('kociemba')

console.log('=== kociemba 库测试 ===\n')

// 定义字符串：U R F D L B 顺序，每面9个贴纸
// 已还原状态
const solved = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'

console.log('已还原状态测试:')
console.log('  解法:', kociemba.solve(solved))

// 打乱 R U R' U'
// U面：右列变B的左列
// R面：自己旋转
// F面：右列变U的右列
// D面：右列变F的右列
// L面：不变
// B面：左列变D的右列

// 简单测试：R
const rState = 'UBUUBUUBURRRRRRRRRUFFUFFUFFDRDDRD DRDDLLLLLLLLBBDBBDBBDB'
// 更简单：直接用已还原状态验证库是否工作

console.log('\n使用库求解:')

// 构建一个简单的打乱状态字符串
// 我们先验证库是否正常工作
const testCases = [
  { name: '已还原', state: solved },
  { name: 'R', state: 'UBUUBUUBURRRRRRRRRUFFUFFUFFFDRDDRD RDDLLLLLLLLBBDBBDBBDB' },
]

for (const tc of testCases) {
  console.log(`\n${tc.name}:`)
  try {
    const solution = kociemba.solve(tc.state.replace(/\s/g, ''))
    console.log('  解法:', solution)
  } catch (e) {
    console.log('  错误:', e.message)
  }
}
