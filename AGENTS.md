# AGENTS.md — Contributor & AI-Agent Guide

This file is a quick-start manual for **any AI agent (or human developer)** picking up work on the Carrom Match Assistant repo. Read this before making changes.

## 🧠 Product Summary

An offline-first mobile scorekeeper for Carrom matches, following International Carrom Federation (ICF) rules. Users set up singles/doubles matches, toss for the break, and score board-by-board with dues, queen coverage, seat rotation, and history. No accounts, no server calls.

## 🏗️ Tech & Layout

- **Runtime:** Expo SDK 54 · React Native 0.81 · TypeScript
- **Routing:** expo-router (file-based) — screens live in `frontend/app/`
- **Storage:** `@react-native-async-storage/async-storage` under key `carrom-match`
- **Audio:** `expo-audio` (`chime.wav` in `frontend/assets/`)
- **Package manager:** yarn 1.22 — do not switch to npm/pnpm

### Key files

```
frontend/
├── app/
│   ├── _layout.tsx        # safe-area provider, icon prewarm (keep prewarm logic intact)
│   └── index.tsx          # ENTIRE app — setup / toss / active / modals / styles
├── assets/
│   ├── chime.wav          # board-complete sound
│   └── images/            # icon, splash
├── src/utils/storage/     # cross-platform kv helpers (prefer these over raw AsyncStorage in new features)
├── app.json               # Expo config — bundle identifiers, permissions
└── package.json           # yarn 1.22, resolutions pinned
```

## 🧮 Match Engine (see `frontend/app/index.tsx`)

- **State:** single `Match` object held in a React state hook. Board history is appended in `completeBoard()`.
- **Scoring:** `points = min(opponentMenLeft + queenBonus, 25 - currentScore)`. Queen bonus is `+3` only when the winner is under 22 AND `queenEligible` is true.
- **Set/series completion:** a set ends when either team reaches 25 or when `boardsPerSet` boards have been played (unless `boardsPerSet === 0`, which means unlimited).
- **Tie-break:** if the score is level after the final board, `tieBreak` flag is set and one more decider board is played.
- **Rotation:** happens only when a set completes.
  - Singles: swap N ↔ S.
  - Doubles: shift the four seats one position clockwise (`[N,E,S,W] → [W,N,E,S]`).
- **Break indicator (⚡):** advances one seat clockwise every set.

## 🎨 Theming

- Dark is default. Light theme is toggled via the app-bar sun/moon icon.
- Because the codebase is a single-file StyleSheet, most components accept a `light` prop and merge a `lightXxx` style variant.
- When adding new components/styles, ALWAYS provide both variants and verify contrast (dark text on light bg, light text on dark bg). Use dev-tools computed style checks before shipping.

## ✅ House Rules

1. **Do not add a backend.** The product is intentionally offline. Never wire in FastAPI / MongoDB unless the user explicitly asks.
2. **Keep everything in TypeScript.** No `.js` source files.
3. **React Native components only** — no HTML tags, no CSS files, no `className`.
4. **Wrap every string in `<Text>`.**
5. **Every interactive element needs a `testID`** in kebab-case describing its role (e.g. `winner-a`, `complete-board`).
6. **Do not break the icon prewarm logic** in `app/_layout.tsx` — Expo Go on Android depends on it.
7. **Do not edit protected files:** `frontend/eas.json`, `frontend/metro.config.js`, `EXPO_PACKAGER_*` in `frontend/.env`.
8. **Cross-platform confirmations:** `Alert.alert` does not work on web. Use `window.confirm(...)` when `Platform.OS === "web"`.
9. **Prefer parallel edits.** When touching multiple styles/components at once, batch tool calls.
10. **Lint before dispatching testing:** `expo lint` should be clean.

## 🧪 Testing

- No unit-test suite is required for this repo — verification happens through the `testing_agent` and screenshot tool.
- If you add new interactive UI, expose `testID`s so future agents can drive it.
- Manual smoke checklist (both themes, both singles/doubles):
  1. Setup → Toss → Active flow completes
  2. Board history updates
  3. Seat rotation after a full set
  4. Tie-break board triggers when scores are level after the final board
  5. Reset flow clears state on both web (window.confirm) and native (Alert.alert)

## 🚢 Publishing

Users publish via the Emergent **Publish** button (top right of the workspace). This handles:
- Deployment
- iOS + Android production builds via managed EAS
- Secret propagation from preview `.env` into the production secret store

Do NOT hand-edit `frontend/eas.json` or invoke EAS CLI directly.

## 📚 Reference Documents

- `README.md` — user-facing description
- `memory/PRD.md` — product spec history
- `memory/test_credentials.md` — auth test creds (empty for this offline app)
- `test_reports/iteration_*.json` — historical testing-agent runs

## ✍️ Coding Style Cheatsheet

- `useState` for local state; no Redux, no Zustand.
- `StyleSheet.create` for styles; no inline objects unless dynamic.
- Prefer small components (< 50 lines) when adding new ones.
- Keep new files under `frontend/src/components/` if the single-file structure ever gets refactored.
- Avoid over-engineering — build only what the current request needs.

Happy shipping. 🎯
