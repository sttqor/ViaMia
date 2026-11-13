Button is the one tappable action shape in Osh Guide: 48px tall (`h-btn`) with 14px corners (`radius-btn`).

## Variants
- **Primary** (`og-btn--primary`): `accent` fill, white label, `shadow-cta` glow, and `accent-hover` on hover. Use one per view for the main action («Выбрать дату», «Подробнее»).
- **Secondary** (`og-btn--secondary`): white with a 1.5px `line` border and `ink` label. Use it for the second action («В маршрут»).
- **Dark** (`og-btn--dark`): `ink` fill. Use it for the toggled-on secondary action («В маршруте»).
- **Compact** (`og-btn--sm`): 44px tall with a 13px label, for actions inside cards.

## Consumer provides
A label from `t()`, an optional 18px Lucide icon placed before the label, and `--block` for full width.

## Do / don't
- Do put two buttons side by side at equal width, `space-10` apart.
- Don't use a different radius or height, outline-only buttons, or a gold button.
- White on `accent` is 4.14:1. It passes only because the label is 15px at weight 800, so keep it that weight.
