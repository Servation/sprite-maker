/**
 * 4x4 Bayer Matrix for Ordered Dithering threshold offsets
 */
const BAYER_MATRIX_4X4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
];

/**
 * Standard preset retro game console palettes
 */
export const PRESET_PALETTES = {
  gameboy: [
    [15, 56, 15],
    [48, 98, 48],
    [139, 172, 15],
    [155, 188, 15]
  ],
  pico8: [
    [0, 0, 0], [29, 43, 83], [126, 37, 83], [0, 135, 81],
    [171, 82, 54], [95, 87, 79], [194, 195, 199], [255, 241, 224],
    [255, 0, 77], [255, 163, 0], [255, 236, 39], [0, 228, 54],
    [41, 173, 255], [131, 118, 156], [255, 119, 168], [255, 204, 170]
  ],
  nes: [
    [124,124,124], [0,0,252], [0,0,188], [68,40,188], [148,0,132], [168,0,32], [168,16,0], [136,20,0],
    [80,48,0], [0,120,0], [0,104,0], [0,88,0], [0,64,88], [0,0,0], [0,0,0], [0,0,0],
    [188,188,188], [0,120,248], [0,88,248], [104,68,252], [216,0,204], [228,0,88], [248,56,0], [228,92,16],
    [172,124,0], [0,184,0], [0,168,0], [0,168,68], [0,136,136], [0,0,0], [0,0,0], [0,0,0],
    [248,248,248], [60,188,252], [104,136,252], [152,120,248], [248,120,248], [248,88,152], [248,120,88], [252,160,68],
    [248,184,0], [184,248,24], [88,216,40], [88,248,152], [0,232,216], [120,120,120], [0,0,0], [0,0,0],
    [252,252,252], [164,228,252], [184,184,248], [216,184,252], [248,184,248], [248,164,192], [240,208,176], [252,224,168],
    [248,216,120], [216,248,120], [184,248,184], [184,248,216], [0,252,252], [248,216,248], [0,0,0], [0,0,0]
  ],
  genesis: [
    [0,0,0], [36,36,36], [73,73,73], [109,109,109], [146,146,146], [182,182,182], [219,219,219], [255,255,255],
    [255,0,0], [219,0,0], [182,0,0], [146,0,0], [109,0,0], [73,0,0], [36,0,0],
    [0,255,0], [0,219,0], [0,182,0], [0,146,0], [0,109,0], [0,73,0], [0,36,0],
    [0,0,255], [0,0,219], [0,0,182], [0,0,146], [0,0,109], [0,0,73], [0,0,36],
    [255,255,0], [219,219,0], [182,182,0], [146,146,0], [109,109,0],
    [255,0,255], [219,0,219], [182,0,182], [146,0,146], [109,0,109],
    [0,255,255], [0,219,219], [0,182,182], [0,146,146], [0,109,109],
    [255,146,0], [219,109,0], [182,73,0], [146,36,0],
    [255,0,146], [219,0,109], [182,0,73], [146,0,36],
    [146,255,0], [109,219,0], [73,182,0], [36,146,0],
    [0,146,255], [0,109,219], [0,73,182], [0,36,146],
    [146,0,255], [109,0,219], [73,0,182], [36,0,146]
  ]
};

/**
 * Extracts a global color palette from a list of frames using frequency-based grouping
 * @param {ImageData[]} frames 
 * @param {number} colorCount 
 * @returns {number[][]} Array of [r,g,b] colors
 */
export function extractGlobalPalette(frames, colorCount) {
  const frequencyMap = new Map();
  
  for (const frame of frames) {
    const data = frame.data;
    const len = data.length;
    for (let i = 0; i < len; i += 4) {
      const a = data[i + 3];
      if (a < 50) continue; // Ignore transparent pixels
      
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Quantize slightly (5 bits per channel) to group near-identical colors
      const qr = r >> 3;
      const qg = g >> 3;
      const qb = b >> 3;
      const key = (qr << 16) | (qg << 8) | qb;
      
      frequencyMap.set(key, (frequencyMap.get(key) || 0) + 1);
    }
  }
  
  const sorted = [...frequencyMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, colorCount);
    
  return sorted.map(([key]) => [
    (key >> 16) << 3,
    ((key >> 8) & 0xFF) << 3,
    (key & 0xFF) << 3
  ]);
}

/**
 * Maps a target color to the closest Euclidean RGB distance color in a palette
 * @param {number} r 
 * @param {number} g 
 * @param {number} b 
 * @param {number[][]} palette 
 * @returns {number[]} The matching [r,g,b] color
 */
