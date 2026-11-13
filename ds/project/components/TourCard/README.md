TourCard is the tour or place card in lists on the Guide and Tours tabs.

- `card` fill with a 1px `line` border, `radius-card` corners and no resting shadow. On hover it gets `shadow-float`.
- The photo is 150px tall and flush with the top. Empty slots show `bg-2` with a `placeholder` mountain.
- A badge sits on the photo top-left and a 38px save IconButton top-right.
- The body has `space-14` padding: the title in `title`, a meta row in `caption` with the price in `title` («от $25»), then two compact buttons.
- The consumer provides the image, title, meta, price (already formatted with `money()`), and the saved and in-route state.
