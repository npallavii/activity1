/**
 * Main Application Logic for 'Frolic Forest' Active Kids App
 * Modes:
 * 1. Freeze Dance: Continuous 3-phase loop (JUMP! ➔ 3, 2, 1 ➔ FREEZE! 3s hold)
 * 2. Fruit Yoga: Picture + Word + Voiceover + 5s hold pose
 * 3. Vegetable Yoga: Picture + Word + Voiceover + 5s hold pose
 * 4. Shoot the Pots:
 *    - Age 4-5: 3-5 pots swipe smash ➔ auto-spell phonetics & word ➔ 10 coins
 *    - Age 6-8: 3-5 pots swipe smash ➔ letters scatter ➔ hand grab & drag to drop zone in spelling order ➔ 10 coins
 */
import { POSES, FRUIT_POSES, VEGETABLE_POSES, LANDMARKS } from './poses.js';
import { soundEngine } from './audio.js';
import { voiceEngine } from './voice.js';
import { PoseTracker } from './poseDetector.js';

export const GAME_MODES = {
  FREEZE_DANCE: 'FREEZE_DANCE',
  FRUIT_YOGA: 'FRUIT_YOGA',
  VEGETABLE_YOGA: 'VEGETABLE_YOGA',
  SHOOT_THE_POTS: 'SHOOT_THE_POTS'
};

export const AGE_GROUPS = {
  AGE_4_5: 'AGE_4_5',
  AGE_6_8: 'AGE_6_8'
};

export const AGE_4_5_WORDS = [
  { word: 'CAT', emoji: '🐱', clue: 'A furry pet that purrs and meows!' },
  { word: 'SUN', emoji: '☀️', clue: 'Shines bright and warm in the sky!' },
  { word: 'DOG', emoji: '🐶', clue: 'A playful loyal friend that barks!' },
  { word: 'FOX', emoji: '🦊', clue: 'A quick clever forest animal!' },
  { word: 'BAT', emoji: '🦇', clue: 'Flies through the forest at night!' },
  { word: 'PIG', emoji: '🐷', clue: 'A cute pink animal that oinks!' },
  { word: 'BEE', emoji: '🐝', clue: 'Buzzes around colorful flowers!' },
  { word: 'OWL', emoji: '🦉', clue: 'Wise bird that hoots at the moon!' },
  { word: 'FROG', emoji: '🐸', clue: 'Hops high and says ribbit!' },
  { word: 'DUCK', emoji: '🦆', clue: 'Quacks and floats on the pond!' },
  { word: 'BIRD', emoji: '🐦', clue: 'Has wings and sings sweet songs!' },
  { word: 'APPLE', emoji: '🍎', clue: 'Sweet, juicy and crunchy fruit!' },
];

export const AGE_6_8_WORDS = [
  { word: 'APPLE', emoji: '🍎', clue: 'Sweet, crunchy red or green fruit!' },
  { word: 'TIGER', emoji: '🐯', clue: 'Striped jungle cat with a mighty roar!' },
  { word: 'PLANT', emoji: '🌱', clue: 'Grows green leaves towards the sunlight!' },
  { word: 'WATER', emoji: '💧', clue: 'Clear, cool, and essential for all life!' },
  { word: 'PANDA', emoji: '🐼', clue: 'Gentle black and white bamboo lover!' },
  { word: 'HORSE', emoji: '🐴', clue: 'Gallops swiftly across the meadows!' },
  { word: 'FROG', emoji: '🐸', clue: 'Hops between lily pads in the pond!' },
  { word: 'BEAR', emoji: '🐻', clue: 'Strong forest friend that loves sweet honey!' },
  { word: 'LION', emoji: '🦁', clue: 'Proud majestic king of the animal kingdom!' },
  { word: 'ZEBRA', emoji: '🦓', clue: 'Striking black and white striped friend!' },
];

export const PHASES = {
  IDLE: 'IDLE',
  ACTION: 'ACTION',           // 5 seconds of jumping / dancing
  COUNTDOWN: 'COUNTDOWN',     // 3 seconds: 3, 2, 1
  FREEZE: 'FREEZE',           // Must hold target yoga pose for 3s (Freeze Dance) or 5s (Fruit/Veg Yoga)
  CELEBRATION: 'CELEBRATION'  // Win reward + auto restart
};

class FreezeDanceGame {
  constructor() {
    this.gameMode = GAME_MODES.FREEZE_DANCE;
    this.currentPosesList = POSES;
    this.currentPhase = PHASES.IDLE;
    this.currentPoseIndex = 0;
    this.energyCoins = parseInt(localStorage.getItem('energyCoins') || '0', 10);

    // Activity 2: Shoot The Pots state
    this.potsAgeGroup = AGE_GROUPS.AGE_4_5; // Default Age 4-5
    this.currentPotWords = AGE_4_5_WORDS;
    this.potWordIndex = 0;
    this.potsBrokenCount = 0;
    this.potsSolvedCount = parseInt(localStorage.getItem('potsSolvedCount') || '0', 10);
    this.potsState = [];
    this.potsLocked = false;
    this.potsNewRoundTimer = null;

    // Age 6-8 Grab & Drag state
    this.grabbedLetter = null; // { element, letter, letterId }
    this.nextDropSlotIndex = 0; // Current slot awaiting letter in spelling order
    this.scatteredLetters = []; // List of scattered letter DOM elements
    
    // Phase timers
    this.actionDuration = 5.0; // 5 seconds
    this.countdownDuration = 3.0; // 3 seconds
    this.holdDurationRequired = 3.0; // 3 seconds freeze hold (5s for Fruit & Veg Yoga)
    
    this.phaseTimeRemaining = 0.0;
    this.currentHoldTime = 0.0;
    this.lastFrameTime = performance.now();
    this.lastCountdownInteger = null;
    this.lastSecondTicked = 0;
    
    // Jump Tracking in Action Phase
    this.jumpCount = 0;
    this.lastShoulderY = null;
    this.jumpCooldown = false;

    // Simulation & states
    this.isSimulating = false;
    this.soundMuted = false;
    this.isGameRunning = false;
    this.autoRestartTimer = null;

    // Cache DOM Elements
    this.dom = {
      // Header
      gameLoopToggleBtn: document.getElementById('game-loop-toggle-btn'),
      gameLoopIcon: document.getElementById('game-loop-icon'),
      gameLoopText: document.getElementById('game-loop-text'),
      muteBtn: document.getElementById('mute-btn'),
      muteIcon: document.getElementById('mute-icon'),
      coinCount: document.getElementById('coin-count'),
      coinCounterBadge: document.getElementById('coin-counter-badge'),

      // Sub-Menu & Activity Mode Switcher
      modeSelectionModal: document.getElementById('mode-selection-modal'),
      openModeMenuBtn: document.getElementById('open-mode-menu-btn'),
      btnModeFreeze: document.getElementById('btn-mode-freeze'),
      btnModeFruit: document.getElementById('btn-mode-fruit'),
      btnModeVeg: document.getElementById('btn-mode-veg'),
      btnModePots: document.getElementById('btn-mode-pots'),
      currentModeBadge: document.getElementById('current-mode-badge'),

      // Age Selection Modal (Activity 2: Shoot the Pots)
      ageSelectionModal: document.getElementById('age-selection-modal'),
      btnAge45: document.getElementById('btn-age-4-5'),
      btnAge68: document.getElementById('btn-age-6-8'),
      btnAgeBack: document.getElementById('btn-age-back'),

      // 3-Phase Tabs (Freeze Dance HUD)
      phaseHudContainer: document.getElementById('phase-hud-container'),
      tabAction: document.getElementById('phase-tab-action'),
      tabCountdown: document.getElementById('phase-tab-countdown'),
      tabFreeze: document.getElementById('phase-tab-freeze'),

      // Yoga Quest HUD (Fruit Yoga & Vegetable Yoga)
      yogaQuestHud: document.getElementById('yoga-quest-hud'),
      yogaQuestIcon: document.getElementById('yoga-quest-icon'),
      yogaQuestTitle: document.getElementById('yoga-quest-title'),
      yogaQuestSubtitle: document.getElementById('yoga-quest-subtitle'),

      // Shoot the Pots Quest HUD (Activity 2)
      potsQuestHud: document.getElementById('pots-quest-hud'),
      potsWordClueBadge: document.getElementById('pots-word-clue-badge'),
      potsInstructionsText: document.getElementById('pots-instructions-text'),
      potsBrokenCounter: document.getElementById('pots-broken-counter'),

      // Left Card: Pose View vs Pots View
      targetPoseCard: document.getElementById('target-pose-card'),
      poseModeView: document.getElementById('pose-mode-view'),
      potsModeView: document.getElementById('pots-mode-view'),
      potsLevelBadge: document.getElementById('pots-level-badge'),
      potsCardEmoji: document.getElementById('pots-card-emoji'),
      potsCardTitle: document.getElementById('pots-card-title'),
      potsCardInstruction: document.getElementById('pots-card-instruction'),
      potsProgressText: document.getElementById('pots-progress-text'),
      potsSlotsContainer: document.getElementById('pots-slots-container'),
      potsClueIcon: document.getElementById('pots-clue-icon'),
      potsClueText: document.getElementById('pots-clue-text'),
      potsProTip: document.getElementById('pots-pro-tip'),
      prevPotWordBtn: document.getElementById('prev-pot-word-btn'),
      nextPotWordBtn: document.getElementById('next-pot-word-btn'),
      potsSolvedCounter: document.getElementById('pots-solved-counter'),

      // Left Card: Pose elements
      itemWordBanner: document.getElementById('item-word-banner'),
      itemPictureEmoji: document.getElementById('item-picture-emoji'),
      itemTypeLabel: document.getElementById('item-type-label'),
      itemWordText: document.getElementById('item-word-text'),
      targetCardSubtitle: document.getElementById('target-card-subtitle'),
      poseName: document.getElementById('pose-name'),
      poseEmoji: document.getElementById('pose-emoji'),
      poseBadge: document.getElementById('pose-badge'),
      poseHint: document.getElementById('pose-hint'),
      poseDescription: document.getElementById('pose-description'),
      poseSvgContainer: document.getElementById('pose-svg-container'),
      prevPoseBtn: document.getElementById('prev-pose-btn'),
      nextPoseBtn: document.getElementById('next-pose-btn'),
      poseDots: document.getElementById('pose-dots'),

      // Right Card: Mirror & Overlays
      webcamVideo: document.getElementById('webcam-video'),
      overlayCanvas: document.getElementById('overlay-canvas'),
      cameraContainer: document.getElementById('camera-container'),
      cameraPlaceholder: document.getElementById('camera-placeholder'),
      startCameraBtn: document.getElementById('start-camera-btn'),
      toggleCameraBtn: document.getElementById('toggle-camera-btn'),
      skipPhaseBtn: document.getElementById('skip-phase-btn'),
      simulateBtn: document.getElementById('simulate-btn'),
      statusBadge: document.getElementById('status-badge'),
      statusText: document.getElementById('status-text'),
      feedbackBanner: document.getElementById('feedback-banner'),
      feedbackText: document.getElementById('feedback-text'),

      // Phase 1 Overlay (JUMP!)
      actionOverlay: document.getElementById('action-overlay'),
      actionCountdownText: document.getElementById('action-countdown-text'),
      actionProgressBar: document.getElementById('action-progress-bar'),
      jumpCountBadge: document.getElementById('jump-count-badge'),

      // Phase 2 Overlay (3, 2, 1)
      countdownOverlay: document.getElementById('countdown-overlay'),
      countdownNumber: document.getElementById('countdown-number'),
      countdownPoseTeaser: document.getElementById('countdown-pose-teaser'),

      // Phase 3 Overlay (FREEZE!)
      freezeOverlay: document.getElementById('freeze-overlay'),
      freezePromptText: document.getElementById('freeze-prompt-text'),
      holdCountdownText: document.getElementById('hold-countdown-text'),
      holdProgressRing: document.getElementById('hold-progress-ring'),
      holdProgressBar: document.getElementById('hold-progress-bar'),

      // Activity 2: Shoot The Pots Overlay & Pots Elements
      potsGameOverlay: document.getElementById('pots-game-overlay'),
      potsShardsContainer: document.getElementById('pots-shards-container'),
      potsOverlayBannerText: document.getElementById('pots-overlay-banner-text'),
      leftHandTracker: document.getElementById('left-hand-tracker'),
      rightHandTracker: document.getElementById('right-hand-tracker'),
      potsStage: document.getElementById('pots-stage'),
      scatteredLettersContainer: document.getElementById('scattered-letters-container'),
      potsDropZone: document.getElementById('pots-drop-zone'),
      snappedWordBanner: document.getElementById('snapped-word-banner'),
      snappedWordLetters: document.getElementById('snapped-word-letters'),
      snappedWordEmoji: document.getElementById('snapped-word-emoji'),
      snappedWordLabel: document.getElementById('snapped-word-label'),

      // Celebration Modal
      celebrationModal: document.getElementById('celebration-modal'),
      celebrationTitle: document.getElementById('celebration-title'),
      celebrationSub: document.getElementById('celebration-sub'),
      celebrationCoins: document.getElementById('celebration-coins'),
      autoRestartCountdown: document.getElementById('auto-restart-countdown'),
      nextRoundBtn: document.getElementById('next-round-btn'),
      screenFlash: document.getElementById('screen-flash'),

      // Initial Start Screen Modal & Big Colorful Start Button
      initialStartModal: document.getElementById('initial-start-modal'),
      initialStartBtn: document.getElementById('initial-start-btn'),
    };

    this.init();
  }

