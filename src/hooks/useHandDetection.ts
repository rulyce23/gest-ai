import { useState, useEffect, useRef, useCallback } from 'react';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import type { HandResults, GestureDetection, HandLandmark } from '../types';
import { GestureClassifier } from '../utils/gestureClassifier';

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
        minDetectionConfidence: 0.8,
        minTrackingConfidence: 0.6,
        selfieMode: true
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
    console.log('🤖 HandDetection: Processing results:', results);

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      console.log('🤖 HandDetection: No hand landmarks detected');
      return;
    }

    console.log(`🤖 HandDetection: Detected ${results.multiHandLandmarks.length} hand(s)`);
    let detectedGesture: GestureDetection | null = null;

    if (results.multiHandLandmarks.length === 1) {
      // Single hand gesture
      const landmarks = results.multiHandLandmarks[0] as HandLandmark[];
      detectedGesture = GestureClassifier.classifyGesture(landmarks);
      console.log('🤖 HandDetection: Single hand gesture detected:', detectedGesture);
    } else if (results.multiHandLandmarks.length === 2) {
      // Two hand gesture - sort by wrist x-coordinate to determine left/right
      const sortedHands = results.multiHandLandmarks.slice().sort((a, b) => a[0].x - b[0].x);
      const leftHand = sortedHands[0] as HandLandmark[];
      const rightHand = sortedHands[1] as HandLandmark[];

      // Try two-hand gestures first
      detectedGesture = GestureClassifier.classifyTwoHandGesture(leftHand, rightHand, results.multiHandedness);
      console.log('🤖 HandDetection: Two hand gesture detected:', detectedGesture);

      // If no two-hand gesture, try single hand gestures
      if (!detectedGesture) {
        detectedGesture = GestureClassifier.classifyGesture(leftHand) ||
                          GestureClassifier.classifyGesture(rightHand);
        console.log('🤖 HandDetection: Fallback single hand gesture:', detectedGesture);
      }
    }

    // Handle gesture detection with debouncing
    if (detectedGesture && detectedGesture.gesture !== lastGestureRef.current) {
      console.log('🤖 HandDetection: New gesture detected:', detectedGesture.gesture);

      // Clear previous timeout
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current);
      }

      // Set new timeout for gesture stability
      gestureTimeoutRef.current = window.setTimeout(() => {
        console.log('🤖 HandDetection: Triggering gesture callback for:', detectedGesture!.gesture);
        lastGestureRef.current = detectedGesture!.gesture;
        onGestureDetected?.(detectedGesture!);

        // Reset after a delay to allow for new detections
        setTimeout(() => {
          lastGestureRef.current = '';
        }, 2000); // Allow 2 seconds before detecting same gesture again
      }, 200); // Reduced to 200ms for faster response
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
