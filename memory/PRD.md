# Carrom Match Assistant — PRD

## Problem statement
Build a professional mobile assistant for scoring International Carrom Federation matches, including setup, toss/break assignment, live board scoring, queen rules, dues, seat rotation, history, theme controls, and an ICF rules reference.

## Architecture
- Expo React Native mobile client with Expo Router entry, React state, MaterialCommunityIcons, AsyncStorage persistence, and responsive portrait/landscape layout.
- Local active-match cache is stored in AsyncStorage and hydrated before the first screen renders.
- Scoring state includes match configuration, score totals, board history, dues, break index, and seat positions.

## User personas
- Club scorer managing an official singles or doubles match.
- Casual players who need a clear, fast board-by-board scorekeeper.
- Referee or spectator reviewing board history and ICF scoring rules.

## Core requirements (static)
- Singles and doubles match setup.
- Toss winner and opening break selection.
- ICF scoring: opponent men count, queen +3 below 22, 25-point / 8-board cap.
- Due/foul counters, seat rotation, break rotation, and board history.
- Dark/light theme control, rules reference, reset confirmation.
- Adaptive layouts with safe touch targets and local persistence.
- Odd-board set series configuration (single/best-of-3/5/7, 3/5/7 boards per set) with automatic, manual, no-rotation, and per-set rotation modes.

## Implemented (2026-08-25)
- Replaced starter placeholder with complete setup → toss → active match flow.
- Added responsive visual carrom board, seat badges, break indicator, scoreboard, due tracker, resolution controls, and named board history.
- Added series settings, set rollover, visible set progress/set score, odd board limits, manual rotation action, per-set rotation, and final-set board-four crossover.
- Added ICF rules sheet with official rules link, theme palette switching, accessibility labels, stable test IDs, and persistence hydration.
- Verified through repeated Expo preview regression testing, including landscape and cold reload restoration.

## Prioritized backlog
- P0: None for the current scorer flow.
- P1: Add a dedicated saved-match history screen for multiple completed matches.
- P1: Add export/share of match results and board breakdown.
- P2: Add haptic/animation preferences and referee notes.
- P2: Add optional remote sync when a backend match service is desired.

## Next tasks
- Add multi-match archive and searchable history.
- Add shareable final scorecard for club records.
- Add richer foul categories and configurable house rules.