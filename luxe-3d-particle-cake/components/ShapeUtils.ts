import * as THREE from 'three';

// Particle Types
export const TYPE_BODY = 0;
export const TYPE_ICING = 1;
export const TYPE_CANDLE = 2;
export const TYPE_FLAME = 3;
export const TYPE_TEXT = 4;

// Helper to shuffle array for "disperse" effect
const shuffle = (array: number[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

/**
 * Generates positions and colors for a 3D Text/Number shape.
 * Fills unused particles into a surrounding cloud to maintain "infinite" feel.
 */
export const generateTextShape = (
  text: string, 
  totalParticles: number, 
  colorMain: string, 
  scale: number = 4.0 // Increased scale for grander numbers
) => {
  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  const positions = new Float32Array(totalParticles * 3);
  const colors = new Float32Array(totalParticles * 3);
  const types = new Float32Array(totalParticles); // 0 by default
  
  if (!ctx) return { positions, colors, types };

  // Draw Text
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 180px Serif'; // Luxury Serif font
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size / 2, size / 2);

  // Scan for pixel data
  const imageData = ctx.getImageData(0, 0, size, size);
  const validPixels: {x: number, y: number}[] = [];
  
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      if (imageData.data[(y * size + x) * 4] > 128) {
        validPixels.push({ x, y });
      }
    }
  }

  // Create shuffled indices
  const indices = Array.from({ length: totalParticles }, (_, i) => i);
  shuffle(indices);

  const mainColor = new THREE.Color(colorMain);
  const cloudColor = new THREE.Color('#332200'); // Faint gold/dust

  const textParticleLimit = Math.floor(totalParticles * 0.4); 
  
  for (let i = 0; i < totalParticles; i++) {
    const idx = indices[i];
    
    const isText = i < textParticleLimit && validPixels.length > 0;
    
    if (isText) {
      const pixel = validPixels[i % validPixels.length];
      
      const u = (pixel.x / size) - 0.5;
      const v = (pixel.y / size) - 0.5;
      const z = (Math.random() - 0.5) * 0.5; // Slight depth
      
      positions[idx * 3] = u * scale;
      positions[idx * 3 + 1] = -v * scale; // Flip Y
      positions[idx * 3 + 2] = z;

      colors[idx * 3] = mainColor.r;
      colors[idx * 3 + 1] = mainColor.g;
      colors[idx * 3 + 2] = mainColor.b;
      
      types[idx] = TYPE_TEXT;
    } else {
      const r = 10 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[idx * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[idx * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[idx * 3 + 2] = r * Math.cos(phi);

      colors[idx * 3] = cloudColor.r * 0.3;
      colors[idx * 3 + 1] = cloudColor.g * 0.3;
      colors[idx * 3 + 2] = cloudColor.b * 0.3;
      
      types[idx] = TYPE_BODY; // Background as body generic
    }
  }

  return { positions, colors, types };
};

/**
 * Generates positions and colors for the Cake shape.
 */
export const generateCakeShape = (
  particleCount: number,
  cakeColorHex: string,
  icingColorHex: string
) => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const types = new Float32Array(particleCount);

    const cCake = new THREE.Color(cakeColorHex);
    const cIcing = new THREE.Color(icingColorHex);
    const cCandle = new THREE.Color('#fffaee');
    const cFlame = new THREE.Color('#ffaa00');
    const cFlameCore = new THREE.Color('#ffffff');

    // TIER CONFIGURATION
    const tiers = [
      { yBottom: -1.5, height: 1.0, radius: 2.0 },
      { yBottom: -0.5, height: 1.0, radius: 1.4 },
      { yBottom:  0.5, height: 1.0, radius: 0.9 },
    ];

    const particlesPerTier = Math.floor((particleCount * 0.85) / tiers.length);
    const candleParticles = particleCount - (particlesPerTier * tiers.length);
    
    const indices = Array.from({ length: particleCount }, (_, i) => i);
    shuffle(indices);
    let ptr = 0;

    const setParticle = (x: number, y: number, z: number, color: THREE.Color, type: number) => {
       if (ptr >= particleCount) return;
       const idx = indices[ptr];
       positions[idx * 3] = x;
       positions[idx * 3 + 1] = y;
       positions[idx * 3 + 2] = z;
       colors[idx * 3] = color.r;
       colors[idx * 3 + 1] = color.g;
       colors[idx * 3 + 2] = color.b;
       types[idx] = type;
       ptr++;
    };

    // 1. GENERATE TIERS
    tiers.forEach((tier) => {
      for (let i = 0; i < particlesPerTier; i++) {
        const isTop = Math.random() > 0.7; 
        let x, y, z;
        let pColor;
        let pType;

        if (isTop) {
           const r = Math.sqrt(Math.random()) * tier.radius;
           const theta = Math.random() * Math.PI * 2;
           const thickness = 0.1;
           y = tier.yBottom + tier.height + (Math.random() * thickness);
           if (r > tier.radius * 0.9 && Math.random() > 0.5) {
             y -= Math.random() * 0.4; 
             x = Math.cos(theta) * tier.radius;
             z = Math.sin(theta) * tier.radius;
           } else {
             x = Math.cos(theta) * r;
             z = Math.sin(theta) * r;
           }
           pColor = cIcing;
           pType = TYPE_ICING;
        } else {
           const theta = Math.random() * Math.PI * 2;
           const r = tier.radius - (Math.random() * 0.1); 
           const h = Math.random() * tier.height;
           y = tier.yBottom + h;
           x = Math.cos(theta) * r;
           z = Math.sin(theta) * r;
           pColor = cCake;
           pType = TYPE_BODY;
        }
        setParticle(x, y, z, pColor, pType);
      }
    });

    // 2. GENERATE CANDLE
    const topTier = tiers[tiers.length - 1];
    const candleBaseY = topTier.yBottom + topTier.height;
    const candleHeight = 1.2;
    const candleRadius = 0.15;
    const candleBodyCount = Math.floor(candleParticles * 0.6);
    
    for (let i = 0; i < candleBodyCount; i++) {
      const h = Math.random() * candleHeight;
      const theta = Math.random() * Math.PI * 2;
      const r = Math.random() * candleRadius;
      setParticle(Math.cos(theta)*r, candleBaseY + h, Math.sin(theta)*r, cCandle, TYPE_CANDLE);
    }

    const flameBaseY = candleBaseY + candleHeight;
    const flameCount = candleParticles - candleBodyCount;
    for (let i = 0; i < flameCount; i++) {
      const u = Math.random();
      const theta = Math.random() * Math.PI * 2;
      const h = u * 0.6; 
      const r = (1 - u) * 0.2 * Math.sin(u * Math.PI); 
      const mix = u; 
      const flameCol = mix > 0.3 ? cFlame : cFlameCore;
      setParticle(Math.cos(theta)*r, flameBaseY + h, Math.sin(theta)*r, flameCol, TYPE_FLAME);
    }

    return { positions, colors, types };
}
