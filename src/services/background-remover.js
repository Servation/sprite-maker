/**
 * Helper to convert hex color string (#rrggbb) to rgb components
 * @param {string} hex - Hex color string
 * @returns {object} { r, g, b }
 */
function hexToRgb(hex) {
  const cleanHex = hex.replace(/^#/, '');
  const bigint = parseInt(cleanHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

/**
 * Removes background from an ImageData frame using chroma keying
 * @param {ImageData} imageData - The input frame data
 * @param {string} targetHexColor - Hex color to remove (e.g., '#00ff00')
 * @param {number} tolerance - Tolerance value (0-100)
 * @returns {ImageData} A new ImageData object with transparent background
 */
export function removeBackground(imageData, targetHexColor, tolerance = 30) {
  // Create a copy of the ImageData so we don't modify the source
  const buffer = new Uint8ClampedArray(imageData.data);
  const { r: rTarget, g: gTarget, b: bTarget } = hexToRgb(targetHexColor);
  
  // Max possible weighted distance is ~150 (approx. distance from pure green to black/white)
  // Let's normalize threshold: tolerance of 100 maps to distance of 180
  const threshold = (tolerance / 100) * 180;
  const feather = 15; // Width of transition zone for edge softening

  for (let i = 0; i < buffer.length; i += 4) {
    const r = buffer[i];
    const g = buffer[i + 1];
    const b = buffer[i + 2];
    const a = buffer[i + 3];

    if (a === 0) continue;

    // Luminance-weighted Euclidean distance
    const rDiff = r - rTarget;
    const gDiff = g - gTarget;
    const bDiff = b - bTarget;
    const dist = Math.sqrt(0.299 * rDiff * rDiff + 0.587 * gDiff * gDiff + 0.114 * bDiff * bDiff);

    if (dist < threshold) {
      // Background pixel
      buffer[i + 3] = 0;
    } else if (dist < threshold + feather) {
      // Transition pixel - apply edge softening (feathering)
      const factor = (dist - threshold) / feather;
      buffer[i + 3] = Math.round(a * factor);
    }
  }

  // Return new ImageData
  return new ImageData(buffer, imageData.width, imageData.height);
}
export default removeBackground;
