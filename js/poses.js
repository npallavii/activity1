/**
 * Pose Definitions & Evaluator for "Freeze & Pose"
 * Contains target stick-figure visual definitions and landmark evaluation logic.
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
      const lw = lm[LANDMARKS.LEFT_WRIST];
      const rw = lm[LANDMARKS.RIGHT_WRIST];

      if (!lw || !rw || !ls || !rs) {
        return { isMatch: false, feedback: 'Step into view so the mirror sees your wings! ✈️' };
      }

      if ((lw.visibility || 1) < 0.35 || (rw.visibility || 1) < 0.35) {
        return { isMatch: false, feedback: 'Bring both arms into the camera view! ✈️' };
      }

      // Arms stretched wide horizontally like wings
      const leftArmHoriz = Math.abs(lw.y - ls.y) < 0.22;
      const rightArmHoriz = Math.abs(rw.y - rs.y) < 0.22;
      const shoulderDist = Math.abs(ls.x - rs.x);
      const armSpan = Math.abs(lw.x - rw.x);
      const armsWide = armSpan > shoulderDist * 1.5;

      if (leftArmHoriz && rightArmHoriz && armsWide) {
        return {
          isMatch: true,
          feedback: 'SOARING AIRPLANE! Wings steady in the sky! ✈️'
        };
      }

      return {
        isMatch: false,
        feedback: 'Stretch arms out wide to the sides like airplane wings! ✈️'
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
      const lk = lm[LANDMARKS.LEFT_KNEE];
      const rk = lm[LANDMARKS.RIGHT_KNEE];
      const la = lm[LANDMARKS.LEFT_ANKLE];
      const ra = lm[LANDMARKS.RIGHT_ANKLE];

      if (!ls || !rs) return { isMatch: false, feedback: 'Step into view!' };

      // Leg check: one leg lifted
      const anklesVisible = la && ra && (la.visibility || 1) > 0.35 && (ra.visibility || 1) > 0.35;
      const kneesVisible = lk && rk && (lk.visibility || 1) > 0.35 && (rk.visibility || 1) > 0.35;
      
      let oneLegLifted = false;
      if (anklesVisible) {
        oneLegLifted = Math.abs(la.y - ra.y) > 0.06;
      } else if (kneesVisible) {
        oneLegLifted = Math.abs(lk.y - rk.y) > 0.06;
      } else {
        // Upper body framing fallback: centered torso and balanced wing arms
        oneLegLifted = lw && rw && Math.abs(lw.y - rw.y) < 0.22;
      }

      if (oneLegLifted) {
        return {
          isMatch: true,
          feedback: 'ELEGANT FLAMINGO! Standing tall on one leg! 🦩'
        };
      }

      return {
        isMatch: false,
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
      const lk = lm[LANDMARKS.LEFT_KNEE];
      const rk = lm[LANDMARKS.RIGHT_KNEE];

      if (!ls || !rs || !nose) return { isMatch: false, feedback: 'Step into view!' };

      const shoulderDist = Math.abs(ls.x - rs.x);
      // Squat low: head/shoulders lowered in frame or hips lowered near knees
      const isLowered = nose.y > 0.30 || ls.y > 0.40;
      // Hands low down near hips/floor
      const handsDown = lw && rw && lw.y > ls.y + 0.10 && rw.y > rs.y + 0.10;
      // Knees wide if visible
      const kneesWide = !lk || !rk || Math.abs(lk.x - rk.x) > shoulderDist * 1.1;

      if (isLowered && (handsDown || kneesWide)) {
        return {
          isMatch: true,
          feedback: 'RIBBIT! Low frog squat held strong! 🐸'
        };
      }

      return {
        isMatch: false,
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
      const lw = lm[LANDMARKS.LEFT_WRIST];
      const rw = lm[LANDMARKS.RIGHT_WRIST];
      const lk = lm[LANDMARKS.LEFT_KNEE];
      const rk = lm[LANDMARKS.RIGHT_KNEE];
      const la = lm[LANDMARKS.LEFT_ANKLE];
      const ra = lm[LANDMARKS.RIGHT_ANKLE];

      if (!lw || !rw || !ls || !rs) return { isMatch: false, feedback: 'Step into view!' };

      const shoulderDist = Math.abs(ls.x - rs.x);
      // Arms stretched horizontal wide
      const leftHoriz = Math.abs(lw.y - ls.y) < 0.22;
      const rightHoriz = Math.abs(rw.y - rs.y) < 0.22;
      const armSpan = Math.abs(lw.x - rw.x);
      const armsWide = armSpan > shoulderDist * 1.5;

      // Legs wide if visible
      const legsWide = (!la || !ra || Math.abs(la.x - ra.x) > shoulderDist * 1.1) &&
                       (!lk || !rk || Math.abs(lk.x - rk.x) > shoulderDist * 1.05);

      if (leftHoriz && rightHoriz && armsWide && legsWide) {
        return {
          isMatch: true,
          feedback: 'COWABUNGA! Surfing the big wave with balance! 🏄'
        };
      }

      return {
        isMatch: false,
        feedback: 'Legs wide, stretch arms out to ride the wave! 🏄'
      };
    }
  }
];

/**
 * ============================================================
 * FRUIT YOGA POSES (Shape Themes, 5-Second Hold Mode)
 * Each fruit displays image/emoji, the word, voiceover & related yoga pose!
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
      const lw = lm[LANDMARKS.LEFT_WRIST];
      const rw = lm[LANDMARKS.RIGHT_WRIST];
      const nose = lm[LANDMARKS.NOSE];

      if (!lw || !rw || !ls || !rs || !nose) {
        return { isMatch: false, feedback: 'Step into view to show your Banana pose! 🍌' };
      }

      // Both hands raised high
      const armsUp = lw.y < ls.y - 0.06 && rw.y < rs.y - 0.06;
      // Sideways curve: wrists shifted noticeably to either left or right of shoulder center
      const shoulderCenter = (ls.x + rs.x) / 2;
      const wristCenter = (lw.x + rw.x) / 2;
      const isCurved = Math.abs(wristCenter - shoulderCenter) > 0.04;

      if (armsUp && isCurved) {
        return {
          isMatch: true,
          feedback: 'DELICIOUS BANANA CURVE! Hold steady for 5 seconds! 🍌'
        };
      }

      if (armsUp && !isCurved) {
        return {
          isMatch: false,
          feedback: 'Lean your arms and body to one side like a curved banana! 🍌'
        };
      }

      return {
        isMatch: false,
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
      const lw = lm[LANDMARKS.LEFT_WRIST];
      const rw = lm[LANDMARKS.RIGHT_WRIST];
      const la = lm[LANDMARKS.LEFT_ANKLE];
      const ra = lm[LANDMARKS.RIGHT_ANKLE];

      if (!lw || !rw || !ls || !rs) return { isMatch: false, feedback: 'Step into view!' };

      const shoulderDist = Math.abs(ls.x - rs.x);
      // Arms high and wide in a star V
      const armsHigh = lw.y < ls.y - 0.06 && rw.y < rs.y - 0.06;
      const armsWide = lw.x < ls.x - 0.06 && rw.x > rs.x + 0.06;
      // Legs wide if visible
      const legsWide = !la || !ra || Math.abs(la.x - ra.x) > shoulderDist * 1.2 || (la.visibility || 1) < 0.4;

      if (armsHigh && armsWide && legsWide) {
        return {
          isMatch: true,
          feedback: 'SHINING STARFRUIT! Glowing bright like a star! ⭐'
        };
      }

      return {
        isMatch: false,
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
      const nose = lm[LANDMARKS.NOSE];
      const lh = lm[LANDMARKS.LEFT_HIP];

      if (!ls || !rs || !nose) return { isMatch: false, feedback: 'Step into view!' };

      // Child's pose: tucked down low and small
      const isLow = nose.y > 0.32 || ls.y > 0.38;
      const isCompact = Math.abs(ls.y - (lh ? lh.y : 0.7)) < 0.35 || nose.y > 0.38;
      const handsTucked = !lw || !rw || (lw.y > ls.y - 0.08 && rw.y > rs.y - 0.08);

      if (isLow && isCompact && handsTucked) {
        return {
          isMatch: true,
          feedback: 'SWEET ROUND APPLE! Cozy and tucked in small! 🍎'
        };
      }

      return {
        isMatch: false,
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
      const nose = lm[LANDMARKS.NOSE];

      if (!ls || !rs || !nose) return { isMatch: false, feedback: 'Step into view!' };

      const isSeatedOrLow = nose.y > 0.28 || ls.y > 0.36;
      const shoulderDist = Math.abs(ls.x - rs.x);
      
      // Legs wide apart on the ground
      const legsWide = (la && ra && Math.abs(la.x - ra.x) > 0.35) ||
                       (lk && rk && Math.abs(lk.x - rk.x) > 0.30);
      // Or arms stretched wide down low towards feet
      const armsWideLow = lw && rw && Math.abs(lw.x - rw.x) > shoulderDist * 1.4 && lw.y > ls.y;

      if (isSeatedOrLow && (legsWide || armsWideLow)) {
        return {
          isMatch: true,
          feedback: 'BIG WATERMELON SLICE! Wide stretch held strong! 🍉'
        };
      }

      return {
        isMatch: false,
        feedback: 'Sit down and stretch your legs wide apart! 🍉'
      };
    }
  }
];

/**
 * ============================================================
 * VEGETABLE YOGA POSES (5-Second Hold Mode)
 * Each vegetable displays image/emoji, the word, voiceover & related yoga pose!
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
      const lw = lm[LANDMARKS.LEFT_WRIST];
      const rw = lm[LANDMARKS.RIGHT_WRIST];
      const nose = lm[LANDMARKS.NOSE];

      if (!lw || !rw || !ls || !rs || !nose) {
        return { isMatch: false, feedback: 'Step into view to show your Carrot pose!' };
      }

      // Hands pointed straight up above nose and close together
      const handsHigh = lw.y < nose.y && rw.y < nose.y;
      const handsTogether = Math.hypot(lw.x - rw.x, lw.y - rw.y) < 0.16;

      if (handsHigh && handsTogether) {
        return {
          isMatch: true,
          feedback: 'CRUNCHY CARROT LOCKED! Hold steady for 5 seconds! 🥕'
        };
      }

      return {
        isMatch: false,
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
      const lw = lm[LANDMARKS.LEFT_WRIST];
      const rw = lm[LANDMARKS.RIGHT_WRIST];
      const le = lm[LANDMARKS.LEFT_ELBOW];
      const re = lm[LANDMARKS.RIGHT_ELBOW];

      if (!lw || !rw || !ls || !rs || !le || !re) return { isMatch: false, feedback: 'Show your arms in the mirror!' };

      const leftElbowLevel = Math.abs(le.y - ls.y) < 0.18;
      const rightElbowLevel = Math.abs(re.y - rs.y) < 0.18;
      const leftForearmUp = lw.y < le.y - 0.08;
      const rightForearmUp = rw.y < re.y - 0.08;

      if (leftElbowLevel && rightElbowLevel && leftForearmUp && rightForearmUp) {
        return {
          isMatch: true,
          feedback: 'MIGHTY BROCCOLI CROWNS! Hold frozen! 🥦'
        };
      }

      return {
        isMatch: false,
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
      const lw = lm[LANDMARKS.LEFT_WRIST];
      const rw = lm[LANDMARKS.RIGHT_WRIST];

      if (!lw || !rw || !ls || !rs) return { isMatch: false, feedback: 'Step into view!' };

      const leftUp = lw.y < ls.y - 0.08;
      const rightDown = rw.y > rs.y + 0.10;
      const rightUp = rw.y < rs.y - 0.08;
      const leftDown = lw.y > ls.y + 0.10;

      if ((leftUp && rightDown) || (rightUp && leftDown)) {
        return {
          isMatch: true,
          feedback: 'TALL GOLDEN CORNSTALK! Hold frozen! 🌽'
        };
      }

      return {
        isMatch: false,
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
      const lw = lm[LANDMARKS.LEFT_WRIST];
      const rw = lm[LANDMARKS.RIGHT_WRIST];

      if (!lw || !rw || !ls || !rs) return { isMatch: false, feedback: 'Step into view!' };

      // Wrists near chest (below shoulders, above hips) and close together
      const chestLevel = lw.y > ls.y && rw.y > rs.y && lw.y < ls.y + 0.35 && rw.y < rs.y + 0.35;
      const handsTogether = Math.hypot(lw.x - rw.x, lw.y - rw.y) < 0.16;

      if (chestLevel && handsTogether) {
        return {
          isMatch: true,
          feedback: 'COZY PEA POD! Stay peaceful and frozen! 🫛'
        };
      }

      return {
        isMatch: false,
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
      const lw = lm[LANDMARKS.LEFT_WRIST];
      const rw = lm[LANDMARKS.RIGHT_WRIST];
      const le = lm[LANDMARKS.LEFT_ELBOW];
      const re = lm[LANDMARKS.RIGHT_ELBOW];

      if (!lw || !rw || !ls || !rs || !le || !re) return { isMatch: false, feedback: 'Step into view!' };

      // Elbows out wide, wrists in front of chest
      const elbowsWide = Math.abs(le.x - re.x) > Math.abs(ls.x - rs.x) * 1.3;
      const wristsNearCenter = Math.abs(lw.x - rw.x) < 0.35 && lw.y > ls.y - 0.05 && rw.y > rs.y - 0.05;

      if (elbowsWide && wristsNearCenter) {
        return {
          isMatch: true,
          feedback: 'ROUND PUMPKIN POWER! Hold it for 5 seconds! 🎃'
        };
      }

      return {
        isMatch: false,
        feedback: 'Round your arms in front like holding a giant pumpkin! 🎃'
      };
    }
  }
];
