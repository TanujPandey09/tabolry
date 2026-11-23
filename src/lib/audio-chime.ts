// Professional Web Audio API Synthesizer for Restaurant Service Bells & Alerts
// Does not depend on external audio URLs or MP3 files that could fail to load or be blocked.

class AudioChimeEngine {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("menuqr_sound_enabled");
      this.soundEnabled = stored !== null ? stored === "true" : true;
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("menuqr_sound_enabled", String(enabled));
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  // Classic restaurant desk call-bell: rich dual-tone chime (Ding-Dong)
  public playOrderBell(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // First Ding (D5 - 587.33 Hz + harmonics)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);

      // Shimmer harmonic for desk bell realism
      const osc1Harmonic = ctx.createOscillator();
      const gain1Harmonic = ctx.createGain();
      osc1Harmonic.type = "triangle";
      osc1Harmonic.frequency.setValueAtTime(1174.66, now);
      gain1Harmonic.gain.setValueAtTime(0.12, now);
      gain1Harmonic.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1Harmonic.connect(gain1Harmonic);
      gain1Harmonic.connect(ctx.destination);
      osc1Harmonic.start(now);
      osc1Harmonic.stop(now + 0.35);

      // Second Dong (A5 - 880 Hz + resonance)
      const dongTime = now + 0.16;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, dongTime);
      gain2.gain.setValueAtTime(0.4, dongTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, dongTime + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(dongTime);
      osc2.stop(dongTime + 0.7);

      const osc2Harmonic = ctx.createOscillator();
      const gain2Harmonic = ctx.createGain();
      osc2Harmonic.type = "triangle";
      osc2Harmonic.frequency.setValueAtTime(1760, dongTime);
      gain2Harmonic.gain.setValueAtTime(0.15, dongTime);
      gain2Harmonic.gain.exponentialRampToValueAtTime(0.001, dongTime + 0.55);
      osc2Harmonic.connect(gain2Harmonic);
      gain2Harmonic.connect(ctx.destination);
      osc2Harmonic.start(dongTime);
      osc2Harmonic.stop(dongTime + 0.55);
    } catch {
      // Browser audio policy prevented playback
    }
  }

  // Payment confirmation cash-register / ascending celebratory chime
  public playPaymentChime(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 -> E5 -> G5 -> C6

      notes.forEach((freq, idx) => {
        const noteStart = now + idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, noteStart);
        gain.gain.setValueAtTime(0.28, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(noteStart);
        osc.stop(noteStart + 0.35);
      });
    } catch {
      // Audio policy
    }
  }

  // Subtle alert ping for table QR scans and kitchen status changes
  public playStatusPing(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(740, now); // F#5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Audio policy
    }
  }
}

export const chimeEngine = new AudioChimeEngine();
