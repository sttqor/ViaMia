// Ищет ключи t("…") без текста в ru/en (кабинет агентства + App.jsx).
// Запуск из корня проекта: node playbooks/agency-cabinet/toolbox/check-keys.mjs .
import fs from "fs";
import { pathToFileURL } from "url";
import path from "path";
const root = path.resolve(process.argv[2] || ".");
const { DICT } = await import(pathToFileURL(root + "/src/i18n.js"));
const files = ["src/App.jsx", ...fs.readdirSync(root + "/src/agency").filter(f => f.endsWith(".jsx")).map(f => "src/agency/" + f)];
const used = new Set();
for (const f of files) for (const m of fs.readFileSync(root + "/" + f, "utf8").matchAll(/(?<![\w.])(?:t|setError)\("([a-zA-Z]+\.[\w.]+)"/g)) used.add(m[1]);
const dyn = { "adm.f.": ["pending","approved","rejected","all"], "adm.t.": ["review","published","all"], "ag.agency.": ["pending","approved","rejected","blocked"], "ag.tour.": ["draft","review","published","rejected","hidden"], "ag.bk.": ["pending","confirmed","declined","cancelled","done"], "ag.check.": ["photos","title","type","duration","price","langs","description","highlights","includes","meeting"], "ag.intro.": ["s1","s2","s3","s4","s1t","s2t","s3t","s4t"], "ticket.": ["declined","cancelled","done"] };
for (const [p, l] of Object.entries(dyn)) l.forEach(x => used.add(p + x));
for (const lang of ["ru", "en"]) console.log(lang, "missing:", [...used].filter(k => !(k in DICT[lang]) && !k.startsWith("pl.")));
