
import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createGlowTexture } from './TextureUtils';
import { generateCakeShape, generateTextShape, TYPE_FLAME, TYPE_BODY, TYPE_ICING, TYPE_CANDLE } from './ShapeUtils';
import { AnimationPhase, CandleState } from '../types';

export interface FlameData {
    life: number;
    wind: number;
}

interface CakeProps {
  particleCount: number;
  particleSize: number;
  rotationSpeed: number;
  cakeColor: string;
  icingColor: string;
  sparkleSpeed: number;
  phase: AnimationPhase;
  candleState: CandleState;
  flameData: React.MutableRefObject<FlameData>;
}

const Cake: React.FC<CakeProps> = ({
  particleCount,
  particleSize,
  rotationSpeed,
  cakeColor,
  icingColor,
  sparkleSpeed,
  phase,
  candleState,
  flameData
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const geomRef = useRef<THREE.BufferGeometry>(null);
  
  // Data buffers
  const currentPositions = useRef(new Float32Array(particleCount * 3));
  const targetPositions = useRef(new Float32Array(particleCount * 3));
  const currentColors = useRef(new Float32Array(particleCount * 3));
  const targetColors = useRef(new Float32Array(particleCount * 3));
  
  // Metadata for particle types
  const particleTypes = useRef(new Float32Array(particleCount));
  
  // Random offsets for smoke animation (velocity/direction)
  const smokeData = useRef(new Float32Array(particleCount * 4)); // x, y, z direction, speed

  // Initialize buffers once
  useMemo(() => {
    for (let i = 0; i < particleCount; i++) {
        // Start far away
        const val = (Math.random() - 0.5) * 50; 
        currentPositions.current[i * 3] = val;
        currentPositions.current[i * 3 + 1] = val;
        currentPositions.current[i * 3 + 2] = val;
        
        targetPositions.current[i * 3] = val;
        targetPositions.current[i * 3 + 1] = val;
        targetPositions.current[i * 3 + 2] = val;

        currentColors.current[i * 3] = 1;
        currentColors.current[i * 3 + 1] = 1;
        currentColors.current[i * 3 + 2] = 1;

        // Init smoke data
        smokeData.current[i * 4] = (Math.random() - 0.5) * 0.05; // vx
        smokeData.current[i * 4 + 1] = 0.02 + Math.random() * 0.05; // vy (up)
        smokeData.current[i * 4 + 2] = (Math.random() - 0.5) * 0.05; // vz
        smokeData.current[i * 4 + 3] = Math.random(); // random phase
    }
  }, [particleCount]);

  const particleTexture = useMemo(() => createGlowTexture(), []);

  // Handle Phase Changes -> Update Targets
  useEffect(() => {
    let result: { positions: Float32Array, colors: Float32Array, types: Float32Array };

    if (phase === 'cake') {
        result = generateCakeShape(particleCount, cakeColor, icingColor);
    } else {
        result = generateTextShape(phase, particleCount, '#FFD700');
    }

    targetPositions.current.set(result.positions);
    targetColors.current.set(result.colors);
    particleTypes.current.set(result.types);

  }, [phase, particleCount, cakeColor, icingColor]);

  // Animation Loop
  useFrame((state) => {
    if (!pointsRef.current || !geomRef.current) return;

    const positions = geomRef.current.attributes.position.array as Float32Array;
    const colors = geomRef.current.attributes.color.array as Float32Array;
    
    const time = state.clock.getElapsedTime();
    const lerpFactor = 0.08;

    const wind = flameData.current.wind;
    const life = flameData.current.life;

    for (let i = 0; i < particleCount; i++) {
        const type = particleTypes.current[i];
        
        let tx = targetPositions.current[i * 3];
        let ty = targetPositions.current[i * 3 + 1];
        let tz = targetPositions.current[i * 3 + 2];

        let tr = targetColors.current[i * 3];
        let tg = targetColors.current[i * 3 + 1];
        let tb = targetColors.current[i * 3 + 2];

        // --- FLAME / SMOKE LOGIC ---
        if (phase === 'cake' && type === TYPE_FLAME) {
            
            if (candleState === 'extinguished') {
                // Smoke Simulation: Ignore target, use velocity
                
                // Read smoke velocity
                const vx = smokeData.current[i * 4];
                const vy = smokeData.current[i * 4 + 1];
                const vz = smokeData.current[i * 4 + 2];
                
                // Apply velocity to current position
                positions[i * 3] += vx;
                positions[i * 3 + 1] += vy;
                positions[i * 3 + 2] += vz;

                // Drift wind
                positions[i * 3] += Math.sin(time + i) * 0.005;

                // Color fades to gray/transparent smoke
                const fadeRate = 0.03;
                colors[i * 3] = Math.max(0, colors[i * 3] - fadeRate);
                colors[i * 3 + 1] = Math.max(0, colors[i * 3 + 1] - fadeRate);
                colors[i * 3 + 2] = Math.max(0, colors[i * 3 + 2] - fadeRate);

                continue; 

            } else {
                // LIT or BLOWING (Controlled by flameData now)
                
                // If life is low, we might not render some particles to simulate shrinking
                // Or we scale them down.
                // Simple threshold: if particle index % 10 > life * 10, hide it (move away or zero alpha)
                // A smoother look: lerp color to black based on life
                
                tr *= life;
                tg *= life;
                tb *= life;

                // Add flicker
                let flickerIntensity = 0.05 + (wind * 0.5); // More wind = more flicker
                
                // Add noise to target
                tx += (Math.random() - 0.5) * flickerIntensity;
                ty += (Math.random() - 0.5) * flickerIntensity * 2; // More vertical flicker
                tz += (Math.random() - 0.5) * flickerIntensity;

                // Apply Wind Force
                // Blow along +X axis for simplicity, or random direction
                if (wind > 0.01) {
                    tx += wind * 1.5; // Blow away from center
                    ty += Math.sin(time * 10 + i) * wind * 0.5; // Turbulent up/down
                }
            }
        }

        // --- STANDARD LERP ---
        const cx = positions[i * 3];
        const cy = positions[i * 3 + 1];
        const cz = positions[i * 3 + 2];

        positions[i * 3] += (tx - cx) * lerpFactor;
        positions[i * 3 + 1] += (ty - cy) * lerpFactor;
        positions[i * 3 + 2] += (tz - cz) * lerpFactor;
        
        // Color Lerp
        const cr = colors[i * 3];
        const cg = colors[i * 3 + 1];
        const cb = colors[i * 3 + 2];
        
        colors[i * 3] += (tr - cr) * lerpFactor;
        colors[i * 3 + 1] += (tg - cg) * lerpFactor;
        colors[i * 3 + 2] += (tb - cb) * lerpFactor;
    }

    geomRef.current.attributes.position.needsUpdate = true;
    geomRef.current.attributes.color.needsUpdate = true;

    // Global rotation
    if (phase === 'cake') {
        pointsRef.current.rotation.y += rotationSpeed * 0.01;
    } else {
        pointsRef.current.rotation.y = Math.sin(time * 0.5) * 0.1;
    }
    
    // Breathing scale
    const breath = 1 + Math.sin(time * sparkleSpeed) * 0.02;
    pointsRef.current.scale.set(breath, breath, breath);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={currentPositions.current} 
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={currentColors.current}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={particleSize}
        vertexColors
        map={particleTexture}
        alphaTest={0.01}
        transparent
        opacity={1.0} 
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation={true}
      />
    </points>
  );
};

export default Cake;
