# Baccarat Table Trainer

A free browser-based baccarat dealing and rules trainer, designed for phone landscape, tablet, and desktop.

**Try it:** https://cjensen1967.github.io/baccarat-table-trainer/

## Training modules

- **Guided Trainer:** coached third-card decisions and explanations.
- **Real Dealing Trainer:** practice dealing and declaring outcomes without prompts.
- **Drill Mode:** focused drawing-rule decisions.
- **Commission Drill:** practice 5% Banker commission and payout calculations.
- **Test Mode:** complete-hand assessments with missed-hand review.
- **Audit Trainer:** identify procedural and winner-declaration mistakes.
- **Missed Hands:** revisit previously incorrect decisions.
- **Progress:** browser-local performance summaries.

## Run locally

Clone or download this repository, then serve its root directory using any static web server, for example:

```sh
python -m http.server 8000
```

Open http://localhost:8000/ in a browser. No build system or package installation is required. The interface loads Font Awesome from a CDN, so those icons require network access.

## Training assumptions

This is a **rules and workflow trainer**, not a realistic shoe simulator or gambling service. Card draws use a deliberately weighted rank pool to emphasize drawing-rule decisions; they do **not** model an eight-deck shoe, depletion, burn cards, or true hand frequencies. The card generator currently excludes Queens and Kings from random draws, although both have the same baccarat value as other ten-value cards. Do not use the resulting frequencies for house-edge, wagering, or statistical analysis.

The commission module teaches conventional 5% Banker commission. Individual properties and jurisdictions may use different commission-free or side-bet rules. Verify local procedures before using this tool for formal training.

## Privacy

Training progress and missed hands are stored in your browser's localStorage. There is no application account or server-side training database. Clearing browser site data may erase progress.

## Source and reuse

The application source code is available under the [MIT License](LICENSE), copyright (c) 2026 Cjensen1967. Card-face artwork originates from Byron Knoll's public-domain vector-playing-cards project (https://code.google.com/archive/p/vector-playing-cards/); the SVG files retain their original source comments. The unverified card-back SVG was removed. Third-party assets and services, including Font Awesome loaded from a CDN, remain subject to their own terms.

## Contributing

Issues and suggestions are welcome. Before submitting a pull request, describe the behavior being changed and how you verified baccarat drawing-rule accuracy. Avoid adding third-party graphics or dependencies without recording their licenses.

## Technical layout

- `index.html` — dashboard
- `disclaimer.html` — educational notice
- `js/core/` — card generation, rules, statistics, UI, disclaimer gate
- `guided/`, `dealing/`, `drill/`, `commission/` — training modules
- `test/`, `audit/`, `review/`, `progress/` — assessment and review modules
- `assets/` — SVG card artwork
- `css/` — shared styling

Built with plain HTML, CSS and JavaScript.
