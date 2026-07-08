export const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    
    // First beep (lower pitch, shorter)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
    gain1.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    
    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.12);
    
    // Second beep (higher pitch, slightly longer)
    const delay = 0.12;
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, audioCtx.currentTime + delay); // A5 note
    gain2.gain.setValueAtTime(0.05, audioCtx.currentTime + delay);
    gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + 0.18);
    
    osc2.start(audioCtx.currentTime + delay);
    osc2.stop(audioCtx.currentTime + delay + 0.18);
  } catch (error) {
    console.error('Web Audio Playback Failed:', error);
  }
};
