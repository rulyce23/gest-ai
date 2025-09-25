import { useState, useEffect, useRef, useCallback } from 'react';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import type { HandResults, GestureDetection, HandLandmark } from '../types';
import { GestureClassifier } from '../utils/gestureClassifier';
import AudioClapDetector from '../utils/audioClapDetector';

export const useHandDetection = (
  videoElement: HTMLVideoElement | null,
  onGestureDetected?: (gesture: GestureDetection) => void
) => {
  const [hands, setHands] = useState<Hands | null>(null);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [lastResults, setLastResults] = useState<HandResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastGestureRef = useRef<string>('');
  const gestureTimeoutRef = useRef<number | undefined>(undefined);
  const audioClapRef = useRef<AudioClapDetector | null>(null);
  const lastAudioClapRef = useRef<number>(0);
  // per-hand temporal history (label -> samples)
  const historyRef = useRef<Record<string, Array<{ ts: number; wrist: { x: number; y: number }; palmCenter: { x: number; y: number } }>>>({});

  // Initialize MediaPipe Hands
  const initializeHands = useCallback(async () => {
    try {
      setError(null);
      console.log('Initializing MediaPipe Hands...');
      
      const handsInstance = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      handsInstance.setOptions({
        maxNumHands: 2,
        modelComplexity: 1 as 0 | 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      });

      handsInstance.onResults((results: any) => {
        console.log('Hand detection results:', results);
        setLastResults(results);
        processResults(results);
      });

      setHands(handsInstance);
      setIsInitialized(true);
      console.log('MediaPipe Hands initialized successfully');
    } catch (err) {
      console.error('Failed to initialize MediaPipe Hands:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize hand detection');
    }
  }, []);

  // Process hand detection results
  const processResults = useCallback((results: HandResults) => {
    // Improved processing: pair landmarks with handedness, maintain per-hand history,
    // and detect temporal gestures (clap with audio confirmation, namaste, raise both, wave)
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) return;

    const now = Date.now();
    // Pair landmarks by handedness label when available
    const handsByLabel: Record<string, HandLandmark[]> = {};
    if (results.multiHandLandmarks && results.multiHandedness && results.multiHandLandmarks.length === results.multiHandedness.length) {
      results.multiHandedness.forEach((h, idx) => {
        const label = h.label || `Hand${idx}`;
        handsByLabel[label] = results.multiHandLandmarks![idx] as HandLandmark[];
      });
    } else {
      results.multiHandLandmarks.forEach((lm, idx) => {
        handsByLabel[`Hand${idx}`] = lm as HandLandmark[];
      });
    }

    // helper: compute palm center
    const palmCenter = (lm: HandLandmark[]) => {
      const pts = [5,9,13,17].map(i => lm[i]);
      const avgX = pts.reduce((s,p) => s + p.x, 0) / pts.length;
      const avgY = pts.reduce((s,p) => s + p.y, 0) / pts.length;
      return { x: avgX, y: avgY };
    };

    // update histories
    Object.entries(handsByLabel).forEach(([label, lm]) => {
      const wrist = { x: lm[0].x, y: lm[0].y };
      const palm = palmCenter(lm);
      historyRef.current[label] = historyRef.current[label] || [];
      historyRef.current[label].push({ ts: now, wrist, palmCenter: palm });
      if (historyRef.current[label].length > 30) historyRef.current[label].shift();
    });

    let detectedGesture: GestureDetection | null = null;

    const labels = Object.keys(handsByLabel);
    if (labels.length === 2) {
      const [la, lb] = labels;
      const a = handsByLabel[la];
      const b = handsByLabel[lb];
      const aPalm = palmCenter(a);
      const bPalm = palmCenter(b);
      const palmDist = GestureClassifier.distance(aPalm as any, bPalm as any);

      // Clap: palms rapidly approach AND (audio spike within 800ms OR no audio available)
      const ah = historyRef.current[la] || [];
      const bh = historyRef.current[lb] || [];
      const aPrev = ah.length >= 5 ? ah[ah.length-5].palmCenter : null;
      const bPrev = bh.length >= 5 ? bh[bh.length-5].palmCenter : null;
      if (aPrev && bPrev) {
        const prevDist = GestureClassifier.distance(aPrev as any, bPrev as any);
        // approaching quickly
        if (prevDist - palmDist > 0.12 && palmDist < 0.12) {
          const audioConfirm = lastAudioClapRef.current && (now - lastAudioClapRef.current) < 800;
          if (audioConfirm || !audioClapRef.current) {
            detectedGesture = { gesture: 'Clap', confidence: 0.97, timestamp: now };
          }
        }
      }

      // Namaste (prayer) - palms close and wrist distance small and middle tips close
      if (!detectedGesture) {
        const leftWrist = a[0];
        const rightWrist = b[0];
        const leftMid = a[12];
        const rightMid = b[12];
        const wristDist = GestureClassifier.distance(leftWrist as any, rightWrist as any);
        const tipDist = GestureClassifier.distance(leftMid as any, rightMid as any);
        if (palmDist < 0.14 && wristDist < 0.18 && tipDist < 0.08) {
          detectedGesture = { gesture: 'Namaste', confidence: 0.95, timestamp: now };
        }
      }

      // Cross Hands - simple horizontal crossing check
      if (!detectedGesture) {
        if (a[0].x > b[0].x + 0.02) {
          detectedGesture = { gesture: 'Cross Hands', confidence: 0.9, timestamp: now };
        }
      }

      // Raise Both Hands - wrists above palms
      if (!detectedGesture) {
        const aRaised = a[0].y < a[9].y - 0.02;
        const bRaised = b[0].y < b[9].y - 0.02;
        if (aRaised && bRaised) {
          detectedGesture = { gesture: 'Raise Both Hands', confidence: 0.9, timestamp: now };
        }
      }
    }

    // Single hand gestures and wave (temporal)
    if (!detectedGesture) {
      for (const [label, lm] of Object.entries(handsByLabel)) {
        const hist = historyRef.current[label] || [];
        const staticGuess = GestureClassifier.classifyGesture(lm);

        // Wave: require Open Palm static + horizontal wrist oscillation
        if (staticGuess && staticGuess.gesture === 'Open Palm') {
          const xs = hist.map(h => h.wrist.x);
          let reversals = 0;
          for (let i = 2; i < xs.length; i++) {
            if ((xs[i] - xs[i-1]) * (xs[i-1] - xs[i-2]) < 0) reversals++;
          }
          const amplitude = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
          if (reversals >= 2 && amplitude > 0.06) {
            detectedGesture = { gesture: 'Wave', confidence: 0.92, timestamp: now };
            break;
          }

          // Raise single hand: wrist high and sustained for short period
          const recent = hist.slice(-6);
          const sustainedHigh = recent.length >= 4 && recent.every(h => h.wrist.y < 0.38);
          if (sustainedHigh) {
            detectedGesture = { gesture: 'Raise Hand', confidence: 0.9, timestamp: now };
            break;
          }
        }

        // fallback to classifier for stable single-hand gestures
        if (!detectedGesture && staticGuess) {
          detectedGesture = staticGuess;
          break;
        }
      }
    }

    // Debounce and callback
    if (detectedGesture && detectedGesture.gesture !== lastGestureRef.current) {
      if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
      gestureTimeoutRef.current = window.setTimeout(() => {
        lastGestureRef.current = detectedGesture!.gesture;
        onGestureDetected?.(detectedGesture!);
        setTimeout(() => { lastGestureRef.current = ''; }, 1800);
      }, 150);
    }
  }, [onGestureDetected]);

  // Start detection
  const startDetection = useCallback(async () => {
    if (!hands || !videoElement || isDetecting) return;

    try {
      setError(null);
      
      const cameraInstance = new Camera(videoElement, {
        onFrame: async () => {
          if (hands && videoElement) {
            await hands.send({ image: videoElement });
          }
        },
        width: 1280,
        height: 720
      });

      await cameraInstance.start();
      setCamera(cameraInstance);
      setIsDetecting(true);
      // start audio clap detector
      try {
        audioClapRef.current = new AudioClapDetector({ threshold: 0.25, cooldownMs: 300 });
        audioClapRef.current.on('clap', () => {
          lastAudioClapRef.current = Date.now();
          console.log('🔊 AudioClapDetector: clap detected');
        });
        audioClapRef.current.start();
      } catch (err) {
        console.warn('AudioClapDetector failed to start', err);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start hand detection');
    }
  }, [hands, videoElement, isDetecting]);

  // Stop detection
  const stopDetection = useCallback(() => {
    if (camera) {
      camera.stop();
      setCamera(null);
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
    }

    setIsDetecting(false);
    setLastResults(null);
    lastGestureRef.current = '';
    // stop audio clap detector
    try {
      audioClapRef.current?.stop();
    } catch (e) {}
    audioClapRef.current = null;
  }, [camera]);

  // Update detection settings
  const updateSettings = useCallback((settings: {
    maxNumHands?: number;
    modelComplexity?: 0 | 1;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
  }) => {
    if (hands) {
      hands.setOptions(settings);
    }
  }, [hands]);

  // Initialize on mount
  useEffect(() => {
    initializeHands();

    return () => {
      stopDetection();
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current);
      }
    };
  }, []);

  // Auto-start detection when video is available
  useEffect(() => {
    if (isInitialized && videoElement && !isDetecting) {
      startDetection();
    }
  }, [isInitialized, videoElement, isDetecting, startDetection]);

  return {
    isInitialized,
    isDetecting,
    lastResults,
    error,
    startDetection,
    stopDetection,
    updateSettings
  };
};
