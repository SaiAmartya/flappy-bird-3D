# 🕊️ AETHERWING — a 3D Flappy Odyssey

> Flap an origami bird through glowing crystal gates, above a glass sea, while the sky itself remembers your score — and the whole world watches the leaderboard.

**AETHERWING** is a fully 3D reimagining of Flappy Bird built with Three.js — a cinematic **side-on camera** watches your bird cross the frame in three-quarter profile while crystal gate columns sweep in from the right, their heights readable as they approach. No bundler, no build step for the frontend: pure ES modules + two tiny serverless functions.

**🎮 Play it live → https://flappy-bird-3d-omega.vercel.app**

---

## ✨ The world

| Feature | How it works |
|---|---|
| **Cinematic side camera** | The bird flies along the world's x-axis, yawed a few degrees toward the viewer. The camera sways gently, follows your altitude, and shakes on impact. Portrait screens automatically widen the FOV and pull back. |
| **Living sky** | A custom GLSL gradient dome with an analytic sun disc + halo. The palette crossfades through four moods — *golden hour → dusk → starlight → dawn* — every 8 gates. Your score literally changes the weather. |
| **Floating islands** | Hexagonal rock shards hanging in the air, capped with grass and low-poly pines, bobbing on the aether across three parallax layers — islands, clouds, and mountains all scroll at different speeds. |
| **Crystal gates** | Rock columns rise from the sea and hang from the sky, tipped with emissive crystals that bloom under an `UnrealBloomPass`. The glowing tips mark the exact collision boundary, and the gates drift gently — the bob is part of the hitbox. |
| **Origami bird** | Procedurally folded from flat-shaded triangles — no models, no textures. Spring-driven wings, velocity-based pitch, a coral crest, and an additive-blended **flight trail** streaming from its tail. |
| **A flock of strangers** | Tiny silhouette birds flap across the far background. The world is alive whether you fly or fall. |
| **Cinematic death** | Feather bursts, a white flash, camera shake, and slow-motion easing to 0.14× time before the score panel rises. |
| **Procedural audio** | Every sound — wing whoosh, pentatonic chimes that climb with your streak, the crash — is synthesized live with WebAudio. No audio files exist in this repo. |
| **Generative soundtrack** | An ambient score (detuned pads, plucked arpeggios, soft bass over Am7 → Fmaj7 → Cmaj7 → G) is composed live by a lookahead scheduler. It brightens when you fly, ducks when you crash, and never repeats exactly. Mute it with the 🔊 button. |

## 🏆 Global leaderboard — and why you can('t) cheat it

The leaderboard is two Vercel serverless functions backed by Vercel Blob storage, designed so the obvious cheats bounce off:

1. **Signed flight tokens** — `POST /api/session` mints an HMAC-SHA256-signed token (server secret, timing-safe comparison) at takeoff. No token, no score.
2. **Physics plausibility** — the game's forward speed caps at 22 u/s with gates 16 u apart, so the server knows the maximum gates a token of a given age could have passed. Claim 500 points on a 6-second token and you get `422 implausible_flight`.
3. **Replay protection** — each token is good for exactly one submission, enforced by an atomic blob write on the token's nonce. Resubmit and you get `409 already_submitted`.
4. **Input hygiene** — names are stripped to a safe charset, length-clamped server-side, and HTML-escaped client-side on render.

*(An honest caveat: any fully client-side game is ultimately simulatable — these defenses stop curl kiddies and replay scripts, not a determined bot that plays the game in real time. That's the same boat the real Flappy Bird was in.)*

## 🎯 How to play

| Input | Action |
|---|---|
| `Space` / `↑` / click / tap | flap |

Pass between the crystal tips. Gaps shrink and the world speeds up as you go. Score ≥ 1 and you can etch your call sign into the global top 100.

## 🛠️ Tech

- **Three.js 0.165** via CDN import map — `EffectComposer` (`RenderPass` → `UnrealBloomPass` → `OutputPass`), ACES filmic tone mapping
- **Custom shaders** — sky dome gradient + sun, per-particle fading flight trail
- **Object pooling** — gate columns and trail particles recycle forever; zero allocation during play
- **Vercel serverless functions** (`api/session.js`, `api/scores.js`) + **Vercel Blob** for persistence
- **WebAudio API** for fully procedural sound
- **Climate Crisis + Outfit** typefaces

## 🚀 Run locally

```bash
git clone https://github.com/SaiAmartya/flappy-bird-3D.git
cd flappy-bird-3D
npm install            # only needed for the leaderboard functions
vercel dev             # full stack — game + API at http://localhost:3000
# or, frontend only (leaderboard shows "offline"):
python3 -m http.server 4173
```

The leaderboard needs two things in your Vercel project: a connected **Blob store** (provides `BLOB_READ_WRITE_TOKEN`) and a `SCORE_SECRET` env var (any long random string).

## 📁 Structure

```
index.html          HUD markup, import map, fonts
api/
  session.js        mints HMAC-signed flight tokens
  scores.js         validated, replay-proof score submission + top-10 reads
src/
  main.js           game loop, state machine, physics, side camera, input
  world.js          sky shader, palettes, ocean, islands, clouds, mountains, flock, stars
  bird.js           procedural origami bird + wing animation
  obstacles.js      pooled crystal gate columns + bobbing collision
  effects.js        particle bursts, score rings, flight trail, camera shake
  audio.js          WebAudio procedural sound synthesis
  leaderboard.js    leaderboard client + rendering
```

---

*created by **Claude Fable 5*** — designed, coded, play-tested, security-tested, and deployed autonomously. 🤖
