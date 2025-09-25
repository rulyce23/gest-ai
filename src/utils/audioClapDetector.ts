type ClapCallback = () => void;

export interface AudioClapOptions {
  threshold?: number; // 0-1 linear amplitude
  cooldownMs?: number;
  onClap?: ClapCallback;
}

export class AudioClapDetector {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private rafId: number | null = null;
  private running = false;
  private lastClapAt = 0;
  private threshold: number;
  private cooldownMs: number;
  private onClap?: ClapCallback;

  constructor(opts: AudioClapOptions = {}) {
    this.threshold = opts.threshold ?? 0.25; // conservative default
    this.cooldownMs = opts.cooldownMs ?? 400;
    this.onClap = opts.onClap;
  }

  async start(): Promise<void> {
    if (this.running) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.source = this.ctx.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
      this.running = true;
      this.process();
    } catch (err) {
      console.warn('AudioClapDetector: microphone access denied or not available', err);
      this.running = false;
    }
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    try {
      if (this.source && (this.source.mediaStream as any)) {
        const tracks = (this.source.mediaStream as MediaStream).getTracks();
        tracks.forEach(t => t.stop());
      }
    } catch (e) {
      // ignore
    }
    try { this.ctx?.close(); } catch (e) {}
    this.ctx = null;
    this.analyser = null;
    this.source = null;
    this.rafId = null;
  }

  private process = () => {
    if (!this.running || !this.analyser) return;
    const bufLen = this.analyser.fftSize;
    const data = new Uint8Array(bufLen);
    this.analyser.getByteTimeDomainData(data);

    // compute normalized peak
    let max = 0;
    for (let i = 0; i < bufLen; i++) {
      const v = Math.abs(data[i] - 128) / 128; // 0..1
      if (v > max) max = v;
    }

    if (max > this.threshold) {
      const now = Date.now();
      if (now - this.lastClapAt > this.cooldownMs) {
        this.lastClapAt = now;
        if (this.onClap) this.onClap();
      }
    }

    this.rafId = requestAnimationFrame(this.process);
  };

  on(event: 'clap', cb: ClapCallback) {
    if (event === 'clap') this.onClap = cb;
  }
}

export default AudioClapDetector;
