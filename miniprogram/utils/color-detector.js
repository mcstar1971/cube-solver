/**
 * utils/color-detector.js - 魔方颜色识别工具
 * 使用 HSV 色彩空间提高识别准确率
 */

// 魔方标准颜色定义 (HSV范围)
// H: 色相 0-360, S: 饱和度 0-100, V: 明度 0-100
const COLOR_RANGES = [
  { name: 'U', label: '白色', sMax: 35, vMin: 65 },           // 白色：低饱和度，高明度
  { name: 'D', label: '黄色', hMin: 35, hMax: 75, sMin: 30 },  // 黄色
  { name: 'F', label: '红色', hMin: 340, hMax: 20, sMin: 40 }, // 红色（跨0度）
  { name: 'B', label: '橙色', hMin: 15, hMax: 50, sMin: 40 },  // 橙色
  { name: 'L', label: '绿色', hMin: 70, hMax: 170, sMin: 30 }, // 绿色
  { name: 'R', label: '蓝色', hMin: 190, hMax: 270, sMin: 30 } // 蓝色
]

// RGB参考颜色
const RGB_COLORS = {
  U: [255, 255, 255],  // 白
  D: [255, 255, 0],    // 黄
  F: [255, 50, 50],    // 红
  B: [255, 165, 0],    // 橙
  L: [50, 255, 50],    // 绿
  R: [50, 50, 255]     // 蓝
}

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
  if (hsv.v < 25) {
    return null
  }
  
  // 白色：低饱和度且高明度（最优先检测）
  if (hsv.s < 35 && hsv.v > 65) {
    return 'U'
  }
  
  // 黄色：特殊处理，需要在白色之后检测
  // 黄色饱和度可能较低，但明度很高
  if (hsv.h >= 35 && hsv.h <= 75 && hsv.v > 50) {
    return 'D'
  }
  
  // 红色特殊处理（跨0度：340-360 或 0-20）
  if ((hsv.h >= 340 || hsv.h <= 20) && hsv.s >= 35 && hsv.v > 30) {
    return 'F'
  }
  
  // 橙色
  if (hsv.h >= 15 && hsv.h <= 50 && hsv.s >= 35 && hsv.v > 40) {
    return 'B'
  }
  
  // 绿色
  if (hsv.h >= 70 && hsv.h <= 170 && hsv.s >= 25 && hsv.v > 30) {
    return 'L'
  }
  
  // 蓝色
  if (hsv.h >= 190 && hsv.h <= 270 && hsv.s >= 25 && hsv.v > 30) {
    return 'R'
  }
  
  // 如果都没匹配，用RGB距离找最接近的
  return findClosestColor(rgb, hsv)
}

/**
 * RGB距离匹配（备用方案）
 */
function findClosestColor(rgb, hsv) {
  // 如果HSV可用，优先使用
  if (hsv) {
    // 白色
    if (hsv.s < 40 && hsv.v > 60) return 'U'
    // 黄色
    if (hsv.h >= 30 && hsv.h <= 80) return 'D'
    // 红色
    if (hsv.h >= 330 || hsv.h <= 30) return 'F'
    // 橙色
    if (hsv.h >= 10 && hsv.h <= 55) return 'B'
    // 绿色
    if (hsv.h >= 60 && hsv.h <= 180) return 'L'
    // 蓝色
    if (hsv.h >= 180 && hsv.h <= 290) return 'R'
  }
  
  // RGB距离
  let minDist = Infinity
  let result = 'U'
  
  for (const [name, color] of Object.entries(RGB_COLORS)) {
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

/**
 * 获取颜色名称（用于显示）
 */
function getColorLabel(colorCode) {
  const labels = {
    U: '白色', D: '黄色', F: '红色',
    B: '橙色', L: '绿色', R: '蓝色'
  }
  return labels[colorCode] || colorCode
}

module.exports = {
  detectColor,
  rgbToHsv,
  validateCubeState,
  getColorLabel,
  COLOR_RANGES,
  RGB_COLORS
}
