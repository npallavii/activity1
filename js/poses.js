/**
 * Pose Definitions & Evaluator for "Freeze & Pose"
 * Contains target stick-figure visual definitions and joint-angle landmark evaluation logic.
 */

// MediaPipe Pose Landmark Indices
export const LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

/**
 * Calculates the 2D joint angle at vertex pointB formed by (pointA -> pointB) and (pointC -> pointB).
 * Returns angle in degrees [0, 180], or null if any point is missing or degenerate.
 */
export function calculateJointAngle(pointA, pointB, pointC) {
  if (!pointA || !pointB || !pointC) return null;
  const v1x = pointA.x - pointB.x;
  const v1y = pointA.y - pointB.y;
  const v2x = pointC.x - pointB.x;
  const v2y = pointC.y - pointB.y;

  const mag1 = Math.hypot(v1x, v1y);
  const mag2 = Math.hypot(v2x, v2y);
  if (mag1 < 1e-5 || mag2 < 1e-5) return null;

  const dot = v1x * v2x + v1y * v2y;
  const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

/**
 * Scores an angle against a target ideal range [minIdeal, maxIdeal].
 * Returns 1.0 if inside the ideal range, decays linearly to 0.0 at error >= tolerance.
 */
export function scoreAngleRange(actualAngle, minIdeal, maxIdeal, tolerance = 35) {
  if (actualAngle === null || actualAngle === undefined || isNaN(actualAngle)) return 0;
  if (actualAngle >= minIdeal && actualAngle <= maxIdeal) return 1.0;
  const err = actualAngle < minIdeal ? minIdeal - actualAngle : actualAngle - maxIdeal;
  if (err >= tolerance) return 0.0;
  return Math.max(0, 1.0 - err / tolerance);
}

/**
 * ============================================================
 * FREEZE DANCE POSES (Animal & Action Themes)
 * 1. Airplane: Arms stretched out wide like wings (Warrior 3 / Airplane pose)
 * 2. Flamingo: Stand tall on one leg! (Tree pose)
 * 3. Frog: Squat down low like a frog (Malasana / Deep squat)
 * 4. Surfer: Legs wide, surfing a wave! (Warrior 2)
 * ============================================================
 */
export const POSES = [
  {
    id: 'airplane',
    name: 'Airplane',
    action: 'Arms stretched out wide like wings.',
    emoji: '✈️',
    badge: 'Action Balance',
    hint: 'Stretch both arms wide out to the sides like airplane wings and soar through the sky!',
    targetDescription: 'Arms stretched out wide like wings (Warrior 3 / Airplane pose)',
    color: '#38bdf8', // Sky Cyan
    stickFigure: {
      head: [50, 22],
      neck: [50, 32],
      spine: [50, 62],
      leftShoulder: [42, 38],
      rightShoulder: [58, 38],
      leftElbow: [22, 38],
      rightElbow: [78, 38],
      leftWrist: [6, 38],
      rightWrist: [94, 38],
      leftHip: [46, 62],
      rightHip: [54, 62],
      leftKnee: [46, 80],
      leftAnkle: [46, 96],
      rightKnee: [72, 66],
      rightAnkle: [90, 70],
    },
    evaluate: (lm) => {
      const ls = lm[LANDMARKS.LEFT_SHOULDER];
      const rs = lm[LANDMARKS.RIGHT_SHOULDER];
      const le = lm[LANDMARKS.LEFT_ELBOW];
      const re = lm[LANDMARKS.RIGHT_ELBOW];
      const lw = lm[LANDMARKS.LEFT_WRIST];
      const rw = lm[LANDMARKS.RIGHT_WRIST];
      const lh = lm[LANDMARKS.LEFT_HIP] || { x: ls ? ls.x : 0.45, y: (ls ? ls.y : 0.4) + 0.3 };
      const rh = lm[LANDMARKS.RIGHT_HIP] || { x: rs ? rs.x : 0.55, y: (rs ? rs.y : 0.4) + 0.3 };

      if (!lw || !rw || !ls || !rs || !le || !re) {
        return { isMatch: false, accuracy: 0, feedback: 'Step into view so the mirror sees your wings! ✈️' };
      }

      if ((lw.visibility || 1) < 0.35 || (rw.visibility || 1) < 0.35) {
        return { isMatch: false, accuracy: 0, feedback: 'Bring both arms into the camera view! ✈️' };
      }

      // Joint angles:
      // Left shoulder angle: (Hip - Shoulder - Elbow) -> ~80° - 105°
      const leftShoulderAngle = calculateJointAngle(lh, ls, le);
      const scoreLS = scoreAngleRange(leftShoulderAngle, 75, 105, 30);

      // Right shoulder angle: (Hip - Shoulder - Elbow) -> ~80° - 105°
      const rightShoulderAngle = calculateJointAngle(rh, rs, re);
      const scoreRS = scoreAngleRange(rightShoulderAngle, 75, 105, 30);

      // Left elbow angle: (Shoulder - Elbow - Wrist) -> ~160° - 180°
      const leftElbowAngle = calculateJointAngle(ls, le, lw);
      const scoreLE = scoreAngleRange(leftElbowAngle, 155, 180, 30);

      // Right elbow angle: (Shoulder - Elbow - Wrist) -> ~160° - 180°
      const rightElbowAngle = calculateJointAngle(rs, re, rw);
      const scoreRE = scoreAngleRange(rightElbowAngle, 155, 180, 30);

      // Horizontal wrist alignment relative to shoulder
      const scoreLHoriz = Math.max(0, 1.0 - Math.abs(lw.y - ls.y) / 0.18);
      const scoreRHoriz = Math.max(0, 1.0 - Math.abs(rw.y - rs.y) / 0.18);

      // Wide wingspan
      const shoulderDist = Math.max(0.1, Math.abs(ls.x - rs.x));
      const armSpan = Math.abs(lw.x - rw.x);
      const scoreSpan = Math.min(1.0, Math.max(0, (armSpan / shoulderDist - 1.2) / 0.8));

      const scores = [scoreLS, scoreRS, scoreLE, scoreRE, scoreLHoriz, scoreRHoriz, scoreSpan];
      const accuracy = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
      const isMatch = accuracy >= 85;

      if (isMatch) {
        return {
          isMatch: true,
          accuracy,
          feedback: 'SOARING AIRPLANE! Wings steady in the sky! ✈️'
        };
      }

      return {
        isMatch: false,
        accuracy,
        feedback: 'Stretch arms straight out wide to the sides like airplane wings! ✈️'
      };
    }
  },
  {
    id: 'flamingo',
    name: 'Flamingo',
    action: 'Stand tall on one leg!',
    emoji: '🦩',
    badge: 'Animal Balance',
    hint: 'Stand tall on one leg with proud flamingo balance!',
    targetDescription: 'Stand tall on one leg (Tree / Flamingo pose)',
    color: '#f472b6', // Flamingo Pink
    stickFigure: {
      head: [50, 20],
      neck: [50, 30],
      spine: [50, 60],
      leftShoulder: [42, 34],
      rightShoulder: [58, 34],
      leftElbow: [36, 44],
      rightElbow: [64, 44],
      leftWrist: [46, 42],
      rightWrist: [54, 42],
      leftHip: [46, 60],
      rightHip: [54, 60],
      leftKnee: [48, 78],
      leftAnkle: [48, 96],
      rightKnee: [70, 70],
      rightAnkle: [52, 74],
    },
    evaluate: (lm) => {
      const ls = lm[LANDMARKS.LEFT_SHOULDER];
      const rs = lm[LANDMARKS.RIGHT_SHOULDER];
      const lw = lm[LANDMARKS.LEFT_WRIST];
      const rw = lm[LANDMARKS.RIGHT_WRIST];
      const lh = lm[LANDMARKS.LEFT_HIP];
      const rh = lm[LANDMARKS.RIGHT_HIP];
      const lk = lm[LANDMARKS.LEFT_KNEE];
      const rk = lm[LANDMARKS.RIGHT_KNEE];
      const la = lm[LANDMARKS.LEFT_ANKLE];
      const ra = lm[LANDMARKS.RIGHT_ANKLE];

      if (!ls || !rs) return { isMatch: false, accuracy: 0, feedback: 'Step into view! 🦩' };

      // Leg evaluation: one standing leg (straight), one lifted leg (bent)
      let scoreStandingKnee = 0;
      let scoreLiftedKnee = 0;
      let scoreLiftHeight = 0;

      const hasLegs = lh && rh && lk && rk;
      if (hasLegs && la && ra) {
        // Case 1: Right leg lifted, Left leg standing
        const leftKneeAngle1 = calculateJointAngle(lh, lk, la);
        const rightKneeAngle1 = calculateJointAngle(rh, rk, ra);
        const sStanding1 = scoreAngleRange(leftKneeAngle1, 155, 180, 25);
        const sLifted1 = scoreAngleRange(rightKneeAngle1, 40, 115, 30);
        const sHeight1 = scoreAngleRange((la.y - ra.y) * 100, 5, 45, 10);
        const avg1 = (sStanding1 + sLifted1 + sHeight1) / 3;

        // Case 2: Left leg lifted, Right leg standing
        const leftKneeAngle2 = calculateJointAngle(lh, lk, la);
        const rightKneeAngle2 = calculateJointAngle(rh, rk, ra);
        const sStanding2 = scoreAngleRange(rightKneeAngle2, 155, 180, 25);
        const sLifted2 = scoreAngleRange(leftKneeAngle2, 40, 115, 30);
        const sHeight2 = scoreAngleRange((ra.y - la.y) * 100, 5, 45, 10);
        const avg2 = (sStanding2 + sLifted2 + sHeight2) / 3;

        if (avg1 >= avg2) {
          scoreStandingKnee = sStanding1;
          scoreLiftedKnee = sLifted1;
          scoreLiftHeight = sHeight1;
        } else {
          scoreStandingKnee = sStanding2;
          scoreLiftedKnee = sLifted2;
          scoreLiftHeight = sHeight2;
        }
      } else if (hasLegs) {
        // If ankles cropped out, use knee differential
        const kneeDiff = Math.abs(lk.y - rk.y);
        scoreLiftHeight = kneeDiff > 0.08 ? 1.0 : Math.max(0, kneeDiff / 0.08);
        scoreStandingKnee = 0.9;
        scoreLiftedKnee = 0.9;
      } else {
        // Upper-body fallback: hands balanced like flamingo wings
        const armBalance = lw && rw ? Math.max(0, 1.0 - Math.abs(lw.y - rw.y) / 0.20) : 0;
        scoreStandingKnee = armBalance;
        scoreLiftedKnee = armBalance;
        scoreLiftHeight = armBalance;
      }

      // Torso upright check
      const midShoulderX = (ls.x + rs.x) / 2;
      const midHipX = lh && rh ? (lh.x + rh.x) / 2 : midShoulderX;
      const scoreUpright = Math.max(0, 1.0 - Math.abs(midShoulderX - midHipX) / 0.12);

      const scores = [scoreStandingKnee, scoreLiftedKnee, scoreLiftHeight, scoreUpright];
      const accuracy = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
      const isMatch = accuracy >= 85;

      if (isMatch) {
        return {
          isMatch: true,
          accuracy,
          feedback: 'ELEGANT FLAMINGO! Standing tall on one leg! 🦩'
        };
      }

      return {
        isMatch: false,
        accuracy,
        feedback: 'Lift one leg and balance tall like a proud flamingo! 🦩'
      };
    }
  },
  {
    id: 'frog',
    name: 'Frog',
    action: 'Squat down low like a frog.',
    emoji: '🐸',
    badge: 'Animal Pose',
    hint: 'Squat down low to the ground with knees wide like a bouncy green frog!',
    targetDescription: 'Squat down low with knees wide (Malasana / Deep squat)',
    color: '#22c55e', // Frog Green
    stickFigure: {
      head: [50, 36],
      neck: [50, 44],
      spine: [50, 66],
      leftShoulder: [40, 48],
      rightShoulder: [60, 48],
      leftElbow: [28, 62],
      rightElbow: [72, 62],
      leftWrist: [44, 76],
      rightWrist: [56, 76],
      leftHip: [42, 66],
      rightHip: [58, 66],
      leftKnee: [24, 74],
      rightKnee: [76, 74],
      leftAnkle: [36, 92],
      rightAnkle: [64, 92],
    },
    evaluate: (lm) => {
      const ls = lm[LANDMARKS.LEFT_SHOULDER];
      const rs = lm[LANDMARKS.RIGHT_SHOULDER];
      const nose = lm[LANDMARKS.NOSE];
      const lw = lm[LANDMARKS.LEFT_WRIST];
      const rw = lm[LANDMARKS.RIGHT_WRIST];
      const lh = lm[LANDMARKS.LEFT_HIP];
      const rh = lm[LANDMARKS.RIGHT_HIP];
      const lk = lm[LANDMARKS.LEFT_KNEE];
      const rk = lm[LANDMARKS.RIGHT_KNEE];
      const la = lm[LANDMARKS.LEFT_ANKLE];
      const ra = lm[LANDMARKS.RIGHT_ANKLE];

      if (!ls || !rs || !nose) return { isMatch: false, accuracy: 0, feedback: 'Step into view! 🐸' };

      // Knee flexion angle: deep squat [40° - 105°]
      let scoreLK = 0.85;
      let scoreRK = 0.85;
      if (lh && rh && lk && rk && la && ra) {
        const angleLK = calculateJointAngle(lh, lk, la);
        const angleRK = calculateJointAngle(rh, rk, ra);
        scoreLK = scoreAngleRange(angleLK, 40, 105, 30);
        scoreRK = scoreAngleRange(angleRK, 40, 105, 30);
      }

      // Hip flexion: [45° - 110°]
      let scoreLH = 0.85;
      let scoreRH = 0.85;
      if (lh && rh && lk && rk) {
        const angleLH = calculateJointAngle(ls, lh, lk);
        const angleRH = calculateJointAngle(rs, rh, rk);
        scoreLH = scoreAngleRange(angleLH, 45, 110, 30);
        scoreRH = scoreAngleRange(angleRH, 45, 110, 30);
      }

      // Low vertical height in frame
      const scoreLow = Math.min(1.0, Math.max(0, (nose.y - 0.28) / 0.14));

      // Hands down low near knees/floor
      let scoreHands = 0.85;
      if (lw && rw) {
        const handsLow = (lw.y > ls.y + 0.08) && (rw.y > rs.y + 0.08);
        scoreHands = handsLow ? 1.0 : Math.max(0, 1.0 - ((ls.y + 0.08) - Math.min(lw.y, rw.y)) / 0.15);
      }

      // Knees wide
      const shoulderDist = Math.max(0.1, Math.abs(ls.x - rs.x));
      let scoreWide = 0.85;
      if (lk && rk) {
        const kneeSpan = Math.abs(lk.x - rk.x);
        scoreWide = Math.min(1.0, Math.max(0, (kneeSpan / shoulderDist - 0.9) / 0.5));
      }

      const scores = [scoreLK, scoreRK, scoreLH, scoreRH, scoreLow, scoreHands, scoreWide];
      const accuracy = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
      const isMatch = accuracy >= 85;

      if (isMatch) {
        return {
          isMatch: true,
          accuracy,
          feedback: 'RIBBIT! Low frog squat held strong! 🐸'
        };
      }

      return {
        isMatch: false,
        accuracy,
        feedback: 'Squat down low with knees wide like a frog! 🐸'
      };
    }
  },
  {
    id: 'surfer',
    name: 'Surfer',
    action: 'Legs wide, surfing a wave!',
    emoji: '🏄',
    badge: 'Action Pose',
    hint: 'Step feet wide and stretch your arms out to ride the wild ocean waves!',
    targetDescription: 'Legs wide, arms stretched surfing a wave (Warrior 2)',
    color: '#06b6d4', // Ocean Cyan
    stickFigure: {
      head: [50, 22],
      neck: [50, 32],
      spine: [50, 60],
      leftShoulder: [42, 38],
      rightShoulder: [58, 38],
      leftElbow: [24, 38],
      rightElbow: [76, 38],
      leftWrist: [8, 38],
      rightWrist: [92, 38],
      leftHip: [44, 60],
      rightHip: [56, 60],
      leftKnee: [30, 76],
      leftAnkle: [26, 96],
      rightKnee: [70, 78],
      rightAnkle: [78, 96],
    },
    evaluate: (lm) => {
      const ls = lm[LANDMARKS.LEFT_SHOULDER];
      const rs = lm[LANDMARKS.RIGHT_SHOULDER];
      const le = lm[LANDMARKS.LEFT_ELBOW];
      const re = lm[LANDMARKS.RIGHT_ELBOW];
      const lw = lm[LANDMARKS.LEFT_WRIST];
      const rw = lm[LANDMARKS.RIGHT_WRIST];
      const lh = lm[LANDMARKS.LEFT_HIP] || { x: ls ? ls.x : 0.45, y: (ls ? ls.y : 0.4) + 0.25 };
      const rh = lm[LANDMARKS.RIGHT_HIP] || { x: rs ? rs.x : 0.55, y: (rs ? rs.y : 0.4) + 0.25 };
      const lk = lm[LANDMARKS.LEFT_KNEE];
      const rk = lm[LANDMARKS.RIGHT_KNEE];
      const la = lm[LANDMARKS.LEFT_ANKLE];
      const ra = lm[LANDMARKS.RIGHT_ANKLE];

      if (!lw || !rw || !ls || !rs || !le || !re) return { isMatch: false, accuracy: 0, feedback: 'Step into view! 🏄' };

      // Arm joint angles: wide horizontal reach
      const leftShoulderAngle = calculateJointAngle(lh, ls, le);
      const scoreLS = scoreAngleRange(leftShoulderAngle, 75, 105, 30);

      const rightShoulderAngle = calculateJointAngle(rh, rs, re);
      const scoreRS = scoreAngleRange(rightShoulderAngle, 75, 105, 30);

      const leftElbowAngle = calculateJointAngle(ls, le, lw);
      const scoreLE = scoreAngleRange(leftElbowAngle, 155, 180, 30);

      const rightElbowAngle = calculateJointAngle(rs, re, rw);
      const scoreRE = scoreAngleRange(rightElbowAngle, 155, 180, 30);

      // Horizontal wrist alignment
      const scoreLHoriz = Math.max(0, 1.0 - Math.abs(lw.y - ls.y) / 0.18);
      const scoreRHoriz = Math.max(0, 1.0 - Math.abs(rw.y - rs.y) / 0.18);

      // Wide stance
      const shoulderDist = Math.max(0.1, Math.abs(ls.x - rs.x));
      let scoreLegs = 0.85;
      if (la && ra) {
        const ankleDist = Math.abs(la.x - ra.x);
        scoreLegs = Math.min(1.0, Math.max(0, (ankleDist / shoulderDist - 1.1) / 0.5));
      } else if (lk && rk) {
        const kneeDist = Math.abs(lk.x - rk.x);
        scoreLegs = Math.min(1.0, Math.max(0, (kneeDist / shoulderDist - 1.0) / 0.4));
      }

      const scores = [scoreLS, scoreRS, scoreLE, scoreRE, scoreLHoriz, scoreRHoriz, scoreLegs];
      const accuracy = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
      const isMatch = accuracy >= 85;

      if (isMatch) {
        return {
          isMatch: true,
          accuracy,
          feedback: 'COWABUNGA! Surfing the big wave with balance! 🏄'
        };
      }

      return {
        isMatch: false,
        accuracy,
        feedback: 'Legs wide, stretch arms out to ride the wave! 🏄'
      };
    }
  }
];

/**
 * ============================================================
 * FRUIT YOGA POSES (Shape Themes, 5-Second Hold Mode)
 * 1. Banana: Arms up high and bend to the side! (Standing side bend)
 * 2. Starfruit: Stretch arms and legs out wide like a star! (Five-pointed star pose)
 * 3. Apple: Tuck in round and small like an apple. (Child's pose)
 * 4. Watermelon Slice: Sit down and stretch your legs wide apart! (Seated wide-angle stretch)
 * ============================================================
 */
export const FRUIT_POSES = [
  {
    id: 'fruit_banana',
    itemType: 'fruit',
    itemName: 'Banana',
    word: 'BANANA',
    name: 'Banana',
    action: 'Arms up high and bend to the side!',
    emoji: '🍌',
    badge: 'Fruit Yoga',
    color: '#facc15', // Vibrant Banana Yellow
    hint: 'Reach both arms overhead and tilt sideways like a curved, sweet yellow banana!',
    targetDescription: 'Arms up high and bend to the side (Standing side bend)',
    stickFigure: {
      head: [56, 22],
      neck: [54, 32],
      spine: [50, 62],
      leftShoulder: [44, 36],
      rightShoulder: [60, 34],
      leftElbow: [42, 20],
      rightElbow: [68, 18],
      leftWrist: [48, 6],
      rightWrist: [72, 6],
      leftHip: [44, 62],
      rightHip: [56, 62],
      leftKnee: [42, 80],
      rightKnee: [58, 80],
      leftAnkle: [40, 96],
      rightAnkle: [60, 96],
    },
    evaluate: (lm) => {
      const ls = lm[LANDMARKS.LEFT_SHOULDER];
      const rs = lm[LANDMARKS.RIGHT_SHOULDER];
      const le = lm[LANDMARKS.LEFT_ELBOW];
      const re = lm[LANDMARKS.RIGHT_ELBOW];
      const lw = lm[LANDMARKS.LEFT_WRIST];
      const rw = lm[LANDMARKS.RIGHT_WRIST];
      const lh = lm[LANDMARKS.LEFT_HIP] || { x: ls ? ls.x : 0.45, y: (ls ? ls.y : 0.4) + 0.3 };
      const rh = lm[LANDMARKS.RIGHT_HIP] || { x: rs ? rs.x : 0.55, y: (rs ? rs.y : 0.4) + 0.3 };

      if (!lw || !rw || !ls || !rs || !le || !re) {
        return { isMatch: false, accuracy: 0, feedback: 'Step into view to show your Banana pose! 🍌' };
      }

      // Overhead reach joint angles: [150° - 180°]
      const leftShoulderAngle = calculateJointAngle(lh, ls, le);
      const scoreLS = scoreAngleRange(leftShoulderAngle, 145, 180, 30);

      const rightShoulderAngle = calculateJointAngle(rh, rs, re);
      const scoreRS = scoreAngleRange(rightShoulderAngle, 145, 180, 30);

      const leftElbowAngle = calculateJointAngle(ls, le, lw);
      const scoreLE = scoreAngleRange(leftElbowAngle, 145, 180, 30);

      const rightElbowAngle = calculateJointAngle(rs, re, rw);
      const scoreRE = scoreAngleRange(rightElbowAngle, 145, 180, 30);

      // Wrists above head
      const scoreLUp = Math.min(1.0, Math.max(0, (ls.y - lw.y) / 0.18));
      const scoreRUp = Math.min(1.0, Math.max(0, (rs.y - rw.y) / 0.18));

      // Lateral curvature: wrists shifted sideways relative to shoulder center
      const shoulderCenter = (ls.x + rs.x) / 2;
      const wristCenter = (lw.x + rw.x) / 2;
      const lateralShift = Math.abs(wristCenter - shoulderCenter);
      const scoreCurve = scoreAngleRange(lateralShift * 100, 5, 25, 6);

      const scores = [scoreLS, scoreRS, scoreLE, scoreRE, scoreLUp, scoreRUp, scoreCurve];
      const accuracy = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
      const isMatch = accuracy >= 85;

      if (isMatch) {
        return {
          isMatch: true,
          accuracy,
          feedback: 'DELICIOUS BANANA CURVE! Hold steady for 5 seconds! 🍌'
        };
      }

      if (lateralShift < 0.04) {
        return {
          isMatch: false,
          accuracy,
          feedback: 'Lean your arms and body to one side like a curved banana! 🍌'
        };
      }

      return {
        isMatch: false,
        accuracy,
        feedback: 'Arms up high and bend to the side! 🍌'
      };
    }
  },
  {
    id: 'fruit_starfruit',
    itemType: 'fruit',
    itemName: 'Starfruit',
    word: 'STARFRUIT',
    name: 'Starfruit',
    action: 'Stretch arms and legs out wide like a star!',
    emoji: '⭐',
    badge: 'Fruit Yoga',
    color: '#fbbf24', // Star Gold
    hint: 'Stretch both arms and legs out wide in a giant glowing five-pointed star!',
    targetDescription: 'Stretch arms and legs out wide like a star (Five-pointed star pose)',
    stickFigure: {
      head: [50, 20],
      neck: [50, 30],
      spine: [50, 60],
      leftShoulder: [42, 36],
      rightShoulder: [58, 36],
      leftElbow: [26, 22],
      rightElbow: [74, 22],
      leftWrist: [10, 8],
      rightWrist: [90, 8],
      leftHip: [44, 60],
      rightHip: [56, 60],
      leftKnee: [34, 78],
      rightKnee: [66, 78],
      leftAnkle: [22, 96],
      rightAnkle: [78, 96],
    },
    evaluate: (lm) => {
      const ls = lm[LANDMARKS.LEFT_SHOULDER];
      const rs = lm[LANDMARKS.RIGHT_SHOULDER];
      const le = lm[LANDMARKS.LEFT_ELBOW];
      const re = lm[LANDMARKS.RIGHT_ELBOW];
      const lw = lm[LANDMARKS.LEFT_WRIST];
      const rw = lm[LANDMARKS.RIGHT_WRIST];
      const lh = lm[LANDMARKS.LEFT_HIP] || { x: ls ? ls.x : 0.45, y: (ls ? ls.y : 0.4) + 0.3 };
      const rh = lm[LANDMARKS.RIGHT_HIP] || { x: rs ? rs.x : 0.55, y: (rs ? rs.y : 0.4) + 0.3 };
      const la = lm[LANDMARKS.LEFT_ANKLE];
      const ra = lm[LANDMARKS.RIGHT_ANKLE];
      const lk = lm[LANDMARKS.LEFT_KNEE];
      const rk = lm[LANDMARKS.RIGHT_KNEE];

      if (!lw || !rw || !ls || !rs || !le || !re) return { isMatch: false, accuracy: 0, feedback: 'Step into view! ⭐' };

      // Arms in high diagonal V [120° - 160°]
      const leftShoulderAngle = calculateJointAngle(lh, ls, le);
      const scoreLS = scoreAngleRange(leftShoulderAngle, 120, 160, 30);

      const rightShoulderAngle = calculateJointAngle(rh, rs, re);
      const scoreRS = scoreAngleRange(rightShoulderAngle, 120, 160, 30);

      // Straight elbows [155° - 180°]
      const leftElbowAngle = calculateJointAngle(ls, le, lw);
      const scoreLE = scoreAngleRange(leftElbowAngle, 155, 180, 30);

      const rightElbowAngle = calculateJointAngle(rs, re, rw);
      const scoreRE = scoreAngleRange(rightElbowAngle, 155, 180, 30);

      // Arms up and wide
      const scoreArmsHigh = Math.min(1.0, Math.max(0, (ls.y - lw.y) / 0.15));
      const shoulderDist = Math.max(0.1, Math.abs(ls.x - rs.x));
      const armSpan = Math.abs(lw.x - rw.x);
      const scoreArmsWide = Math.min(1.0, Math.max(0, (armSpan / shoulderDist - 1.2) / 0.6));

      // Legs wide
      let scoreLegs = 0.9;
      if (la && ra) {
        const ankleDist = Math.abs(la.x - ra.x);
        scoreLegs = Math.min(1.0, Math.max(0, (ankleDist / shoulderDist - 1.1) / 0.5));
      } else if (lk && rk) {
        const kneeDist = Math.abs(lk.x - rk.x);
        scoreLegs = Math.min(1.0, Math.max(0, (kneeDist / shoulderDist - 1.0) / 0.4));
      }

      const scores = [scoreLS, scoreRS, scoreLE, scoreRE, scoreArmsHigh, scoreArmsWide, scoreLegs];
      const accuracy = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
      const isMatch = accuracy >= 85;

      if (isMatch) {
        return {
          isMatch: true,
          accuracy,
          feedback: 'SHINING STARFRUIT! Glowing bright like a star! ⭐'
        };
      }

      return {
        isMatch: false,
        accuracy,
        feedback: 'Stretch arms and legs out wide like a star! ⭐'
      };
    }
  },
  {
    id: 'fruit_apple',
    itemType: 'fruit',
    itemName: 'Apple',
    word: 'APPLE',
    name: 'Apple',
    action: 'Tuck in round and small like an apple.',
    emoji: '🍎',
    badge: 'Fruit Yoga',
    color: '#ef4444', // Red Apple
    hint: 'Tuck in round and small on the floor like a cozy little apple!',
    targetDescription: 'Tuck in round and small like an apple (Child’s pose)',
    stickFigure: {
      head: [32, 66],
      neck: [40, 62],
      spine: [54, 52],
      leftShoulder: [44, 58],
      rightShoulder: [48, 54],
      leftElbow: [26, 68],
      rightElbow: [30, 64],
      leftWrist: [16, 72],
      rightWrist: [20, 68],
      leftHip: [68, 62],
      rightHip: [72, 58],
      leftKnee: [56, 78],
      rightKnee: [60, 74],
      leftAnkle: [74, 80],
      rightAnkle: [78, 76],
    },
    evaluate: (lm) => {
      const ls = lm[LANDMARKS.LEFT_SHOULDER];
      const rs = lm[LANDMARKS.RIGHT_SHOULDER];
      const lw = lm[LANDMARKS.LEFT_WRIST];
      const rw = lm[LANDMARKS.RIGHT_WRIST];
      const le = lm[LANDMARKS.LEFT_ELBOW];
      const re = lm[LANDMARKS.RIGHT_ELBOW];
      const nose = lm[LANDMARKS.NOSE];
      const lh = lm[LANDMARKS.LEFT_HIP];
      const rh = lm[LANDMARKS.RIGHT_HIP];
      const lk = lm[LANDMARKS.LEFT_KNEE];
      const rk = lm[LANDMARKS.RIGHT_KNEE];
      const la = lm[LANDMARKS.LEFT_ANKLE];
      const ra = lm[LANDMARKS.RIGHT_ANKLE];

      if (!ls || !rs || !nose) return { isMatch: false, accuracy: 0, feedback: 'Step into view! 🍎' };

      // Compact flexion: Child's pose hips & knees flexed [35° - 90°]
      let scoreLH = 0.85;
      let scoreRH = 0.85;
      if (lh && rh && lk && rk) {
        const angleLH = calculateJointAngle(ls, lh, lk);
        const angleRH = calculateJointAngle(rs, rh, rk);
        scoreLH = scoreAngleRange(angleLH, 35, 90, 30);
        scoreRH = scoreAngleRange(angleRH, 35, 90, 30);
      }

      let scoreLK = 0.85;
      let scoreRK = 0.85;
      if (lh && rh && lk && rk && la && ra) {
        const angleLK = calculateJointAngle(lh, lk, la);
        const angleRK = calculateJointAngle(rh, rk, ra);
        scoreLK = scoreAngleRange(angleLK, 35, 90, 30);
        scoreRK = scoreAngleRange(angleRK, 35, 90, 30);
      }

      // Low vertical profile in frame
      const scoreLow = Math.min(1.0, Math.max(0, (nose.y - 0.32) / 0.15));

      // Elbows/arms: in child's pose, arms can be extended forward on floor [135° - 180°] or tucked back by sides [35° - 110°]
      let scoreElbows = 0.85;
      if (le && re && lw && rw) {
        const angleLE = calculateJointAngle(ls, le, lw);
        const angleRE = calculateJointAngle(rs, re, rw);
        const sL = Math.max(scoreAngleRange(angleLE, 35, 110, 30), scoreAngleRange(angleLE, 135, 180, 30));
        const sR = Math.max(scoreAngleRange(angleRE, 35, 110, 30), scoreAngleRange(angleRE, 135, 180, 30));
        scoreElbows = (sL + sR) / 2;
      }

      const scores = [scoreLH, scoreRH, scoreLK, scoreRK, scoreLow, scoreElbows];
      const accuracy = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
      const isMatch = accuracy >= 85;

      if (isMatch) {
        return {
          isMatch: true,
          accuracy,
          feedback: 'SWEET ROUND APPLE! Cozy and tucked in small! 🍎'
        };
      }

      return {
        isMatch: false,
        accuracy,
        feedback: 'Tuck in round and small like an apple! 🍎'
      };
    }
  },
  {
    id: 'fruit_watermelon',
    itemType: 'fruit',
    itemName: 'Watermelon Slice',
    word: 'WATERMELON',
    name: 'Watermelon Slice',
    action: 'Sit down and stretch your legs wide apart!',
    emoji: '🍉',
    badge: 'Fruit Yoga',
    color: '#10b981', // Emerald & Pink
    hint: 'Sit down on the floor and stretch your legs wide apart like a big watermelon smile!',
    targetDescription: 'Sit down and stretch your legs wide apart (Seated wide-angle stretch)',
    stickFigure: {
      head: [50, 32],
      neck: [50, 42],
      spine: [50, 68],
      leftShoulder: [42, 46],
      rightShoulder: [58, 46],
      leftElbow: [30, 54],
      rightElbow: [70, 54],
      leftWrist: [18, 64],
      rightWrist: [82, 64],
      leftHip: [44, 72],
      rightHip: [56, 72],
      leftKnee: [28, 76],
      rightKnee: [72, 76],
      leftAnkle: [12, 84],
      rightAnkle: [88, 84],
    },
    evaluate: (lm) => {
      const ls = lm[LANDMARKS.LEFT_SHOULDER];
      const rs = lm[LANDMARKS.RIGHT_SHOULDER];
      const lw = lm[LANDMARKS.LEFT_WRIST];
      const rw = lm[LANDMARKS.RIGHT_WRIST];
      const la = lm[LANDMARKS.LEFT_ANKLE];
      const ra = lm[LANDMARKS.RIGHT_ANKLE];
      const lk = lm[LANDMARKS.LEFT_KNEE];
      const rk = lm[LANDMARKS.RIGHT_KNEE];
      const lh = lm[LANDMARKS.LEFT_HIP];
      const rh = lm[LANDMARKS.RIGHT_HIP];
      const nose = lm[LANDMARKS.NOSE];

      if (!ls || !rs || !nose) return { isMatch: false, accuracy: 0, feedback: 'Step into view! 🍉' };

      // Seated / low level in frame
      const scoreLow = Math.min(1.0, Math.max(0, (nose.y - 0.26) / 0.12));

      // Hips flexed seated [60° - 115°]
      let scoreLH = 0.85;
      let scoreRH = 0.85;
      if (lh && rh && lk && rk) {
        const angleLH = calculateJointAngle(ls, lh, lk);
        const angleRH = calculateJointAngle(rs, rh, rk);
        scoreLH = scoreAngleRange(angleLH, 60, 115, 30);
        scoreRH = scoreAngleRange(angleRH, 60, 115, 30);
      }

      // Legs straight [140° - 180°]
      let scoreLK = 0.85;
      let scoreRK = 0.85;
      if (lh && rh && lk && rk && la && ra) {
        const angleLK = calculateJointAngle(lh, lk, la);
        const angleRK = calculateJointAngle(rh, rk, ra);
        scoreLK = scoreAngleRange(angleLK, 140, 180, 30);
        scoreRK = scoreAngleRange(angleRK, 140, 180, 30);
      }

      // Wide leg spread
      let scoreLegSpan = 0.85;
      if (la && ra) {
        scoreLegSpan = Math.min(1.0, Math.max(0, (Math.abs(la.x - ra.x) - 0.28) / 0.3));
      } else if (lk && rk) {
        scoreLegSpan = Math.min(1.0, Math.max(0, (Math.abs(lk.x - rk.x) - 0.24) / 0.25));
      }

      const scores = [scoreLow, scoreLH, scoreRH, scoreLK, scoreRK, scoreLegSpan];
      const accuracy = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
      const isMatch = accuracy >= 85;

      if (isMatch) {
        return {
          isMatch: true,
          accuracy,
          feedback: 'BIG WATERMELON SLICE! Wide stretch held strong! 🍉'
        };
      }

      return {
        isMatch: false,
        accuracy,
        feedback: 'Sit down and stretch your legs wide apart! 🍉'
      };
    }
  }
];

/**
 * ============================================================
 * VEGETABLE YOGA POSES (5-Second Hold Mode)
 * ============================================================
 */
export const VEGETABLE_POSES = [
  {
    id: 'veg_carrot',
    itemType: 'vegetable',
    itemName: 'Carrot',
    word: 'CARROT',
    name: 'Crunchy Carrot',
    emoji: '🥕',
    badge: 'Vegetable Yoga',
    color: '#f97316', // Bright Carrot Orange
    hint: 'Stand super tall and point your hands together straight up like a pointy orange carrot!',
    targetDescription: 'Hands pressed together pointing straight to the sky',
    stickFigure: {
      head: [50, 22],
      neck: [50, 32],
      spine: [50, 62],
      leftShoulder: [42, 36],
      rightShoulder: [58, 36],
      leftElbow: [42, 18],
      rightElbow: [58, 18],
      leftWrist: [49, 5],
      rightWrist: [51, 5],
      leftHip: [44, 62],
      rightHip: [56, 62],
      leftKnee: [42, 80],
      rightKnee: [58, 80],
      leftAnkle: [40, 96],
      rightAnkle: [60, 96],
    },
    evaluate: (lm) => {
      const ls = lm[LANDMARKS.LEFT_SHOULDER];
      const rs = lm[LANDMARKS.RIGHT_SHOULDER];
      const le = lm[LANDMARKS.LEFT_ELBOW];
      const re = lm[LANDMARKS.RIGHT_ELBOW];
      const lw = lm[LANDMARKS.LEFT_WRIST];
      const rw = lm[LANDMARKS.RIGHT_WRIST];
      const lh = lm[LANDMARKS.LEFT_HIP] || { x: ls ? ls.x : 0.45, y: (ls ? ls.y : 0.4) + 0.3 };
      const rh = lm[LANDMARKS.RIGHT_HIP] || { x: rs ? rs.x : 0.55, y: (rs ? rs.y : 0.4) + 0.3 };
      const nose = lm[LANDMARKS.NOSE];

      if (!lw || !rw || !ls || !rs || !le || !re || !nose) {
        return { isMatch: false, accuracy: 0, feedback: 'Step into view to show your Carrot pose! 🥕' };
      }

      // Shoulders pointing straight up: [155° - 180°]
      const leftShoulderAngle = calculateJointAngle(lh, ls, le);
      const scoreLS = scoreAngleRange(leftShoulderAngle, 155, 180, 25);

      const rightShoulderAngle = calculateJointAngle(rh, rs, re);
      const scoreRS = scoreAngleRange(rightShoulderAngle, 155, 180, 25);

      // Elbows straight: [155° - 180°]
      const leftElbowAngle = calculateJointAngle(ls, le, lw);
      const scoreLE = scoreAngleRange(leftElbowAngle, 155, 180, 25);

      const rightElbowAngle = calculateJointAngle(rs, re, rw);
      const scoreRE = scoreAngleRange(rightElbowAngle, 155, 180, 25);

      // Hands together overhead
      const distWrists = Math.hypot(lw.x - rw.x, lw.y - rw.y);
      const scoreHandsTogether = scoreAngleRange(distWrists * 100, 0, 12, 10);

      // Hands above nose
      const scoreHandsAbove = (lw.y < nose.y && rw.y < nose.y) ? 1.0 : Math.max(0, 1.0 - (Math.max(lw.y, rw.y) - nose.y) / 0.15);

      const scores = [scoreLS, scoreRS, scoreLE, scoreRE, scoreHandsTogether, scoreHandsAbove];
      const accuracy = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
      const isMatch = accuracy >= 85;

      if (isMatch) {
        return {
          isMatch: true,
          accuracy,
          feedback: 'CRUNCHY CARROT LOCKED! Hold steady for 5 seconds! 🥕'
        };
      }

      return {
        isMatch: false,
        accuracy,
        feedback: 'Point both hands together straight to the sky like a carrot tip! 🥕'
      };
    }
  },
  {
    id: 'veg_broccoli',
    itemType: 'vegetable',
    itemName: 'Broccoli',
    word: 'BROCCOLI',
    name: 'Broccoli Tree',
    emoji: '🥦',
    badge: 'Vegetable Yoga',
    color: '#22c55e', // Emerald Broccoli Green
    hint: 'Bend your elbows at 90 degrees like big, strong, fluffy green broccoli crowns!',
    targetDescription: 'Cactus arms with 90-degree bent elbows',
    stickFigure: {
      head: [50, 22],
      neck: [50, 32],
      spine: [50, 62],
      leftShoulder: [42, 40],
      rightShoulder: [58, 40],
      leftElbow: [22, 42],
      rightElbow: [78, 42],
      leftWrist: [22, 14],
      rightWrist: [78, 14],
      leftHip: [44, 62],
      rightHip: [56, 62],
      leftKnee: [42, 80],
      rightKnee: [58, 80],
      leftAnkle: [40, 96],
      rightAnkle: [60, 96],
    },
    evaluate: (lm) => {
      const ls = lm[LANDMARKS.LEFT_SHOULDER];
      const rs = lm[LANDMARKS.RIGHT_SHOULDER];
      const le = lm[LANDMARKS.LEFT_ELBOW];
      const re = lm[LANDMARKS.RIGHT_ELBOW];
      const lw = lm[LANDMARKS.LEFT_WRIST];
      const rw = lm[LANDMARKS.RIGHT_WRIST];
      const lh = lm[LANDMARKS.LEFT_HIP] || { x: ls ? ls.x : 0.45, y: (ls ? ls.y : 0.4) + 0.3 };
      const rh = lm[LANDMARKS.RIGHT_HIP] || { x: rs ? rs.x : 0.55, y: (rs ? rs.y : 0.4) + 0.3 };

      if (!lw || !rw || !ls || !rs || !le || !re) return { isMatch: false, accuracy: 0, feedback: 'Show your arms in the mirror! 🥦' };

      // Shoulders out at 90°: [75° - 105°]
      const leftShoulderAngle = calculateJointAngle(lh, ls, le);
      const scoreLS = scoreAngleRange(leftShoulderAngle, 75, 105, 25);

      const rightShoulderAngle = calculateJointAngle(rh, rs, re);
      const scoreRS = scoreAngleRange(rightShoulderAngle, 75, 105, 25);

      // Elbows bent at 90°: [75° - 105°]
      const leftElbowAngle = calculateJointAngle(ls, le, lw);
      const scoreLE = scoreAngleRange(leftElbowAngle, 75, 105, 25);

      const rightElbowAngle = calculateJointAngle(rs, re, rw);
      const scoreRE = scoreAngleRange(rightElbowAngle, 75, 105, 25);

      // Forearms pointing upwards
      const scoreLUp = (lw.y < le.y - 0.05) ? 1.0 : Math.max(0, 1.0 - (lw.y - (le.y - 0.05)) / 0.15);
      const scoreRUp = (rw.y < re.y - 0.05) ? 1.0 : Math.max(0, 1.0 - (rw.y - (re.y - 0.05)) / 0.15);

      const scores = [scoreLS, scoreRS, scoreLE, scoreRE, scoreLUp, scoreRUp];
      const accuracy = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
      const isMatch = accuracy >= 85;

      if (isMatch) {
        return {
          isMatch: true,
          accuracy,
          feedback: 'MIGHTY BROCCOLI CROWNS! Hold frozen! 🥦'
        };
      }

      return {
        isMatch: false,
        accuracy,
        feedback: 'Bend elbows and point both hands up like broccoli branches! 🥦'
      };
    }
  },
  {
    id: 'veg_corn',
    itemType: 'vegetable',
    itemName: 'Corn',
    word: 'CORN',
    name: 'Tall Cornstalk',
    emoji: '🌽',
    badge: 'Vegetable Yoga',
    color: '#eab308', // Golden Corn
    hint: 'One arm reaching high to the sunlight like a tall cornstalk, one hand on hip!',
    targetDescription: 'One arm pointing high, other hand on hip',
    stickFigure: {
      head: [50, 22],
      neck: [50, 32],
      spine: [50, 62],
      leftShoulder: [42, 36],
      rightShoulder: [58, 36],
      leftElbow: [30, 20],
      rightElbow: [68, 50],
      leftWrist: [22, 6],
      rightWrist: [56, 62],
      leftHip: [44, 62],
      rightHip: [56, 62],
      leftKnee: [42, 80],
      rightKnee: [58, 80],
      leftAnkle: [40, 96],
      rightAnkle: [60, 96],
    },
    evaluate: (lm) => {
      const ls = lm[LANDMARKS.LEFT_SHOULDER];
      const rs = lm[LANDMARKS.RIGHT_SHOULDER];
      const le = lm[LANDMARKS.LEFT_ELBOW];
      const re = lm[LANDMARKS.RIGHT_ELBOW];
      const lw = lm[LANDMARKS.LEFT_WRIST];
      const rw = lm[LANDMARKS.RIGHT_WRIST];
      const lh = lm[LANDMARKS.LEFT_HIP] || { x: ls ? ls.x : 0.45, y: (ls ? ls.y : 0.4) + 0.3 };
      const rh = lm[LANDMARKS.RIGHT_HIP] || { x: rs ? rs.x : 0.55, y: (rs ? rs.y : 0.4) + 0.3 };

      if (!lw || !rw || !ls || !rs || !le || !re) return { isMatch: false, accuracy: 0, feedback: 'Step into view! 🌽' };

      // Case A: Left arm up, Right arm down on hip
      const sLUpShoulder = scoreAngleRange(calculateJointAngle(lh, ls, le), 150, 180, 30);
      const sLUpElbow = scoreAngleRange(calculateJointAngle(ls, le, lw), 150, 180, 30);
      const sRDownShoulder = scoreAngleRange(calculateJointAngle(rh, rs, re), 15, 60, 30);
      const sRDownElbow = scoreAngleRange(calculateJointAngle(rs, re, rw), 45, 125, 35);
      const avgA = (sLUpShoulder + sLUpElbow + sRDownShoulder + sRDownElbow) / 4;

      // Case B: Right arm up, Left arm down on hip
      const sRUpShoulder = scoreAngleRange(calculateJointAngle(rh, rs, re), 150, 180, 30);
      const sRUpElbow = scoreAngleRange(calculateJointAngle(rs, re, rw), 150, 180, 30);
      const sLDownShoulder = scoreAngleRange(calculateJointAngle(lh, ls, le), 15, 60, 30);
      const sLDownElbow = scoreAngleRange(calculateJointAngle(ls, le, lw), 45, 125, 35);
      const avgB = (sRUpShoulder + sRUpElbow + sLDownShoulder + sLDownElbow) / 4;

      const accuracy = Math.round(Math.max(avgA, avgB) * 100);
      const isMatch = accuracy >= 85;

      if (isMatch) {
        return {
          isMatch: true,
          accuracy,
          feedback: 'TALL GOLDEN CORNSTALK! Hold frozen! 🌽'
        };
      }

      return {
        isMatch: false,
        accuracy,
        feedback: 'Reach ONE hand up to the sun and keep the other hand on your hip! 🌽'
      };
    }
  },
  {
    id: 'veg_pea',
    itemType: 'vegetable',
    itemName: 'Pea Pod',
    word: 'PEA POD',
    name: 'Cozy Pea Pod',
    emoji: '🫛',
    badge: 'Vegetable Yoga',
    color: '#84cc16', // Lime Pea Pod
    hint: 'Bring your palms together at your chest in a warm, cozy pea pod shape!',
    targetDescription: 'Hands together in prayer at chest level',
    stickFigure: {
      head: [50, 22],
      neck: [50, 32],
      spine: [50, 62],
      leftShoulder: [42, 38],
      rightShoulder: [58, 38],
      leftElbow: [32, 48],
      rightElbow: [68, 48],
      leftWrist: [47, 48],
      rightWrist: [53, 48],
      leftHip: [44, 62],
      rightHip: [56, 62],
      leftKnee: [42, 80],
      rightKnee: [58, 80],
      leftAnkle: [40, 96],
      rightAnkle: [60, 96],
    },
    evaluate: (lm) => {
      const ls = lm[LANDMARKS.LEFT_SHOULDER];
      const rs = lm[LANDMARKS.RIGHT_SHOULDER];
      const le = lm[LANDMARKS.LEFT_ELBOW];
      const re = lm[LANDMARKS.RIGHT_ELBOW];
      const lw = lm[LANDMARKS.LEFT_WRIST];
      const rw = lm[LANDMARKS.RIGHT_WRIST];
      const lh = lm[LANDMARKS.LEFT_HIP] || { x: ls ? ls.x : 0.45, y: (ls ? ls.y : 0.4) + 0.3 };
      const rh = lm[LANDMARKS.RIGHT_HIP] || { x: rs ? rs.x : 0.55, y: (rs ? rs.y : 0.4) + 0.3 };

      if (!lw || !rw || !ls || !rs || !le || !re) return { isMatch: false, accuracy: 0, feedback: 'Step into view! 🫛' };

      // Shoulders adducted near chest: [20° - 60°]
      const leftShoulderAngle = calculateJointAngle(lh, ls, le);
      const scoreLS = scoreAngleRange(leftShoulderAngle, 20, 60, 25);

      const rightShoulderAngle = calculateJointAngle(rh, rs, re);
      const scoreRS = scoreAngleRange(rightShoulderAngle, 20, 60, 25);

      // Elbows bent in prayer: [40° - 110°]
      const leftElbowAngle = calculateJointAngle(ls, le, lw);
      const scoreLE = scoreAngleRange(leftElbowAngle, 40, 110, 25);

      const rightElbowAngle = calculateJointAngle(rs, re, rw);
      const scoreRE = scoreAngleRange(rightElbowAngle, 40, 110, 25);

      // Wrists together in prayer
      const distWrists = Math.hypot(lw.x - rw.x, lw.y - rw.y);
      const scoreWristsTogether = scoreAngleRange(distWrists * 100, 0, 12, 10);

      // Chest level (below shoulders, above hips)
      const scoreChestLevel = (lw.y > ls.y && rw.y > rs.y && lw.y < lh.y && rw.y < rh.y) ? 1.0 : 0.5;

      const scores = [scoreLS, scoreRS, scoreLE, scoreRE, scoreWristsTogether, scoreChestLevel];
      const accuracy = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
      const isMatch = accuracy >= 85;

      if (isMatch) {
        return {
          isMatch: true,
          accuracy,
          feedback: 'COZY PEA POD! Stay peaceful and frozen! 🫛'
        };
      }

      return {
        isMatch: false,
        accuracy,
        feedback: 'Bring your palms together at your chest like a cozy pea pod! 🫛'
      };
    }
  },
  {
    id: 'veg_pumpkin',
    itemType: 'vegetable',
    itemName: 'Pumpkin',
    word: 'PUMPKIN',
    name: 'Giant Pumpkin',
    emoji: '🎃',
    badge: 'Vegetable Yoga',
    color: '#ea580c', // Pumpkin Orange
    hint: 'Round your arms out in front like holding a big, plump round pumpkin!',
    targetDescription: 'Arms rounded in a wide circle at chest height',
    stickFigure: {
      head: [50, 22],
      neck: [50, 32],
      spine: [50, 62],
      leftShoulder: [42, 38],
      rightShoulder: [58, 38],
      leftElbow: [24, 46],
      rightElbow: [76, 46],
      leftWrist: [40, 48],
      rightWrist: [60, 48],
      leftHip: [44, 62],
      rightHip: [56, 62],
      leftKnee: [42, 80],
      rightKnee: [58, 80],
      leftAnkle: [40, 96],
      rightAnkle: [60, 96],
    },
    evaluate: (lm) => {
      const ls = lm[LANDMARKS.LEFT_SHOULDER];
      const rs = lm[LANDMARKS.RIGHT_SHOULDER];
      const le = lm[LANDMARKS.LEFT_ELBOW];
      const re = lm[LANDMARKS.RIGHT_ELBOW];
      const lw = lm[LANDMARKS.LEFT_WRIST];
      const rw = lm[LANDMARKS.RIGHT_WRIST];
      const lh = lm[LANDMARKS.LEFT_HIP] || { x: ls ? ls.x : 0.45, y: (ls ? ls.y : 0.4) + 0.3 };
      const rh = lm[LANDMARKS.RIGHT_HIP] || { x: rs ? rs.x : 0.55, y: (rs ? rs.y : 0.4) + 0.3 };

      if (!lw || !rw || !ls || !rs || !le || !re) return { isMatch: false, accuracy: 0, feedback: 'Step into view! 🎃' };

      // Shoulders rounded forward: [55° - 95°]
      const leftShoulderAngle = calculateJointAngle(lh, ls, le);
      const scoreLS = scoreAngleRange(leftShoulderAngle, 55, 95, 25);

      const rightShoulderAngle = calculateJointAngle(rh, rs, re);
      const scoreRS = scoreAngleRange(rightShoulderAngle, 55, 95, 25);

      // Elbows rounded in a circle: [20° - 85°]
      const leftElbowAngle = calculateJointAngle(ls, le, lw);
      const scoreLE = scoreAngleRange(leftElbowAngle, 20, 85, 25);

      const rightElbowAngle = calculateJointAngle(rs, re, rw);
      const scoreRE = scoreAngleRange(rightElbowAngle, 20, 85, 25);

      // Elbows wider than shoulders
      const shoulderWidth = Math.abs(ls.x - rs.x);
      const elbowWidth = Math.abs(le.x - re.x);
      const scoreElbowsWide = Math.min(1.0, Math.max(0, (elbowWidth / shoulderWidth - 1.1) / 0.4));

      // Wrists in front near center
      const scoreWristsCenter = scoreAngleRange(Math.abs(lw.x - rw.x) * 100, 5, 25, 12);

      const scores = [scoreLS, scoreRS, scoreLE, scoreRE, scoreElbowsWide, scoreWristsCenter];
      const accuracy = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
      const isMatch = accuracy >= 85;

      if (isMatch) {
        return {
          isMatch: true,
          accuracy,
          feedback: 'ROUND PUMPKIN POWER! Hold it for 5 seconds! 🎃'
        };
      }

      return {
        isMatch: false,
        accuracy,
        feedback: 'Round your arms in front like holding a giant pumpkin! 🎃'
      };
    }
  }
];
