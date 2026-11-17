// «Полёт в маршрут»: миниатюра тура летит от нажатой кнопки к вкладке «Маршрут».
// Кнопка только сообщает, откуда лететь; рисует полёт FlyLayer, «приземление» играет TabBar.

export const FLY_EVENT = "osh:fly-route";
export const BUMP_EVENT = "osh:route-bump";

// from — элемент кнопки, image — фото тура (может не быть), delay — задержка старта в секундах
export function flyToRoute({ from, image, delay = 0 }) {
  if (!from?.getBoundingClientRect) return;
  const r = from.getBoundingClientRect();
  window.dispatchEvent(
    new CustomEvent(FLY_EVENT, {
      detail: { from: { x: r.left + r.width / 2, y: r.top + r.height / 2 }, image: image || null, delay },
    }),
  );
}
