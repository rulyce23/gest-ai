import React from 'react';
import { motion } from 'framer-motion';
import { Camera, CameraOff, Settings } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { SkeletonOverlay } from './SkeletonOverlay';
import type { HandResults } from '../types';

interface CameraViewProps {
  handResults: HandResults | null;
  showSkeleton: boolean;
  onVideoRef: (ref: HTMLVideoElement | null) => void;
  className?: string;
}

export const CameraView: React.FC<CameraViewProps> = ({
  handResults,
  showSkeleton,
  onVideoRef,
  className = ''
}) => {
  const {
    devices,
    selectedDeviceId,
    stream,
    isLoading,
    error,
    videoRef,
    switchCamera,
    isSupported
  } = useCamera();

  React.useEffect(() => {
    onVideoRef(videoRef.current);
  }, [videoRef.current, onVideoRef]);

  if (!isSupported) {
    return (
      <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center text-white">
            <CameraOff className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-semibold mb-2">Camera Not Supported</h3>
            <p className="text-gray-300">Your browser doesn't support camera access.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Camera Controls */}
      <div className="absolute top-4 left-4 z-20 flex gap-2">
        {devices.length > 1 && (
          <motion.select
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            value={selectedDeviceId}
            onChange={(e) => switchCamera(e.target.value)}
            className="bg-black/50 text-white px-3 py-2 rounded-lg text-sm backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </motion.select>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-black/50 text-white px-3 py-2 rounded-lg backdrop-blur-sm border border-white/20 flex items-center gap-2"
        >
          <Camera className="w-4 h-4" />
          <span className="text-sm">
            {stream ? 'Connected' : isLoading ? 'Connecting...' : 'Disconnected'}
          </span>
        </motion.div>
      </div>

      {/* Skeleton Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-black/50 text-white px-3 py-2 rounded-lg backdrop-blur-sm border border-white/20 flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          <span className="text-sm">
            Skeleton: {showSkeleton ? 'ON' : 'OFF'}
          </span>
        </motion.div>
      </div>

      {/* Video Element */}
      <div className="relative w-full h-full min-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"
            />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center text-white">
              <CameraOff className="w-16 h-16 mx-auto mb-4 text-red-400" />
              <h3 className="text-lg font-semibold mb-2">Camera Error</h3>
              <p className="text-gray-300 max-w-md">{error}</p>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }} // Mirror the video
        />

        {/* Skeleton Overlay */}
        {videoRef.current && (
          <SkeletonOverlay
            results={handResults}
            width={videoRef.current.videoWidth || 1280}
            height={videoRef.current.videoHeight || 720}
            show={showSkeleton && !!handResults}
            className="absolute inset-0"
          />
        )}

        {/* Detection Status */}
        {handResults?.multiHandLandmarks && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-4 bg-green-500/80 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm"
          >
            {handResults.multiHandLandmarks.length} hand(s) detected
          </motion.div>
        )}
      </div>
    </div>
  );
};
