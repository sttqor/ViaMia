import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";

// Плашка-подсказка над нижним меню. Рисуется в body, поэтому не зависит
// от того, где на странице её вызвали, и не встаёт посреди списка.
export function Toast({ show, onHide, ms = 2400, children }) {
  useEffect(() => {
    if (!show) return;
    const id = setTimeout(onHide, ms);
    return () => clearTimeout(id);
  }, [show, onHide, ms]);

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          key="toast"
          className="toast-note"
          role="status"
          style={{ x: "-50%" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
