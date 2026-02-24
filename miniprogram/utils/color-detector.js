/**
 * utils/color-detector.js - 魔方颜色识别工具
 * 使用 HSV 色彩空间提高识别准确率
 */

// 魔方标准颜色定义 (HSV范围)
// H: 色相 0-360, S: 饱和度 0-100, V: 明度 0-100
const COLOR_RANGES = [
  { name: 'U', label: '白色', hMin: 0, hMax: 360, sMin: 0, sMax: 30, vMin: 70 },      // 白色：低饱和度，高明度
  { name: 'D', label: '黄色', hMin: 40, hMax: 70, sMin: 40, sMax: 100, vMin: 50 },   // 黄色
  { name: 'F', label: '红色', hMin: 0, hMax: 20, sMin: 50, sMax: 100, vMin: 30 },    // 红色 (包含 340-360)
  { name: 'B', label: '橙色', hMin: 20, hMax: 45, sMin: 50, sMax: 100, vMin: 50 },   // 橙色
  { name: 'L', label: '绿色', hMin: 80, hMax: 160, sMin: 40, sMax: 100, vMin: 30 },  // 绿色
  { name: 'R', label: '蓝色', hMin: 200, hMax: 260, sMin: 40, sMax: 100, vMin: 30 }  // 蓝色
]

/**
 * RGB 转 HSV
 */
function rgbToHsv(r, g, b) {
  r /= 255
  g /= 255
  b /= 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min
  
  let h = 0
  const s = max === 0 ? 0 : (diff / max) * 100
  const v = max * 100
  
  if (diff !== 0) {
    if (max === r) {
      h = 60 * ((g - b) / diff + (g < b ? 6 : 0))
    } else if (max === g) {
      h = 60 * ((b - r) / diff + 2)
    } else {
      h = 60 * ((r - g) / diff + 4)
    }
  }
  
  return { h, s, v }
}

/**
 * 识别单个色块颜色（HSV方法）
 */
function detectColor(rgb) {
  const hsv = rgbToHsv(rgb[0], rgb[1], rgb[2])
  
  // 如果明度太低，无法识别
  if (hsv.v < 20) {
    console.log('颜色太暗:', rgb, hsv)
    return null
  }
  
  // 白色：低饱和度且高明度
  if (hsv.s < 30 && hsv.v > 60) {
    return 'U'
  }
  
  // 其他颜色按色相匹配
  for (const color of COLOR_RANGES) {
    if (color.name === 'U') continue  // 白色已经处理
    
    // 红色特殊处理（跨0度）
    if (color.name === 'F') {
      if ((hsv.h >= 340 || hsv.h <= 20) && hsv.s >= color.sMin) {
        return 'F'
      }
      continue
    }
    
    if (hsv.h >= color.hMin && hsv.h <= color.hMax && hsv.s >= color.sMin) {
      return color.name
    }
  }
  
  // 如果都没匹配，按距离找最接近的
  return findClosestColor(rgb)
}

/**
 * 备用：RGB距离匹配
 */
function findClosestColor(rgb) {
  const COLORS = {
    U: [255, 255, 255],
    D: [255, 255, 0],
    F: [255, 0, 0],
    B: [255, 165, 0],
    L: [0, 255, 0],
    R: [0, 0, 255]
  }
  
  let minDist = Infinity
  let result = 'U'
  
  for (const [name, color] of Object.entries(COLORS)) {
    const dist = Math.sqrt(
      Math.pow(rgb[0] - color[0], 2) +
      Math.pow(rgb[1] - color[1], 2) +
      Math.pow(rgb[2] - color[2], 2)
    )
    if (dist < minDist) {
      minDist = dist
      result = name
    }
  }
  
  return result
}

/**
 * 验证魔方状态是否有效
 */
function validateCubeState(state) {
  const faces = ['U', 'D', 'F', 'B', 'L', 'R']
  
  for (const face of faces) {
    if (!state[face]) return false
  }
  
  const colorCount = { U: 0, D: 0, F: 0, B: 0, L: 0, R: 0 }
  for (const face of faces) {
    for (const row of state[face]) {
      for (const color of row) {
        colorCount[color]++
      }
    }
  }
  
  for (const count of Object.values(colorCount)) {
    if (count !== 9) return false
  }
  
  return true
}

module.exports = {
  detectColor,
  rgbToHsv,
  validateCubeState,
  COLOR_RANGES
}
