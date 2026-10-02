/**
 * Voice Engine using browser native Web Speech API (window.speechSynthesis)
 * Configured with a cute, friendly "Little Puppy" companion character:
 * - Pitch 1.6 (youthful, light, cartoon-like tone)
 * - Rate 1.1 (bouncy, energetic pacing)
 * - Clean voice selection preferring Natural & high-clarity voices
 * - Interactive two-tone "yip-yip" chime accent right before the puppy speaks
 */
import { soundEngine } from './audio.js';

/**
 * Loops through window.speechSynthesis.getVoices() and picks the cleanest, smoothest available voice:
 * 1. Voices containing 'Natural' (e.g. Microsoft Natural voices on Edge/Windows)
 * 2. 'Google UK English Female' or other Google female voices
 * 3. High-clarity female voices responding best to pitch shifts without robotic distortion
 * 4. Fallback to first English voice
 * 5. Fallback to first available voice
 */
export function selectFriendlyVoice(voices) {
  if (!voices || voices.length === 0) return null;

  // 1. Prefer high-quality 'Natural' voices (exceptionally smooth at pitch 1.6)
  for (let i = 0; i < voices.length; i++) {
    const nameLower = voices[i].name.toLowerCase();
    if (nameLower.includes('natural') && (voices[i].lang.startsWith('en') || !voices[i].lang)) {
      return voices[i];
    }
  }

  // 2. Prefer 'Google UK English Female' or Google English voices
  for (let i = 0; i < voices.length; i++) {
    if (voices[i].name.includes('Google UK English Female')) {
      return voices[i];
    }
  }
  for (let i = 0; i < voices.length; i++) {
    if (voices[i].name.includes('Google US English') || voices[i].name.includes('Google UK English')) {
      return voices[i];
    }
  }

  // 3. Prefer high-clarity female voices which respond best to pitch shifts
  const highClarityKeywords = [
    'female', 'zira', 'samantha', 'victoria', 'karen', 'jenny', 'aria',
    'hazel', 'fiona', 'moira', 'tessa', 'eva', 'serena', 'allison', 'ava'
  ];
  for (let i = 0; i < voices.length; i++) {
    const nameLower = voices[i].name.toLowerCase();
    for (let k = 0; k < highClarityKeywords.length; k++) {
      if (nameLower.includes(highClarityKeywords[k])) {
        return voices[i];
      }
    }
  }

  // 4. Fallback to first English voice
  for (let i = 0; i < voices.length; i++) {
    if (voices[i].lang && voices[i].lang.startsWith('en')) {
      return voices[i];
    }
  }

  return voices[0] || null;
}

class VoiceEngine {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.voices = [];
    this.selectedVoice = null;
    this.muted = false;
    this.activeUtterances = new Set(); // Prevent garbage collection bug in Chrome

    if (this.synth) {
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  initVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    this.selectedVoice = selectFriendlyVoice(this.voices);
  }

  setMuted(isMuted) {
    this.muted = isMuted;
    if (this.muted && this.synth) {
      this.synth.cancel();
      this.activeUtterances.clear();
    }
  }

  /**
   * Speak text with cute, friendly "little puppy" character settings:
   * - Pitch 1.6 (youthful, light, cartoon tone)
   * - Rate 1.1 (bouncy, energetic pacing)
   * - Optional soft two-tone "yip-yip" mascot chime right before speech
   */
  speak(text, { pitch = 1.6, rate = 1.1, volume = 1.0, interrupt = true, chime = true } = {}) {
    if (this.muted || !this.synth) return;

    // Refresh voices if not yet cached
    if (!this.selectedVoice) {
      this.initVoices();
    }

    if (interrupt) {
      this.synth.cancel();
      this.activeUtterances.clear();
    }

    // Play cheerful two-tone "yip-yip" mascot chime
    if (chime) {
      soundEngine.playYipYipChime();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.pitch = pitch;   // 1.6: puppy character pitch
    utterance.rate = rate;     // 1.1: energetic puppy pacing
    utterance.volume = volume; // Full clear volume

    // Store in Set to prevent premature garbage collection in Chrome
    this.activeUtterances.add(utterance);
    utterance.onend = () => {
      this.activeUtterances.delete(utterance);
    };
    utterance.onerror = () => {
      this.activeUtterances.delete(utterance);
    };

    // Brief 75ms space so the mascot yip-yip chime rings delightfully right before the puppy speaks
    const speakDelay = chime ? 75 : 0;
    setTimeout(() => {
      if (this.synth.paused) {
        this.synth.resume();
      }
      this.synth.speak(utterance);
    }, speakDelay);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.activeUtterances.clear();
    }
  }
}

export const voiceEngine = new VoiceEngine();
