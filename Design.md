# Digital Heroes — Design Tokens

Source of truth for the site's color system. Defined as CSS custom properties in
`client/src/index.css` (`@theme`), which Tailwind v4 turns into utility classes automatically
(e.g. `--color-wise-green` → `bg-wise-green` / `text-wise-green` / `border-wise-green`).

## Brand & Accent — Wise Green family

| Token | Hex | Usage |
|---|---|---|
| Wise Green | `#9fe870` | The brand's universal CTA color — primary buttons, primary links. |
| Green Active | `#cdffad` | Lighter active state for hover / press. |
| Green Neutral | `#c5edab` | Mid-saturation neutral active fill. |
| Green Pale | `#e2f6d5` | Lightest green for soft tints / badges. |

## Surface

| Token | Hex | Usage |
|---|---|---|
| Canvas | `#ffffff` | Page background. |
| Canvas Soft | `#e8ebe6` | Secondary/dim surfaces, cards, section fills. |

## Text

| Token | Hex | Usage |
|---|---|---|
| Ink | `#0e0f0c` | Primary text, headings. |
| Ink Deep | `#163300` | Dark brand surface (used as the "dark section" background, replacing the old navy) and its matching deep text. |
| Body | `#454745` | Secondary body text. |
| Mute | `#868685` | Tertiary / muted text, captions. |

## Semantic — Positive family

| Token | Hex | Usage |
|---|---|---|
| Positive | `#2ead4b` | Success states, active/paid statuses. |
| Positive Deep | `#054d28` | Success text on light backgrounds. |

## Semantic — Warning family

| Token | Hex | Usage |
|---|---|---|
| Warning | `#ffd11a` | Warning fills. |
| Warning Deep | `#b86700` | Warning text/icons. |
| Warning Content | `#4a3b1c` | Text on a warning-fill background. |

## Semantic — Negative family

| Token | Hex | Usage |
|---|---|---|
| Negative | `#d03238` | Errors, destructive actions. |
| Negative Deep | `#a72027` | Negative text on light backgrounds. |
| Negative Darkest | `#a7000d` | Highest-emphasis negative (rare). |
| Negative Bg | `#320707` | Negative fill background (dark, for banners/toasts). |

## Tertiary accent

| Token | Hex | Usage |
|---|---|---|
| Accent Orange | `#ffc091` | Tertiary accent — used sparingly against the dark (Ink Deep) sections. |
| Accent Cyan | `#38c8ff` | Tertiary accent — draw/prize-pool highlights, charts. |

## Usage notes

- **Primary CTA**: `wise-green` fill with `ink` or `ink-deep` text (never white-on-green — the
  green isn't dark enough for AA contrast with white text).
- **Dark sections** (hero, admin sidebar): `ink-deep` background, `canvas` text, `accent-orange`
  or `accent-cyan` for highlighted numbers/stats.
- **Borders/dividers**: a line color derived from `canvas-soft` (`--color-line`, `#dbe0d6`) —
  not part of the palette brief above, added so cards/tables have a visible hairline against
  `canvas`.
- Semantic colors (positive/warning/negative) drive subscription status, draw/payout states, and
  form validation — never repurpose them decoratively.
