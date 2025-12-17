import React from 'react';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

interface SceneEffectsProps {
  bloomIntensity: number;
  bloomThreshold: number;
}

const SceneEffects: React.FC<SceneEffectsProps> = ({ bloomIntensity, bloomThreshold }) => {
  return (
    <EffectComposer disableNormalPass>
      <Bloom 
        luminanceThreshold={bloomThreshold} 
        mipmapBlur 
        intensity={bloomIntensity} 
        radius={0.7}
      />
      <Vignette
        offset={0.3}
        darkness={0.6}
        eskil={false}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
};

export default SceneEffects;