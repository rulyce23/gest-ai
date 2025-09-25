import React, { useRef, useEffect } from 'react';
import type { HandResults, HandLandmark } from '../types';

interface SkeletonOverlayProps {
  results: HandResults | null;
  width: number;
  height: number;
  show: boolean;
  className?: string;
}

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],     // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],     // Index finger
  [0, 9], [9, 10], [10, 11], [11, 12], // Middle finger
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring finger
  [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [5, 9], [9, 13], [13, 17]            // Palm connections
];

export const SkeletonOverlay: React.FC<SkeletonOverlayProps> = ({
  results,
  width,
  height,
  show,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;


    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!show || !results?.multiHandLandmarks) {
      return;
    }

    console.log('Drawing skeleton overlay for', results.multiHandLandmarks.length, 'hands');

    // Set drawing styles
    ctx.strokeStyle = '#00ff00';
    ctx.fillStyle = '#ff0000';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    results.multiHandLandmarks.forEach((landmarks: HandLandmark[], handIndex: number) => {
      // Determine hand color based on handedness
      const isLeftHand = results.multiHandedness?.[handIndex]?.label === 'Left';
      ctx.strokeStyle = isLeftHand ? '#00ff00' : '#ff6600';
      ctx.fillStyle = isLeftHand ? '#00cc00' : '#ff8800';

      console.log(`Drawing hand ${handIndex + 1} (${isLeftHand ? 'Left' : 'Right'}) with ${landmarks.length} landmarks`);

      // Draw connections first
      ctx.lineWidth = 3;
      HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const startPoint = landmarks[startIdx];
        const endPoint = landmarks[endIdx];

        if (startPoint && endPoint) {
          const x1 = startPoint.x * canvas.width;
          const y1 = startPoint.y * canvas.height;
          const x2 = endPoint.x * canvas.width;
          const y2 = endPoint.y * canvas.height;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      });

      // Draw landmarks on top
      landmarks.forEach((landmark: HandLandmark, index: number) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;

        // Different sizes for different landmarks
        let radius = 4;
        if (index === 0) radius = 8; // Wrist
        else if ([4, 8, 12, 16, 20].includes(index)) radius = 6; // Fingertips

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();

        // Add white border for better visibility
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Restore color
        ctx.strokeStyle = isLeftHand ? '#00ff00' : '#ff6600';

        // Add landmark numbers for debugging (optional)
        if (import.meta.env.DEV && index % 4 === 0) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px Arial';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeText(index.toString(), x + 10, y - 10);
          ctx.fillText(index.toString(), x + 10, y - 10);
          ctx.fillStyle = isLeftHand ? '#00cc00' : '#ff8800';
        }
      });
    });
  }, [results, width, height, show]);

  if (!show) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`absolute top-0 left-0 pointer-events-none z-10 ${className}`}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transform: 'scaleX(-1)' // Mirror to match video
      }}
    />
  );
};
