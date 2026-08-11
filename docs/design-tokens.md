# Design tokens v0.1

- Status: Draft for Phase 1; a bounded implementation task chooses the styling
  layer (CSS custom properties, Tailwind theme, etc.) and must not change these
  values without a handoff note.
- Owner: Claude Code UX task (P1.3)
- Consumers: `src/app` layout/pages, `src/components/mdx`, print stylesheet, a
  future Tailwind/CSS-variable implementation task

This file is the single source of values. Implementation tasks translate it into
code (e.g. `:root` custom properties or a `tailwind.config` theme) but must not
invent new colors, sizes or breakpoints outside this list. Propose additions here
first if a page genuinely needs one.

## Why these choices

- Content is long-form Vietnamese chemistry text read on phones between classes
  and printed to A4 for offline study. Contrast, line length and print behavior
  matter more than visual flourish.
- v1 ships one theme (light). Tokens are still named semantically (`color-bg`,
  not `color-white`) so a dark theme can be added later without renaming call
  sites — but implementing dark mode itself is out of scope for v1.
- No token depends on a provider SDK, a specific font CDN, or content data, so
  this file stays valid across P2 (conversion) and P3 (vertical slice).

## Color

Semantic tokens, light theme only. Values are 8-digit hex or hex; all
text-on-surface pairs meet WCAG AA (4.5:1 body, 3:1 large text/UI).

| Token                  | Value       | Usage                                                 |
| ---------------------- | ----------- | ----------------------------------------------------- |
| `color-bg`             | `#FFFFFF`   | Page background                                       |
| `color-bg-subtle`      | `#F5F7F6`   | Section backgrounds, cards at rest                    |
| `color-surface`        | `#FFFFFF`   | Cards, dialogs, popovers (with border/shadow)         |
| `color-border`         | `#DCE3E0`   | Default hairline border                               |
| `color-border-strong`  | `#B7C2BD`   | Input borders, table rules                            |
| `color-text`           | `#1A2421`   | Primary body text                                     |
| `color-text-muted`     | `#4C5A55`   | Secondary text, captions, metadata                    |
| `color-text-disabled`  | `#8B9793`   | Disabled labels                                       |
| `color-brand`          | `#0F6E5C`   | Primary brand (deep teal — lab/chemistry association) |
| `color-brand-strong`   | `#0B5548`   | Brand hover/active                                    |
| `color-brand-subtle`   | `#E3F2EE`   | Brand-tinted backgrounds (active nav, badges)         |
| `color-accent`         | `#2E6BE0`   | Links inside prose, secondary interactive accent      |
| `color-success`        | `#1E7B34`   | Completed status, saved confirmations                 |
| `color-success-subtle` | `#E7F5EA`   | Success banners/badges background                     |
| `color-warning`        | `#8A5A00`   | Non-blocking QA warnings, "in review" badges          |
| `color-warning-subtle` | `#FBF0DA`   | Warning banner background                             |
| `color-danger`         | `#B3261E`   | Errors, blocking validation, destructive actions      |
| `color-danger-subtle`  | `#FBE9E8`   | Error banner background                               |
| `color-focus-ring`     | `#2E6BE0`   | 2px focus outline, all interactive elements           |
| `color-overlay`        | `#0A1210B3` | Modal/drawer backdrop (70% opacity)                   |

Rules:

- Never use a raw hex value in a component; reference the token name.
- `color-danger` / `color-warning` map 1:1 to QA record severities (`blocking` /
  `warning` in `docs/contracts/content.md`) so lesson QA state and UI state stay
  visually consistent.
- `color-brand` is reserved for primary actions and current-state indicators
  (active nav item, in-progress lesson ring). Do not use it for large body text.

## Typography

| Token              | Value                                                                    | Usage                                 |
| ------------------ | ------------------------------------------------------------------------ | ------------------------------------- |
| `font-family-sans` | `"Inter", "Noto Sans", system-ui, -apple-system, "Segoe UI", sans-serif` | UI chrome and prose body              |
| `font-family-mono` | `"JetBrains Mono", ui-monospace, "Cascadia Code", monospace`             | Source references, code-like metadata |

`Inter` and `Noto Sans` both ship full Vietnamese diacritic coverage (Latin
Extended Additional); `Noto Sans` is the fallback if `Inter` is unavailable
before either is self-hosted or loaded via `next/font`. Chemical formulas and
math are set by KaTeX's own fonts, not by these tokens.

| Token            | Size / line-height | Usage                                |
| ---------------- | ------------------ | ------------------------------------ |
| `font-size-xs`   | 12px / 16px        | Metadata, timestamps, badges         |
| `font-size-sm`   | 14px / 20px        | Captions, secondary UI text          |
| `font-size-base` | 16px / 26px        | Body text (lesson prose, default UI) |
| `font-size-lg`   | 18px / 28px        | Lead paragraph, emphasized body      |
| `font-size-xl`   | 22px / 30px        | `h3` / card titles                   |
| `font-size-2xl`  | 28px / 36px        | `h2` / section titles                |
| `font-size-3xl`  | 34px / 42px        | `h1` / page titles                   |

