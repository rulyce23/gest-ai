import React from 'react';
import type { HandResults, GestureDetection } from '../types';

interface DebugPanelProps {
  handResults: HandResults | null;
  currentGesture: GestureDetection | null;
  isDetecting: boolean;
  show?: boolean;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  handResults,
  currentGesture,
  isDetecting,
  show = false
}) => {
  if (!show) return null;

  return (
    <div className="bg-gray-900/90 text-white p-4 rounded-lg text-xs font-mono border border-gray-700">
      <h3 className="font-bold mb-3 text-center text-green-400">🔍 Debug Info</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Detection Status */}
        <div className="bg-gray-800/50 p-2 rounded">
          <div className="text-gray-400 mb-1">Detection</div>
          <div className={isDetecting ? 'text-green-400' : 'text-red-400'}>
            {isDetecting ? '✅ Active' : '❌ Inactive'}
          </div>
        </div>

        {/* Hand Count */}
        <div className="bg-gray-800/50 p-2 rounded">
          <div className="text-gray-400 mb-1">Hands</div>
          <div className="text-blue-400">
            {handResults?.multiHandLandmarks?.length || 0}
          </div>
        </div>

        {/* Current Gesture */}
        <div className="bg-gray-800/50 p-2 rounded">
          <div className="text-gray-400 mb-1">Gesture</div>
          <div className="text-yellow-400">
            {currentGesture?.gesture || 'None'}
          </div>
        </div>

        {/* Confidence */}
        <div className="bg-gray-800/50 p-2 rounded">
          <div className="text-gray-400 mb-1">Confidence</div>
          <div className="text-purple-400">
            {currentGesture ? `${Math.round(currentGesture.confidence * 100)}%` : 'N/A'}
          </div>
        </div>
      </div>
      {handResults?.multiHandLandmarks && handResults.multiHandLandmarks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="text-gray-400 mb-2">Hand Details:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {handResults.multiHandLandmarks.map((hand, index) => (
              <div key={index} className="bg-gray-800/30 p-2 rounded text-xs">
                <span className="text-cyan-400">Hand {index + 1}:</span>{' '}
                <span className="text-white">
                  {handResults.multiHandedness?.[index]?.label || 'Unknown'}
                </span>{' '}
                <span className="text-gray-400">({hand.length} landmarks)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Status */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="text-gray-400 mb-2">System Status:</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-800/30 p-2 rounded text-xs">
            <span className="text-gray-400">MediaPipe:</span>{' '}
            <span className={typeof window !== 'undefined' && 'MediaPipe' in window ? 'text-green-400' : 'text-red-400'}>
              {typeof window !== 'undefined' && 'MediaPipe' in window ? '✅' : '❌'}
            </span>
          </div>
          <div className="bg-gray-800/30 p-2 rounded text-xs">
            <span className="text-gray-400">TTS:</span>{' '}
            <span className={typeof window !== 'undefined' && 'speechSynthesis' in window ? 'text-green-400' : 'text-red-400'}>
              {typeof window !== 'undefined' && 'speechSynthesis' in window ? '✅' : '❌'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
