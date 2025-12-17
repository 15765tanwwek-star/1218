import React, { useEffect, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import GUI from 'lil-gui'; 
import Cake, { FlameData } from './components/Hat'; 
import SceneEffects from './components/SceneEffects';
import { DEFAULT_CONFIG, AppConfig, AnimationPhase, CandleState } from './types';
import { getAudioContext, startContinuousAudioAnalysis } from './components/AudioUtils';

// Main App Component
const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [phase, setPhase] = useState<AnimationPhase>('3');
  const [candleState, setCandleState] = useState<CandleState>('lit');
  const [started, setStarted] = useState(false);
  const [showWishes, setShowWishes] = useState(false);
  
  const guiRef = useRef<GUI | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const micCleanupRef = useRef<(() => void) | null>(null);
  
  // Ref to track flame physics without re-rendering
  const flameDataRef = useRef<FlameData>({ life: 1.0, wind: 0.0 });

  // Countdown Logic - triggers only after started
  useEffect(() => {
    if (!started) return;

    // Reset to start state
    setPhase('3');
    setCandleState('lit');
    setShowWishes(false);
    flameDataRef.current = { life: 1.0, wind: 0.0 };

    // Sequence: 3 (0s) -> 2 (1s) -> 1 (2s) -> Cake (3s)
    const t1 = setTimeout(() => setPhase('2'), 1000);
    const t2 = setTimeout(() => setPhase('1'), 2000);
    const t3 = setTimeout(() => {
        setPhase('cake');
    }, 3000);

    return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
    };
  }, [started]);

  // Activate Microphone when Cake is ready and candle is lit
  useEffect(() => {
    if (phase === 'cake' && candleState === 'lit') {
        
        // Start music immediately when the cake appears (countdown ends)
        if (musicRef.current) {
            musicRef.current.currentTime = 0;
            musicRef.current.play().catch(e => console.warn("Music playback failed", e));
        }

        const initMic = async () => {
            const cleanup = await startContinuousAudioAnalysis((intensity) => {
                // Determine wind
                const wind = intensity; 
                flameDataRef.current.wind = wind;

                // Reduce life based on wind
                // Lowered threshold to 0.1 (was 0.2) to react to softer breaths
                if (wind > 0.1) { 
                     // Increased decay rate to 0.15 (was 0.05) to blow out faster
                     flameDataRef.current.life = Math.max(0, flameDataRef.current.life - (wind * 0.15));
                } else {
                     // Recover slowly if wind stops
                     if (flameDataRef.current.life > 0) {
                         flameDataRef.current.life = Math.min(1.0, flameDataRef.current.life + 0.005);
                     }
                }

                // Check for extinguish
                if (flameDataRef.current.life <= 0) {
                    handleBlowFinish();
                }
            });
            micCleanupRef.current = cleanup;
        };
        initMic();
    }
    
    return () => {
        if (micCleanupRef.current) {
            micCleanupRef.current();
            micCleanupRef.current = null;
        }
    };
  }, [phase, candleState]);

  // Transition to extinguished
  const handleBlowFinish = () => {
     if (micCleanupRef.current) {
         micCleanupRef.current();
         micCleanupRef.current = null;
     }
     
     // Set specific state to ensure animation matches
     flameDataRef.current.life = 0;
     flameDataRef.current.wind = 0;
     
     setCandleState('extinguished');
     setTimeout(() => setShowWishes(true), 500); 
  };

  // Button manual blow
  const handleManualBlow = () => {
      // Simulate instant blowout
      handleBlowFinish();
  };

  const handleStart = () => {
    // Initialize Audio Context on User Interaction
    if (!audioCtxRef.current) {
        audioCtxRef.current = getAudioContext();
    }
    // Resume if suspended
    if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
    }
    
    // Pre-initialize and "unlock" the audio element on user gesture
    if (!musicRef.current) {
        const audio = new Audio('https://upload.wikimedia.org/wikipedia/commons/6/6e/Happy_Birthday_to_You_-_piano.ogg');
        audio.loop = true;
        audio.volume = 0.5;
        musicRef.current = audio;
    }

    // Play silence briefly to unlock audio autoplay restrictions on mobile/safari
    musicRef.current.muted = true;
    musicRef.current.play().then(() => {
        musicRef.current?.pause();
        musicRef.current!.currentTime = 0;
        musicRef.current!.muted = false;
    }).catch(err => {
        console.warn("Audio unlock failed:", err);
    });

    setStarted(true);
  };

  const resetCake = () => {
     setStarted(false); 
     setShowWishes(false);
     
     // Stop music
     if (musicRef.current) {
         musicRef.current.pause();
         musicRef.current.currentTime = 0;
     }

     setTimeout(() => {
         handleStart();
     }, 100);
  };

  // Initialize Lil-GUI
  useEffect(() => {
    if (guiRef.current) guiRef.current.destroy();

    const gui = new GUI({ title: '🎂 Birthday Cake Settings' });
    guiRef.current = gui;

    const guiParams = { ...config };
    const actions = { 
        replay: resetCake,
    };

    const handleUpdate = () => {
        setConfig({ ...guiParams });
    };

    const visualsFolder = gui.addFolder('Patisserie');
    visualsFolder.addColor(guiParams, 'cakeColor').name('Sponge Color').onChange(handleUpdate);
    visualsFolder.addColor(guiParams, 'icingColor').name('Frosting/Gold').onChange(handleUpdate);
    visualsFolder.add(guiParams, 'particleCount', 1000, 60000, 100).name('Particles').onFinishChange(handleUpdate);
    visualsFolder.add(guiParams, 'particleSize', 0.01, 0.5).name('Size').onChange(handleUpdate);

    const animFolder = gui.addFolder('Presentation');
    animFolder.add(guiParams, 'rotationSpeed', 0, 5).name('Rotate Speed').onChange(handleUpdate);
    animFolder.add(guiParams, 'sparkleSpeed', 0, 5).name('Shimmer').onChange(handleUpdate);
    animFolder.add(actions, 'replay').name('Relight & Replay');

    const postFolder = gui.addFolder('Cinematic');
    postFolder.add(guiParams, 'bloomIntensity', 0, 5).name('Glow Power').onChange(handleUpdate);
    postFolder.add(guiParams, 'bloomThreshold', 0, 1).name('Glow Threshold').onChange(handleUpdate);

    if (window.innerWidth < 600) {
        gui.close();
    }

    return () => {
      gui.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  return (
    <div className="relative w-full h-screen bg-neutral-900 overflow-hidden">
      {/* Overlay UI */}
      <div className="absolute top-0 left-0 w-full p-8 z-10 pointer-events-none flex flex-col items-center transition-opacity duration-1000" style={{ opacity: showWishes ? 0 : 1 }}>
        <h1 className="text-5xl md:text-7xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-yellow-700 tracking-wider text-center drop-shadow-[0_0_20px_rgba(255,215,0,0.6)]">
          HAPPY BIRTHDAY
        </h1>
        <p className="text-center text-amber-100/70 font-light tracking-[0.4em] text-xs md:text-sm mt-3 uppercase">
          {phase === 'cake' ? 'Blow gently into your microphone...' : started ? 'Assembling...' : 'Ready?'}
        </p>
      </div>

      {/* Birthday Wishes Card */}
      <div 
        className={`absolute inset-0 z-30 flex items-center justify-center pointer-events-none transition-all duration-1000 ease-out transform ${showWishes ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      >
          <div className="bg-black/30 backdrop-blur-xl border border-yellow-500/30 p-12 max-w-2xl text-center rounded-2xl shadow-[0_0_100px_rgba(255,165,0,0.2)]">
            <h2 className="text-4xl md:text-6xl font-serif text-amber-200 mb-6 drop-shadow-lg">
                May All Your Wishes<br/>Come True
            </h2>
            <p className="text-yellow-100/80 font-light text-lg md:text-xl leading-relaxed font-sans tracking-wide">
                Wishing you a year filled with brilliance, prosperity, and endless inspiration. 
                <br/><span className="text-sm mt-4 block opacity-60 uppercase tracking-[0.2em]">- The Universe -</span>
            </p>
          </div>
      </div>

      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 2, 9], fov: 45 }}
        gl={{ 
            antialias: false,
            toneMapping: 1, 
            toneMappingExposure: 1.2
        }}
      >
        <color attach="background" args={['#080402']} />
        
        {/* Environment and Lighting */}
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffaa55" />
        <pointLight position={[-10, 5, -10]} intensity={0.5} color="#cc66ff" />
        <pointLight position={[0, 5, 2]} intensity={0.8} color="#ffffcc" /> {/* Front fill */}
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        {/* The Main Attraction */}
        <group position={[0, -1.2, 0]}>
            <Cake 
                particleCount={config.particleCount}
                particleSize={config.particleSize}
                rotationSpeed={config.rotationSpeed}
                cakeColor={config.cakeColor}
                icingColor={config.icingColor}
                sparkleSpeed={config.sparkleSpeed}
                phase={phase}
                candleState={candleState}
                flameData={flameDataRef}
            />
        </group>

        {/* Post Processing */}
        <SceneEffects 
            bloomIntensity={config.bloomIntensity} 
            bloomThreshold={config.bloomThreshold} 
        />

        <OrbitControls 
            enablePan={false} 
            enableZoom={true} 
            minDistance={4} 
            maxDistance={20} 
            autoRotate={showWishes} // Rotate slowly when wishes are shown
            autoRotateSpeed={0.5}
            maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
      
      {/* Interaction Controls */}
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none z-20">
         {!started && (
             <button 
                className="pointer-events-auto px-16 py-6 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 text-black font-serif text-2xl font-bold tracking-widest uppercase shadow-[0_0_50px_rgba(255,200,0,0.5)] hover:scale-105 hover:shadow-[0_0_80px_rgba(255,200,0,0.8)] transition-all duration-500 border-2 border-yellow-200 animate-pulse"
                onClick={handleStart}
             >
                Celebrate
             </button>
         )}
      </div>

      <div className="absolute bottom-10 w-full flex justify-center pointer-events-none z-20">
         {phase === 'cake' && candleState !== 'extinguished' && (
             <button 
                className="pointer-events-auto px-12 py-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-serif text-xl tracking-widest uppercase shadow-[0_0_30px_rgba(255,165,0,0.6)] hover:scale-105 hover:shadow-[0_0_50px_rgba(255,165,0,0.9)] transition-all duration-300 border border-yellow-300/50"
                onClick={handleManualBlow}
             >
                Blow Candle
             </button>
         )}
         
         {candleState === 'extinguished' && showWishes && (
             <button 
                className="pointer-events-auto px-10 py-3 rounded-full bg-white/10 backdrop-blur-md text-amber-200 font-serif text-lg tracking-widest uppercase border border-amber-200/30 hover:bg-white/20 transition-all duration-300 pointer-events-auto"
                onClick={resetCake}
             >
                Replay
             </button>
         )}
      </div>
    </div>
  );
};

export default App;