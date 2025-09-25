import type { HandLandmark, GestureDetection } from '../types';

export class GestureClassifier {
  private static calculateDistance(point1: HandLandmark, point2: HandLandmark): number {
    return Math.sqrt(
      Math.pow(point1.x - point2.x, 2) +
      Math.pow(point1.y - point2.y, 2) +
      Math.pow(point1.z - point2.z, 2)
    );
  }

  private static isFingerExtended(landmarks: HandLandmark[], fingerTips: number[], fingerPips: number[]): boolean[] {
    return fingerTips.map((tip, index) => {
      const pip = fingerPips[index];
      return landmarks[tip].y < landmarks[pip].y;
    });
  }

  private static isThumbExtended(landmarks: HandLandmark[]): boolean {
    // Thumb is extended if tip (4) is further from wrist (0) than MCP (2)
    const wrist = landmarks[0];
    const thumbMcp = landmarks[2];
    const thumbTip = landmarks[4];
    
    const distanceWristToMcp = this.calculateDistance(wrist, thumbMcp);
    const distanceWristToTip = this.calculateDistance(wrist, thumbTip);
    
    return distanceWristToTip > distanceWristToMcp;
  }

  static classifyGesture(landmarks: HandLandmark[]): GestureDetection | null {
    if (!landmarks || landmarks.length !== 21) {
      console.log('🤖 GestureClassifier: Invalid landmarks for gesture classification');
      return null;
    }

    const fingerTips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky tips
    const fingerPips = [6, 10, 14, 18]; // Index, Middle, Ring, Pinky PIPs

    const fingersExtended = this.isFingerExtended(landmarks, fingerTips, fingerPips);
    const thumbExtended = this.isThumbExtended(landmarks);

    const extendedCount = fingersExtended.filter(Boolean).length + (thumbExtended ? 1 : 0);

    console.log('🤖 GestureClassifier: Analysis:', {
      fingersExtended,
      thumbExtended,
      extendedCount
    });

    // Fist - no fingers extended
    if (extendedCount === 0) {
      console.log('🤖 GestureClassifier: Detected: Fist');
      return {
        gesture: 'Fist',
        confidence: 0.9,
        timestamp: Date.now()
      };
    }

    // Thumbs Up - only thumb extended
    if (thumbExtended && extendedCount === 1) {
      console.log('🤖 GestureClassifier: Detected: Thumbs-Up');
      return {
        gesture: 'Thumbs-Up',
        confidence: 0.9,
        timestamp: Date.now()
      };
    }

    // Pointing - only index finger extended
    if (fingersExtended[0] && extendedCount === 1) {
      console.log('🤖 GestureClassifier: Detected: Pointing');
      return {
        gesture: 'Pointing',
        confidence: 0.9,
        timestamp: Date.now()
      };
    }

    // Victory (Peace) - index and middle finger extended
    if (fingersExtended[0] && fingersExtended[1] && extendedCount === 2) {
      console.log('🤖 GestureClassifier: Detected: Victory');
      return {
        gesture: 'Victory',
        confidence: 0.9,
        timestamp: Date.now()
      };
    }

    // Open Palm - all fingers extended
    if (extendedCount === 5) {
      console.log('🤖 GestureClassifier: Detected: Open Palm');
      return {
        gesture: 'Open Palm',
        confidence: 0.95,
        timestamp: Date.now()
      };
    }

    // Wave detection - similar to open palm but with movement
    if (extendedCount >= 4) {
      console.log('🤖 GestureClassifier: Detected: Wave');
      return {
        gesture: 'Wave',
        confidence: 0.8,
        timestamp: Date.now()
      };
    }

    console.log('🤖 GestureClassifier: No gesture detected for extended count:', extendedCount);
    return null;
  }

  static classifyTwoHandGesture(leftHand: HandLandmark[], rightHand: HandLandmark[]): GestureDetection | null {
    if (!leftHand || !rightHand || leftHand.length !== 21 || rightHand.length !== 21) {
      return null;
    }

    // Clap detection - palms close together
    const leftPalm = leftHand[9]; // Middle finger MCP
    const rightPalm = rightHand[9];
    const palmDistance = this.calculateDistance(leftPalm, rightPalm);

    if (palmDistance < 0.1) {
      return {
        gesture: 'Clap',
        confidence: 0.9,
        timestamp: Date.now()
      };
    }

    // Namaste - palms together in prayer position
    const leftWrist = leftHand[0];
    const rightWrist = rightHand[0];
    const leftMiddleTip = leftHand[12];
    const rightMiddleTip = rightHand[12];

    const wristDistance = this.calculateDistance(leftWrist, rightWrist);
    const tipDistance = this.calculateDistance(leftMiddleTip, rightMiddleTip);

    if (palmDistance < 0.15 && wristDistance < 0.2 && tipDistance < 0.1) {
      return {
        gesture: 'Namaste',
        confidence: 0.9,
        timestamp: Date.now()
      };
    }

    // Cross Hands - hands crossed
    if (leftHand[0].x > rightHand[0].x) {
      return {
        gesture: 'Cross Hands',
        confidence: 0.8,
        timestamp: Date.now()
      };
    }

    // Raise Both Hands - both hands raised up
    const leftHandRaised = leftHand[0].y > leftHand[9].y;
    const rightHandRaised = rightHand[0].y > rightHand[9].y;

    if (leftHandRaised && rightHandRaised) {
      return {
        gesture: 'Raise Both Hands',
        confidence: 0.8,
        timestamp: Date.now()
      };
    }

    return null;
  }
}
