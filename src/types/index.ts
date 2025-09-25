export interface GestureMapping {
  id: string;
  name: string;
  emoji: string;
  text: string;
  enabled: boolean;
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandResults {
  multiHandLandmarks?: HandLandmark[][];
  multiHandedness?: Array<{
    index: number;
    score: number;
    label: string;
  }>;
}

export interface GestureDetection {
  gesture: string;
  confidence: number;
  timestamp: number;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface AppSettings {
  darkMode: boolean;
  showSkeleton: boolean;
  gestureThreshold: number;
  debounceTime: number;
  ttsEnabled: boolean;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
}

export type GestureType = 
  | 'Wave'
  | 'Open Palm'
  | 'Thumbs-Up'
  | 'Fist'
  | 'Pointing'
  | 'Victory'
  | 'Clap'
  | 'Cross Hands'
  | 'Raise Both Hands'
  | 'Namaste';
