// node supabase/functions/push-text.test.mjs
import assert from "node:assert/strict";
import { pushLang, pushText, pushUrl } from "./_shared/push-text.js";

assert.equal(pushLang("ky"), "ru");
assert.equal(pushLang("de"), "en");
assert.deepEqual(pushText("confirmed", { tour: "Сулайман-Тоо", date: "2026-12-20" }, "ru"), {
  title: "Бронь подтверждена",
  body: "Сулайман-Тоо · 2026-12-20. Детали — в билете",
});
assert.equal(pushText("message", { name: "Айбек", text: "привет" }, "en").body, "Айбек: привет");
assert.equal(pushText("cancelled", { tour: "X" }, "ru").body, "X"); // без даты — без хвоста « · »
assert.equal(pushText("unknown", {}, "ru"), null);
assert.equal(pushText("message", { text: "a".repeat(500) }, "ru").body.length, 180);
assert.equal(pushUrl({ to_user: "u" }, "AB 12"), "/?ticket=AB%2012");
assert.equal(pushUrl({ to_agency: "a" }, "AB12"), "/");
console.log("push-text: ok");
