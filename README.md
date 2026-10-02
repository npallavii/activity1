# 🌿 Frolic Forest: Freeze Dance & Pose

An interactive, motion-tracked active web game for kids built with **vanilla JavaScript**, **Tailwind CSS**, and **Google MediaPipe Pose Tracking**. Inspired by active freeze dance videos (like Danny Go / GoNoodle).

---

## 🎵 Polished Audio & Friendly Voice Experience

- **Looping Background Music**: HTML5 `<audio>` element playing an upbeat background track on a loop at a pleasant low volume (`volume = 0.2`).
- **Enthusiastic & Friendly Voiceover (Pitch 1.4)**:
  - Default speech pitch set to **1.4** for a noticeably higher, cheerful, and encouraging sound.
  - Smart voice selector function (`selectFriendlyVoice`) that searches through `window.speechSynthesis.getVoices()`:
    1. Looks for **'Google UK English Female'**
    2. Looks for **'Microsoft Zira'**
    3. Falls back to the first available friendly female voice (*Samantha*, *Jenny*, *Victoria*, etc.)
    4. Falls back to any clear English voice.
- **Autoplay Compliance (Big Colorful 'Start Game' Button)**:
  - An enchanted initial welcome overlay covers the screen on load.
  - To respect browser autoplay and media permission policies, **the game loop, camera tracking, background music, and voiceovers ONLY start after the user clicks the big, colorful 'START GAME' button!**

---

## 🎮 Continuous 3-Phase Freeze Dance Loop with Voice Commands

Powered by the browser's native **Web Speech API (`window.speechSynthesis`)**, every phase transition has synchronous, enthusiastic kid-friendly voiceovers so children don't have to read the screen:

1. **🏃 Phase 1: Action Phase ("JUMP! JUMP! JUMP!" - 5s)**
   - Voice says loudly: **"Jump! Jump! Jump!"**
   - Screen displays giant energetic bouncing letters: **"JUMP! JUMP! JUMP!"**
   - Synthesizes an upbeat groovy freeze-dance beat with funky bassline and punchy drums via Web Audio API.
   - Real-time jump detection tracks player vertical motion (`Jumps Detected: 🔥`).
   - 5-second countdown progress bar.

2. **⏱️ Phase 2: Countdown Phase ("3, 2, 1" - 3s)**
   - Music halts dramatically.
   - Voice speaks synchronously with each number: **"Three... Two... One..."**
   - Giant pulsating numbers count down: **3 ➔ 2 ➔ 1** with ascending alert beeps.
   - Teases the upcoming yoga pose so players can prepare!

3. **❄️ Phase 3: Freeze Phase ("FREEZE!" - 3s Hold)**
   - Screen flashes an icy freeze banner: **"❄️ FREEZE!"**
   - Voice announces: **"Freeze! Tree Pose!"**
   - Displays the target yoga pose (e.g. **Tree Pose 🌲**, Sun Reacher ☀️, Forest Eagle 🦅, Forest Star ⭐, Guardian ⚡).
   - Mirrored webcam view tracks player posture and shows a 3-second circular countdown ring (`3s... 2s... 1s`).
   - **Win Condition**: Holding the pose for 3 seconds:
     - Voice enthusiastically cheers: **"Wow! Completed! Great job!"**
     - Awards **+10 Energy Coins** with flying coin animation.
     - Plays victorious fanfare & coin collection chimes.
     - Launches full-screen confetti & screen flash.
     - Flashes the **"GREAT JOB!"** celebration modal.
     - **Automatically restarts the loop** back to **Phase 1: JUMP! JUMP! JUMP!** with a new pose queued up!

---

## 🚀 Testing in Your Browser

Open your browser and navigate to:

```
http://localhost:3000
```

### Quick Controls
- **"🎮 Start Dance Loop"**: Begins the continuous 3-phase game loop.
- **"✨ Simulate Freeze Pose"**: Tests the 3-second hold and win condition immediately without needing a webcam.
- **"⏭️ Skip Phase"**: Fast-forwards to the next phase.
- **"🔊 Mute"**: Mutes/unmutes the sound synthesizer and dance beat.

---

## 📁 Project Structure

```
kids-active-app/
├── index.html         # Main interface, 3-phase HUD, action/countdown/freeze overlays
├── server.js          # Lightweight Node.js local HTTP server
├── package.json       # Project scripts
├── css/
│   └── styles.css     # Jump bounce, countdown pop, frost glow, fireflies
└── js/
    ├── app.js         # Continuous 3-phase state machine & win loop
    ├── audio.js       # Web Audio API dance beats, countdown beeps, freeze swoosh, fanfare
    ├── poses.js       # Tree Pose, Sun Reacher, Eagle, Star, Guardian & evaluator logic
    └── poseDetector.js# Google MediaPipe Pose tracker & glowing skeleton canvas overlay
```
