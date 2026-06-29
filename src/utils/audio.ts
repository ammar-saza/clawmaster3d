class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private motorOsc: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;
  private ambientHumGain: GainNode | null = null;
  public isMuted: boolean = false;

  // Independent Volume Multipliers (0.0 to 1.0)
  public musicVolume: number = 0.5;
  public craneVolume: number = 0.5;
  public coinVolume: number = 0.5;

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.startAmbientHum();
      }
    } catch (e) {
      console.warn("Web Audio API not supported in this environment:", e);
    }
  }

  private startAmbientHum() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, this.ctx.currentTime); // Low electric mains hum
      
      // Multiply default base gain (0.005) by musicVolume level
      const targetGainVal = 0.005 * this.musicVolume;
      gain.gain.setValueAtTime(targetGainVal, this.ctx.currentTime);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      
      // Save ref to shut off on mute or live volume sliding
      this.ambientHumGain = gain;
    } catch (e) {
      console.warn(e);
    }
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.ambientHumGain) {
      const targetGainVal = 0.005 * this.musicVolume;
      this.ambientHumGain.gain.setValueAtTime(this.isMuted ? 0 : targetGainVal, this.ctx.currentTime);
    }
  }

  public setCraneVolume(vol: number) {
    this.craneVolume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.motorGain) {
      const targetGainVal = 0.02 * this.craneVolume;
      this.motorGain.gain.setValueAtTime(this.isMuted ? 0 : targetGainVal, this.ctx.currentTime);
    }
  }

  public setCoinVolume(vol: number) {
    this.coinVolume = Math.max(0, Math.min(1, vol));
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopMotor();
      if (this.ambientHumGain && this.ctx) {
        this.ambientHumGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
    } else {
      if (this.ctx) {
        this.ctx.resume();
        if (this.ambientHumGain) {
          const targetGainVal = 0.005 * this.musicVolume;
          this.ambientHumGain.gain.setValueAtTime(targetGainVal, this.ctx.currentTime);
        } else {
          this.startAmbientHum();
        }
      }
    }
  }

  public playCoin() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    
    const now = this.ctx.currentTime;
    
    // Quick dual-chime retro metallic scale
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(987.77, now); // B5
    osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1318.51, now); // E6
    osc2.frequency.setValueAtTime(1567.98, now + 0.08); // G6
    
    // Scale by coinVolume (base gain 0.08)
    const coinGain = 0.08 * this.coinVolume;
    gainNode.gain.setValueAtTime(coinGain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    
    osc1.start(now);
    osc2.start(now);
    
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  public startMotor() {
    this.init();
    if (!this.ctx || this.isMuted || this.motorOsc) return;
    
    try {
      const now = this.ctx.currentTime;
      this.motorOsc = this.ctx.createOscillator();
      this.motorGain = this.ctx.createGain();
      
      this.motorOsc.type = 'sawtooth';
      this.motorOsc.frequency.setValueAtTime(85, now); // Retro machine hum
      
      // Low pass filter to make it warmer and less harsh
      const lpf = this.ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.setValueAtTime(180, now);
      
      // Crane volume scale
      const craneMotorGain = 0.02 * this.craneVolume;
      this.motorGain.gain.setValueAtTime(craneMotorGain, now);
      
      this.motorOsc.connect(lpf);
      lpf.connect(this.motorGain);
      this.motorGain.connect(this.ctx.destination);
      
      this.motorOsc.start(now);
    } catch (e) {
      console.warn("Could not start motor sound:", e);
    }
  }

  public stopMotor() {
    if (this.motorOsc && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.motorGain?.gain.linearRampToValueAtTime(0, now + 0.05);
        this.motorOsc.stop(now + 0.06);
      } catch (e) {}
      this.motorOsc = null;
      this.motorGain = null;
    }
  }

  public playClawAction() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.2);
    
    // Scale by craneVolume
    const clawGain = 0.06 * this.craneVolume;
    gainNode.gain.setValueAtTime(clawGain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    
    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playSuccess() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    
    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Beautiful C Major Arpeggio scale
    const delay = 0.08;
    const duration = 0.4;
    
    notes.forEach((freq, i) => {
      if (!this.ctx) return;
      const t = now + i * delay;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      
      // Scaled by coinVolume
      const successGain = 0.05 * this.coinVolume;
      gainNode.gain.setValueAtTime(successGain, t);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + duration);
      
      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      
      osc.start(t);
      osc.stop(t + duration);
    });
  }

  public playFail() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now); // A3
    osc.frequency.linearRampToValueAtTime(110, now + 0.5); // Slide down to A2
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    
    // Scaled by craneVolume
    const failGain = 0.05 * this.craneVolume;
    gainNode.gain.setValueAtTime(failGain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.5);
  }

  public playTargetHit() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(880, now + 0.06);
    
    // Scaled by coinVolume
    const hitGain = 0.04 * this.coinVolume;
    gainNode.gain.setValueAtTime(hitGain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.15);
  }
}

export const AudioEngine = new RetroAudioEngine();