  async init() {
    this.updateCoinDisplay();
    this.renderPoseDots();
    this.loadPose(0); // Starts on initial pose
    this.setupEventListeners();

    // Initialize Pose Tracker (does NOT start camera until user clicks Start Game)
    this.tracker = new PoseTracker({
      videoElement: this.dom.webcamVideo,
      canvasElement: this.dom.overlayCanvas,
      onLandmarks: (landmarks) => this.onPoseLandmarks(landmarks),
      onStatusChange: (status) => this.onTrackerStatus(status),
    });

    try {
      await this.tracker.initMediaPipe();
    } catch (err) {
      console.warn('Initial MediaPipe setup warning:', err);
    }

    // Start background game loop ticker for smooth timer interpolation
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  setupEventListeners() {
    // Initial Start Game button (Autoplay fix)
    if (this.dom.initialStartBtn) {
      this.dom.initialStartBtn.addEventListener('click', () => this.onUserStartGame());
    }

    // Camera buttons
    this.dom.startCameraBtn.addEventListener('click', () => this.startCamera());
    this.dom.toggleCameraBtn.addEventListener('click', () => this.toggleCamera());

    // Game loop toggle & sound mute
    this.dom.gameLoopToggleBtn.addEventListener('click', () => this.toggleGameLoop());
    this.dom.muteBtn.addEventListener('click', () => {
      const isMuted = soundEngine.toggleMute();
      this.dom.muteIcon.textContent = isMuted ? '🔇' : '🔊';
      this.dom.muteBtn.title = isMuted ? 'Unmute' : 'Mute';
    });

    // Pose navigation buttons
    this.dom.nextPoseBtn.addEventListener('click', () => this.nextPose());
    this.dom.prevPoseBtn.addEventListener('click', () => this.previousPose());

    // Simulator button
    this.dom.simulateBtn.addEventListener('click', () => this.toggleSimulation());

    // Skip phase button
    this.dom.skipPhaseBtn.addEventListener('click', () => this.skipPhase());

    // Sub-Menu Activity buttons
    if (this.dom.openModeMenuBtn) {
      this.dom.openModeMenuBtn.addEventListener('click', () => this.openModeSelectionModal());
    }
    if (this.dom.btnModeFreeze) {
      this.dom.btnModeFreeze.addEventListener('click', () => this.selectMode(GAME_MODES.FREEZE_DANCE));
    }
    if (this.dom.btnModeFruit) {
      this.dom.btnModeFruit.addEventListener('click', () => this.selectMode(GAME_MODES.FRUIT_YOGA));
    }
    if (this.dom.btnModeVeg) {
      this.dom.btnModeVeg.addEventListener('click', () => this.selectMode(GAME_MODES.VEGETABLE_YOGA));
    }
    if (this.dom.btnModePots) {
      this.dom.btnModePots.addEventListener('click', () => this.openAgeSelectionModal());
    }

    // Age Selection Modal buttons
    if (this.dom.btnAge45) {
      this.dom.btnAge45.addEventListener('click', () => this.selectPotsAgeGroup(AGE_GROUPS.AGE_4_5));
    }
    if (this.dom.btnAge68) {
      this.dom.btnAge68.addEventListener('click', () => this.selectPotsAgeGroup(AGE_GROUPS.AGE_6_8));
    }
    if (this.dom.btnAgeBack) {
      this.dom.btnAgeBack.addEventListener('click', () => this.closeAgeSelectionModalAndReopenMenu());
    }

    // Pots navigation buttons
    if (this.dom.prevPotWordBtn) {
      this.dom.prevPotWordBtn.addEventListener('click', () => this.prevPotWord());
    }
    if (this.dom.nextPotWordBtn) {
      this.dom.nextPotWordBtn.addEventListener('click', () => this.nextPotWord());
    }

    // Celebration modal instant restart button
    this.dom.nextRoundBtn.addEventListener('click', () => {
      this.closeCelebration();
      if (this.gameMode === GAME_MODES.FREEZE_DANCE) {
        this.nextPose();
        this.startActionPhase();
      } else if (this.gameMode === GAME_MODES.SHOOT_THE_POTS) {
        this.nextPotWord();
      } else {
        this.nextPose();
        this.startYogaPose();
      }
    });
  }

  /**
   * After user clicks 'Start Game', unlock audio/camera and show the Activity Sub-Menu!
   */
  async onUserStartGame() {
    // 1. Hide initial start modal with smooth fade
    if (this.dom.initialStartModal) {
      this.dom.initialStartModal.classList.add('opacity-0', 'pointer-events-none');
      setTimeout(() => {
        this.dom.initialStartModal.classList.add('hidden');
      }, 500);
    }

    // 2. Unlock Web Audio & Web Speech synthesis from user gesture
    soundEngine.init();
    voiceEngine.initVoices();

    // 3. Play looping background music
    soundEngine.playBgMusic();

    // 4. Start camera tracking
    try {
      await this.startCamera();
    } catch (e) {
      console.warn('Camera startup warning:', e);
    }

    // 5. Open Sub-Menu
    this.openModeSelectionModal();
  }

  openModeSelectionModal() {
    this.closeAgeSelectionModal();
    if (this.dom.modeSelectionModal) {
      this.dom.modeSelectionModal.classList.remove('hidden');
    }
  }

  closeModeSelectionModal() {
    if (this.dom.modeSelectionModal) {
      this.dom.modeSelectionModal.classList.add('hidden');
    }
  }

  openAgeSelectionModal() {
    this.closeModeSelectionModal();
    if (this.dom.ageSelectionModal) {
      this.dom.ageSelectionModal.classList.remove('hidden');
    }
  }

  closeAgeSelectionModal() {
    if (this.dom.ageSelectionModal) {
      this.dom.ageSelectionModal.classList.add('hidden');
    }
  }

  closeAgeSelectionModalAndReopenMenu() {
    this.closeAgeSelectionModal();
    this.openModeSelectionModal();
  }

  selectPotsAgeGroup(ageGroup) {
    this.closeAgeSelectionModal();
    this.potsAgeGroup = ageGroup;
    this.currentPotWords = ageGroup === AGE_GROUPS.AGE_6_8 ? AGE_6_8_WORDS : AGE_4_5_WORDS;
    this.potWordIndex = 0;
    this.selectMode(GAME_MODES.SHOOT_THE_POTS);
  }

  /**
   * Switches game mode when user clicks an activity
   */
  selectMode(mode) {
    this.closeModeSelectionModal();
    this.closeAgeSelectionModal();
    this.closeCelebration();
    this.gameMode = mode;

    // Reset common timers & states
    if (this.potsNewRoundTimer) {
      clearTimeout(this.potsNewRoundTimer);
      this.potsNewRoundTimer = null;
    }
    this.potsLocked = false;
    soundEngine.stopDanceBeat();

    if (mode === GAME_MODES.FREEZE_DANCE) {
      this.currentPosesList = POSES;
      this.holdDurationRequired = 3.0; // 3 seconds freeze hold
      this.currentPoseIndex = 0;

      // Update Header Badge
      this.dom.currentModeBadge.textContent = 'Freeze Dance 🎵';
      this.dom.currentModeBadge.className = 'text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200';

      // Show Freeze Dance HUD, hide others
      this.dom.phaseHudContainer.classList.remove('hidden');
      this.dom.yogaQuestHud.classList.add('hidden');
      this.dom.potsQuestHud.classList.add('hidden');
      this.dom.itemWordBanner.classList.add('hidden');

      // Left Card: Pose View
      this.dom.poseModeView.classList.remove('hidden');
      this.dom.potsModeView.classList.add('hidden');

      // Right Card: Hide Pots Overlay
      this.dom.potsGameOverlay.classList.add('hidden');

      this.dom.simulateBtn.innerHTML = '<span>✨</span> Simulate Freeze Pose';

      soundEngine.pausePotsBgMusic();
      this.renderPoseDots();
      this.loadPose(0);
      this.startGameLoop();
    } else if (mode === GAME_MODES.FRUIT_YOGA) {
      this.currentPosesList = FRUIT_POSES;
      this.holdDurationRequired = 5.0; // 5 seconds yoga hold
      this.currentPoseIndex = 0;

      this.dom.currentModeBadge.textContent = 'Fruit Yoga 🍎';
      this.dom.currentModeBadge.className = 'text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200';

      this.dom.phaseHudContainer.classList.add('hidden');
      this.dom.potsQuestHud.classList.add('hidden');
      this.dom.yogaQuestHud.classList.remove('hidden');
      this.dom.yogaQuestIcon.textContent = '🍎';
      this.dom.yogaQuestTitle.textContent = 'Fruit Yoga Adventure';
      this.dom.yogaQuestSubtitle.textContent = 'Hold the fruit pose for 5 seconds to earn Energy Coins!';
      this.dom.itemWordBanner.classList.remove('hidden');

      this.dom.poseModeView.classList.remove('hidden');
      this.dom.potsModeView.classList.add('hidden');
      this.dom.potsGameOverlay.classList.add('hidden');

      this.dom.simulateBtn.innerHTML = '<span>✨</span> Simulate Freeze Pose';

      soundEngine.pausePotsBgMusic();
      this.renderPoseDots();
      this.loadPose(0);
      this.startYogaMode();
    } else if (mode === GAME_MODES.VEGETABLE_YOGA) {
      this.currentPosesList = VEGETABLE_POSES;
      this.holdDurationRequired = 5.0; // 5 seconds yoga hold
      this.currentPoseIndex = 0;

      this.dom.currentModeBadge.textContent = 'Vegetable Yoga 🥕';
      this.dom.currentModeBadge.className = 'text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200';

      this.dom.phaseHudContainer.classList.add('hidden');
      this.dom.potsQuestHud.classList.add('hidden');
      this.dom.yogaQuestHud.classList.remove('hidden');
      this.dom.yogaQuestIcon.textContent = '🥕';
      this.dom.yogaQuestTitle.textContent = 'Vegetable Yoga Adventure';
      this.dom.yogaQuestSubtitle.textContent = 'Hold the veggie pose for 5 seconds to earn Energy Coins!';
      this.dom.itemWordBanner.classList.remove('hidden');

      this.dom.poseModeView.classList.remove('hidden');
      this.dom.potsModeView.classList.add('hidden');
      this.dom.potsGameOverlay.classList.add('hidden');

      this.dom.simulateBtn.innerHTML = '<span>✨</span> Simulate Freeze Pose';

      soundEngine.pausePotsBgMusic();
      this.renderPoseDots();
      this.loadPose(0);
      this.startYogaMode();
    } else if (mode === GAME_MODES.SHOOT_THE_POTS) {
      const ageLabel = this.potsAgeGroup === AGE_GROUPS.AGE_6_8 ? 'Age 6-8' : 'Age 4-5';
      this.dom.currentModeBadge.textContent = `Shoot Pots 🏺 (${ageLabel})`;
      this.dom.currentModeBadge.className = 'text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-50 text-orange-900 border border-orange-200';

      this.dom.phaseHudContainer.classList.add('hidden');
      this.dom.yogaQuestHud.classList.add('hidden');
      this.dom.potsQuestHud.classList.remove('hidden');

      this.dom.poseModeView.classList.add('hidden');
      this.dom.potsModeView.classList.remove('hidden');

      this.hideAllOverlays();
      this.dom.potsGameOverlay.classList.remove('hidden');

      this.dom.simulateBtn.innerHTML = '<span>💥</span> Smash Next Pot';
      this.dom.gameLoopIcon.textContent = '⏸️';
      this.dom.gameLoopText.textContent = 'Pause Game';

      this.startShootThePotsMode();
    }
  }

  /**
   * ============================================================
   * ACTIVITY 2: SHOOT THE POTS MODE
   * ============================================================
   */
  startShootThePotsMode() {
    soundEngine.init();
    voiceEngine.initVoices();
    soundEngine.playPotsBgMusic();
    this.isGameRunning = true;
    this.currentPhase = PHASES.IDLE;

    if (!this.tracker.isRunning && !this.isSimulating) {
      this.startCamera();
    }

    if (this.potsAgeGroup === AGE_GROUPS.AGE_6_8) {
      this.dom.statusText.textContent = 'Shoot The Pots (Age 6-8): Break pots, then grab & drag letters to spell!';
      this.dom.feedbackText.textContent = 'Swipe to break pots, then hover hand over letters to drag them into slots!';
      if (this.dom.potsInstructionsText) {
        this.dom.potsInstructionsText.textContent = 'Swipe to break pots, then grab & drag letters into the drop slots in spelling order!';
      }
      if (this.dom.potsProTip) {
        this.dom.potsProTip.innerHTML = '<strong>Pro Tip:</strong> Break pots to scatter letters! Hover your hand over a letter to grab it and drag it into the bottom slots!';
      }
      voiceEngine.speak('Shoot the Pots! Swipe to smash the pots, then grab and drag the letters into the slots in order!', { pitch: 1.4, rate: 1.05, volume: 1.0 });
    } else {
      this.dom.statusText.textContent = 'Shoot The Pots (Age 4-5): Swipe hands to break pots and auto-spell!';
      this.dom.feedbackText.textContent = 'Swipe your hands across the screen to smash the pots!';
      if (this.dom.potsInstructionsText) {
        this.dom.potsInstructionsText.textContent = 'Swipe your hands in the air across each terracotta pot to break it!';
      }
      if (this.dom.potsProTip) {
        this.dom.potsProTip.innerHTML = '<strong>Pro Tip:</strong> Stand back so your camera sees both hands swiping across the pots!';
      }
      voiceEngine.speak('Shoot the Pots! Swipe your hands to smash the pots and spell the mystery word!', { pitch: 1.4, rate: 1.05, volume: 1.0 });
    }

    this.loadPotWord(this.potWordIndex);
  }

  loadPotWord(index) {
    this.potWordIndex = (index + this.currentPotWords.length) % this.currentPotWords.length;
    const currentItem = this.currentPotWords[this.potWordIndex];
    const word = currentItem.word.toUpperCase();
    const letters = word.split('');
    const numLetters = letters.length;

    this.potsState = new Array(numLetters).fill(false);
    this.potsBrokenCount = 0;
    this.potsLocked = false;
    this.grabbedLetter = null;
    this.nextDropSlotIndex = 0;
    this.scatteredLetters = [];

    if (this.potsNewRoundTimer) {
      clearTimeout(this.potsNewRoundTimer);
      this.potsNewRoundTimer = null;
    }

    // Hide center snapped banner & clear shards
    if (this.dom.snappedWordBanner) {
      this.dom.snappedWordBanner.classList.add('hidden');
    }
    if (this.dom.potsShardsContainer) {
      this.dom.potsShardsContainer.innerHTML = '';
    }

    // Update Top HUD
    if (this.dom.potsWordClueBadge) {
      this.dom.potsWordClueBadge.textContent = `Word ${this.potWordIndex + 1}: ${currentItem.emoji} ${currentItem.word}`;
    }
    if (this.dom.potsBrokenCounter) {
      this.dom.potsBrokenCounter.textContent = `0 / ${numLetters} Pots Broken`;
    }

    // Update Left Card
    if (this.dom.potsLevelBadge) {
      this.dom.potsLevelBadge.textContent = `Word ${this.potWordIndex + 1} of ${this.currentPotWords.length}`;
    }
    if (this.dom.potsProgressText) {
      this.dom.potsProgressText.textContent = `0 of ${numLetters} Letters Found`;
    }
    if (this.dom.potsClueIcon) {
      this.dom.potsClueIcon.textContent = currentItem.emoji;
    }
    if (this.dom.potsClueText) {
      this.dom.potsClueText.textContent = currentItem.clue;
    }
    if (this.dom.potsSolvedCounter) {
      this.dom.potsSolvedCounter.textContent = `${this.potsSolvedCount} Solved`;
    }

    // Render Left Card mystery letter slots dynamically (3-5 slots)
    if (this.dom.potsSlotsContainer) {
      this.dom.potsSlotsContainer.innerHTML = '';
      letters.forEach((_, i) => {
        const slot = document.createElement('div');
        slot.id = `letter-slot-${i}`;
        slot.className = 'w-16 h-20 sm:w-20 sm:h-24 rounded-2xl bg-white border-2 border-dashed border-orange-300 flex flex-col items-center justify-center transition-all duration-300 shadow-sm';
        slot.innerHTML = `
          <span class="slot-letter text-3xl sm:text-4xl font-black font-game text-stone-300">?</span>
          <span class="text-[9px] font-bold text-orange-800/60 uppercase">Letter ${i + 1}</span>
        `;
        this.dom.potsSlotsContainer.appendChild(slot);
      });
    }

    // Render Right Card dynamic terracotta pots on screen (3-5 pots)
    if (this.dom.potsStage) {
      this.dom.potsStage.innerHTML = '';
      letters.forEach((letter, i) => {
        const potContainer = document.createElement('div');
        potContainer.id = `pot-slot-${i}`;
        potContainer.className = 'pot-target-container relative flex flex-col items-center justify-center cursor-pointer group flex-1 max-w-[130px] px-1';
        potContainer.dataset.index = i;
        potContainer.dataset.letter = letter;

        // Natural, muted terracotta clay SVG
        potContainer.innerHTML = `
          <div id="pot-graphic-${i}" class="w-20 h-24 sm:w-24 sm:h-28 md:w-28 md:h-32 relative transition-all duration-300 animate-pot-hover group-hover:scale-105" style="animation-delay: -${(i * 0.7).toFixed(1)}s;">
            <svg viewBox="0 0 100 120" class="w-full h-full drop-shadow-[0_6px_12px_rgba(0,0,0,0.35)]">
              <defs>
                <linearGradient id="potGrad${i}" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#c86a4b"/>
                  <stop offset="45%" stop-color="#b85d3e"/>
                  <stop offset="100%" stop-color="#8f3d23"/>
                </linearGradient>
                <linearGradient id="potRim${i}" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#fb923c"/>
                  <stop offset="50%" stop-color="#fed7aa"/>
                  <stop offset="100%" stop-color="#c86a4b"/>
                </linearGradient>
              </defs>
              <ellipse cx="50" cy="16" rx="28" ry="7" fill="url(#potRim${i})" stroke="#fed7aa" stroke-width="2"/>
              <ellipse cx="50" cy="16" rx="20" ry="4" fill="#58210f"/>
              <path d="M28 16 Q30 30 22 45 Q12 65 14 90 Q15 106 50 106 Q85 106 86 90 Q88 65 78 45 Q70 30 72 16 Z" fill="url(#potGrad${i})" stroke="#fed7aa" stroke-width="2"/>
              <path d="M20 54 Q50 64 80 54" stroke="#fed7aa" stroke-width="2.5" fill="none" opacity="0.8"/>
              <path d="M16 74 Q50 86 84 74" stroke="#fed7aa" stroke-width="2.5" fill="none" opacity="0.85"/>
              <ellipse cx="36" cy="62" rx="5" ry="14" fill="#ffffff" opacity="0.22" transform="rotate(-15 36 62)"/>
            </svg>
            <span class="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-stone-900/80 text-[10px] font-black text-amber-200 uppercase tracking-wider shadow whitespace-nowrap">
              Pot ${i + 1}
            </span>
          </div>
          <!-- Revealed Letter for Age 4-5 -->
          <div id="pot-letter-${i}" class="hidden flex flex-col items-center justify-center animate-bounce-in">
            <div id="pot-letter-char-${i}" class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-md flex items-center justify-center text-3xl sm:text-4xl font-black font-game text-amber-950">
              ${letter}
            </div>
            <span class="mt-1 text-[11px] font-black text-amber-800">HIT! 💥</span>
          </div>
        `;

        potContainer.addEventListener('click', () => {
          if (this.gameMode === GAME_MODES.SHOOT_THE_POTS) {
            this.hitPot(i);
          }
        });

        this.dom.potsStage.appendChild(potContainer);
      });
    }

    // Configure Center Snapped Word Letters Container dynamically
    if (this.dom.snappedWordLetters) {
      this.dom.snappedWordLetters.innerHTML = '';
      letters.forEach((letter) => {
        const charEl = document.createElement('div');
        charEl.className = 'w-16 h-20 sm:w-20 sm:h-24 rounded-2xl bg-white border-2 border-amber-300 shadow-md flex items-center justify-center text-4xl sm:text-5xl font-black font-game text-amber-950';
        charEl.textContent = letter;
        this.dom.snappedWordLetters.appendChild(charEl);
      });
    }
    if (this.dom.snappedWordEmoji) {
      this.dom.snappedWordEmoji.textContent = currentItem.emoji;
    }
    if (this.dom.snappedWordLabel) {
      this.dom.snappedWordLabel.textContent = currentItem.word;
    }

    // Mode specific setup: Age 6-8 vs Age 4-5
    if (this.potsAgeGroup === AGE_GROUPS.AGE_6_8) {
      // Show Drop Zone & Scattered Container
      if (this.dom.potsDropZone) {
        this.dom.potsDropZone.innerHTML = '';
        this.dom.potsDropZone.classList.remove('hidden');

        letters.forEach((letter, i) => {
          const dropSlot = document.createElement('div');
          dropSlot.id = `drop-slot-${i}`;
          dropSlot.className = `drop-slot ${i === 0 ? 'is-active-target' : ''}`;
          dropSlot.dataset.slotIndex = i;
          dropSlot.dataset.expectedLetter = letter;
          dropSlot.innerHTML = `
            <span class="slot-char text-2xl font-black font-game text-teal-800/40">_</span>
            <span class="text-[9px] font-bold text-teal-900/60 uppercase">Slot ${i + 1}</span>
          `;
          this.dom.potsDropZone.appendChild(dropSlot);
        });
      }

      if (this.dom.scatteredLettersContainer) {
        this.dom.scatteredLettersContainer.innerHTML = '';
        this.dom.scatteredLettersContainer.classList.remove('hidden');
      }
    } else {
      // Age 4-5: Hide Drop Zone & Scattered Container
      if (this.dom.potsDropZone) {
        this.dom.potsDropZone.classList.add('hidden');
      }
      if (this.dom.scatteredLettersContainer) {
        this.dom.scatteredLettersContainer.classList.add('hidden');
      }
    }
  }

  nextPotWord() {
    this.loadPotWord(this.potWordIndex + 1);
  }

  prevPotWord() {
    this.loadPotWord(this.potWordIndex - 1);
  }

  /**
   * Smash pot at index
   */
  hitPot(index) {
    if (this.potsLocked || this.potsState[index]) return;

    this.potsState[index] = true;
    this.potsBrokenCount++;

    const currentItem = this.currentPotWords[this.potWordIndex];
    const letter = currentItem.word[index];
    const numLetters = currentItem.word.length;
    console.log(`[App] Pot ${index + 1} smashed! Letter '${letter}' (Broken: ${this.potsBrokenCount}/${numLetters})`);

    // Immediate satisfying ceramic crash sound effect
    soundEngine.playPotCrash();

    // Spawn ceramic shards
    this.spawnPotShards(index);

    // Hide pot graphic
    const potGraphic = document.getElementById(`pot-graphic-${index}`);
    if (potGraphic) potGraphic.classList.add('hidden');

    if (this.potsAgeGroup === AGE_GROUPS.AGE_4_5) {
      // AGE 4-5 AUTO-SPELL LOGIC:
      // Show letter at pot location
      const potLetter = document.getElementById(`pot-letter-${index}`);
      if (potLetter) potLetter.classList.remove('hidden');

      // Update Left Card letter slot
      const slot = document.getElementById(`letter-slot-${index}`);
      if (slot) {
        slot.className = 'w-16 h-20 sm:w-20 sm:h-24 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-md flex flex-col items-center justify-center transition-all duration-300';
        slot.innerHTML = `
          <span class="slot-letter text-3xl sm:text-4xl font-black font-game text-amber-900 animate-bounce">${letter}</span>
          <span class="text-[9px] font-black text-amber-700 uppercase tracking-wider">HIT! 💥</span>
        `;
      }

      // Update HUD
      if (this.dom.potsBrokenCounter) {
        this.dom.potsBrokenCounter.textContent = `${this.potsBrokenCount} / ${numLetters} Pots Broken`;
      }
      if (this.dom.potsProgressText) {
        this.dom.potsProgressText.textContent = `${this.potsBrokenCount} of ${numLetters} Letters Found!`;
      }
      this.dom.statusText.textContent = `💥 Smashing! Found letter '${letter}'!`;
      this.dom.feedbackText.textContent = `Great hit! Pot ${index + 1} shattered! Letter '${letter}' revealed!`;

      // Check Win Condition: all pots broken!
      if (this.potsBrokenCount >= numLetters) {
        this.onAllPotsBrokenAge45();
      }
    } else {
      // AGE 6-8 FULL-BODY SPELLING LOGIC:
      // Letters scatter randomly across the screen!
      this.spawnScatteredLetter(letter, index);

      if (this.dom.potsBrokenCounter) {
        this.dom.potsBrokenCounter.textContent = `${this.potsBrokenCount} / ${numLetters} Pots Smashed`;
      }
      if (this.dom.potsProgressText) {
        this.dom.potsProgressText.textContent = `${this.nextDropSlotIndex} of ${numLetters} Letters Spelled`;
      }
      this.dom.statusText.textContent = `💥 Pot broken! Letter '${letter}' is floating! Hover hand to grab!`;
      this.dom.feedbackText.textContent = `Hover your hand over letter '${letter}' to grab and drag it to the drop slots!`;
    }
  }

  /**
   * Spawns flying natural muted terracotta shards
   */
  spawnPotShards(potIndex) {
    const potElement = document.getElementById(`pot-slot-${potIndex}`);
    const container = this.dom.potsShardsContainer;
    if (!potElement || !container || !this.dom.potsGameOverlay) return;

    const potRect = potElement.getBoundingClientRect();
    const overlayRect = this.dom.potsGameOverlay.getBoundingClientRect();

    const originX = (potRect.left - overlayRect.left) + potRect.width / 2;
    const originY = (potRect.top - overlayRect.top) + potRect.height / 2;

    const shardCount = 14;
    for (let i = 0; i < shardCount; i++) {
      const shard = document.createElement('div');
      shard.className = 'pot-shard';

      const angle = (Math.PI * 2 * i) / shardCount + (Math.random() - 0.5) * 0.4;
      const distance = 45 + Math.random() * 75;
      const targetX = originX + Math.cos(angle) * distance;
      const targetY = originY + Math.sin(angle) * distance;
      const rot = (Math.random() - 0.5) * 720;
      const size = 8 + Math.random() * 12;

      shard.style.width = `${size}px`;
      shard.style.height = `${size}px`;
      shard.style.left = `${originX}px`;
      shard.style.top = `${originY}px`;
      shard.style.transform = `translate(-50%, -50%) rotate(0deg)`;

      container.appendChild(shard);

      requestAnimationFrame(() => {
        shard.style.left = `${targetX}px`;
        shard.style.top = `${targetY + 40}px`;
        shard.style.transform = `translate(-50%, -50%) rotate(${rot}deg) scale(0.6)`;
        shard.style.opacity = '0';
      });

      setTimeout(() => shard.remove(), 700);
    }
  }

  /**
   * AGE 6-8: Spawns a scattered floating letter tile across the screen
   */
  spawnScatteredLetter(letter, originalIndex) {
    const container = this.dom.scatteredLettersContainer;
    if (!container || !this.dom.cameraContainer) return;

    const containerRect = this.dom.cameraContainer.getBoundingClientRect();
    const letterEl = document.createElement('div');
    letterEl.className = 'scattered-letter';
    letterEl.dataset.letter = letter;
    letterEl.dataset.letterId = `letter-${originalIndex}-${Date.now()}`;
    letterEl.dataset.originalIndex = originalIndex;
    letterEl.textContent = letter;

    // Distribute randomly across the upper/mid portion of the screen (15% to 80% X, 20% to 55% Y)
    const paddingX = 70;
    const paddingY = 60;
    const availableWidth = Math.max(200, containerRect.width - paddingX * 2);
    const availableHeight = Math.max(150, containerRect.height * 0.45);

    const randX = paddingX + Math.random() * availableWidth;
    const randY = paddingY + Math.random() * availableHeight;

    letterEl.style.left = `${randX}px`;
    letterEl.style.top = `${randY}px`;

    // Mouse and Touch Drag Fallback for smooth browser testing
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let elStartX = 0;
    let elStartY = 0;

    const onPointerDown = (e) => {
      if (this.potsLocked) return;
      isDragging = true;
      letterEl.classList.add('is-grabbed');
      this.grabbedLetter = { element: letterEl, letter, id: letterEl.dataset.letterId };
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      dragStartX = clientX;
      dragStartY = clientY;
      elStartX = parseFloat(letterEl.style.left) || randX;
      elStartY = parseFloat(letterEl.style.top) || randY;
      e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - dragStartX;
      const dy = clientY - dragStartY;
      letterEl.style.left = `${elStartX + dx}px`;
      letterEl.style.top = `${elStartY + dy}px`;

      // Check drop slot proximity
      this.checkGrabbedLetterDropProximity(letterEl, letter);
    };

    const onPointerUp = () => {
      if (!isDragging) return;
      isDragging = false;
      letterEl.classList.remove('is-grabbed');
      if (this.grabbedLetter && this.grabbedLetter.id === letterEl.dataset.letterId) {
        this.grabbedLetter = null;
      }
    };

    letterEl.addEventListener('mousedown', onPointerDown);
    letterEl.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchend', onPointerUp);

    container.appendChild(letterEl);
    this.scatteredLetters.push(letterEl);
  }

  /**
   * Check if a grabbed letter has been brought into the active drop slot (Age 6-8)
   */
  checkGrabbedLetterDropProximity(letterEl, letter) {
    if (this.potsLocked || !this.dom.potsDropZone) return false;

    const activeSlot = document.getElementById(`drop-slot-${this.nextDropSlotIndex}`);
    if (!activeSlot) return false;

    const slotRect = activeSlot.getBoundingClientRect();
    const letterRect = letterEl.getBoundingClientRect();

    // Intersection test
    const dx = (letterRect.left + letterRect.width / 2) - (slotRect.left + slotRect.width / 2);
    const dy = (letterRect.top + letterRect.height / 2) - (slotRect.top + slotRect.height / 2);
    const dist = Math.hypot(dx, dy);

    if (dist < 65) {
      const currentItem = this.currentPotWords[this.potWordIndex];
      const expectedLetter = currentItem.word[this.nextDropSlotIndex];

      if (letter === expectedLetter) {
        this.snapLetterIntoDropSlot(letterEl, letter, this.nextDropSlotIndex);
        return true;
      } else {
        // Wrong letter order feedback
        this.dom.feedbackText.textContent = `Looking for '${expectedLetter}' next! Find '${expectedLetter}'!`;
        activeSlot.classList.add('animate-pot-wobble');
        setTimeout(() => activeSlot.classList.remove('animate-pot-wobble'), 300);
      }
    }
    return false;
  }

  /**
   * Snaps letter into drop slot and advances spelling order (Age 6-8)
   */
  snapLetterIntoDropSlot(letterEl, letter, slotIndex) {
    const currentItem = this.currentPotWords[this.potWordIndex];
    const numLetters = currentItem.word.length;

    console.log(`[App] Correct letter '${letter}' placed in slot ${slotIndex + 1}!`);
    soundEngine.playLetterSnap();

    // Update active drop slot
    const slot = document.getElementById(`drop-slot-${slotIndex}`);
    if (slot) {
      slot.classList.remove('is-active-target');
      slot.classList.add('is-filled');
      slot.innerHTML = `
        <span class="slot-char text-2xl font-black font-game text-emerald-950 animate-bounce">${letter}</span>
        <span class="text-[9px] font-black text-emerald-700 uppercase">Correct!</span>
      `;
    }

    // Update Left Card letter slot
    const leftSlot = document.getElementById(`letter-slot-${slotIndex}`);
    if (leftSlot) {
      leftSlot.className = 'w-16 h-20 sm:w-20 sm:h-24 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-md flex flex-col items-center justify-center transition-all duration-300';
      leftSlot.innerHTML = `
        <span class="slot-letter text-3xl sm:text-4xl font-black font-game text-amber-900 animate-bounce">${letter}</span>
        <span class="text-[9px] font-black text-amber-700 uppercase tracking-wider">Letter ${slotIndex + 1}</span>
      `;
    }

    // Remove letter element from scattered pool
    if (letterEl && letterEl.parentNode) {
      letterEl.remove();
    }
    this.scatteredLetters = this.scatteredLetters.filter(el => el !== letterEl);
    this.grabbedLetter = null;

    // Advance to next slot in spelling order
    this.nextDropSlotIndex++;
    voiceEngine.speak(letter, { pitch: 1.4, rate: 1.1, volume: 1.0 });

    if (this.dom.potsProgressText) {
      this.dom.potsProgressText.textContent = `${this.nextDropSlotIndex} of ${numLetters} Letters Spelled`;
    }

    if (this.nextDropSlotIndex < numLetters) {
      // Highlight next slot
      const nextSlot = document.getElementById(`drop-slot-${this.nextDropSlotIndex}`);
      if (nextSlot) {
        nextSlot.classList.add('is-active-target');
      }
      this.dom.statusText.textContent = `Great! Letter '${letter}' placed! Now find '${currentItem.word[this.nextDropSlotIndex]}'!`;
      this.dom.feedbackText.textContent = `Awesome! Now grab letter '${currentItem.word[this.nextDropSlotIndex]}'!`;
    } else {
      // ALL LETTERS PLACED CORRECTLY!
      this.onAllPotsBrokenAge68();
    }
  }

  /**
   * AGE 4-5 WIN: When all pots are broken, auto-snap together and voice readout
   */
  onAllPotsBrokenAge45() {
    this.potsLocked = true;
    const currentItem = this.currentPotWords[this.potWordIndex];
    const letters = currentItem.word.split('');

    // Award 10 Energy Coins immediately
    this.awardCoins(10);
    this.potsSolvedCount++;
    localStorage.setItem('potsSolvedCount', this.potsSolvedCount.toString());
    if (this.dom.potsSolvedCounter) {
      this.dom.potsSolvedCounter.textContent = `${this.potsSolvedCount} Solved`;
    }

    // Play celebration audio sequence
    setTimeout(() => {
      soundEngine.playLetterSnap();
      soundEngine.playSuccess();
    }, 250);

    // Screen flash & Confetti
    this.dom.screenFlash.classList.remove('opacity-0', 'pointer-events-none');
    this.dom.screenFlash.classList.add('opacity-80');
    setTimeout(() => {
      this.dom.screenFlash.classList.remove('opacity-80');
      this.dom.screenFlash.classList.add('opacity-0', 'pointer-events-none');
    }, 400);

    this.launchConfetti();

    // Show center snapped word banner
    if (this.dom.snappedWordBanner) {
      this.dom.snappedWordBanner.classList.remove('hidden');
    }

    // Web Speech API: phonetic spelling loudly and enthusiastically
    const titleCasedWord = currentItem.word.charAt(0) + currentItem.word.slice(1).toLowerCase();
    const phoneticSpelling = `${letters.join(' - ')}... ${titleCasedWord}!`;
    console.log(`[App] Age 4-5 Word Complete! Speaking: "${phoneticSpelling}"`);
    voiceEngine.speak(phoneticSpelling, { pitch: 1.4, rate: 0.9, volume: 1.0 });

    // Auto-advance to next word after 3.5s delay
    this.potsNewRoundTimer = setTimeout(() => {
      this.nextPotWord();
    }, 3500);
  }

  /**
   * AGE 6-8 WIN: When all letters have been dragged and placed in order
   */
  onAllPotsBrokenAge68() {
    this.potsLocked = true;
    const currentItem = this.currentPotWords[this.potWordIndex];
    const letters = currentItem.word.split('');

    // Award 10 Energy Coins immediately
    this.awardCoins(10);
    this.potsSolvedCount++;
    localStorage.setItem('potsSolvedCount', this.potsSolvedCount.toString());
    if (this.dom.potsSolvedCounter) {
      this.dom.potsSolvedCounter.textContent = `${this.potsSolvedCount} Solved`;
    }

    setTimeout(() => {
      soundEngine.playLetterSnap();
      soundEngine.playSuccess();
    }, 250);

    this.dom.screenFlash.classList.remove('opacity-0', 'pointer-events-none');
    this.dom.screenFlash.classList.add('opacity-80');
    setTimeout(() => {
      this.dom.screenFlash.classList.remove('opacity-80');
      this.dom.screenFlash.classList.add('opacity-0', 'pointer-events-none');
    }, 400);

    this.launchConfetti();

    if (this.dom.snappedWordBanner) {
      this.dom.snappedWordBanner.classList.remove('hidden');
    }

    const titleCasedWord = currentItem.word.charAt(0) + currentItem.word.slice(1).toLowerCase();
    const celebratorySpeech = `Brilliant spelling! ${letters.join(' - ')}... ${titleCasedWord}!`;
    console.log(`[App] Age 6-8 Spelled successfully! Speaking: "${celebratorySpeech}"`);
    voiceEngine.speak(celebratorySpeech, { pitch: 1.4, rate: 0.9, volume: 1.0 });

    this.potsNewRoundTimer = setTimeout(() => {
      this.nextPotWord();
    }, 3500);
  }

  /**
   * Collision and Hand Coordinate Tracking for Activity 2
   */
  checkPotsCollision(landmarks) {
    if (this.potsLocked || !landmarks || !this.dom.cameraContainer) return;

    const containerRect = this.dom.cameraContainer.getBoundingClientRect();
    if (!containerRect.width || !containerRect.height) return;

    // Track wrists (15, 16) and index fingertips (19, 20)
    const handPoints = [];

    // Left hand
    const lw = landmarks[LANDMARKS.LEFT_WRIST];
    const li = landmarks[LANDMARKS.LEFT_INDEX];
    if (lw && lw.visibility > 0.35) handPoints.push({ x: lw.x, y: lw.y, isLeft: true });
    if (li && li.visibility > 0.35) handPoints.push({ x: li.x, y: li.y, isLeft: true });

    // Right hand
    const rw = landmarks[LANDMARKS.RIGHT_WRIST];
    const ri = landmarks[LANDMARKS.RIGHT_INDEX];
    if (rw && rw.visibility > 0.35) handPoints.push({ x: rw.x, y: rw.y, isLeft: false });
    if (ri && ri.visibility > 0.35) handPoints.push({ x: ri.x, y: ri.y, isLeft: false });

    // Update hand visual trackers
    let leftScreenPoint = null;
    let rightScreenPoint = null;

    if (lw && lw.visibility > 0.35) {
      leftScreenPoint = { x: (1.0 - lw.x) * 100, y: lw.y * 100 };
    }
    if (rw && rw.visibility > 0.35) {
      rightScreenPoint = { x: (1.0 - rw.x) * 100, y: rw.y * 100 };
    }

    if (this.dom.leftHandTracker) {
      if (leftScreenPoint) {
        this.dom.leftHandTracker.classList.remove('hidden');
        this.dom.leftHandTracker.style.left = `${leftScreenPoint.x}%`;
        this.dom.leftHandTracker.style.top = `${leftScreenPoint.y}%`;
      } else {
        this.dom.leftHandTracker.classList.add('hidden');
      }
    }

    if (this.dom.rightHandTracker) {
      if (rightScreenPoint) {
        this.dom.rightHandTracker.classList.remove('hidden');
        this.dom.rightHandTracker.style.left = `${rightScreenPoint.x}%`;
        this.dom.rightHandTracker.style.top = `${rightScreenPoint.y}%`;
      } else {
        this.dom.rightHandTracker.classList.add('hidden');
      }
    }

    const currentItem = this.currentPotWords[this.potWordIndex];
    const numLetters = currentItem.word.length;

    // 1. Check collision against unbroken pots
    for (let i = 0; i < numLetters; i++) {
      if (this.potsState[i]) continue; // already broken

      const potEl = document.getElementById(`pot-slot-${i}`);
      if (!potEl) continue;

      const potRect = potEl.getBoundingClientRect();
      const potCenterX = potRect.left - containerRect.left + potRect.width / 2;
      const potCenterY = potRect.top - containerRect.top + potRect.height / 2;
      const hitRadius = Math.max(65, Math.min(potRect.width, potRect.height) * 0.7);

      for (const pt of handPoints) {
        const handPxX = (1.0 - pt.x) * containerRect.width;
        const handPxY = pt.y * containerRect.height;

        const distance = Math.hypot(handPxX - potCenterX, handPxY - potCenterY);
        if (distance < hitRadius) {
          this.hitPot(i);
          break;
        }
      }
    }

    // 2. AGE 6-8: Hand Tracking Letter Grab & Drag
    if (this.potsAgeGroup === AGE_GROUPS.AGE_6_8 && handPoints.length > 0) {
      // Pick the primary active hand (lowest Y / closest to interaction area)
      const primaryHand = handPoints[0];
      const handPxX = (1.0 - primaryHand.x) * containerRect.width;
      const handPxY = primaryHand.y * containerRect.height;

      if (!this.grabbedLetter) {
        // Proximity detection to unplaced scattered letters
        for (const letterEl of this.scatteredLetters) {
          const letterLeft = parseFloat(letterEl.style.left) || 0;
          const letterTop = parseFloat(letterEl.style.top) || 0;
          const dist = Math.hypot(handPxX - (letterLeft + 29), handPxY - (letterTop + 29));

          if (dist < 50) {
            // Grab letter!
            this.grabbedLetter = {
              element: letterEl,
              letter: letterEl.dataset.letter,
              id: letterEl.dataset.letterId
            };
            letterEl.classList.add('is-grabbed');
            this.dom.feedbackText.textContent = `Grabbing '${letterEl.dataset.letter}'! Move your hand to the bottom drop slot!`;
            break;
          }
        }
      } else {
        // Drag letter following hand position
        const letterEl = this.grabbedLetter.element;
        if (letterEl && letterEl.parentNode) {
          letterEl.style.left = `${handPxX - 29}px`;
          letterEl.style.top = `${handPxY - 29}px`;

          // Test proximity to active drop slot
          this.checkGrabbedLetterDropProximity(letterEl, this.grabbedLetter.letter);
        } else {
          this.grabbedLetter = null;
        }
      }
    }
  }

  get currentPose() {
    return this.currentPosesList[this.currentPoseIndex] || this.currentPosesList[0];
  }

  loadPose(index) {
    this.currentPoseIndex = (index + this.currentPosesList.length) % this.currentPosesList.length;
    const pose = this.currentPose;

    this.dom.poseName.textContent = pose.name;
    this.dom.poseEmoji.textContent = pose.emoji;
    this.dom.poseBadge.textContent = pose.badge;
    this.dom.poseHint.textContent = pose.action || pose.hint;
    this.dom.poseDescription.textContent = pose.targetDescription || pose.action;
    this.dom.countdownPoseTeaser.textContent = `${pose.name} ${pose.emoji}`;
    this.dom.freezePromptText.textContent = `❄️ Hold ${pose.name} for ${Math.round(this.holdDurationRequired)} Seconds!`;

    // Item Word Banner for Fruit and Vegetable Yoga modes
    if (this.gameMode === GAME_MODES.FRUIT_YOGA || this.gameMode === GAME_MODES.VEGETABLE_YOGA) {
      if (this.dom.itemWordBanner) {
        this.dom.itemWordBanner.classList.remove('hidden');
        if (this.dom.itemPictureEmoji) this.dom.itemPictureEmoji.textContent = pose.emoji;
        if (this.dom.itemWordText) this.dom.itemWordText.textContent = pose.word || pose.itemName?.toUpperCase() || pose.name.toUpperCase();
        if (this.dom.itemTypeLabel) {
          this.dom.itemTypeLabel.textContent = this.gameMode === GAME_MODES.FRUIT_YOGA ? 'FRUIT OF THE DAY 🍎' : 'VEGGIE OF THE DAY 🥕';
        }
      }
    } else {
      if (this.dom.itemWordBanner) {
        this.dom.itemWordBanner.classList.add('hidden');
      }
    }

    this.renderStickFigure(pose);
    this.updatePoseDots();

    if (this.isSimulating) {
      const mock = this.generateMockLandmarks(pose.id);
      this.tracker.simulatePose(mock);
    }
  }

  nextPose() {
    this.loadPose(this.currentPoseIndex + 1);
    if (this.isGameRunning && this.gameMode !== GAME_MODES.FREEZE_DANCE) {
      this.startYogaPose();
    }
  }

  previousPose() {
    this.loadPose(this.currentPoseIndex - 1);
    if (this.isGameRunning && this.gameMode !== GAME_MODES.FREEZE_DANCE) {
      this.startYogaPose();
    }
  }

  toggleGameLoop() {
    if (this.isGameRunning) {
      this.pauseGameLoop();
    } else {
      if (this.gameMode === GAME_MODES.FREEZE_DANCE) {
        this.startGameLoop();
      } else if (this.gameMode === GAME_MODES.SHOOT_THE_POTS) {
        this.startShootThePotsMode();
      } else {
        this.startYogaMode();
      }
    }
  }

  startGameLoop() {
    soundEngine.init();
    voiceEngine.initVoices();
    soundEngine.playBgMusic();
    this.isGameRunning = true;
    this.dom.gameLoopIcon.textContent = '⏸️';
    this.dom.gameLoopText.textContent = 'Pause Dance';

    if (!this.tracker.isRunning && !this.isSimulating) {
      this.startCamera();
    }

    this.startActionPhase();
  }

  pauseGameLoop() {
    this.isGameRunning = false;
    this.currentPhase = PHASES.IDLE;
    soundEngine.stopDanceBeat();
    soundEngine.pauseBgMusic();
    soundEngine.pausePotsBgMusic();
    voiceEngine.stop();
    this.dom.gameLoopIcon.textContent = '🎮';
    if (this.gameMode === GAME_MODES.FREEZE_DANCE) {
      this.dom.gameLoopText.textContent = 'Resume Dance';
    } else if (this.gameMode === GAME_MODES.SHOOT_THE_POTS) {
      this.dom.gameLoopText.textContent = 'Resume Pots';
    } else {
      this.dom.gameLoopText.textContent = 'Resume Yoga';
    }
    this.dom.statusText.textContent = 'Activity paused';
    if (this.gameMode !== GAME_MODES.SHOOT_THE_POTS) {
      this.hideAllOverlays();
    }
  }

  /**
   * ============================================================
   * FRUIT YOGA & VEGETABLE YOGA LOOP (5-Second Hold)
   * ============================================================
   */
  startYogaMode() {
    soundEngine.init();
    voiceEngine.initVoices();
    soundEngine.playBgMusic();
    soundEngine.stopDanceBeat();
    this.isGameRunning = true;
    this.dom.gameLoopIcon.textContent = '⏸️';
    this.dom.gameLoopText.textContent = 'Pause Yoga';

    if (!this.tracker.isRunning && !this.isSimulating) {
      this.startCamera();
    }

    this.startYogaPose();
  }

  startYogaPose() {
    this.currentPhase = PHASES.FREEZE;
    this.currentHoldTime = 0.0;
    this.lastSecondTicked = 0;
    this.tracker.setMatchingState(false);

    const pose = this.currentPose;

    soundEngine.playFreezeSwoosh();
    this.hideAllOverlays();
    this.dom.freezeOverlay.classList.remove('hidden');

    this.dom.targetCardSubtitle.textContent = 'ACTIVE TARGET POSE';
    this.dom.targetPoseCard.classList.add('forest-card-glow');
    this.dom.statusText.textContent = `${this.gameMode === GAME_MODES.FRUIT_YOGA ? 'Fruit' : 'Vegetable'} Yoga: Hold ${pose.name} for 5 seconds!`;

    this.dom.holdProgressBar.style.width = '0%';
    const circumference = 2 * Math.PI * 40;
    this.dom.holdProgressRing.style.strokeDashoffset = circumference;
    this.dom.holdCountdownText.textContent = '5';
    this.dom.freezePromptText.textContent = `❄️ Hold ${pose.name} for 5 Seconds!`;

    const spokenName = pose.name;
    const spokenAction = pose.action || pose.hint;
    voiceEngine.speak(`${spokenName}! ${spokenAction}`, { pitch: 1.4, rate: 1.05, volume: 1.0 });

    if (this.isSimulating) {
      const mock = this.generateMockLandmarks(pose.id);
      this.tracker.simulatePose(mock);
    }
  }

  /**
   * ============================================================
   * PHASE 1: ACTION PHASE ("JUMP! JUMP! JUMP!" for 5 seconds)
   * ============================================================
   */
  startActionPhase() {
    this.currentPhase = PHASES.ACTION;
    this.phaseTimeRemaining = this.actionDuration;
    this.currentHoldTime = 0.0;
    this.jumpCount = 0;
    this.dom.jumpCountBadge.textContent = '0';
    this.tracker.setMatchingState(false);

    this.updatePhaseTabs('ACTION');
    this.hideAllOverlays();
    this.dom.actionOverlay.classList.remove('hidden');

    voiceEngine.speak('Jump! Jump! Jump!', { pitch: 1.25, rate: 1.15, volume: 1.0 });

    this.dom.statusText.textContent = 'Phase 1: JUMP! JUMP! JUMP!';
    this.dom.targetCardSubtitle.textContent = 'Up Next: Freeze Pose';
    this.dom.targetPoseCard.classList.remove('forest-card-glow');

    soundEngine.startDanceBeat();
  }

  /**
   * ============================================================
   * PHASE 2: COUNTDOWN PHASE ("3, 2, 1" ready to freeze)
   * ============================================================
   */
  startCountdownPhase() {
    this.currentPhase = PHASES.COUNTDOWN;
    this.phaseTimeRemaining = this.countdownDuration;
    this.lastCountdownInteger = null;

    soundEngine.stopDanceBeat();
    this.updatePhaseTabs('COUNTDOWN');
    this.hideAllOverlays();
    this.dom.countdownOverlay.classList.remove('hidden');

    this.dom.countdownPoseTeaser.textContent = `${this.currentPose.name} ${this.currentPose.emoji}`;
    this.dom.statusText.textContent = 'Phase 2: Get ready to freeze!';
  }

  /**
   * ============================================================
   * PHASE 3: FREEZE PHASE ("FREEZE!" + Target Yoga Pose, 3s Hold)
   * ============================================================
   */
  startFreezePhase() {
    this.currentPhase = PHASES.FREEZE;
    this.currentHoldTime = 0.0;
    this.lastSecondTicked = 0;

    soundEngine.playFreezeSwoosh();
    this.updatePhaseTabs('FREEZE');
    this.hideAllOverlays();
    this.dom.freezeOverlay.classList.remove('hidden');

    const spokenName = this.currentPose.name;
    const spokenAction = this.currentPose.action || this.currentPose.hint;
    voiceEngine.speak(`Three... Two... One... Freeze! ${spokenName}! ${spokenAction}`, { pitch: 1.4, rate: 1.05, volume: 1.0 });

    this.dom.targetCardSubtitle.textContent = 'ACTIVE TARGET POSE';
    this.dom.targetPoseCard.classList.add('forest-card-glow');
    this.dom.statusText.textContent = `Phase 3: FREEZE! Hold ${this.currentPose.name} for 3 seconds!`;

    this.dom.holdProgressBar.style.width = '0%';
    const circumference = 2 * Math.PI * 40;
    this.dom.holdProgressRing.style.strokeDashoffset = circumference;
    this.dom.holdCountdownText.textContent = '3';
    this.dom.freezePromptText.textContent = `❄️ Hold ${this.currentPose.name} for 3 Seconds!`;

    if (this.isSimulating) {
      const mock = this.generateMockLandmarks(this.currentPose.id);
      this.tracker.simulatePose(mock);
    }
  }

  skipPhase() {
    if (this.gameMode === GAME_MODES.SHOOT_THE_POTS) {
      this.nextPotWord();
      return;
    }

    if (this.currentPhase === PHASES.ACTION) {
      this.startCountdownPhase();
    } else if (this.currentPhase === PHASES.COUNTDOWN) {
      this.startFreezePhase();
    } else if (this.currentPhase === PHASES.FREEZE) {
      this.triggerWin();
    } else {
      this.startActionPhase();
    }
  }

  hideAllOverlays() {
    this.dom.actionOverlay.classList.add('hidden');
    this.dom.countdownOverlay.classList.add('hidden');
    this.dom.freezeOverlay.classList.add('hidden');
  }

  updatePhaseTabs(activePhase) {
    const tabs = {
      ACTION: this.dom.tabAction,
      COUNTDOWN: this.dom.tabCountdown,
      FREEZE: this.dom.tabFreeze
    };

    Object.entries(tabs).forEach(([phaseKey, tabEl]) => {
      if (!tabEl) return;
      if (phaseKey === activePhase) {
        tabEl.className = 'flex items-center justify-center gap-2 py-2 px-2 sm:px-4 rounded-xl transition-all duration-300 bg-amber-50 border border-amber-200 text-amber-900 shadow-sm';
      } else {
        tabEl.className = 'flex items-center justify-center gap-2 py-2 px-2 sm:px-4 rounded-xl transition-all duration-300 opacity-50 bg-stone-50 border border-stone-200 text-slate-600';
      }
    });
  }

  /**
   * Master Game Loop ticker
   */
  gameLoop(timestamp) {
    const dt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = timestamp;

    if (this.isGameRunning && this.gameMode === GAME_MODES.FREEZE_DANCE) {
      // 1. Action Phase Timer (5 seconds)
      if (this.currentPhase === PHASES.ACTION) {
        this.phaseTimeRemaining -= dt;
        const progress = Math.max(0, this.phaseTimeRemaining / this.actionDuration);
        this.dom.actionProgressBar.style.width = `${progress * 100}%`;
        this.dom.actionCountdownText.textContent = `${Math.max(0, this.phaseTimeRemaining).toFixed(1)}s`;

        if (this.phaseTimeRemaining <= 0) {
          this.startCountdownPhase();
        }
      }

      // 2. Countdown Phase Timer (3 seconds: 3, 2, 1)
      else if (this.currentPhase === PHASES.COUNTDOWN) {
        this.phaseTimeRemaining -= dt;
        const currentNum = Math.ceil(this.phaseTimeRemaining);

        if (currentNum !== this.lastCountdownInteger && currentNum > 0 && currentNum <= 3) {
          this.lastCountdownInteger = currentNum;
          this.dom.countdownNumber.textContent = `${currentNum}`;
          this.dom.countdownNumber.classList.remove('animate-pop');
          void this.dom.countdownNumber.offsetWidth;
          this.dom.countdownNumber.classList.add('animate-pop');
          soundEngine.playCountdownTick(currentNum);

          if (currentNum === 3) {
            voiceEngine.speak('Three', { pitch: 1.15, rate: 1.05, volume: 1.0 });
          } else if (currentNum === 2) {
            voiceEngine.speak('Two', { pitch: 1.2, rate: 1.05, volume: 1.0 });
          } else if (currentNum === 1) {
            voiceEngine.speak('One', { pitch: 1.25, rate: 1.05, volume: 1.0 });
          }
        }

        if (this.phaseTimeRemaining <= 0) {
          this.startFreezePhase();
        }
      }
    }

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  /**
   * MediaPipe Pose landmark reception
   */
  onPoseLandmarks(landmarks) {
    if (this.gameMode === GAME_MODES.SHOOT_THE_POTS) {
      this.checkPotsCollision(landmarks);
      return;
    }

    if (this.currentPhase === PHASES.CELEBRATION || !landmarks) {
      if (!landmarks && this.currentPhase === PHASES.FREEZE) {
        this.dom.feedbackText.textContent = 'Step into view so the mirror can verify your pose!';
        this.tracker.setMatchingState(false);
      }
      return;
    }

    // 1. Action Phase: Track jumps
    if (this.currentPhase === PHASES.ACTION) {
      const ls = landmarks[LANDMARKS.LEFT_SHOULDER];
      const rs = landmarks[LANDMARKS.RIGHT_SHOULDER];
      if (ls && rs) {
        const shoulderY = (ls.y + rs.y) / 2;
        if (this.lastShoulderY !== null) {
          const dy = this.lastShoulderY - shoulderY;
          if (dy > 0.04 && !this.jumpCooldown) {
            this.jumpCount++;
            this.dom.jumpCountBadge.textContent = `${this.jumpCount}`;
            this.jumpCooldown = true;
            setTimeout(() => { this.jumpCooldown = false; }, 280);
          }
        }
        this.lastShoulderY = shoulderY;
      }
      this.dom.feedbackText.textContent = 'Bounce and Jump! Keep moving! 🦘';
      return;
    }

    // 2. Freeze / Yoga Phase: Evaluate target pose and check hold time
    if (this.currentPhase === PHASES.FREEZE) {
      const now = performance.now();
      const dt = Math.min((now - (this.lastPoseEvalTime || now)) / 1000, 0.1);
      this.lastPoseEvalTime = now;

      const evaluation = this.currentPose.evaluate(landmarks);
      this.tracker.setMatchingState(evaluation.isMatch);

      if (evaluation.isMatch) {
        this.currentHoldTime += dt;
        this.dom.feedbackText.textContent = evaluation.feedback;
        this.dom.feedbackBanner.className = 'px-4 py-2 rounded-2xl bg-teal-50 border border-teal-300 text-teal-900 font-black text-sm transition-all duration-300 shadow-md text-center max-w-md';

        const remainingSeconds = Math.max(0, this.holdDurationRequired - this.currentHoldTime);
        const displaySeconds = Math.ceil(remainingSeconds);
        const progressPercent = Math.min(100, (this.currentHoldTime / this.holdDurationRequired) * 100);

        this.dom.holdCountdownText.textContent = `${displaySeconds}`;
        this.dom.holdProgressBar.style.width = `${progressPercent}%`;
        const circumference = 2 * Math.PI * 40;
        const strokeDashoffset = circumference - (circumference * progressPercent) / 100;
        this.dom.holdProgressRing.style.strokeDashoffset = strokeDashoffset;

        if (displaySeconds !== this.lastSecondTicked && displaySeconds > 0) {
          soundEngine.playTick(displaySeconds);
          this.lastSecondTicked = displaySeconds;
        }

        if (this.currentHoldTime >= this.holdDurationRequired) {
          this.triggerWin();
        }
      } else {
        this.dom.feedbackText.textContent = evaluation.feedback;
        this.dom.feedbackBanner.className = 'px-4 py-2 rounded-2xl bg-white/90 border border-stone-200 text-slate-800 text-sm font-semibold transition-all duration-300 shadow-md text-center max-w-md';

        if (this.currentHoldTime > 0) {
          this.currentHoldTime = Math.max(0, this.currentHoldTime - dt * 2.5);
          const progressPercent = (this.currentHoldTime / this.holdDurationRequired) * 100;
          this.dom.holdProgressBar.style.width = `${progressPercent}%`;
          const circumference = 2 * Math.PI * 40;
          const strokeDashoffset = circumference - (circumference * progressPercent) / 100;
          this.dom.holdProgressRing.style.strokeDashoffset = strokeDashoffset;
        }
      }
    }
  }

  /**
   * WIN CONDITION:
   * 1. Award 10 Energy Coins
   * 2. Play celebratory success sound & coin chime
   * 3. Flash 'Great Job!' modal banner & confetti
   * 4. Automatically restart loop
   */
  triggerWin() {
    if (this.currentPhase === PHASES.CELEBRATION) return;
    this.currentPhase = PHASES.CELEBRATION;

    soundEngine.playSuccess();
    setTimeout(() => soundEngine.playCoin(), 320);

    this.dom.screenFlash.classList.remove('opacity-0', 'pointer-events-none');
    this.dom.screenFlash.classList.add('opacity-80');
    setTimeout(() => {
      this.dom.screenFlash.classList.remove('opacity-80');
      this.dom.screenFlash.classList.add('opacity-0', 'pointer-events-none');
    }, 400);

    this.awardCoins(10);
    this.launchConfetti();
    this.dom.celebrationModal.classList.remove('hidden');

    if (this.gameMode === GAME_MODES.FRUIT_YOGA) {
      this.dom.celebrationTitle.textContent = 'FRUITTASTIC!';
      this.dom.celebrationSub.textContent = `Amazing job! You held the ${this.currentPose.itemName} pose for 5 seconds!`;
      this.dom.nextRoundBtn.textContent = 'Next Fruit Pose ➔';
    } else if (this.gameMode === GAME_MODES.VEGETABLE_YOGA) {
      this.dom.celebrationTitle.textContent = 'VEGGIE CHAMPION!';
      this.dom.celebrationSub.textContent = `Terrific balance! You mastered the ${this.currentPose.itemName} pose!`;
      this.dom.nextRoundBtn.textContent = 'Next Veggie Pose ➔';
    } else {
      this.dom.celebrationTitle.textContent = 'GREAT JOB!';
      this.dom.celebrationSub.textContent = 'You held the freeze pose like a true forest champion!';
      this.dom.nextRoundBtn.textContent = 'Jump Back In! ➔';
    }

    voiceEngine.speak('Wow! Completed! Great job!', { pitch: 1.4, rate: 1.05, volume: 1.0 });

    let restartSeconds = 3;
    this.dom.autoRestartCountdown.textContent = `${restartSeconds}`;

    if (this.autoRestartTimer) clearInterval(this.autoRestartTimer);
    this.autoRestartTimer = setInterval(() => {
      restartSeconds--;
      if (restartSeconds > 0) {
        this.dom.autoRestartCountdown.textContent = `${restartSeconds}`;
      } else {
        clearInterval(this.autoRestartTimer);
        this.autoRestartTimer = null;
        this.closeCelebration();
        
        if (this.gameMode === GAME_MODES.FREEZE_DANCE) {
          this.nextPose();
          this.startActionPhase();
        } else {
          this.nextPose();
          this.startYogaPose();
        }
      }
    }, 1000);
  }

  closeCelebration() {
    if (this.autoRestartTimer) {
      clearInterval(this.autoRestartTimer);
      this.autoRestartTimer = null;
    }
    voiceEngine.stop();
    this.dom.celebrationModal.classList.add('hidden');
  }

  awardCoins(amount) {
    this.energyCoins += amount;
    localStorage.setItem('energyCoins', this.energyCoins.toString());

    this.dom.coinCounterBadge.classList.add('scale-125', 'ring-4', 'ring-amber-300', 'bg-amber-100');
    this.dom.coinCount.textContent = this.energyCoins;

    this.spawnFlyingCoin(amount);

    setTimeout(() => {
      this.dom.coinCounterBadge.classList.remove('scale-125', 'ring-4', 'ring-amber-300', 'bg-amber-100');
    }, 800);
  }

  updateCoinDisplay() {
    this.dom.coinCount.textContent = this.energyCoins;
  }

  spawnFlyingCoin(amount) {
    const coinFloater = document.createElement('div');
    coinFloater.className = 'fixed z-50 pointer-events-none text-2xl font-black text-amber-500 flex items-center gap-1 drop-shadow transition-all duration-1000 ease-out';
    coinFloater.innerHTML = `🪙 +${amount}`;
    coinFloater.style.left = '50%';
    coinFloater.style.top = '50%';
    coinFloater.style.transform = 'translate(-50%, -50%) scale(1.5)';
    document.body.appendChild(coinFloater);

    requestAnimationFrame(() => {
      const targetRect = this.dom.coinCounterBadge.getBoundingClientRect();
      coinFloater.style.left = `${targetRect.left + 20}px`;
      coinFloater.style.top = `${targetRect.top + 10}px`;
      coinFloater.style.transform = 'translate(0, 0) scale(0.8)';
      coinFloater.style.opacity = '0';
    });

    setTimeout(() => coinFloater.remove(), 1100);
  }

  launchConfetti() {
    if (window.confetti) {
      window.confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#34d399', '#6ee7b7', '#fde68a', '#38bdf8'],
      });

      setTimeout(() => {
        window.confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#fbbf24', '#34d399', '#a7f3d0'],
        });
        window.confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#fbbf24', '#38bdf8', '#a7f3d0'],
        });
      }, 180);
    }
  }

  /**
   * Camera controls
   */
  async startCamera() {
    console.log('[App] "Start Magic Mirror" / camera startup requested.');
    this.dom.statusText.textContent = 'Requesting camera permissions...';

    this.dom.startCameraBtn.classList.add('hidden');
    this.dom.cameraPlaceholder.classList.add('hidden');
    this.dom.webcamVideo.classList.remove('hidden');
    this.dom.overlayCanvas.classList.remove('hidden');
    this.dom.toggleCameraBtn.classList.remove('hidden');

    try {
      console.log('[App] Invoking tracker.startCamera()...');
      await this.tracker.startCamera();
      console.log('[App] tracker.startCamera() succeeded. Magic mirror is live!');

      this.dom.toggleCameraBtn.innerHTML = `
        <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-1.5"></span>
        Pause Camera
      `;
      this.dom.statusText.textContent = 'Camera active! Magic mirror tracking on.';
    } catch (err) {
      console.error('[App] Failed to start camera:', err);
      this.dom.cameraPlaceholder.classList.remove('hidden');
      this.dom.startCameraBtn.classList.remove('hidden');
      this.dom.webcamVideo.classList.add('hidden');
      this.dom.overlayCanvas.classList.add('hidden');
      this.dom.toggleCameraBtn.classList.add('hidden');
      this.dom.statusText.textContent = `Camera error: ${err.message || 'Permission denied'}. Click "Start Magic Mirror" or test with Simulation!`;
    }
  }

  toggleCamera() {
    console.log(`[App] toggleCamera() called, currently isRunning=${this.tracker.isRunning}`);
    if (this.tracker.isRunning) {
      this.tracker.stopCamera();
      this.dom.toggleCameraBtn.textContent = 'Resume Camera';
      this.dom.statusText.textContent = 'Camera paused';
    } else {
      this.startCamera();
    }
  }

  toggleSimulation() {
    if (this.gameMode === GAME_MODES.SHOOT_THE_POTS) {
      const currentItem = this.currentPotWords[this.potWordIndex];
      const numLetters = currentItem.word.length;

      // Check if there are unbroken pots
      const nextUnbroken = this.potsState.findIndex(broken => !broken);
      if (nextUnbroken !== -1) {
        this.hitPot(nextUnbroken);
        return;
      }

      // If all pots are already broken and in Age 6-8 mode:
      if (this.potsAgeGroup === AGE_GROUPS.AGE_6_8 && this.nextDropSlotIndex < numLetters) {
        const expectedLetter = currentItem.word[this.nextDropSlotIndex];
        const matchingEl = this.scatteredLetters.find(el => el.dataset.letter === expectedLetter);
        if (matchingEl) {
          this.snapLetterIntoDropSlot(matchingEl, expectedLetter, this.nextDropSlotIndex);
        } else {
          this.nextPotWord();
        }
        return;
      }

      // Advance to next word
      this.nextPotWord();
      return;
    }

    this.isSimulating = !this.isSimulating;

    if (this.isSimulating) {
      this.dom.simulateBtn.innerHTML = `
        <span class="inline-block w-2 h-2 rounded-full bg-amber-300 animate-pulse mr-1.5"></span>
        Stop Simulation
      `;
      this.dom.simulateBtn.classList.remove('bg-emerald-600');
      this.dom.simulateBtn.classList.add('bg-amber-600');

      this.dom.cameraPlaceholder.classList.add('hidden');
      this.dom.overlayCanvas.classList.remove('hidden');

      if (!this.isGameRunning) {
        if (this.gameMode === GAME_MODES.FREEZE_DANCE) {
          this.startGameLoop();
        } else {
          this.startYogaMode();
        }
      }

      if (this.currentPhase !== PHASES.FREEZE) {
        if (this.gameMode === GAME_MODES.FREEZE_DANCE) {
          this.startFreezePhase();
        } else {
          this.startYogaPose();
        }
      }

      const mockLm = this.generateMockLandmarks(this.currentPose.id);
      this.tracker.simulatePose(mockLm);
    } else {
      this.dom.simulateBtn.innerHTML = `<span>✨</span> Simulate Freeze Pose`;
      this.dom.simulateBtn.classList.add('bg-emerald-600');
      this.dom.simulateBtn.classList.remove('bg-amber-600');

      this.tracker.clearSimulation();
      this.currentHoldTime = 0.0;
      if (!this.tracker.stream) {
        this.dom.cameraPlaceholder.classList.remove('hidden');
      }
    }
  }

  onTrackerStatus({ status, message }) {
    this.dom.statusText.textContent = message;
    if (status === 'running') {
      this.dom.statusBadge.classList.remove('bg-amber-50', 'text-amber-800', 'border-amber-200');
      this.dom.statusBadge.classList.add('bg-emerald-50', 'text-emerald-800', 'border-emerald-200');
    }
  }

  renderPoseDots() {
    this.dom.poseDots.innerHTML = '';
    this.currentPosesList.forEach((p, idx) => {
      const dot = document.createElement('button');
      dot.className = `w-2.5 h-2.5 rounded-full transition-all duration-300 ${
        idx === this.currentPoseIndex ? 'bg-emerald-600 w-6 shadow-sm' : 'bg-stone-300 hover:bg-stone-400'
      }`;
      dot.title = p.name;
      dot.addEventListener('click', () => {
        this.loadPose(idx);
        if (this.isGameRunning && this.gameMode !== GAME_MODES.FREEZE_DANCE) {
          this.startYogaPose();
        }
      });
      this.dom.poseDots.appendChild(dot);
    });
  }

  updatePoseDots() {
    const dots = this.dom.poseDots.children;
    for (let i = 0; i < dots.length; i++) {
      if (i === this.currentPoseIndex) {
        dots[i].className = 'w-6 h-2.5 rounded-full bg-emerald-600 shadow-sm transition-all duration-300';
      } else {
        dots[i].className = 'w-2.5 h-2.5 rounded-full bg-stone-300 hover:bg-stone-400 transition-all duration-300';
      }
    }
  }

  renderStickFigure(pose) {
    const fig = pose.stickFigure;
    const color = pose.color || '#059669';

    const svgHtml = `
      <svg viewBox="0 0 100 105" class="w-full h-full drop-shadow">
        <defs>
          <filter id="magic-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#34d399" />
            <stop offset="50%" stop-color="${color}" />
            <stop offset="100%" stop-color="#059669" />
          </linearGradient>
        </defs>

        <!-- Spine -->
        <line x1="${fig.neck[0]}" y1="${fig.neck[1]}" x2="${fig.spine[0]}" y2="${fig.spine[1]}"
              stroke="url(#bodyGrad)" stroke-width="5" stroke-linecap="round" />

        <!-- Shoulders -->
        <line x1="${fig.leftShoulder[0]}" y1="${fig.leftShoulder[1]}" x2="${fig.rightShoulder[0]}" y2="${fig.rightShoulder[1]}"
              stroke="url(#bodyGrad)" stroke-width="4.5" stroke-linecap="round" />

        <!-- Left Arm -->
        <line x1="${fig.leftShoulder[0]}" y1="${fig.leftShoulder[1]}" x2="${fig.leftElbow[0]}" y2="${fig.leftElbow[1]}"
              stroke="${color}" stroke-width="4" stroke-linecap="round" />
        <line x1="${fig.leftElbow[0]}" y1="${fig.leftElbow[1]}" x2="${fig.leftWrist[0]}" y2="${fig.leftWrist[1]}"
              stroke="${color}" stroke-width="4" stroke-linecap="round" />

        <!-- Right Arm -->
        <line x1="${fig.rightShoulder[0]}" y1="${fig.rightShoulder[1]}" x2="${fig.rightElbow[0]}" y2="${fig.rightElbow[1]}"
              stroke="${color}" stroke-width="4" stroke-linecap="round" />
        <line x1="${fig.rightElbow[0]}" y1="${fig.rightElbow[1]}" x2="${fig.rightWrist[0]}" y2="${fig.rightWrist[1]}"
              stroke="${color}" stroke-width="4" stroke-linecap="round" />

        <!-- Hips -->
        <line x1="${fig.leftHip[0]}" y1="${fig.leftHip[1]}" x2="${fig.rightHip[0]}" y2="${fig.rightHip[1]}"
              stroke="url(#bodyGrad)" stroke-width="4.5" stroke-linecap="round" />

        <!-- Left Leg -->
        <line x1="${fig.leftHip[0]}" y1="${fig.leftHip[1]}" x2="${fig.leftKnee[0]}" y2="${fig.leftKnee[1]}"
              stroke="#059669" stroke-width="4" stroke-linecap="round" />
        <line x1="${fig.leftKnee[0]}" y1="${fig.leftKnee[1]}" x2="${fig.leftAnkle[0]}" y2="${fig.leftAnkle[1]}"
              stroke="#059669" stroke-width="4" stroke-linecap="round" />

        <!-- Right Leg -->
        <line x1="${fig.rightHip[0]}" y1="${fig.rightHip[1]}" x2="${fig.rightKnee[0]}" y2="${fig.rightKnee[1]}"
              stroke="#059669" stroke-width="4" stroke-linecap="round" />
        <line x1="${fig.rightKnee[0]}" y1="${fig.rightKnee[1]}" x2="${fig.rightAnkle[0]}" y2="${fig.rightAnkle[1]}"
              stroke="#059669" stroke-width="4" stroke-linecap="round" />

        <!-- Head -->
        <circle cx="${fig.head[0]}" cy="${fig.head[1]}" r="11" fill="#fef3c7" stroke="${color}" stroke-width="2.5" />
        <circle cx="${fig.head[0] - 4}" cy="${fig.head[1] - 2}" r="1.5" fill="#1e293b" />
        <circle cx="${fig.head[0] + 4}" cy="${fig.head[1] - 2}" r="1.5" fill="#1e293b" />
        <path d="M ${fig.head[0] - 4} ${fig.head[1] + 3} Q ${fig.head[0]} ${fig.head[1] + 7} ${fig.head[0] + 4} ${fig.head[1] + 3}"
              fill="none" stroke="#1e293b" stroke-width="1.6" stroke-linecap="round" />

        <!-- Glowing Wrist indicators -->
        <circle cx="${fig.leftWrist[0]}" cy="${fig.leftWrist[1]}" r="6.5" fill="#ffffff" stroke="${color}" stroke-width="2" class="animate-ping" style="transform-origin: ${fig.leftWrist[0]}px ${fig.leftWrist[1]}px; opacity: 0.7;" />
        <circle cx="${fig.leftWrist[0]}" cy="${fig.leftWrist[1]}" r="5" fill="#fde68a" stroke="#ffffff" stroke-width="1.5" />

        <circle cx="${fig.rightWrist[0]}" cy="${fig.rightWrist[1]}" r="6.5" fill="#ffffff" stroke="${color}" stroke-width="2" class="animate-ping" style="transform-origin: ${fig.rightWrist[0]}px ${fig.rightWrist[1]}px; opacity: 0.7;" />
        <circle cx="${fig.rightWrist[0]}" cy="${fig.rightWrist[1]}" r="5" fill="#fde68a" stroke="#ffffff" stroke-width="1.5" />
      </svg>
    `;

    this.dom.poseSvgContainer.innerHTML = svgHtml;
  }

  generateMockLandmarks(poseId) {
    const lm = Array(33).fill(null).map(() => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.99 }));

    lm[0] = { x: 0.5, y: 0.28, z: 0, visibility: 0.99 }; // Nose
    lm[11] = { x: 0.42, y: 0.42, z: 0, visibility: 0.99 }; // Left shoulder
    lm[12] = { x: 0.58, y: 0.42, z: 0, visibility: 0.99 }; // Right shoulder
    lm[13] = { x: 0.38, y: 0.32, z: 0, visibility: 0.99 }; // Left elbow
    lm[14] = { x: 0.62, y: 0.32, z: 0, visibility: 0.99 }; // Right elbow
    lm[15] = { x: 0.38, y: 0.20, z: 0, visibility: 0.99 }; // Left wrist
    lm[16] = { x: 0.62, y: 0.20, z: 0, visibility: 0.99 }; // Right wrist
    lm[23] = { x: 0.45, y: 0.68, z: 0, visibility: 0.99 }; // Left hip
    lm[24] = { x: 0.55, y: 0.68, z: 0, visibility: 0.99 }; // Right hip
    lm[25] = { x: 0.45, y: 0.82, z: 0, visibility: 0.99 }; // Left knee
    lm[26] = { x: 0.55, y: 0.82, z: 0, visibility: 0.99 }; // Right knee
    lm[27] = { x: 0.45, y: 0.95, z: 0, visibility: 0.99 }; // Left ankle
    lm[28] = { x: 0.55, y: 0.95, z: 0, visibility: 0.99 }; // Right ankle

    if (poseId === 'airplane') {
      lm[11] = { x: 0.42, y: 0.40, z: 0, visibility: 0.99 };
      lm[12] = { x: 0.58, y: 0.40, z: 0, visibility: 0.99 };
      lm[13] = { x: 0.24, y: 0.40, z: 0, visibility: 0.99 };
      lm[14] = { x: 0.76, y: 0.40, z: 0, visibility: 0.99 };
      lm[15] = { x: 0.08, y: 0.40, z: 0, visibility: 0.99 };
      lm[16] = { x: 0.92, y: 0.40, z: 0, visibility: 0.99 };
      lm[25] = { x: 0.46, y: 0.80, z: 0, visibility: 0.99 };
      lm[26] = { x: 0.70, y: 0.68, z: 0, visibility: 0.99 };
      lm[27] = { x: 0.46, y: 0.96, z: 0, visibility: 0.99 };
      lm[28] = { x: 0.88, y: 0.72, z: 0, visibility: 0.99 };
    } else if (poseId === 'flamingo') {
      lm[11] = { x: 0.42, y: 0.35, z: 0, visibility: 0.99 };
      lm[12] = { x: 0.58, y: 0.35, z: 0, visibility: 0.99 };
      lm[13] = { x: 0.36, y: 0.44, z: 0, visibility: 0.99 };
      lm[14] = { x: 0.64, y: 0.44, z: 0, visibility: 0.99 };
      lm[15] = { x: 0.46, y: 0.42, z: 0, visibility: 0.99 };
      lm[16] = { x: 0.54, y: 0.42, z: 0, visibility: 0.99 };
      lm[23] = { x: 0.46, y: 0.60, z: 0, visibility: 0.99 };
      lm[24] = { x: 0.54, y: 0.60, z: 0, visibility: 0.99 };
      lm[25] = { x: 0.48, y: 0.78, z: 0, visibility: 0.99 };
      lm[26] = { x: 0.68, y: 0.70, z: 0, visibility: 0.99 };
      lm[27] = { x: 0.48, y: 0.96, z: 0, visibility: 0.99 };
      lm[28] = { x: 0.52, y: 0.74, z: 0, visibility: 0.99 };
    } else if (poseId === 'frog') {
      lm[0] = { x: 0.50, y: 0.40, z: 0, visibility: 0.99 };
      lm[11] = { x: 0.40, y: 0.48, z: 0, visibility: 0.99 };
      lm[12] = { x: 0.60, y: 0.48, z: 0, visibility: 0.99 };
      lm[13] = { x: 0.28, y: 0.62, z: 0, visibility: 0.99 };
      lm[14] = { x: 0.72, y: 0.62, z: 0, visibility: 0.99 };
      lm[15] = { x: 0.44, y: 0.76, z: 0, visibility: 0.99 };
      lm[16] = { x: 0.56, y: 0.76, z: 0, visibility: 0.99 };
      lm[23] = { x: 0.42, y: 0.66, z: 0, visibility: 0.99 };
      lm[24] = { x: 0.58, y: 0.66, z: 0, visibility: 0.99 };
      lm[25] = { x: 0.24, y: 0.74, z: 0, visibility: 0.99 };
      lm[26] = { x: 0.76, y: 0.74, z: 0, visibility: 0.99 };
      lm[27] = { x: 0.36, y: 0.92, z: 0, visibility: 0.99 };
      lm[28] = { x: 0.64, y: 0.92, z: 0, visibility: 0.99 };
    } else if (poseId === 'surfer') {
      lm[11] = { x: 0.42, y: 0.40, z: 0, visibility: 0.99 };
      lm[12] = { x: 0.58, y: 0.40, z: 0, visibility: 0.99 };
      lm[13] = { x: 0.24, y: 0.40, z: 0, visibility: 0.99 };
      lm[14] = { x: 0.76, y: 0.40, z: 0, visibility: 0.99 };
      lm[15] = { x: 0.08, y: 0.40, z: 0, visibility: 0.99 };
      lm[16] = { x: 0.92, y: 0.40, z: 0, visibility: 0.99 };
      lm[25] = { x: 0.30, y: 0.76, z: 0, visibility: 0.99 };
      lm[26] = { x: 0.70, y: 0.78, z: 0, visibility: 0.99 };
      lm[27] = { x: 0.26, y: 0.96, z: 0, visibility: 0.99 };
      lm[28] = { x: 0.78, y: 0.96, z: 0, visibility: 0.99 };
    } else if (poseId === 'fruit_banana') {
      lm[11] = { x: 0.44, y: 0.42, z: 0, visibility: 0.99 };
      lm[12] = { x: 0.60, y: 0.40, z: 0, visibility: 0.99 };
      lm[13] = { x: 0.42, y: 0.22, z: 0, visibility: 0.99 };
      lm[14] = { x: 0.54, y: 0.20, z: 0, visibility: 0.99 };
      lm[15] = { x: 0.28, y: 0.12, z: 0, visibility: 0.99 };
      lm[16] = { x: 0.34, y: 0.12, z: 0, visibility: 0.99 };
    } else if (poseId === 'fruit_starfruit') {
      lm[11] = { x: 0.42, y: 0.38, z: 0, visibility: 0.99 };
      lm[12] = { x: 0.58, y: 0.38, z: 0, visibility: 0.99 };
      lm[13] = { x: 0.26, y: 0.24, z: 0, visibility: 0.99 };
      lm[14] = { x: 0.74, y: 0.24, z: 0, visibility: 0.99 };
      lm[15] = { x: 0.10, y: 0.10, z: 0, visibility: 0.99 };
      lm[16] = { x: 0.90, y: 0.10, z: 0, visibility: 0.99 };
      lm[27] = { x: 0.22, y: 0.96, z: 0, visibility: 0.99 };
      lm[28] = { x: 0.78, y: 0.96, z: 0, visibility: 0.99 };
    } else if (poseId === 'fruit_apple') {
      lm[0] = { x: 0.32, y: 0.66, z: 0, visibility: 0.99 };
      lm[11] = { x: 0.44, y: 0.58, z: 0, visibility: 0.99 };
      lm[12] = { x: 0.48, y: 0.54, z: 0, visibility: 0.99 };
      lm[13] = { x: 0.26, y: 0.68, z: 0, visibility: 0.99 };
      lm[14] = { x: 0.30, y: 0.64, z: 0, visibility: 0.99 };
      lm[15] = { x: 0.16, y: 0.72, z: 0, visibility: 0.99 };
      lm[16] = { x: 0.20, y: 0.68, z: 0, visibility: 0.99 };
      lm[23] = { x: 0.68, y: 0.62, z: 0, visibility: 0.99 };
      lm[24] = { x: 0.72, y: 0.58, z: 0, visibility: 0.99 };
    } else if (poseId === 'fruit_watermelon') {
      lm[0] = { x: 0.50, y: 0.32, z: 0, visibility: 0.99 };
      lm[11] = { x: 0.42, y: 0.46, z: 0, visibility: 0.99 };
      lm[12] = { x: 0.58, y: 0.46, z: 0, visibility: 0.99 };
      lm[13] = { x: 0.30, y: 0.54, z: 0, visibility: 0.99 };
      lm[14] = { x: 0.70, y: 0.54, z: 0, visibility: 0.99 };
      lm[15] = { x: 0.18, y: 0.64, z: 0, visibility: 0.99 };
      lm[16] = { x: 0.82, y: 0.64, z: 0, visibility: 0.99 };
      lm[23] = { x: 0.44, y: 0.72, z: 0, visibility: 0.99 };
      lm[24] = { x: 0.56, y: 0.72, z: 0, visibility: 0.99 };
      lm[25] = { x: 0.28, y: 0.76, z: 0, visibility: 0.99 };
      lm[26] = { x: 0.72, y: 0.76, z: 0, visibility: 0.99 };
      lm[27] = { x: 0.12, y: 0.84, z: 0, visibility: 0.99 };
      lm[28] = { x: 0.88, y: 0.84, z: 0, visibility: 0.99 };
    } else if (poseId === 'veg_carrot') {
      lm[13] = { x: 0.42, y: 0.20, z: 0, visibility: 0.99 };
      lm[14] = { x: 0.58, y: 0.20, z: 0, visibility: 0.99 };
      lm[15] = { x: 0.49, y: 0.08, z: 0, visibility: 0.99 };
      lm[16] = { x: 0.51, y: 0.08, z: 0, visibility: 0.99 };
    } else if (poseId === 'veg_broccoli') {
      lm[13] = { x: 0.24, y: 0.42, z: 0, visibility: 0.99 };
      lm[14] = { x: 0.76, y: 0.42, z: 0, visibility: 0.99 };
      lm[15] = { x: 0.24, y: 0.16, z: 0, visibility: 0.99 };
      lm[16] = { x: 0.76, y: 0.16, z: 0, visibility: 0.99 };
    } else if (poseId === 'veg_corn') {
      lm[13] = { x: 0.30, y: 0.22, z: 0, visibility: 0.99 };
      lm[14] = { x: 0.68, y: 0.52, z: 0, visibility: 0.99 };
      lm[15] = { x: 0.26, y: 0.08, z: 0, visibility: 0.99 };
      lm[16] = { x: 0.56, y: 0.66, z: 0, visibility: 0.99 };
    } else if (poseId === 'veg_pea') {
      lm[13] = { x: 0.34, y: 0.48, z: 0, visibility: 0.99 };
      lm[14] = { x: 0.66, y: 0.48, z: 0, visibility: 0.99 };
      lm[15] = { x: 0.48, y: 0.50, z: 0, visibility: 0.99 };
      lm[16] = { x: 0.52, y: 0.50, z: 0, visibility: 0.99 };
    } else if (poseId === 'veg_pumpkin') {
      lm[13] = { x: 0.22, y: 0.46, z: 0, visibility: 0.99 };
      lm[14] = { x: 0.78, y: 0.46, z: 0, visibility: 0.99 };
      lm[15] = { x: 0.42, y: 0.48, z: 0, visibility: 0.99 };
      lm[16] = { x: 0.58, y: 0.48, z: 0, visibility: 0.99 };
    } else {
      lm[13] = { x: 0.36, y: 0.24, z: 0, visibility: 0.99 };
      lm[15] = { x: 0.32, y: 0.10, z: 0, visibility: 0.99 };
      lm[14] = { x: 0.64, y: 0.54, z: 0, visibility: 0.99 };
      lm[16] = { x: 0.58, y: 0.68, z: 0, visibility: 0.99 };
    }

    return lm;
  }
}

// Instantiate game on page load
window.addEventListener('DOMContentLoaded', () => {
  window.game = new FreezeDanceGame();
});
