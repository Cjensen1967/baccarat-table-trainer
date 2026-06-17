# Baccarat Table Trainer

A modern, mobile-first baccarat dealing and rules trainer designed to feel like a real table from the dealer's perspective — especially in phone landscape mode.

**Live demo:** https://cjensen1967.github.io/baccarat-table-trainer/

---

## Modules

| Module | Status | Description |
|--------|--------|-------------|
| **Guided Trainer** (L1) | ✅ Ready | Step-by-step coached walk-through of every decision. Teaches the third-card sequence with prompts, hints, and a rules reference. |
| **Real Dealing Trainer** (L2) | ✅ Ready | No prompts. Work the hand exactly as you would at a live table — deal cards, call the result, get caught on mistakes. |
| Drill Mode | 🔜 Soon | Rapid-fire single-decision drills to sharpen specific rules. |
| Test Mode | 🔜 Soon | Timed, no-peek assessment with a final score. |
| Missed Hands | 🔜 Soon | Replay and study the hands you got wrong. |
| Progress / Stats | 🔜 Soon | Track accuracy and streaks across every mode. |

---

## Design principles

- **Phone landscape is the primary training layout.** A phone on its side is roughly the shape of a baccarat table. The app takes advantage of that — Banker left, Player right, dealer's perspective.
- **No answer leakage.** Controls, card spots, and visual cues never reveal the correct action before the trainee commits a decision. Feedback appears only after the trainee acts.
- **Implicit stand (L2).** There is no STAND button. Not dealing a card and moving on *is* standing — exactly as at a real table. The engine catches the mistake of standing when a draw was required at the next forward action.
- **Rules trainer, not a casino simulator.** Cards are drawn randomly from an infinite 52-card space. No shoe depletion, burn cards, or penetration tracking.

---

## Baccarat drawing rules

**Player**
- 0–5: Draw a third card
- 6–7: Stand
- 8–9: Natural (no further cards)

**Banker** (after Player acts)
- If Player stood, Banker follows the same 0–5 draw / 6–7 stand rule
- 0–2: Always draw
- 3: Draw unless Player's third card was 8
- 4: Draw if Player's third card was 2–7
- 5: Draw if Player's third card was 4–7
- 6: Draw if Player's third card was 6–7
- 7: Stand
- 8–9: Natural (no further cards)

---

## Project structure

```
baccarat-table-trainer/
├── index.html          Dashboard / home
├── disclaimer.html     Age/disclaimer gate
├── assets/             52 card images (suit+rank.png)
├── css/
│   ├── variables.css   Design tokens
│   ├── base.css        Global reset + shared components
│   ├── table.css       Felt layout + responsive breakpoints
│   └── home.css        Dashboard styles
├── js/core/
│   ├── cards.js        Card model, shoe, rendering
│   ├── rules.js        Baccarat draw rules + outcome logic
│   ├── stats.js        localStorage stats tracking
│   ├── ui.js           Feedback, sheet, active-state helpers
│   └── gate.js         Disclaimer gate
├── guided/             Guided Trainer (L1)
└── dealing/            Real Dealing Trainer (L2)
```

---

## Development notes

Spawned from the [Bac_suite_codex](https://github.com/Cjensen1967/Bac_suite_codex) experimental build. Pure HTML/CSS/JS — no build step, no dependencies beyond Font Awesome (CDN).
