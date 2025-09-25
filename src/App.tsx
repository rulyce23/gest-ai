import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Moon, 
  Sun, 
  Settings, 
  Volume2, 
  VolumeX, 
  Eye, 
  EyeOff,
  Hand,
  Bug
} from 'lucide-react';
import { CameraView } from './components/CameraView';
import { GestureMappingPanel } from './components/GestureMappingPanel';
import { DebugPanel } from './components/DebugPanel';
import { useHandDetection } from './hooks/useHandDetection';
import { TTSService } from './utils/ttsService';
import { storageService } from './utils/storage';
import type { GestureMapping, GestureDetection, AppSettings } from './types';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showDebug, setShowDebug] = useState(import.meta.env.DEV);
  const [currentGesture, setCurrentGesture] = useState<GestureDetection | null>(null);
  const [gestureMappings, setGestureMappings] = useState<GestureMapping[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    darkMode: false,
    showSkeleton: true,
    gestureThreshold: 0.8,
    debounceTime: 300,
    ttsEnabled: true,
    ttsRate: 1,
    ttsPitch: 1,
    ttsVolume: 1
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ttsServiceRef = useRef<TTSService | null>(null);
  const gestureTimeoutRef = useRef<number | undefined>(undefined);

  // Handle manual TTS
  const handleManualTTS = (text: string) => {
    console.log('🔊 App: Manual TTS requested for:', text);
    // fire-and-forget but surface errors
    speakText(text).catch(err => console.error('Manual TTS failed:', err));
  };

  // Initialize TTS service
  useEffect(() => {
    ttsServiceRef.current = new TTSService(settings);
    console.log('TTS Service initialized:', ttsServiceRef.current);
  }, []);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await storageService.getSettings();
        const mergedSettings = { ...settings, ...savedSettings };
        setSettings(mergedSettings);
        setDarkMode(mergedSettings.darkMode);
        setShowSkeleton(mergedSettings.showSkeleton);
        
        if (ttsServiceRef.current) {
          ttsServiceRef.current.updateSettings(mergedSettings);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, []);

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Handle gesture detection
  const handleGestureDetected = async (gesture: GestureDetection) => {
    console.log('🎯 App: Gesture detected:', gesture);

    // Set current gesture immediately (this triggers the popup/notification)
    setCurrentGesture(gesture);

    // Clear previous timeout
    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
    }

    // Find matching mapping
    const mapping = gestureMappings.find(
      m => m.name === gesture.gesture && m.enabled
    );

    console.log('📋 App: Found mapping:', mapping);
    console.log('🔊 App: TTS enabled:', settings.ttsEnabled);
    console.log('🤖 App: TTS service available:', !!ttsServiceRef.current);
    console.log('📊 App: Gesture mappings count:', gestureMappings.length);

    // Trigger TTS immediately when gesture is detected (bersamaan dengan popup)
    if (mapping && settings.ttsEnabled) {
      console.log('🔊 App: Starting TTS for gesture:', gesture.gesture);
      console.log('📝 App: TTS text:', mapping.text);

      // Use simple TTS function - no Promise, just trigger
      // Ensure TTS service exists (in case detection fired before mount effect)
      if (!ttsServiceRef.current) {
        ttsServiceRef.current = new TTSService(settings);
      }

      // Fire-and-forget speak; speakText already tries audio-unlock
      void speakText(mapping.text);

      console.log('🚀 App: TTS started immediately for:', mapping.text);
    } else {
      console.log('⚠️ App: TTS not triggered - reasons:', {
        hasMapping: !!mapping,
        ttsEnabled: settings.ttsEnabled,
        hasTTSService: !!ttsServiceRef.current,
        mappingsCount: gestureMappings.length,
        gestureName: gesture.gesture
      });
    }

    // Clear current gesture after delay
    gestureTimeoutRef.current = window.setTimeout(() => {
      setCurrentGesture(null);
    }, 4000); // Increased to 4 seconds to allow TTS to complete
  };

  // Centralized TTS entry that uses TTSService (which attempts audio-unlock)
  const speakText = async (text: string) => {
    console.log('🔊 App: speakText called with:', text);

    if (!settings.ttsEnabled) {
      console.log('🔇 App: TTS disabled');
      return;
    }

    // Prefer using the TTSService (it performs audio-unlock attempts)
    if (ttsServiceRef.current) {
      try {
        await ttsServiceRef.current.speak(text);
        return;
      } catch (err) {
        console.error('🔊 App: TTSService.speak failed, falling back to speechSynthesis', err);
        // fallthrough to fallback below
      }
    }

    // Fallback: direct speechSynthesis (best-effort)
    if (!('speechSynthesis' in window)) {
      console.error('❌ App: TTS not supported in this browser');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = settings.ttsRate || 1;
      utterance.pitch = settings.ttsPitch || 1;
      utterance.volume = settings.ttsVolume || 1;
      utterance.lang = 'id-ID';

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const indonesianVoice = voices.find(voice =>
          voice.lang.includes('id') || voice.name.toLowerCase().includes('indonesia')
        );
        if (indonesianVoice) utterance.voice = indonesianVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('🔊 App: Fallback speech failed', err);
    }
  };

  // Hand detection hook
  const { lastResults, isDetecting, error: handError } = useHandDetection(
    videoRef.current,
    handleGestureDetected
  );

  // Update settings
  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    if (ttsServiceRef.current) {
      ttsServiceRef.current.updateSettings(updatedSettings);
    }

    try {
      await storageService.saveSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  // Toggle functions
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    updateSettings({ darkMode: newDarkMode });
  };

  const toggleSkeleton = () => {
    const newShowSkeleton = !showSkeleton;
    setShowSkeleton(newShowSkeleton);
    updateSettings({ showSkeleton: newShowSkeleton });
  };

  const toggleTTS = () => {
    updateSettings({ ttsEnabled: !settings.ttsEnabled });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: currentGesture ? 360 : 0 }}
                transition={{ duration: 0.5 }}
                className="p-2 bg-primary-500 rounded-lg"
              >
                <Hand className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Gesture AI
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Real-time Hand Gesture Recognition
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Status Indicators */}
              <div className="flex items-center gap-2 mr-4">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                  isDetecting ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${isDetecting ? 'bg-green-500' : 'bg-red-500'}`} />
                  {isDetecting ? 'Detecting' : 'Stopped'}
                </div>

                {settings.ttsEnabled && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    <Volume2 className="w-3 h-3" />
                    TTS
                  </div>
                )}
              </div>

              {/* Controls */}
              <button
                onClick={toggleSkeleton}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                title={showSkeleton ? 'Hide skeleton' : 'Show skeleton'}
              >
                {showSkeleton ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleTTS}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                title={settings.ttsEnabled ? 'Disable TTS' : 'Enable TTS'}
              >
                {settings.ttsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleDarkMode}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                title={darkMode ? 'Light mode' : 'Dark mode'}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setShowDebug(!showDebug)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Toggle Debug"
              >
                <Bug className="w-5 h-5" />
              </button>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Camera View */}
          <div className="lg:col-span-2">
            <CameraView
              handResults={lastResults}
              showSkeleton={showSkeleton}
              onVideoRef={(ref) => { videoRef.current = ref; }}
              className="w-full aspect-video"
            />

            {handError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <p className="text-red-800 dark:text-red-200 text-sm">
                  <strong>Hand Detection Error:</strong> {handError}
                </p>
              </motion.div>
            )}

            {/* Debug Panel - positioned below camera */}
            {showDebug && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <DebugPanel
                  handResults={lastResults}
                  currentGesture={currentGesture}
                  isDetecting={isDetecting}
                  show={true}
                />
              </motion.div>
            )}
          </div>

          {/* Gesture Mapping Panel */}
          <div className="lg:col-span-1">
            <GestureMappingPanel
              currentGesture={currentGesture}
              onMappingUpdate={setGestureMappings}
              onManualTTS={handleManualTTS}
              className="h-full"
            />
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Settings
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  TTS Rate: {settings.ttsRate}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={settings.ttsRate}
                  onChange={(e) => updateSettings({ ttsRate: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  TTS Pitch: {settings.ttsPitch}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={settings.ttsPitch}
                  onChange={(e) => updateSettings({ ttsPitch: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  TTS Volume: {settings.ttsVolume}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.ttsVolume}
                  onChange={(e) => updateSettings({ ttsVolume: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </main>
    </div>
  );
}

export default App;
