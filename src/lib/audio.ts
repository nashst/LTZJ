// Retro Arcade Sound Synthesizer using Web Audio API
class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterVolume: GainNode | null = null;
  private musicVolume: GainNode | null = null;
  private sfxVolume: GainNode | null = null;
  private sequenceInterval: number | null = null;
  private isMuted: boolean = false;
  private isMusicPlaying: boolean = false;

  constructor() {
    // Lazy initialized on first user interaction
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.masterVolume = this.ctx.createGain();
      this.masterVolume.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterVolume.connect(this.ctx.destination);

      this.musicVolume = this.ctx.createGain();
      this.musicVolume.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.musicVolume.connect(this.masterVolume);

      this.sfxVolume = this.ctx.createGain();
      this.sfxVolume.gain.setValueAtTime(0.6, this.ctx.currentTime);
      this.sfxVolume.connect(this.masterVolume);
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  private resumeContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute(): boolean {
    this.resumeContext();
    this.isMuted = !this.isMuted;
    if (this.masterVolume && this.ctx) {
      this.masterVolume.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  getMutedState(): boolean {
    return this.isMuted;
  }

  // SOUND EFFECTS
  playShoot(type: 'STANDARD' | 'SPREAD' | 'LASER' | 'PLASMA') {
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.sfxVolume!);

    if (type === 'STANDARD') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.12);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      osc.start(t);
      osc.stop(t + 0.13);
    } else if (type === 'SPREAD') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(450, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      osc.start(t);
      osc.stop(t + 0.16);
    } else if (type === 'LASER') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, t);
      osc.frequency.linearRampToValueAtTime(600, t + 0.08);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
      osc.start(t);
      osc.stop(t + 0.09);
    } else { // PLASMA
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.25);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      osc.start(t);
      osc.stop(t + 0.26);
    }
  }

  playExplosion(type: 'SMALL' | 'MEDIUM' | 'LARGE' | 'BOSS') {
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const duration = type === 'SMALL' ? 0.2 : type === 'MEDIUM' ? 0.4 : type === 'LARGE' ? 0.7 : 1.8;
    const gainVal = type === 'SMALL' ? 0.3 : type === 'MEDIUM' ? 0.5 : type === 'LARGE' ? 0.8 : 1.0;

    // Direct synthesising noise
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    if (type === 'SMALL') {
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.exponentialRampToValueAtTime(100, t + duration);
    } else if (type === 'MEDIUM') {
      filter.frequency.setValueAtTime(500, t);
      filter.frequency.exponentialRampToValueAtTime(60, t + duration);
    } else { // LARGE / BOSS
      filter.frequency.setValueAtTime(300, t);
      filter.frequency.exponentialRampToValueAtTime(40, t + duration);
    }

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxVolume!);

    noiseNode.start(t);
    noiseNode.stop(t + duration);

    // Add bass rumble for Boss or Large explosions
    if (type === 'LARGE' || type === 'BOSS') {
      const rumble = this.ctx.createOscillator();
      const rumbleGain = this.ctx.createGain();
      rumble.type = 'sawtooth';
      rumble.frequency.setValueAtTime(90, t);
      rumble.frequency.linearRampToValueAtTime(30, t + duration);

      rumbleGain.gain.setValueAtTime(0.6, t);
      rumbleGain.gain.exponentialRampToValueAtTime(0.01, t + duration);

      rumble.connect(rumbleGain);
      rumbleGain.connect(this.sfxVolume!);
      rumble.start(t);
      rumble.stop(t + duration);
    }
  }

  playPlayerHit() {
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.setValueAtTime(90, t + 0.08);
    osc.frequency.setValueAtTime(45, t + 0.16);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(gain);
    osc.connect(this.sfxVolume!);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  playPowerUp() {
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(261.63, t); // C4
    osc.frequency.setValueAtTime(329.63, t + 0.08); // E4
    osc.frequency.setValueAtTime(392.00, t + 0.16); // G4
    osc.frequency.setValueAtTime(523.25, t + 0.24); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.50, t + 0.4); // C6

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.setValueAtTime(0.3, t + 0.24);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxVolume!);
    osc.start(t);
    osc.stop(t + 0.46);
  }

  playBomb() {
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const duration = 1.2;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + duration);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(220, t);
    osc2.frequency.exponentialRampToValueAtTime(30, t + duration);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxVolume!);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + duration);
    osc2.stop(t + duration);
  }

  playBossWarning() {
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const delay = i * 0.5;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, t + delay);
      osc.frequency.linearRampToValueAtTime(80, t + delay + 0.35);

      gain.gain.setValueAtTime(0.4, t + delay);
      gain.gain.linearRampToValueAtTime(0.01, t + delay + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxVolume!);
      osc.start(t + delay);
      osc.stop(t + delay + 0.4);
    }
  }

  // RETRO 8-BIT MUSIC SEQUENCE TRAK
  startMusic() {
    this.resumeContext();
    if (!this.ctx || this.isMusicPlaying) return;
    this.isMusicPlaying = true;

    let step = 0;
    const tempo = 135; // BPM
    const stepDuration = 60 / tempo / 2; // Eighth notes

    // Sequence loop (16 steps)
    // Simple retro bass line and techno beat sound
    const bassNotes = [
      110.00, 110.00, 130.81, 130.81, // A2, A2, C3, C3
      146.83, 146.83, 164.81, 164.81, // D3, D3, E3, E3
      110.00, 110.00, 196.00, 196.00, // A2, A2, G3, G3
      220.00, 196.00, 164.81, 130.81  // A3, G3, E3, C3
    ];

    const melodyNotes = [
      440.00, 0, 440.00, 493.88, 523.25, 0, 587.33, 0,
      659.25, 587.33, 523.25, 493.88, 440.00, 0, 392.00, 440.00
    ];

    const playStep = () => {
      if (!this.ctx || !this.isMusicPlaying || this.isMuted) return;

      const t = this.ctx.currentTime;
      
      // Bass channel
      const bassNode = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassNode.type = 'sawtooth';
      bassNode.frequency.setValueAtTime(bassNotes[step % 16] / 2, t);
      
      bassGain.gain.setValueAtTime(0.18, t);
      bassGain.gain.exponentialRampToValueAtTime(0.01, t + stepDuration - 0.02);

      bassNode.connect(bassGain);
      bassGain.connect(this.musicVolume!);
      bassNode.start(t);
      bassNode.stop(t + stepDuration);

      // Metronome hi-hat on odd steps
      if (step % 4 === 2) {
        const hhNode = this.ctx.createOscillator();
        const hhGain = this.ctx.createGain();
        hhNode.type = 'triangle';
        hhNode.frequency.setValueAtTime(8000, t);
        
        hhGain.gain.setValueAtTime(0.03, t);
        hhGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        hhNode.connect(hhGain);
        hhGain.connect(this.musicVolume!);
        hhNode.start(t);
        hhNode.stop(t + 0.06);
      }

      // Melody Channel
      const melodyFreq = melodyNotes[step % 16];
      if (melodyFreq > 0) {
        const melNode = this.ctx.createOscillator();
        const melGain = this.ctx.createGain();
        melNode.type = 'triangle';
        melNode.frequency.setValueAtTime(melodyFreq, t);

        melGain.gain.setValueAtTime(0.08, t);
        melGain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 1.5);

        melNode.connect(melGain);
        melGain.connect(this.musicVolume!);
        melNode.start(t);
        melNode.stop(t + stepDuration * 1.6);
      }

      step++;
    };

    // Use interval scheduler
    const scheduleNext = () => {
      if (!this.isMusicPlaying) return;
      playStep();
      this.sequenceInterval = window.setTimeout(scheduleNext, stepDuration * 1000);
    };

    scheduleNext();
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.sequenceInterval) {
      clearTimeout(this.sequenceInterval);
      this.sequenceInterval = null;
    }
  }
}

export const audio = new AudioEngine();
export default audio;
