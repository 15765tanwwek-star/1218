
export const getAudioContext = (): AudioContext | null => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return null;
  return new AudioContext();
};

/**
 * Plays a background music track from a URL.
 * Returns the HTMLAudioElement so it can be controlled (paused/stopped) later.
 */
export const playBackgroundMusic = (url: string): HTMLAudioElement => {
  const audio = new Audio(url);
  audio.loop = true; // Keep playing the song
  audio.volume = 0.5;
  
  // Attempt to play. Note: This might require a user interaction history, 
  // which is satisfied by the "Celebrate" button click in the main flow.
  audio.play().catch((e) => console.warn("Audio playback blocked or failed:", e));
  
  return audio;
};

/**
 * Starts continuous microphone analysis.
 * onAnalysis callback is called repeatedly with the current volume level (0.0 to ~1.0).
 */
export const startContinuousAudioAnalysis = async (onAnalysis: (intensity: number) => void): Promise<() => void> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
            echoCancellation: true, // Critical: Prevents the music from the speaker triggering the 'blow'
            noiseSuppression: false, // We want to detect the 'noise' of air blowing
            autoGainControl: false 
        } 
    });
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    
    // Smooth out the values a bit
    analyser.smoothingTimeConstant = 0.2; 
    analyser.fftSize = 256; // Smaller FFT for faster reaction to low freq
    microphone.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let isActive = true;

    const detect = () => {
        if (!isActive) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // Blowing creates significant low-frequency rumble/noise
        // Focus on the first ~10% bins (Deep low frequency) which corresponds to breath wind
        const lowEndLimit = Math.max(2, Math.floor(dataArray.length * 0.1)); 
        let sum = 0;
        for(let i = 0; i < lowEndLimit; i++) {
            sum += dataArray[i];
        }
        const average = sum / lowEndLimit;

        // Normalize:
        // Lowered threshold to 12 (was 20) to detect softer blowing
        // Lowered divisor to 50 (was 80) so it reaches max intensity faster
        const threshold = 12; 
        const normalized = Math.min(1, Math.max(0, (average - threshold) / 50));

        onAnalysis(normalized);
        requestAnimationFrame(detect);
    };

    detect();

    return () => {
        isActive = false;
        stream.getTracks().forEach(track => track.stop());
        microphone.disconnect();
        analyser.disconnect();
        audioContext.close();
    };

  } catch (err) {
    console.warn("Microphone access denied or error:", err);
    return () => {};
  }
};
