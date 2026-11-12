import { useId } from "react";
import { motion } from "framer-motion";
import "./Segmented.css";

// Переключатель в стиле iOS (UISegmentedControl): белый ползунок переезжает с пружиной.
// options: [{ value, label }]
export function Segmented({ options, value, onChange, label }) {
  const id = useId();
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            className={`seg-item ${on ? "is-on" : ""}`}
            onClick={() => onChange(o.value)}
          >
            {on && (
              <motion.span
                layoutId={`seg-thumb-${id}`}
                className="seg-thumb"
                transition={{ type: "spring", stiffness: 520, damping: 38 }}
              />
            )}
            <span className="seg-label">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
