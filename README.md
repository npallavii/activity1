# 🌿 Frolic Forest: Freeze & Pose

An interactive, motion-tracked active web game for kids built with **vanilla JavaScript**, **Tailwind CSS**, and **Google MediaPipe Pose Tracking**.

---

## 🌟 Features

- **Google MediaPipe Pose Tracking**: Real-time AI skeleton tracking directly in the browser via webcam with no backend requirements.
- **Enchanted Forest Theme**: Rich animated CSS gradients, bioluminescent firefly particles, glowing magical vine skeletons, and playful child-friendly typography (`Fredoka`).
- **Target Poses with Stick Figure Guides**:
  - ☀️ **Sun Reacher**: Hands raised high above head reaching for the magic sunlight.
  - 🦅 **Forest Eagle**: Arms outstretched horizontally like soaring wings (T-Pose).
  - 🌲 **Mighty Oak**: Cactus / goalpost branches pose.
  - ⚡ **Forest Guardian**: One hand punching to the sky, one hand on the hip.
- **Mirrored Magic Mirror**: Webcam feed is mirrored horizontally for intuitive body coordination, with overlay canvas drawing glowing neon joints and connection lines.
- **3-Second Hold Win Condition**:
  - Circular visual countdown ring + 3s, 2s, 1s charging progress bar.
  - Web Audio API procedural sound engine: Fairy tick chime on count, celebratory victory fanfare, and coin chime.
  - Radiant screen flash and multi-color confetti explosion.
  - Animated **"GREAT JOB!"** celebration modal.
  - **+10 Energy Coins** added to the top-right coin counter with a flying coin animation and local persistence!
- **Instant Testing Simulator**: Includes a **"Simulate Pose"** button to preview and verify the full 3-second hold and win flow instantly without requiring a webcam.

---

## 🚀 Running the Game

The local server is already running! You can open:

```
http://localhost:3000
```

To run or restart the server manually:

```bash
# Using Node.js
node server.js
# Or
npm start
```

---

## 📁 Project Structure

```
kids-active-app/
├── index.html         # Main enchanted forest interface and layout
├── server.js          # Lightweight Node.js local HTTP server
├── package.json       # Project configuration and start scripts
├── css/
│   └── styles.css     # Enchanted forest styling, firefly motes, glassmorphic cards
└── js/
    ├── app.js         # Game controller, 3s hold timer, win triggers & coin rewards
    ├── audio.js       # Web Audio API procedural sound synthesizer (fanfare, coin, tick)
    ├── poses.js       # Target pose definitions and landmark evaluation logic
    └── poseDetector.js# Google MediaPipe Pose tracker & glowing skeleton canvas overlay
```
