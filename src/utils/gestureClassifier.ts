import type { HandLandmark, GestureDetection } from '../types';

export class GestureClassifier {
  private static calculateDistance(point1: HandLandmark, point2: HandLandmark): number {
    return Math.sqrt(
      Math.pow(point1.x - point2.x, 2) +
      Math.pow(point1.y - point2.y, 2) +
      Math.pow(point1.z - point2.z, 2)
    );
  }

  // Public helper for other modules (keeps a simple x/y based signature compatible)
  static distance(a: { x: number; y: number; z?: number } | HandLandmark, b: { x: number; y: number; z?: number } | HandLandmark) {
    // Normalize to HandLandmark shape
    const p1 = a as HandLandmark;
    const p2 = b as HandLandmark;
    return GestureClassifier.calculateDistance(p1, p2);
  }

  // Compute a simple palm normal from landmarks for orientation checks
  static computePalmNormalFrom(landmarks: HandLandmark[]): { x: number; y: number; z: number } {
    const a = landmarks[0]; // wrist
    const b = landmarks[5]; // index_mcp
    const c = landmarks[17]; // pinky_mcp
    const ab = { x: b.x - a.x, y: b.y - a.y, z: (b.z || 0) - (a.z || 0) };
    const ac = { x: c.x - a.x, y: c.y - a.y, z: (c.z || 0) - (a.z || 0) };
    const nx = ab.y * ac.z - ab.z * ac.y;
    const ny = ab.z * ac.x - ab.x * ac.z;
    const nz = ab.x * ac.y - ab.y * ac.x;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    return { x: nx / len, y: ny / len, z: nz / len };
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

    // Helper: compute a simple palm normal using three landmarks (wrist(0), index_mcp(5), pinky_mcp(17))
    const computePalmNormal = (): { x: number; y: number; z: number } => {
      const a = landmarks[0]; // wrist
      const b = landmarks[5]; // index_mcp
      const c = landmarks[17]; // pinky_mcp
      // vectors
      const ab = { x: b.x - a.x, y: b.y - a.y, z: (b.z || 0) - (a.z || 0) };
      const ac = { x: c.x - a.x, y: c.y - a.y, z: (c.z || 0) - (a.z || 0) };
      // cross product ab x ac
      const nx = ab.y * ac.z - ab.z * ac.y;
      const ny = ab.z * ac.x - ab.x * ac.z;
      const nz = ab.x * ac.y - ab.y * ac.x;
      // normalize
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      return { x: nx / len, y: ny / len, z: nz / len };
    };

  const palmNormal = computePalmNormal();
  // When palm normal's z is negative and large magnitude, the palm is likely facing away (backhand)


      // Fist detection (robust): use normalized distances and finger-curl count
      const palm = landmarks[9];
      const tipIndicesAll = [4, 8, 12, 16, 20];
      const pipIndices = [2, 6, 10, 14, 18];

      // Hand width reference: distance between index MCP (5) and pinky MCP (17)
      const handWidth = this.calculateDistance(landmarks[5], landmarks[17]) || 1;

      const tipDistances = tipIndicesAll.map(i => this.calculateDistance(landmarks[i], palm));
      const avgTipToPalm = tipDistances.reduce((s, v) => s + v, 0) / tipDistances.length;

      // fingertip spread (max distance between any two tips)
      let maxTipSpread = 0;
      for (let i = 0; i < tipIndicesAll.length; i++) {
        for (let j = i + 1; j < tipIndicesAll.length; j++) {
          const d = this.calculateDistance(landmarks[tipIndicesAll[i]], landmarks[tipIndicesAll[j]]);
          if (d > maxTipSpread) maxTipSpread = d;
        }
      }

      // Count curled fingers by comparing tip vs pip vertical positions (MediaPipe y increases downward)
      let curledCount = 0;
      for (let k = 0; k < tipIndicesAll.length; k++) {
        const tip = landmarks[tipIndicesAll[k]];
        const pip = landmarks[pipIndices[k]];
        // If tip is below or roughly at pip (y larger), it is likely curled
        if (tip.y >= pip.y - 0.01) curledCount++;
      }

      // Normalize distances by hand width so thresholds are resolution- and distance-invariant
      const avgTipToPalmNorm = avgTipToPalm / handWidth;
      const maxTipSpreadNorm = maxTipSpread / handWidth;

      // Heuristic: most fingers curled, tips close to palm, and tips not spread out
      if (curledCount >= 4 && avgTipToPalmNorm < 0.6 && maxTipSpreadNorm < 0.45) {
        console.log('🤖 GestureClassifier: Detected: Fist (robust) ', { curledCount, avgTipToPalmNorm, maxTipSpreadNorm });
        return { gesture: 'Fist', confidence: 0.96, timestamp: Date.now() };
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

    // Open Palm - all fingers extended. Check orientation: if palm normal faces away, it's a Backhand
    if (extendedCount === 5) {
      if (palmNormal.z < -0.3) {
        console.log('🤖 GestureClassifier: Detected: Backhand (open palm facing away)');
        return { gesture: 'Backhand', confidence: 0.9, timestamp: Date.now() };
      }

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

      // Clap: palms very close
      if (palmDistance < 0.095) {
        return { gesture: 'Clap', confidence: 0.92, timestamp: Date.now() };
      }

    // Namaste - palms together in prayer position
    const leftWrist = leftHand[0];
    const rightWrist = rightHand[0];
    const leftMiddleTip = leftHand[12];
    const rightMiddleTip = rightHand[12];

    const wristDistance = this.calculateDistance(leftWrist, rightWrist);
    const tipDistance = this.calculateDistance(leftMiddleTip, rightMiddleTip);

      // Namaste: palms near each other, wrists near, middle finger tips close,
      // and palms facing each other (opposing normals)
      const leftNormal = GestureClassifier.computePalmNormalFrom(leftHand);
      const rightNormal = GestureClassifier.computePalmNormalFrom(rightHand);
      const normalsDot = leftNormal.x * rightNormal.x + leftNormal.y * rightNormal.y + leftNormal.z * rightNormal.z;

      // normalsDot near -1 means facing each other; allow a margin (-0.2)
      if (palmDistance < 0.12 && wristDistance < 0.14 && tipDistance < 0.06 && normalsDot < -0.2) {
        return { gesture: 'Namaste', confidence: 0.96, timestamp: Date.now() };
      }

    // Cross Hands - hands crossed
    if (leftHand[0].x > rightHand[0].x) {
        return { gesture: 'Cross Hands', confidence: 0.88, timestamp: Date.now() };
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
