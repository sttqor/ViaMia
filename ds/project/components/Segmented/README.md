Segmented is an iOS-style switch between 2–4 views (for example «Сам / С агентством»).

- The track is a 7% `ink` wash in a `radius-chip` pill with 3px padding. Items are `h-chip` tall with 13px/700 labels.
- The selected item gets a white thumb with `shadow-thumb` and an `ink` label. Unselected labels are `muted`.
- In the app the thumb slides on a spring (framer-motion `layoutId`, stiffness 520, damping 38).
- The consumer provides `options [{value, label}]`, `value`, `onChange` and an aria `label`. It renders as a `tablist`.
