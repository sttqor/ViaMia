TabBar is the floating glass tab bar in the style of iOS 26, with five tabs: Guide, Map, Route, Tours and Profile.

- A translucent white capsule (`nav-h`, 62px) over an 18px blur with `shadow-nav`. It floats 14px above the bottom safe area.
- A lens (a 7% `ink` pill) sits under the selected tab. You can drag it with a finger, and tapping the selected tab again scrolls to the top.
- Selected tab: `accent` icon and label.
- **Route** is always set apart by a 34px `accent` disc with a white icon, and its label is weight 800.
- No count badge.
- It shrinks to a single 62px disc when the page scrolls down (`useMinimizeOnScroll`).
- Its 10px labels in `accent` are 4.14:1 on white. That falls short of 4.5:1, and the source keeps it as is.
