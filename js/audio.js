/**
 * Enchanted Forest Audio Engine (Web Audio API)
 * Generates upbeat freeze dance music, rhythmic beats, countdown beeps,
 * crystal freeze effects, celebratory fanfares, and coin chimes!
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.beatInterval = null;
    this.beatStep = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.bgAudio = document.getElementById('bg-music');
    this.potsBgAudio = document.getElementById('pots-bg-music');
  }

  playBgMusic() {
    this.pausePotsBgMusic();
    if (!this.bgAudio) {
      this.bgAudio = document.getElementById('bg-music');
    }
    if (this.bgAudio && !this.muted) {
      this.bgAudio.volume = 0.2; // Low background volume
      this.bgAudio.play().catch(err => {
        console.log('Background music play error or blocked:', err);
      });
    }
  }

  pauseBgMusic() {
    if (!this.bgAudio) {
      this.bgAudio = document.getElementById('bg-music');
    }
    if (this.bgAudio) {
      this.bgAudio.pause();
    }
  }

  playPotsBgMusic() {
    this.pauseBgMusic();
    if (!this.potsBgAudio) {
      this.potsBgAudio = document.getElementById('pots-bg-music');
    }
    if (this.potsBgAudio && !this.muted) {
      this.potsBgAudio.volume = 0.25; // Energetic background volume
      this.potsBgAudio.play().catch(err => {
        console.log('Pots music play error or blocked:', err);
      });
    }
  }

  pausePotsBgMusic() {
    if (!this.potsBgAudio) {
      this.potsBgAudio = document.getElementById('pots-bg-music');
    }
    if (this.potsBgAudio) {
      this.potsBgAudio.pause();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopDanceBeat();
      this.pauseBgMusic();
      this.pausePotsBgMusic();
    } else {
      if (window.game && window.game.gameMode === 'SHOOT_THE_POTS') {
        this.playPotsBgMusic();
      } else {
        this.playBgMusic();
      }
    }
    return this.muted;
  }

  /**
   * Upbeat Funky Freeze Dance Beat for the "JUMP! JUMP! JUMP!" Action Phase
   * Synthesizes dynamic kicks, bouncy basslines, and percussion in real time!
   */
  startDanceBeat() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    this.stopDanceBeat();
    this.beatStep = 0;

    // Upbeat 128 BPM = ~117ms per 16th note, ~234ms per 8th note
    const tempoInterval = 234; // 8th note pulse

    const bassNotes = [
      130.81, // C3
      130.81, // C3
      155.56, // Eb3
      174.61, // F3
      196.00, // G3
      174.61, // F3
      155.56, // Eb3
      196.00  // G3
    ];

    this.beatInterval = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const step = this.beatStep % 8;

      // 1. Kick Drum on beats 0, 2, 4, 6 (Quarter notes)
      if (step % 2 === 0) {
        this.playKick(t);
      }

      // 2. Snappy Clap / Hi-Hat on offbeats
      if (step % 4 === 2) {
        this.playSnare(t);
      } else {
        this.playHiHat(t);
      }

      // 3. Bouncy Bass Synthesizer note
      const bassFreq = bassNotes[step];
      this.playBassNote(t, bassFreq);

      this.beatStep++;
    }, tempoInterval);
  }

  stopDanceBeat() {
    if (this.beatInterval) {
      clearInterval(this.beatInterval);
      this.beatInterval = null;
    }
  }

  playKick(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  playSnare(t) {
    // Noise buffer for snap
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.02));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
  }

  playHiHat(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(8000, t);
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.045);
  }

  playBassNote(t, freq) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.19);
  }

  /**
   * Dramatic Countdown Beeps (3, 2, 1)
   */
  playCountdownTick(number) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Ascending pitch for urgency
    const freqs = { 3: 440, 2: 554.37, 1: 739.99 };
    const f = freqs[number] || 500;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, t);
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.19);
  }

  /**
   * Dramatic "FREEZE!" Crystal Sound Effect
   */
  playFreezeSwoosh() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Chime sweep downward into icy freeze
    [1200, 950, 700, 520].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.03);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + idx * 0.03 + 0.25);

      gain.gain.setValueAtTime(0.2, t + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.03 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.03);
      osc.stop(t + idx * 0.03 + 0.32);
    });
  }

  /**
   * Hold Pose Tick (as seconds count down in Freeze phase)
   */
  playTick(step = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    const f = freqs[step % freqs.length];

    osc.frequency.setValueAtTime(f, t);
    osc.frequency.exponentialRampToValueAtTime(f * 1.2, t + 0.12);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  /**
   * Triumphant Win & Pose Success Fanfare
   */
  playSuccess() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [
      { f: 523.25, t: 0.00, dur: 0.18 }, // C5
      { f: 659.25, t: 0.12, dur: 0.18 }, // E5
      { f: 783.99, t: 0.24, dur: 0.18 }, // G5
      { f: 1046.5, t: 0.36, dur: 0.40 }, // C6
      { f: 1318.5, t: 0.48, dur: 0.55 }, // E6
    ];

    const baseTime = this.ctx.currentTime;

    notes.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, baseTime + note.t);

      gain.gain.setValueAtTime(0, baseTime + note.t);
      gain.gain.linearRampToValueAtTime(0.3, baseTime + note.t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, baseTime + note.t + note.dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(baseTime + note.t);
      osc.stop(baseTime + note.t + note.dur + 0.05);
    });
  }

  /**
   * Energy Coin collection chime
   */
  playCoin() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(987.77, t);
    osc1.frequency.setValueAtTime(1318.51, t + 0.08);

    osc2.frequency.setValueAtTime(1975.53, t);
    osc2.frequency.setValueAtTime(2637.02, t + 0.08);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.46);
    osc2.stop(t + 0.46);
  }

  /**
   * Terracotta Ceramic Pot Crash & Shatter Sound Effect
   */
  playPotCrash() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Ceramic Ring (High resonant ping)
    const clinkOsc = this.ctx.createOscillator();
    const clinkGain = this.ctx.createGain();
    clinkOsc.type = 'triangle';
    clinkOsc.frequency.setValueAtTime(1400, now);
    clinkOsc.frequency.exponentialRampToValueAtTime(320, now + 0.18);
    clinkGain.gain.setValueAtTime(0.7, now);
    clinkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    clinkOsc.connect(clinkGain);
    clinkGain.connect(this.ctx.destination);
    clinkOsc.start(now);
    clinkOsc.stop(now + 0.22);

    // 2. Secondary Harmonic Clink
    const clinkOsc2 = this.ctx.createOscillator();
    const clinkGain2 = this.ctx.createGain();
    clinkOsc2.type = 'sine';
    clinkOsc2.frequency.setValueAtTime(2200, now);
    clinkOsc2.frequency.exponentialRampToValueAtTime(800, now + 0.12);
    clinkGain2.gain.setValueAtTime(0.5, now);
    clinkGain2.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    clinkOsc2.connect(clinkGain2);
    clinkGain2.connect(this.ctx.destination);
    clinkOsc2.start(now);
    clinkOsc2.stop(now + 0.14);

    // 3. Ceramic Shatter Noise Burst
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.15);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.Q.setValueAtTime(3.0, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(now);

    // 4. Punchy Impact Thud
    const thudOsc = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(160, now);
    thudOsc.frequency.exponentialRampToValueAtTime(45, now + 0.15);
    thudGain.gain.setValueAtTime(0.6, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    thudOsc.connect(thudGain);
    thudGain.connect(this.ctx.destination);
    thudOsc.start(now);
    thudOsc.stop(now + 0.16);
  }

  /**
   * Letter Snap sound effect when 3 letters snap together
   */
  playLetterSnap() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12); // C6
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Brief, soft two-tone "yip-yip" puppy mascot chime right before puppy speaks
   */
  playYipYipChime() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Tone 1: quick cheerful chirp (920Hz -> 1380Hz)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(920, now);
    osc1.frequency.exponentialRampToValueAtTime(1380, now + 0.05);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.07);

    // Tone 2: playful perk (1220Hz -> 1760Hz)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1220, now + 0.065);
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.13);
    gain2.gain.setValueAtTime(0.14, now + 0.065);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now + 0.065);
    osc2.stop(now + 0.155);
  }

  /**
   * Soft, cheerful pop sound effect for pot hit
   */
  playSoftPop() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(960, now + 0.07);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  /**
   * Camera Shutter Snapshot Sound Effect for Show & Tell Art
   */
  playCameraShutter() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Click 1: shutter open
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1200, now);
    osc1.frequency.exponentialRampToValueAtTime(150, now + 0.04);
    gain1.gain.setValueAtTime(0.5, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.055);

    // Click 2: shutter snap shut
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1450, now + 0.045);
    osc2.frequency.exponentialRampToValueAtTime(200, now + 0.09);
    gain2.gain.setValueAtTime(0.6, now + 0.045);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now + 0.045);
    osc2.stop(now + 0.105);
  }
}

export const soundEngine = new SoundEngine();
