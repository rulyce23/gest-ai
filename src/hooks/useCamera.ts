import { useState, useEffect, useRef, useCallback } from 'react';
import type { CameraDevice } from '../types';

export const useCamera = () => {
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get available camera devices
  const getDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Request permission first
      await navigator.mediaDevices.getUserMedia({ video: true });

      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceList
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 8)}...`
        }));

      setDevices(videoDevices);

      // Auto-select first device if none selected
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access camera devices');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDeviceId]);

  // Start camera stream
  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const targetDeviceId = deviceId || selectedDeviceId;
      if (!targetDeviceId) {
        throw new Error('No camera device selected');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: { exact: targetDeviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);

      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      if (deviceId) {
        setSelectedDeviceId(deviceId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start camera');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDeviceId, stream]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  // Switch camera device
  const switchCamera = useCallback((deviceId: string) => {
    startCamera(deviceId);
  }, [startCamera]);

  // Check if camera is supported
  const isSupported = useCallback(() => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (isSupported()) {
      getDevices();
    } else {
      setError('Camera access is not supported in this browser');
    }

    // Cleanup on unmount
    return () => {
      stopCamera();
    };
  }, []);

  // Auto-start camera when device is selected
  useEffect(() => {
    if (selectedDeviceId && !stream && !isLoading) {
      startCamera();
    }
  }, [selectedDeviceId, stream, isLoading, startCamera]);

  // Handle device changes
  useEffect(() => {
    const handleDeviceChange = () => {
      getDevices();
    };

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [getDevices]);

  return {
    devices,
    selectedDeviceId,
    stream,
    isLoading,
    error,
    videoRef,
    startCamera,
    stopCamera,
    switchCamera,
    getDevices,
    isSupported: isSupported()
  };
};
