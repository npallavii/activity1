/**
 * Voice Engine using browser native Web Speech API (window.speechSynthesis)
 * Provides enthusiastic, kid-friendly voiceovers with pitch 1.4 and friendly voice selection.
 */

/**
 * Loops through window.speechSynthesis.getVoices() and tries to select a friendly-sounding voice:
 * 1. 'Google UK English Female'
 * 2. 'Microsoft Zira'
 * 3. Fallback to the first available female voice
 * 4. Fallback to first English or first available voice
 */
export function selectFriendlyVoice(voices) {
  if (!voices || voices.length === 0) return null;

  // 1. Look for 'Google UK English Female'
  for (let i = 0; i < voices.length; i++) {
    if (voices[i].name.includes('Google UK English Female')) {
      return voices[i];
    }
  }

  // 2. Look for 'Microsoft Zira'
  for (let i = 0; i < voices.length; i++) {
    if (voices[i].name.includes('Microsoft Zira')) {
      return voices[i];
    }
  }

  // 3. Fallback to the first available female voice
  const femaleKeywords = ['female', 'zira', 'samantha', 'victoria', 'karen', 'jenny', 'hazel', 'fiona', 'moira', 'tessa', 'eva', 'serena'];
  for (let i = 0; i < voices.length; i++) {
    const nameLower = voices[i].name.toLowerCase();
    for (let k = 0; k < femaleKeywords.length; k++) {
      if (nameLower.includes(femaleKeywords[k])) {
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
   * Speak text with enthusiastic kid-friendly settings (default pitch 1.4)
   */
  speak(text, { pitch = 1.4, rate = 1.05, volume = 1.0, interrupt = true } = {}) {
    if (this.muted || !this.synth) return;

    // Refresh voices if not yet cached
    if (!this.selectedVoice) {
      this.initVoices();
    }

    if (interrupt) {
      this.synth.cancel();
      this.activeUtterances.clear();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.pitch = pitch;   // Pitch 1.4: higher and enthusiastic for kids
    utterance.rate = rate;     // Natural, lively cadence
    utterance.volume = volume; // Full clear volume

    // Store in Set to prevent premature garbage collection in Chrome
    this.activeUtterances.add(utterance);
    utterance.onend = () => {
      this.activeUtterances.delete(utterance);
    };
    utterance.onerror = () => {
      this.activeUtterances.delete(utterance);
    };

    if (this.synth.paused) {
      this.synth.resume();
    }

    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.activeUtterances.clear();
    }
  }
}

export const voiceEngine = new VoiceEngine();
