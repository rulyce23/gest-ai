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


    // Thumbs Up - only thumb extended
    if (thumbExtended && extendedCount === 1) {
      console.log('🤖 GestureClassifier: Detected: Thumbs-Up');
      return {
        gesture: 'Thumbs-Up',
        confidence: 0.9,
        timestamp: Date.now()
      };
    }

    // Pointing - index finger extended, others curled, extremely flexible for user pose (minimal checks, allow tilted/sideways, varying curl levels)
    if (fingersExtended[0] && extendedCount === 1) {
      const indexTip = landmarks[8];
      const indexPip = landmarks[6];
      const wrist = landmarks[0];
      const thumbTip = landmarks[4];
      const thumbMcp = landmarks[2];
      
      // Very relaxed index extension (tip y < pip + larger tolerance for curls/tilts)
      const indexExtended = indexTip.y < indexPip.y + 0.1;
      if (!indexExtended) {
        return null;
      }
      
      // Highly relaxed other fingers (allow more extension tolerance, only require not fully extended)
      const middleExtended = landmarks[12].y < landmarks[10].y + 0.1;
      const ringExtended = landmarks[16].y < landmarks[14].y + 0.1;
      const pinkyExtended = landmarks[20].y < landmarks[18].y + 0.1;
      // Softer check: allow if not all other fingers are fully extended
      const otherFingersMostlyCurled = !(middleExtended && ringExtended && pinkyExtended);
      if (!otherFingersMostlyCurled) {
        return null;
      }
      
      // Very flexible thumb (allow extended or curled without restriction)
      // No check - fully allow for user pose variations
      
      // Optional pointing direction (even more relaxed z for any view)
      const pointingForward = Math.abs(indexTip.z) < 0.3; // Allow side/tilted/back views
      // if (!pointingForward) { return null; } // Fully commented for max flexibility
      
      // Very relaxed finger length (0.03-0.5 for close/far/tilted poses)
      const indexLength = this.calculateDistance(wrist, indexTip);
      if (indexLength < 0.03 || indexLength > 0.5) {
        return null;
      }
      
      // No vertical, orientation, or direction checks - allow any pointing pose (straight, tilted, sideways)
      
      console.log('🤖 GestureClassifier: Detected: Pointing (🫵) - index length:', indexLength.toFixed(3), 'extremely-flexible for user pose');
      return {
        gesture: 'Pointing',
        confidence: 0.9,
        timestamp: Date.now()
      };
    }

    // Victory (Peace) - index and middle finger extended in V shape, ultra-tuned for user's exact image pose (full extension, minimal tilt tolerance, palm facing, V separation, right-hand)
    if (fingersExtended[0] && fingersExtended[1] && !fingersExtended[2] && !fingersExtended[3] && !thumbExtended && extendedCount === 2) {
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      const indexPip = landmarks[6];
      const middlePip = landmarks[10];
      const wrist = landmarks[0];
      const indexMcp = landmarks[5];
      const middleMcp = landmarks[9];
      
      // Ultra-tuned finger extension for user's image (distance-based, 98% threshold for full straight extension)
      const indexDist = this.calculateDistance(indexTip, indexPip);
      const indexSegmentLen = this.calculateDistance(indexMcp, indexPip);
      const indexExtended = indexDist > indexSegmentLen * 0.98;
      
      const middleDist = this.calculateDistance(middleTip, middlePip);
      const middleSegmentLen = this.calculateDistance(middleMcp, middlePip);
      const middleExtended = middleDist > middleSegmentLen * 0.98;
      
      if (!indexExtended || !middleExtended) {
        return null;
      }
      
      // Wrist position ultra-tuned for user's image (y tolerance 0.02 for minimal tilt)
      const wristBelow = wrist.y > Math.max(indexTip.y, middleTip.y) - 0.02;
      if (!wristBelow) {
        return null;
      }
      
      // Palm facing ultra-tuned for user's image (|z| < 0.12 for closer facing)
      const palmFacing = Math.abs(indexTip.z) < 0.12 && Math.abs(middleTip.z) < 0.12;
      if (!palmFacing) {
        return null;
      }
      
      // V spread ultra-tuned for user's image V (>0.008 for precise separation)
      const vSpread = this.calculateDistance(indexTip, middleTip);
      if (vSpread < 0.008) {
        return null;
      }
      
      // Finger length ultra-tuned for user's image hand (0.08-0.38)
      const indexLength = this.calculateDistance(wrist, indexTip);
      const middleLength = this.calculateDistance(wrist, middleTip);
      if (indexLength < 0.08 || middleLength < 0.08 || indexLength > 0.38 || middleLength > 0.38) {
        return null;
      }
      
      // Angle ultra-tuned for user's image V (45-125 degrees)
      const indexVec = { x: indexTip.x - indexMcp.x, y: indexTip.y - indexMcp.y, z: indexTip.z - indexMcp.z };
      const middleVec = { x: middleTip.x - middleMcp.x, y: middleTip.y - middleMcp.y, z: middleTip.z - middleMcp.z };
      
      const indexLen = Math.sqrt(indexVec.x**2 + indexVec.y**2 + indexVec.z**2);
      const middleLen = Math.sqrt(middleVec.x**2 + middleVec.y**2 + middleVec.z**2);
      if (indexLen === 0 || middleLen === 0) {
        return null;
      }
      
      const normIndex = { x: indexVec.x / indexLen, y: indexVec.y / indexLen, z: indexVec.z / indexLen };
      const normMiddle = { x: middleVec.x / middleLen, y: middleVec.y / middleLen, z: middleVec.z / middleLen };
      
      const dot = normIndex.x * normMiddle.x + normIndex.y * normMiddle.y + normIndex.z * normMiddle.z;
      const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
      
      if (angle < 45 || angle > 125) {
        return null;
      }
      
      // Horizontal spread ultra-tuned for user's image (>0.005)
      const xDiff = Math.abs(indexTip.x - middleTip.x);
      if (xDiff < 0.005) {
        return null;
      }
      
      // Orientation ultra-tuned for user's right-hand V in image (strict index left of middle for right)
      const isRightHand = wrist.x > 0.5;
      const correctOrientation = isRightHand ? (indexTip.x < middleTip.x) : (indexTip.x > middleTip.x);
      if (!correctOrientation) {
        return null;
      }
      
      console.log('🤖 GestureClassifier: Detected: Victory (✌️) - angle:', angle.toFixed(1), 'spread:', vSpread.toFixed(3), 'ultra-tuned for user image pose');
      return {
        gesture: 'Victory',
        confidence: 0.95,
        timestamp: Date.now()
      };
    }

    // Open Palm - all fingers extended (right/general hand)
    if (extendedCount === 5 && landmarks[0].x >= 0.5) {
      console.log('🤖 GestureClassifier: Detected: Open Palm (right/general)');
      return {
        gesture: 'Open Palm',
        confidence: 0.95,
        timestamp: Date.now()
      };
    }

    // Stop - all fingers extended on left hand only
    if (extendedCount === 5 && landmarks[0].x < 0.5) {
      console.log('🤖 GestureClassifier: Detected: Stop (left hand)');
      return {
        gesture: 'Stop',
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

  static classifyTwoHandGesture(leftHand: HandLandmark[], rightHand: HandLandmark[], handedness?: Array<{index: number; score: number; label: string;}>): GestureDetection | null {
    if (!leftHand || !rightHand || leftHand.length !== 21 || rightHand.length !== 21) {
      return null;
    }

    // Namaste - pinky fingers touching, other fingers curled (🙏 emoji: palms together, pinkies touching)
    const leftFingerTips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky
    const leftFingerPips = [6, 10, 14, 18];
    const rightFingerTips = [8, 12, 16, 20];
    const rightFingerPips = [6, 10, 14, 18];

    const leftFingersExtended = this.isFingerExtended(leftHand, leftFingerTips, leftFingerPips);
    const rightFingersExtended = this.isFingerExtended(rightHand, rightFingerTips, rightFingerPips);

    // Only pinky extended on both hands, others curled
    const leftPinkyOnly = leftFingersExtended[3] && !leftFingersExtended[0] && !leftFingersExtended[1] && !leftFingersExtended[2];
    const rightPinkyOnly = rightFingersExtended[3] && !rightFingersExtended[0] && !rightFingersExtended[1] && !rightFingersExtended[2];

    if (!leftPinkyOnly || !rightPinkyOnly) {
      return null;
    }

    const leftWrist = leftHand[0];
    const rightWrist = rightHand[0];
    const leftPinkyTip = leftHand[20];
    const rightPinkyTip = rightHand[20];

    const pinkyDistance = this.calculateDistance(leftPinkyTip, rightPinkyTip);
    const wristDistance = this.calculateDistance(leftWrist, rightWrist);
    const heightDifference = Math.abs(leftWrist.y - rightWrist.y);

    if (pinkyDistance < 0.1 && wristDistance < 0.2 && heightDifference < 0.1) {
      console.log('🤖 GestureClassifier: Detected: Namaste (🙏) - pinky distance:', pinkyDistance.toFixed(3));
      return {
        gesture: 'Namaste',
        confidence: 0.9,
        timestamp: Date.now()
      };
    }

    // Cross Hands - hands crossed at wrists (🤞 emoji: fingers crossed, but adapt for hand crossing)
    const leftWristX = leftHand[0].x;
    const rightWristX = rightHand[0].x;
    const wristCrossDistance = Math.abs(leftWristX - rightWristX);
    const verticalAlignment = Math.abs(leftHand[0].y - rightHand[0].y) < 0.15;

    // Check if hands are close and potentially crossed (relaxed crossing detection since sorted by x)
    if (wristCrossDistance < 0.3 && verticalAlignment && handedness) {
      // Use handedness to detect if positions are swapped (left hand on right side, etc.)
      const leftHandedness = handedness[0].label; // Assuming sorted, but check labels
      const rightHandedness = handedness[1].label;
      const isCrossed = (leftHandedness === 'Right' && rightHandedness === 'Left'); // Swapped labels indicate crossing
      if (isCrossed) {
        console.log('🤖 GestureClassifier: Detected: Cross Hands (🤞) - crossed positions');
        return {
          gesture: 'Cross Hands',
          confidence: 0.85,
          timestamp: Date.now()
        };
      }
    }

    return null;
  }
}
