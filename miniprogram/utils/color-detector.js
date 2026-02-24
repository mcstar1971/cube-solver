/**
 * utils/color-detector.js - 魔方颜色识别工具
 */

// 魔方标准颜色定义
const CUBE_COLORS = {
  WHITE:  { name: 'U', hex: '#FFFFFF', rgb: [255, 255, 255] },
  YELLOW: { name: 'D', hex: '#FFFF00', rgb: [255, 255, 0] },
  RED:    { name: 'F', hex: '#FF0000', rgb: [255, 0, 0] },
  ORANGE: { name: 'B', hex: '#FFA500', rgb: [255, 165, 0] },
  BLUE:   { name: 'R', hex: '#0000FF', rgb: [0, 0, 255] },
  GREEN:  { name: 'L', hex: '#00FF00', rgb: [0, 255, 0] }
}

/**
 * 计算两个颜色的相似度（欧几里得距离）
 */
function colorDistance(rgb1, rgb2) {
  return Math.sqrt(
    Math.pow(rgb1[0] - rgb2[0], 2) +
    Math.pow(rgb1[1] - rgb2[1], 2) +
    Math.pow(rgb1[2] - rgb2[2], 2)
  )
}

/**
 * 识别单个色块颜色
 * @param {number[]} rgb - RGB颜色值 [r, g, b]
 * @returns {string} 魔方颜色名称 (U/D/F/B/L/R)
 */
function detectColor(rgb) {
  let minDistance = Infinity
  let detectedColor = 'U'

  for (const [colorName, colorData] of Object.entries(CUBE_COLORS)) {
    const distance = colorDistance(rgb, colorData.rgb)
    if (distance < minDistance) {
      minDistance = distance
      detectedColor = colorData.name
    }
  }

  return detectedColor
}

/**
 * 从图像帧中提取魔方面颜色
 * @param {ImageData} frameData - 图像数据
 * @param {number} faceSize - 魔方面在画面中的大小
 * @returns {string[][]} 3x3的颜色矩阵
 */
function extractFaceColors(frameData, faceSize) {
  const colors = []
  const cellSize = faceSize / 3
  const centerX = frameData.width / 2
  const centerY = frameData.height / 2
  const startX = centerX - faceSize / 2
  const startY = centerY - faceSize / 2

  for (let row = 0; row < 3; row++) {
    colors[row] = []
    for (let col = 0; col < 3; col++) {
      // 取每个格子中心点的颜色
      const sampleX = Math.floor(startX + col * cellSize + cellSize / 2)
      const sampleY = Math.floor(startY + row * cellSize + cellSize / 2)
      
      // 取周围区域的平均值以减少噪声
      const avgColor = getAverageColor(frameData, sampleX, sampleY, 10)
      colors[row][col] = detectColor(avgColor)
    }
  }

  return colors
}

/**
 * 获取区域平均颜色
 */
function getAverageColor(frameData, centerX, centerY, radius) {
  let r = 0, g = 0, b = 0, count = 0

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = centerX + dx
      const y = centerY + dy
      
      if (x >= 0 && x < frameData.width && y >= 0 && y < frameData.height) {
        const idx = (y * frameData.width + x) * 4
        r += frameData.data[idx]
        g += frameData.data[idx + 1]
        b += frameData.data[idx + 2]
        count++
      }
    }
  }

  return [
    Math.round(r / count),
    Math.round(g / count),
    Math.round(b / count)
  ]
}

/**
 * 验证魔方状态是否有效
 */
function validateCubeState(state) {
  // 检查是否所有面都有数据
  const faces = ['U', 'D', 'F', 'B', 'L', 'R']
  for (const face of faces) {
    if (!state[face]) return false
  }
  
  // 检查每个颜色是否恰好出现9次
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
  extractFaceColors,
  validateCubeState,
  CUBE_COLORS
}
