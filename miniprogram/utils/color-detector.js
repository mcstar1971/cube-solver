/**
 * utils/color-detector.js - 魔方颜色识别工具
 * 使用 HSV 色彩空间提高识别准确率
 */

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
 * 识别单个色块颜色
 * 
 * 魔方标准颜色（参考）：
 * - 白色：低饱和度，高明度
 * - 黄色：色相 50-70，高明度
 * - 红色：色相 0-20 或 340-360，中等饱和度
 * - 橙色：色相 15-50
 * - 绿色：色相 70-170
 * - 蓝色：色相 190-270
 */
function detectColor(rgb) {
  const [r, g, b] = rgb
  const hsv = rgbToHsv(r, g, b)
  
  const { h, s, v } = hsv
  
  // 明度太低，无法识别
  if (v < 20) {
    return null
  }
  
  // ===== 白色检测（优先，条件放宽）=====
  // 条件1：饱和度极低（<25）且明度高（>65）
  // 条件2：RGB都很高且接近（差异<40）
  const isLowSat = s < 25 && v > 65
  const isHighRgb = r > 180 && g > 180 && b > 180 && 
                    Math.abs(r - g) < 40 && Math.abs(g - b) < 40 && Math.abs(r - b) < 40
  if (isLowSat || isHighRgb) {
    return 'U'
  }
  
  // ===== 黄色检测 =====
  // 黄色：色相 40-75，饱和度 > 30，明度高
  // 特点：R和G都很高，B较低
  if (h >= 40 && h <= 75 && s > 25 && v > 50) {
    return 'D'
  }
  // 黄色的另一种情况：R高，G高，B低
  if (r > 200 && g > 180 && b < 150 && s > 20) {
    return 'D'
  }
  
  // ===== 红色检测 =====
  // 红色：色相 340-360 或 0-20
  // 特点：R高，G和B低
  if ((h >= 340 || h <= 20) && s > 30 && v > 30) {
    return 'F'
  }
  // 红色的RGB特征
  if (r > 180 && g < 120 && b < 120 && s > 40) {
    return 'F'
  }
  
  // ===== 橙色检测 =====
  // 橙色：色相 15-50，介于红和黄之间
  if (h >= 15 && h <= 50 && s > 40 && v > 40) {
    return 'B'
  }
  // 橙色的RGB特征：R高，G中等，B低
  if (r > 200 && g > 100 && g < 180 && b < 100) {
    return 'B'
  }
  
  // ===== 绿色检测 =====
  // 绿色：色相 70-170
  if (h >= 70 && h <= 170 && s > 25 && v > 30) {
    return 'L'
  }
  // 绿色的RGB特征：G最高
  if (g > r && g > b && g > 100 && s > 20) {
    return 'L'
  }
  
  // ===== 蓝色检测 =====
  // 蓝色：色相 190-270
  if (h >= 190 && h <= 270 && s > 25 && v > 30) {
    return 'R'
  }
  // 蓝色的RGB特征：B最高
  if (b > r && b > g && b > 80) {
    return 'R'
  }
  
  // ===== 兜底方案：找最接近的颜色 =====
  return findClosestColorByRgb(rgb, hsv)
}

/**
 * RGB距离匹配（兜底方案）
 */
function findClosestColorByRgb(rgb, hsv) {
  // 标准颜色RGB值
  const COLORS = {
    U: [255, 255, 255],  // 白
    D: [255, 255, 0],    // 黄
    F: [255, 50, 50],    // 红
    B: [255, 165, 0],    // 橙
    L: [50, 205, 50],    // 绿
    R: [50, 50, 255]     // 蓝
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

/**
 * 获取颜色名称
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
  getColorLabel
}
