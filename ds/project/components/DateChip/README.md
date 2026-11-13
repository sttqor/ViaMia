DateChip is a day picker tile used in booking.

- At least 64px wide with `radius-thumb` corners, a 1px `line` border and a `card` fill. It shows the weekday in `caption` above the day number in 16px/800.
- Selected (`aria-pressed="true"`): `accent` border on an `accent-glow` fill, with the weekday in `accent-hover`.
- The consumer provides dates from `upcomingDates()`, labelled with `weekdayShort`.
