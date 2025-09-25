import type { AppSettings } from '../types';

export class TTSService {
  private synthesis: SpeechSynthesis;
  private settings: Partial<AppSettings>;
  private audioCtx: AudioContext | null = null;

  constructor(settings: Partial<AppSettings> = {}) {
    this.synthesis = window.speechSynthesis;
    this.settings = {
      ttsEnabled: true,
      ttsRate: 0.9,
      ttsPitch: 0.8,
      ttsVolume: 1,
      ...settings
    };
  }

  updateSettings(newSettings: Partial<AppSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  async speak(text: string): Promise<void> {
    // Ensure audio system is 'unlocked' where possible before attempting speech
    try {
      await this.ensureAudioUnlocked();
    } catch (err) {
      console.warn('🔊 TTS: Audio unlock attempt failed or unavailable', err);
    }

    return new Promise((resolve, reject) => {
      console.log('🔊 TTS: Attempting to speak:', text);

      if (!this.settings.ttsEnabled) {
        console.log('🔇 TTS: Disabled, skipping');
        resolve();
        return;
      }

      if (!this.isSupported()) {
        console.error('❌ TTS: Browser not supported');
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Stop any current speech
      this.stop();

      // Create utterance
      const utterance = new SpeechSynthesisUtterance(text);
      console.log('🎤 TTS: Created utterance');

      // Set basic properties
      utterance.rate = this.settings.ttsRate || 1;
      utterance.pitch = this.settings.ttsPitch || 1;
      utterance.volume = this.settings.ttsVolume || 1;
      utterance.lang = 'id-ID';

      // Event listeners
      utterance.onstart = () => {
        console.log('🔊 TTS: STARTED speaking');
      };

      utterance.onend = () => {
        console.log('🔊 TTS: FINISHED speaking');
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('🔊 TTS: ERROR -', event.error);
        reject(new Error(`TTS Error: ${event.error}`));
      };

      // Try to set Indonesian voice
      const voices = this.synthesis.getVoices();
      console.log('🔊 TTS: Available voices:', voices.length);

      if (voices.length > 0) {
        const indonesianVoice = voices.find(voice =>
          voice.lang.includes('id') || voice.name.toLowerCase().includes('indonesia')
        );

        if (indonesianVoice) {
          console.log('🔊 TTS: Using Indonesian voice:', indonesianVoice.name);
          utterance.voice = indonesianVoice;
        } else {
          console.log('🔊 TTS: Using default voice');
        }
      }

      // Speak immediately
      console.log('🔊 TTS: Executing speech synthesis...');
      try {
        this.synthesis.speak(utterance);
      } catch (err) {
        console.error('🔊 TTS: speechSynthesis.speak threw', err);
        reject(err as Error);
        return;
      }

      // Fallback: if speech never starts because of autoplay policies, resolve after timeout
      const fallbackTimeout = window.setTimeout(() => {
        if (!this.synthesis.speaking) {
          console.warn('🔊 TTS: Fallback timeout reached and speech did not start');
          resolve();
        }
      }, 5000);

      // Clear fallback on natural end / error
      const clearAndResolve = () => {
        clearTimeout(fallbackTimeout);
        resolve();
      };

      utterance.onend = () => {
        console.log('🔊 TTS: FINISHED speaking');
        clearAndResolve();
      };

      utterance.onerror = (event) => {
        console.error('🔊 TTS: ERROR -', event.error);
        clearTimeout(fallbackTimeout);
        reject(new Error(`TTS Error: ${event.error}`));
      };
    });
  }

  private async ensureAudioUnlocked(): Promise<void> {
    try {
      if (!this.audioCtx) {
        const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctor) return Promise.resolve();
        this.audioCtx = new Ctor();
      }

      // Resume audio context if suspended
      const ctx = this.audioCtx;
      if (!ctx) return Promise.resolve();

      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch (err) {
          // continue to try oscillator approach
        }
      }

      // Play a very short silent buffer / near-silent oscillator to try to unlock audio on some browsers
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001; // near-silent but will count as an audio output
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      await new Promise<void>((res) => setTimeout(() => {
        try { osc.stop(); } catch (e) {}
        res();
      }, 30));
    } catch (err) {
      // Not fatal; some browsers will still block until a real user gesture
      console.warn('🔊 TTS: ensureAudioUnlocked encountered an error', err);
      return Promise.resolve();
    }
  }

  stop() {
    if (this.synthesis.speaking) {
      console.log('🔊 TTS: Stopping current speech');
      this.synthesis.cancel();
    }
  }

  isSpeaking(): boolean {
    return this.synthesis.speaking;
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synthesis.getVoices();
  }

  isSupported(): boolean {
    return 'speechSynthesis' in window;
  }
}
