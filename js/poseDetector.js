/**
 * MediaPipe Pose Detector and Magical Skeleton Renderer
 */

// Major connections between landmarks
const POSE_CONNECTIONS = [
  // Face & Torso
  [11, 12], // Shoulders
  [11, 23], [12, 24], // Shoulders to Hips
  [23, 24], // Hips
  // Left Arm
  [11, 13], [13, 15],
  // Right Arm
  [12, 14], [14, 16],
  // Left Leg
  [23, 25], [25, 27],
  // Right Leg
  [24, 26], [26, 28],
];

export class PoseTracker {
  constructor({ videoElement, canvasElement, onLandmarks, onStatusChange }) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.onLandmarks = onLandmarks;
    this.onStatusChange = onStatusChange || (() => {});

    this.pose = null;
    this.stream = null;
    this.isRunning = false;
    this.isDetecting = false;
    this.simulatedLandmarks = null;
    this.isPoseMatching = false;
    this.particles = [];
  }

  async init() {
    console.log('[PoseTracker] Initializing MediaPipe Pose vision engine...');
    this.onStatusChange({ status: 'loading', message: 'Awakening forest vision...' });

    // Wait until MediaPipe Pose is available on window (or dynamically load if missing)
    let attempts = 0;
    while (!window.Pose && attempts < 40) {
      await new Promise(r => setTimeout(r, 150));
      attempts++;
    }

    if (!window.Pose) {
      console.warn('[PoseTracker] window.Pose not detected after waiting. Attempting dynamic script injection from CDN...');
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js';
          script.crossOrigin = 'anonymous';
          script.onload = () => {
            console.log('[PoseTracker] Dynamic MediaPipe Pose script tag loaded successfully.');
            resolve();
          };
          script.onerror = (e) => reject(new Error('Failed to fetch MediaPipe Pose script from CDN'));
          document.head.appendChild(script);
        });
      } catch (scriptErr) {
        console.error('[PoseTracker] Dynamic script loading failed:', scriptErr);
        throw new Error('MediaPipe Pose library could not be loaded from CDN. Check internet connection.');
      }
    }

    if (!window.Pose) {
      throw new Error('MediaPipe Pose library is unavailable.');
    }

    console.log('[PoseTracker] Instantiating window.Pose with locateFile CDN mapping...');
    this.pose = new window.Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.pose.onResults((results) => this.handleResults(results));

    // Warm-up WASM if supported
    if (typeof this.pose.initialize === 'function') {
      try {
        console.log('[PoseTracker] Pre-initializing MediaPipe Pose WASM binaries...');
        await this.pose.initialize();
        console.log('[PoseTracker] MediaPipe Pose WASM binaries pre-initialized successfully.');
      } catch (wasmErr) {
        console.warn('[PoseTracker] MediaPipe Pose WASM pre-init warning (will initialize on first frame):', wasmErr);
      }
    }

    this.onStatusChange({ status: 'ready', message: 'Vision ready! Starting camera...' });
    console.log('[PoseTracker] MediaPipe Pose engine initialized and ready!');
  }

  async startCamera() {
    console.log('[PoseTracker] startCamera() triggered.');

    // 1. Ensure MediaPipe Pose is initialized
    if (!this.pose) {
      console.log('[PoseTracker] MediaPipe Pose not yet initialized. Calling init() now...');
      try {
        await this.init();
      } catch (initErr) {
        console.error('[PoseTracker] MediaPipe Pose initialization error during startCamera:', initErr);
      }
    }

    try {
      if (this.stream) {
        console.log('[PoseTracker] Stopping previous media stream before requesting new stream...');
        this.stopCamera();
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errorMsg = 'navigator.mediaDevices.getUserMedia is not supported on this browser or insecure context (use http://localhost or HTTPS).';
        console.error('[PoseTracker]', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('[PoseTracker] Requesting webcam stream via navigator.mediaDevices.getUserMedia...');
      let stream = null;
      try {
        // Try ideal resolution first
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: false,
        });
        console.log('[PoseTracker] Camera stream successfully acquired with ideal constraints (1280x720, user).');
      } catch (constraintErr) {
        console.warn('[PoseTracker] Ideal constraints failed, falling back to basic { video: true }:', constraintErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        console.log('[PoseTracker] Camera stream acquired with fallback basic { video: true } constraints.');
      }

      this.stream = stream;
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        const settings = videoTracks[0].getSettings ? videoTracks[0].getSettings() : {};
        console.log(`[PoseTracker] Active video track: label="${videoTracks[0].label}", resolution=${settings.width || 'auto'}x${settings.height || 'auto'}`);
      }

      this.video.muted = true;
      this.video.playsInline = true;
      this.video.srcObject = this.stream;
      console.log('[PoseTracker] Bound stream to video element. Awaiting video playback...');

      // Robust check for video metadata & playback start (handles already-loaded readyState)
      await new Promise((resolve) => {
        let isDone = false;
        const complete = () => {
          if (!isDone) {
            isDone = true;
            console.log(`[PoseTracker] Video playback active! Dimensions: ${this.video.videoWidth}x${this.video.videoHeight}, readyState: ${this.video.readyState}`);
            resolve();
          }
        };

        if (this.video.readyState >= 2 && !this.video.paused) {
          complete();
          return;
        }

        this.video.onloadedmetadata = () => {
          console.log('[PoseTracker] Video event: onloadedmetadata fired');
          this.video.play().then(complete).catch(err => {
            console.warn('[PoseTracker] video.play() warning on loadedmetadata:', err);
            complete();
          });
        };

        this.video.onloadeddata = () => {
          console.log('[PoseTracker] Video event: onloadeddata fired');
          this.video.play().then(complete).catch(err => {
            console.warn('[PoseTracker] video.play() warning on loadeddata:', err);
            complete();
          });
        };

        // Safety timeout so initialization never hangs if event already fired
        setTimeout(() => {
          if (!isDone) {
            console.log('[PoseTracker] Event listener timeout reached (1000ms), forcing video.play()...');
            this.video.play().then(complete).catch(err => {
              console.warn('[PoseTracker] Force play() warning after timeout:', err);
              complete();
            });
          }
        }, 1000);
      });

      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());

      this.isRunning = true;
      this.onStatusChange({ status: 'running', message: 'Camera active. Step into view!' });
      console.log('[PoseTracker] Camera active. Starting detection frame loop...');
      this.startDetectionLoop();
    } catch (err) {
      console.error('[PoseTracker] Camera access error in startCamera():', err);
      this.onStatusChange({
        status: 'error',
        message: `Camera error: ${err.name || ''} ${err.message || 'Permission denied'}. Try "Simulate Freeze Pose" to test!`,
      });
      throw err;
    }
  }

  stopCamera() {
    this.isRunning = false;
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
    this.clearCanvas();
    this.onStatusChange({ status: 'stopped', message: 'Camera stopped.' });
  }

  resizeCanvas() {
    if (!this.video || !this.canvas) return;
    const w = this.video.videoWidth || 640;
    const h = this.video.videoHeight || 480;
    this.canvas.width = w;
    this.canvas.height = h;
  }

  clearCanvas() {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  async startDetectionLoop() {
    const loop = async () => {
      if (!this.isRunning) return;

      if (this.simulatedLandmarks) {
        // Mock testing mode
        this.renderSimulated();
        requestAnimationFrame(loop);
        return;
      }

      if (
        this.video &&
        this.video.readyState >= 2 &&
        !this.isDetecting &&
        this.pose
      ) {
        this.isDetecting = true;
        try {
          await this.pose.send({ image: this.video });
        } catch (e) {
          console.warn('Pose send frame error:', e);
        } finally {
          this.isDetecting = false;
        }
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  setMatchingState(isMatching) {
    this.isPoseMatching = isMatching;
  }

  handleResults(results) {
    this.resizeCanvas();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const landmarks = results.poseLandmarks;

    if (landmarks && landmarks.length > 0) {
      this.drawMagicSkeleton(landmarks);
      if (this.onLandmarks) {
        this.onLandmarks(landmarks);
      }
    } else {
      if (this.onLandmarks) {
        this.onLandmarks(null);
      }
    }
  }

  drawMagicSkeleton(landmarks) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Glowing style based on whether the pose is currently matching
    const strokeColor = this.isPoseMatching ? '#fbbf24' : '#34d399';
    const glowColor = this.isPoseMatching ? 'rgba(251, 191, 36, 0.8)' : 'rgba(52, 211, 153, 0.6)';
    const jointColor = this.isPoseMatching ? '#fef08a' : '#6ee7b7';

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Draw enchanted connecting vines / bones
    POSE_CONNECTIONS.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];

      if (!p1 || !p2) return;
      if ((p1.visibility || 1) < 0.35 || (p2.visibility || 1) < 0.35) return;

      const x1 = p1.x * w;
      const y1 = p1.y * h;
      const x2 = p2.x * w;
      const y2 = p2.y * h;

      // Glow layer
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = this.isPoseMatching ? 10 : 6;
      ctx.strokeStyle = glowColor;
      ctx.shadowBlur = this.isPoseMatching ? 20 : 10;
      ctx.shadowColor = strokeColor;
      ctx.stroke();

      // Sharp inner magical core line
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.stroke();
    });

    // 2. Draw magical glowing joint nodes
    // Highlighted key joints: Wrists (15, 16), Shoulders (11, 12), Elbows (13, 14), Nose (0)
    const keyJoints = [0, 11, 12, 13, 14, 15, 16, 23, 24];

    keyJoints.forEach(idx => {
      const p = landmarks[idx];
      if (!p || (p.visibility || 1) < 0.35) return;

      const x = p.x * w;
      const y = p.y * h;
      const isWrist = (idx === 15 || idx === 16);
      const radius = isWrist ? (this.isPoseMatching ? 14 : 10) : 7;

      // Outer glow
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = jointColor;
      ctx.shadowBlur = isWrist ? 25 : 12;
      ctx.shadowColor = isWrist ? '#f59e0b' : '#10b981';
      ctx.fill();

      // Inner white star core
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.fill();

      // Emit particles on wrists if matching
      if (isWrist && this.isPoseMatching && Math.random() < 0.3) {
        this.particles.push({
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 3,
          vy: -Math.random() * 3 - 1,
          size: Math.random() * 5 + 2,
          alpha: 1,
          color: Math.random() > 0.5 ? '#fef08a' : '#86efac'
        });
      }
    });

    // 3. Draw & update magical sparkle particles
    for (let k = this.particles.length - 1; k >= 0; k--) {
      const part = this.particles[k];
      part.x += part.vx;
      part.y += part.vy;
      part.alpha -= 0.03;
      part.size *= 0.95;

      if (part.alpha <= 0) {
        this.particles.splice(k, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = part.alpha;
      ctx.fillStyle = part.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = part.color;
      ctx.beginPath();
      ctx.arc(part.x, part.y, Math.max(1, part.size), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  // Simulation mode for testing without a physical webcam
  simulatePose(mockLandmarks) {
    this.simulatedLandmarks = mockLandmarks;
    if (!this.isRunning) {
      this.isRunning = true;
      this.canvas.width = 640;
      this.canvas.height = 480;
      this.startDetectionLoop();
    }
  }

  clearSimulation() {
    this.simulatedLandmarks = null;
  }

  renderSimulated() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.simulatedLandmarks) {
      this.drawMagicSkeleton(this.simulatedLandmarks);
      if (this.onLandmarks) {
        this.onLandmarks(this.simulatedLandmarks);
      }
    }
  }
}
