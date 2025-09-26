import type { AppSettings } from '../types';

export class TTSService {
  private synthesis: SpeechSynthesis;
  private settings: Partial<AppSettings>;

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

  speak(text: string): Promise<void> {
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
      this.synthesis.speak(utterance);
    });
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
