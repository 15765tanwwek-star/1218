import * as THREE from 'three';

/**
 * Generates a soft, glowing radial gradient texture for particles
 * to avoid loading external assets and ensure a "light" look.
 */
export const createGlowTexture = (): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Create a radial gradient
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    
    // Core (Brightest)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    // Mid (Color hint)
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.5)');
    // Edge (Fade out)
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.premultiplyAlpha = true;
  return texture;
};