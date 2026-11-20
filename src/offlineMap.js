// Карта Оша без интернета: заранее кладём в кэш стиль, тайлы, значки и шрифты.
// Сервис-воркер (vite.config.js → runtimeCaching "osh-map") отдаёт их из того же кэша,
// поэтому MapLibre не замечает, что сети нет. Векторные тайлы OpenFreeMap — до z14,
// дальше карта просто увеличивает их сама, так что всё влезает в ~4 МБ.
export const MAP_CACHE = "osh-map";
const STYLES = ["positron", "dark"];
// Ош с окрестностями (Сулайман-Тоо, аэропорт, Кара-Суу)
const BBOX = { w: 72.62, s: 40.43, e: 73.0, n: 40.66 };
const ZOOMS = [8, 9, 10, 11, 12, 13, 14];
// латиница + кириллица — этого хватает для подписей на ru/en/ky
const GLYPH_RANGES = ["0-255", "256-511", "1024-1279"];
const DONE_KEY = "osh-map-offline";

const lng2x = (lng, z) => Math.floor(((lng + 180) / 360) * 2 ** z);
const lat2y = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};

// ── свой протокол для MapLibre: osh://… = https://…, но сначала из кэша ──
// Работает везде, где есть Cache API (и в приложении Capacitor, где сервис-воркера нет).
// Всё, что карта загрузила по сети, тоже кладём в кэш — тайлы только в пределах Оша.
const HOST = "https://tiles.openfreemap.org";
export const toOsh = (url) => (typeof url === "string" ? url.replace(HOST, "osh://tiles.openfreemap.org") : url);

function inOsh(url) {
  const m = /\/(\d+)\/(\d+)\/(\d+)\.pbf/.exec(url);
  if (!m) return true; // стиль, tilejson, шрифты, значки — кэшируем всегда
  const [z, x, y] = m.slice(1).map(Number);
  if (z > 14) return false;
  return x >= lng2x(BBOX.w, z) && x <= lng2x(BBOX.e, z) && y >= lat2y(BBOX.n, z) && y <= lat2y(BBOX.s, z);
}

export async function cachedFetch(url, signal) {
  const cache = offlineSupported() ? await caches.open(MAP_CACHE).catch(() => null) : null;
  try {
    const r = await fetch(url, { signal });
    if (!r.ok) throw new Error(String(r.status));
    if (cache && inOsh(url)) cache.put(url, r.clone()).catch(() => {});
    return r;
  } catch (err) {
    const hit = cache && (await cache.match(url));
    if (hit) return hit;
    throw err;
  }
}

export function registerOshProtocol(maplibregl) {
  if (registerOshProtocol.done) return;
  registerOshProtocol.done = true;
  maplibregl.addProtocol("osh", async (params, abort) => {
    const url = params.url.replace(/^osh:\/\//, "https://");
    const r = await cachedFetch(url, abort.signal);
    if (params.type === "json") {
      const data = await r.json();
      // tilejson: адреса тайлов тоже через наш протокол
      if (Array.isArray(data.tiles)) data.tiles = data.tiles.map(toOsh);
      return { data };
    }
    if (params.type === "string") return { data: await r.text() };
    return { data: await r.arrayBuffer() };
  });
}

export function offlineMapSaved() {
  try {
    return localStorage.getItem(DONE_KEY);
  } catch {
    return null;
  }
}

export const offlineSupported = () => typeof caches !== "undefined";

async function json(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

async function collectUrls() {
  const urls = new Set();
  for (const name of STYLES) {
    const styleUrl = `https://tiles.openfreemap.org/styles/${name}`;
    urls.add(styleUrl);
    const style = await json(styleUrl);
    if (style.sprite) {
      for (const s of Array.isArray(style.sprite) ? style.sprite.map((x) => x.url) : [style.sprite]) {
        for (const suf of [".json", ".png", "@2x.json", "@2x.png"]) urls.add(s + suf);
      }
    }
    const fonts = new Set();
    for (const l of style.layers) {
      const f = l.layout?.["text-font"];
      if (Array.isArray(f) && f.every((x) => typeof x === "string")) fonts.add(f.join(","));
    }
    if (style.glyphs) {
      for (const f of fonts) for (const r of GLYPH_RANGES) urls.add(style.glyphs.replace("{fontstack}", encodeURIComponent(f)).replace("{range}", r));
    }
    for (const src of Object.values(style.sources)) {
      if (src.type !== "vector") continue;
      let tiles = src.tiles;
      if (!tiles && src.url) {
        urls.add(src.url);
        tiles = (await json(src.url)).tiles;
      }
      for (const tpl of tiles || []) {
        for (const z of ZOOMS) {
          for (let x = lng2x(BBOX.w, z); x <= lng2x(BBOX.e, z); x++) {
            for (let y = lat2y(BBOX.n, z); y <= lat2y(BBOX.s, z); y++) {
              urls.add(tpl.replace("{z}", z).replace("{x}", x).replace("{y}", y));
            }
          }
        }
      }
    }
  }
  return [...urls];
}

// onProgress(done, total, bytes). Возвращает { files, bytes }.
export async function downloadOshMap(onProgress) {
  if (!offlineSupported()) throw new Error("unsupported");
  const cache = await caches.open(MAP_CACHE);
  const urls = await collectUrls();
  let done = 0;
  let bytes = 0;
  let failed = 0;
  const queue = [...urls];
  async function worker() {
    while (queue.length) {
      const url = queue.shift();
      try {
        const hit = await cache.match(url);
        if (hit) {
          bytes += Number(hit.headers.get("content-length")) || 0;
        } else {
          const r = await fetch(url);
          if (r.ok) {
            const buf = await r.clone().arrayBuffer();
            bytes += buf.byteLength;
            await cache.put(url, r);
          } else failed++;
        }
      } catch {
        failed++;
      }
      done++;
      onProgress?.(done, urls.length, bytes);
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  if (failed > urls.length * 0.05) throw new Error("partial");
  try {
    localStorage.setItem(DONE_KEY, new Date().toISOString());
  } catch {
    /* не страшно */
  }
  return { files: urls.length, bytes };
}

export async function deleteOshMap() {
  if (offlineSupported()) await caches.delete(MAP_CACHE);
  try {
    localStorage.removeItem(DONE_KEY);
  } catch {
    /* не страшно */
  }
}