Weights: `font-weight-regular` 400, `font-weight-medium` 500 (UI labels, table
headers), `font-weight-semibold` 600 (headings, buttons). Body line-height stays
≥1.5 (26px/16px) to keep Vietnamese diacritics legible at small sizes.

## Spacing

4px base scale, used for padding, margin and gap:

| Token     | Value | Token      | Value |
| --------- | ----- | ---------- | ----- |
| `space-1` | 4px   | `space-6`  | 24px  |
| `space-2` | 8px   | `space-8`  | 32px  |
| `space-3` | 12px  | `space-10` | 40px  |
| `space-4` | 16px  | `space-12` | 48px  |
| `space-5` | 20px  | `space-16` | 64px  |

Page content max width: `content-width-prose` = 720px (lesson reading column,
tuned for line length ~70–85 characters at `font-size-base`). Wide app
shells (dashboards) use `content-width-wide` = 1120px.

## Radius, border, shadow

| Token                  | Value                                                |
| ---------------------- | ---------------------------------------------------- |
| `radius-sm`            | 4px (badges, inline chips)                           |
| `radius-md`            | 8px (buttons, inputs, cards)                         |
| `radius-lg`            | 16px (modals, large panels)                          |
| `radius-full`          | 9999px (avatars, pill badges)                        |
| `border-width-default` | 1px                                                  |
| `border-width-focus`   | 2px                                                  |
| `shadow-sm`            | `0 1px 2px rgba(10,18,16,0.06)` — card at rest       |
| `shadow-md`            | `0 4px 12px rgba(10,18,16,0.10)` — dropdown, popover |
| `shadow-lg`            | `0 12px 32px rgba(10,18,16,0.16)` — modal, drawer    |

## Breakpoints

| Token        | Min width | Target                                   |
| ------------ | --------- | ---------------------------------------- |
| `bp-mobile`  | 0         | Phones (default, mobile-first)           |
| `bp-tablet`  | 640px     | Small tablets, large phones landscape    |
| `bp-desktop` | 1024px    | Tablets landscape, laptops               |
| `bp-wide`    | 1440px    | Large desktop (teacher dashboard tables) |

Layout rules:

- Lesson reader: single column at `bp-mobile`/`bp-tablet`; at `bp-desktop` the
  table of contents becomes a persistent right-hand rail (see
  `docs/wireframes.md`).
- Teacher dashboard tables: horizontally scrollable within their own container
  below `bp-desktop`, never the page body.
- Touch targets stay ≥44×44px at `bp-mobile`/`bp-tablet` regardless of the
  visual size implied by spacing tokens.

## Motion

| Token              | Value                             |
| ------------------ | --------------------------------- |
| `duration-fast`    | 120ms — hover/focus state changes |
| `duration-default` | 200ms — panel open/close, toasts  |
| `easing-standard`  | `cubic-bezier(0.2, 0, 0, 1)`      |

All transitions must be disabled under `prefers-reduced-motion: reduce`
(instant state change instead of animating).

## Print

Print is a first-class target (private per-lesson PDF, ADR-0001) and also
governs `window.print()` from the lesson reader before the PDF pipeline exists.

| Token                                                                     | Value                                               |
| ------------------------------------------------------------------------- | --------------------------------------------------- |
| `print-page-size`                                                         | A4                                                  |
| `print-margin`                                                            | 18mm top/bottom, 16mm left/right                    |
| `print-font-size-base`                                                    | 11pt                                                |
| `print-color-mode`                                                        | Grayscale-safe: every semantic color pair (text/bg, |
| badge, callout) must stay legible if rendered in grayscale by a low-toner |
| printer.                                                                  |

Print rules (apply to the lesson reader and anything the PDF pipeline reuses):

- Hide: primary nav, TOC rail, bookmark/progress controls, "Đã học xong"
  button, footer chrome.
- Show: title, metadata (topic/lesson/source not required in print), full
  prose, figures with captions, tables, worked examples with solutions
  expanded (not collapsed).
- Force `Hint`/`Solution` MDX components (see `docs/contracts/content.md`) to
  their expanded state in print; collapsed-by-default only applies on screen.
- `ChemFigure` images must not exceed the print content width and must avoid
  splitting across a page break where possible (`break-inside: avoid`).
- Tables (`DataTable`) repeat their header row on page breaks.

## Non-goals for this token set

- No dark theme values (see "Why these choices").
- No animation/illustration system beyond the motion tokens above.
- No icon set is pinned yet; the implementation task may choose one
  (e.g. Lucide) as long as stroke width and sizing stay consistent with
  `space-4`/`space-5` icon-box sizes.
