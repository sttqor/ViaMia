// Генерирует supabase/seed.sql из src/data.js (туры и факты).
// Запуск: node scripts/make-seed.mjs
// Повторный запуск seed.sql в Supabase обновляет существующие строки (upsert по id).

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { EXPERIENCES, FACTS } from "../src/data.js";

const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => (a && a.length ? `array[${a.map(q).join(", ")}]::text[]` : "'{}'::text[]");
const json = (o) => `${q(JSON.stringify(o || {}))}::jsonb`;
const num = (v) => (v === null || v === undefined ? "null" : Number(v));

// всё, что лежит в карточке под кодом языка (en, ky, …) → колонка i18n
const LANG_KEYS = /^[a-z]{2}$/;
const i18nOf = (item) =>
  Object.fromEntries(Object.entries(item).filter(([k, v]) => LANG_KEYS.test(k) && v && typeof v === "object"));

const tourRows = EXPERIENCES.map((e, i) =>
  `(${[
    q(e.id), q(e.category), q(e.type), q(e.title), q(e.place), q(e.duration), num(e.price), num(e.rating),
    num(e.reviews ?? 0), q(e.badge), q(e.lang), q(e.agencyName), q(e.url), arr([e.image, ...(e.images || [])].filter(Boolean)),
    num(e.lat), num(e.lng), e.freeCancel ? "true" : "false", q(e.group), q(e.meeting), q(e.description),
    arr(e.highlights), arr(e.includes), json(i18nOf(e)), "true", (i + 1) * 10,
  ].join(", ")})`
);

const factRows = FACTS.map((f, i) =>
  `(${[
    q(f.id), q(f.title), q(f.emoji), q(f.short), q(f.image), q(f.tag), arr(f.body), arr(f.points),
    q(f.linkLabel), q(f.linkTab), q(f.expId), json(i18nOf(f)), "true", (i + 1) * 10,
  ].join(", ")})`
);

const sql = `-- СГЕНЕРИРОВАНО scripts/make-seed.mjs из src/data.js — руками не править.
-- Запуск: Supabase → SQL Editor → вставить → Run (после schema.sql).
-- Туров, которых больше нет в data.js, скрываются (published = false), а не удаляются,
-- чтобы не сломать старые заявки, которые на них ссылаются.

insert into public.tours
  (id, category, type, title, place, duration, price, rating, reviews, badge, langs, agency_name, source_url, images,
   lat, lng, free_cancel, group_size, meeting, description, highlights, includes, i18n, published, sort)
values
  ${tourRows.join(",\n  ")}
on conflict (id) do update set
  category = excluded.category, type = excluded.type, title = excluded.title, place = excluded.place,
  duration = excluded.duration, price = excluded.price, rating = excluded.rating, reviews = excluded.reviews,
  badge = excluded.badge, langs = excluded.langs, agency_name = excluded.agency_name, source_url = excluded.source_url,
  images = excluded.images, lat = excluded.lat, lng = excluded.lng,
  free_cancel = excluded.free_cancel, group_size = excluded.group_size, meeting = excluded.meeting,
  description = excluded.description, highlights = excluded.highlights, includes = excluded.includes,
  i18n = excluded.i18n, published = excluded.published, sort = excluded.sort;

update public.tours set published = false
where agency_id is null and id not in (${EXPERIENCES.map((e) => q(e.id)).join(", ")});

insert into public.facts
  (id, title, emoji, short, image, tag, body, points, link_label, link_tab, exp_id, i18n, published, sort)
values
  ${factRows.join(",\n  ")}
on conflict (id) do update set
  title = excluded.title, emoji = excluded.emoji, short = excluded.short, image = excluded.image,
  tag = excluded.tag, body = excluded.body, points = excluded.points, link_label = excluded.link_label,
  link_tab = excluded.link_tab, exp_id = excluded.exp_id, i18n = excluded.i18n,
  published = excluded.published, sort = excluded.sort;
`;

const out = fileURLToPath(new URL("../supabase/seed.sql", import.meta.url));
writeFileSync(out, sql, "utf8");
console.log(`seed.sql: ${EXPERIENCES.length} туров, ${FACTS.length} фактов → ${out}`);