export function findClosestColor(r, g, b, palette) {
  let minDistance = Infinity;
  let closest = palette[0] || [0, 0, 0];
  
  for (let i = 0; i < palette.length; i++) {
    const pr = palette[i][0];
    const pg = palette[i][1];
    const pb = palette[i][2];
    
    const dist = (r - pr) * (r - pr) + (g - pg) * (g - pg) + (b - pb) * (b - pb);
    if (dist < minDistance) {
      minDistance = dist;
      closest = palette[i];
    }
  }
  
  return closest;
}

/**
 * Reduce color bit depth and apply optional Ordered Dithering to extracted frames
 * @param {ImageData[]} frames - Input transparent frames
 * @param {object} options - Quantization configurations
 * @param {boolean} options.enabled - Toggle color quantization
 * @param {string} options.mode - 'custom' | '8bit' | '12bit' | '15bit' | '16bit' | 'nes' | 'gameboy' | 'pico8' | 'genesis'
 * @param {number} options.colors - Number of custom colors (2-256)
 * @param {boolean} options.dither - Toggle Bayer ordered dithering
 * @returns {ImageData[]} Quantized frames
 */
export function quantizeFrames(frames, { enabled = false, mode = 'custom', colors = 16, dither = false }) {
  if (!enabled || !frames || frames.length === 0) return frames;
  
  const isBitDepthMode = ['8bit', '12bit', '15bit', '16bit'].includes(mode);
  
  let palette = [];
  if (!isBitDepthMode) {
    if (mode === 'custom') {
      palette = extractGlobalPalette(frames, colors);
    } else {
      palette = PRESET_PALETTES[mode] || PRESET_PALETTES.pico8;
    }
    
    if (palette.length === 0) return frames;
  }
  
  const bayerSpread = 24; // Dithering intensity offset multiplier
  
  return frames.map(frame => {
    const width = frame.width;
    const height = frame.height;
    
    // Create offscreen canvas structure to safely output new ImageData
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const newImgData = ctx.createImageData(width, height);
    
    const srcData = frame.data;
    const destData = newImgData.data;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const a = srcData[i + 3];
        
        if (a < 50) {
          destData[i] = 0;
          destData[i + 1] = 0;
          destData[i + 2] = 0;
          destData[i + 3] = 0; // Retain transparency
          continue;
        }
        
        const r = srcData[i];
        const g = srcData[i + 1];
        const b = srcData[i + 2];
        
        let targetR = r;
        let targetG = g;
        let targetB = b;
        
        if (dither) {
          const bayerValue = BAYER_MATRIX_4X4[y % 4][x % 4];
          const ditherValue = (bayerValue / 16 - 0.5) * bayerSpread;
          
          targetR = Math.max(0, Math.min(255, r + ditherValue));
          targetG = Math.max(0, Math.min(255, g + ditherValue));
          targetB = Math.max(0, Math.min(255, b + ditherValue));
        }
        
        if (isBitDepthMode) {
          let qr, qg, qb;
          if (mode === '8bit') {
            // 8-bit color: 3-3-2 format (Red 3-bit, Green 3-bit, Blue 2-bit)
            qr = Math.round(Math.floor(targetR / 32) * (255 / 7));
            qg = Math.round(Math.floor(targetG / 32) * (255 / 7));
            qb = Math.round(Math.floor(targetB / 64) * (255 / 3));
          } else if (mode === '12bit') {
            // 12-bit color: 4-4-4 format (4 bits per channel)
            qr = Math.round(Math.floor(targetR / 16) * (255 / 15));
            qg = Math.round(Math.floor(targetG / 16) * (255 / 15));
            qb = Math.round(Math.floor(targetB / 16) * (255 / 15));
          } else if (mode === '15bit') {
            // 15-bit color: 5-5-5 format (5 bits per channel)
            qr = Math.round(Math.floor(targetR / 8) * (255 / 31));
            qg = Math.round(Math.floor(targetG / 8) * (255 / 31));
            qb = Math.round(Math.floor(targetB / 8) * (255 / 31));
          } else if (mode === '16bit') {
            // 16-bit color: 5-6-5 format (Red 5-bit, Green 6-bit, Blue 5-bit)
            qr = Math.round(Math.floor(targetR / 8) * (255 / 31));
            qg = Math.round(Math.floor(targetG / 4) * (255 / 63));
            qb = Math.round(Math.floor(targetB / 8) * (255 / 31));
          }
          destData[i] = qr;
          destData[i + 1] = qg;
          destData[i + 2] = qb;
        } else {
          const closest = findClosestColor(targetR, targetG, targetB, palette);
          destData[i] = closest[0];
          destData[i + 1] = closest[1];
          destData[i + 2] = closest[2];
        }
        destData[i + 3] = 255; // Set opaque
      }
    }
    
    return newImgData;
  });
}
