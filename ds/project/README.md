Osh Guide is a mobile web guide to Osh, Kyrgyzstan, for travellers exploring without a guide: places, a day route, and tours from local agencies. It looks like warm sand with one terracotta accent and one indigo dark. It is calm, editorial and a little crafted, with a Kyrgyz ornament in the background. Every button shares one height and one shape.

## Principles

- **One accent.** Terracotta `accent` is the only colour that asks for action. Don't add a second brand hue. Turquoise and `#ff5533` are retired and must not come back.
- **One dark.** Indigo `ink` carries all text and the selected state of filters. Don't use pure black.
- **Warm ground.** Screens sit on sand `bg`. Underlays use `bg-2`. Cards are white `card` with a 1px `line` border.
- **Borders, not shadows.** Cards are flat with a `line` border. Shadows are only for things that float: the tab bar (`shadow-nav`), the ticket (`shadow-float`), sheets (`shadow-sheet`) and the primary button's glow (`shadow-cta`).
- **One button shape.** Every button is `h-btn` (48px) tall with `radius-btn` (14px) corners. Chips are pills at `h-chip` (36px). Icon buttons are 44px white circles.

## Content

- The interface is Russian first, with English alongside, and more languages come through the i18n dictionary. Never hard-code UI strings. Every label goes through `t()`.
- Write short, plain and in the second person. Use sentence case for buttons and headings: «Выбрать дату», «В маршрут», «Подробнее». Uppercase is only for `overline` labels and badges.
- Labels state the action: «+ В маршрут», which turns into «✓ В маршруте» once added. Use the glyphs ✓ and + only in these toggles. No emoji anywhere else.
- Errors say what happened and what to do: «Карта временно недоступна», then «Проверьте интернет и откройте вкладку снова.»
- Prices are stored in USD and shown in the user's currency with «от {price}». Use placeholders for agency prices and contacts, never invented figures.

## Colour

| Role | Token | Rule |
| --- | --- | --- |
| Action | `accent` / `accent-hover` | Primary buttons, active dots, the Route tab disc. Put `card` (white) text on it at 15px/800 or larger only, because it is 4.14:1. |
| Text | `ink`, `ink-soft`, `muted` | `ink` for titles and body. `muted` for meta and descriptions. `ink-soft` for secondary dark text on `bg-2`. |
| Tag | `gold` | Small tags only, with `ink` or `ink-deep` text. Never a fill larger than a badge. |
| Ground | `bg`, `bg-2`, `card` | Page, underlay, card. |
| Line | `line` | 1px card borders, 1.5px control borders, dividers. |
| State | `success` on `success-bg`, `accent-hover` on `accent-glow` | Confirmed and error notes. Each one carries an icon or a word too. |

Inactive tab icons use `muted-2`. It passes 3:1 for icons but not 4.5:1 for small text, so the tab bar labels stay in `ink`.

## Type

- **Manrope** (`ui`) sets the whole interface at weights 500, 700 and 800. **Playfair Display** (`display`) is only for screen titles and section headings (`display-xl`, `display-lg`, `display-md`). Both load from Google Fonts: `Manrope:wght@500;600;700;800` and `Playfair+Display:wght@700;800;900`.
- Body copy is `body` (13/1.5) in `muted`. Card titles and prices are `title` (15/800). Meta is `caption` (11/700, `muted`).
- Interface text is never lighter than weight 500.

## Space and layout

- The app is a single column at most `app-max-w` (430px) wide, designed at 390px. Screen gutters are `space-16` on lists and `space-22` on hero and style screens.
- Inside cards, padding is `space-14`, with `space-8` between title, meta and actions.
- Scroll areas reserve `nav-h` plus 42px at the bottom so the floating tab bar never covers content.

## Shape

- Use the five radii: `radius-thumb` 12, `radius-btn` 14, `radius-card` 20, `radius-sheet` 22 and `radius-chip` 999. Photos inside a card are flush with the card's top corners.

## Surfaces and glass

- Only the tab bar and the segmented control use glass: translucent white over a blur, with a hairline inset. Icon buttons are solid white with a `line` border, never glass.
- Background: `bg` with `ornament-tile.webp` stretched over the column at 34% opacity, and a soft mountain silhouette along the bottom (see Ornament).

## Motion

- Screens enter in 0.32s with `cubic-bezier(0.22, 1, 0.36, 1)`, rising 16px from 98% scale. Sheets slide up in 0.28s on the same curve.
- Pressed controls scale to 0.92–0.98. The segmented thumb and the tab lens move on a spring (stiffness 520, damping 38).
- The tab bar shrinks to a single disc when the page scrolls down.
- `prefers-reduced-motion` turns all of these off.

## Focus and states

- Focus ring: 2px solid `accent`, offset 2px. It is 3.85:1 on `bg`.
- Disabled controls drop to 35–50% opacity and keep their shape.

## Iconography

- Use [Lucide](https://lucide.dev) only (`lucide-react`), with a 2px stroke, round caps and joins, and `currentColor`. Size icons at 18px in buttons and fields, 20px in icon buttons and 22px in the tab bar. The filled Route disc uses a 2.2px stroke.
- Key glyphs: `Compass` (Guide), `Map` (Map), `Route` (Route), `Sparkle` (Tours), `User` (Profile), `Heart` (save, stroked in `accent`), `Search`, `ChevronLeft` (back).
- There is no logo yet. Set the name «Osh Guide» in `display-xl`.

## Ornament

- `assets/Ornament` holds the four Kyrgyz ornament images. Use `ornament-tile.webp` as the page background layer. The bottom and side pieces are decorative frames. Always place them behind content, never over text, and never recolour them.
