class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private ambientGain: GainNode | null = null;
  private ambientStarted = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(m: boolean): void {
    this.muted = m;
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(m ? 0 : 0.045, this.ctx.currentTime, 0.15);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public startAmbient(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.ambientStarted) return;
    this.ambientStarted = true;

    const gain = ctx.createGain();
    gain.gain.value = this.muted ? 0 : 0.045;
    gain.connect(ctx.destination);
    this.ambientGain = gain;

    const freqs = [55, 82.41, 110, 164.81];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      filter.type = 'lowpass';
      filter.frequency.value = 340;
      const subGain = ctx.createGain();
      subGain.gain.value = idx === 0 ? 0.45 : 0.18;
      osc.connect(filter);
      filter.connect(subGain);
      subGain.connect(gain);
      osc.start();
    });
  }

  private tone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume: number,
  ): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    const jitter = 0.94 + Math.random() * 0.12;
    osc.frequency.setValueAtTime(freqStart * jitter, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd * jitter), now + duration);
    g.gain.setValueAtTime(volume, now);
    g.gain.exponentialRampToValueAtTime(0.0008, now + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playShoot(): void {
    this.tone(720, 190, 0.12, 'sawtooth', 0.08);
  }

  public playHit(): void {
    this.tone(240, 75, 0.09, 'square', 0.09);
  }

  public playKill(): void {
    this.tone(360, 60, 0.28, 'sawtooth', 0.12);
    setTimeout(() => this.tone(520, 120, 0.18, 'triangle', 0.08), 45);
  }

  public playJump(): void {
    this.tone(180, 420, 0.14, 'triangle', 0.07);
  }

  public playDash(): void {
    this.tone(480, 160, 0.16, 'sine', 0.09);
  }

  public playChest(): void {
    this.tone(440, 660, 0.14, 'triangle', 0.09);
    setTimeout(() => this.tone(660, 880, 0.22, 'sine', 0.09), 90);
  }

  public playGateOpen(): void {
    this.tone(95, 48, 0.75, 'sawtooth', 0.12);
    setTimeout(() => this.tone(330, 495, 0.45, 'triangle', 0.08), 180);
  }

  public playHackClick(): void {
    this.tone(640, 780, 0.06, 'sine', 0.06);
  }

  public playPlayerHurt(): void {
    this.tone(160, 55, 0.22, 'sawtooth', 0.13);
  }

  public playDialogue(): void {
    this.tone(520, 640, 0.07, 'sine', 0.05);
  }
}

export const soundEngine = new SoundEngine();
