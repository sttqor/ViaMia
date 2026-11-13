// Языки, валюты и форматирование.
//
// КАК ДОБАВИТЬ ЯЗЫК: добавьте словарь в DICT (например `ky: { ... }`) —
// язык сам появится в профиле. Недостающие ключи берутся из русского.
//
// КАК ПЕРЕВЕСТИ КАРТОЧКУ (тур, факт, категорию) — см. data.js:
// внутри карточки добавьте блок `en: { title: "...", ... }`.
// Поля без перевода показываются по-русски.

export const BASE_LANG = "ru";

// Все языки, которые можно включить. В профиле видны только те, у кого есть словарь в DICT.
const LANG_META = [
  { code: "ru", native: "Русский", locale: "ru-RU" },
  { code: "en", native: "English", locale: "en-US" },
  { code: "ky", native: "Кыргызча", locale: "ky-KG" },
  { code: "uz", native: "Oʻzbekcha", locale: "uz-UZ" },
  { code: "kk", native: "Қазақша", locale: "kk-KZ" },
  { code: "tg", native: "Тоҷикӣ", locale: "tg-TJ" },
  { code: "tr", native: "Türkçe", locale: "tr-TR" },
  { code: "zh", native: "中文", locale: "zh-CN" },
  { code: "ja", native: "日本語", locale: "ja-JP" },
  { code: "ko", native: "한국어", locale: "ko-KR" },
  { code: "de", native: "Deutsch", locale: "de-DE" },
  { code: "fr", native: "Français", locale: "fr-FR" },
  { code: "es", native: "Español", locale: "es-ES" },
  { code: "it", native: "Italiano", locale: "it-IT" },
  { code: "pt", native: "Português", locale: "pt-PT" },
  { code: "ar", native: "العربية", locale: "ar", rtl: true },
  { code: "fa", native: "فارسی", locale: "fa-IR", rtl: true },
  { code: "hi", native: "हिन्दी", locale: "hi-IN" },
];

// Курсы к 1 USD. ПРИМЕРНЫЕ — заглушка, обновить вручную или подключить API курсов.
// Все цены в data.js хранятся в USD.
export const CURRENCIES = [
  { code: "USD", rate: 1 },
  // symbol — свой значок, если стандартный плохо отображается (знак сома ⃀ есть не во всех шрифтах)
  { code: "KGS", rate: 87.4, symbol: { ru: "сом", en: "som" } },
  { code: "EUR", rate: 0.86 },
  { code: "RUB", rate: 80 },
  { code: "KZT", rate: 520 },
  { code: "UZS", rate: 12000 },
  { code: "GBP", rate: 0.75 },
  { code: "CNY", rate: 7.1 },
  { code: "JPY", rate: 150 },
  { code: "TRY", rate: 42 },
  { code: "AED", rate: 3.67 },
  { code: "INR", rate: 88 },
];

export const DICT = {
  ru: {
    "nav.home": "Ош: Гид",
    "nav.map": "Карта",
    "nav.route": "Маршрут",
    "nav.tours": "Туры",
    "nav.profile": "Профиль",
    "nav.label": "Навигация",

    "common.back": "Назад",
    "common.search": "Поиск…",
    "common.nothing": "Ничего не найдено",
    "common.save": "Сохранить",
    "common.unsave": "Убрать из избранного",
    "common.details": "Подробнее",
    "common.from": "от",
    "price.from": "от {price}",
    "price.request": "цена по запросу",
    "detail.agencySite": "Подробнее на сайте {name}",

    "card.inRoute": "✓ В маршруте",
    "card.addRoute": "+ В маршрут",

    "map.search": "Найти место на карте…",
    "map.locate": "Моё местоположение",
    "map.locateError": "Не удалось определить местоположение",
    "map.failedTitle": "Карта временно недоступна",
    "map.failedText": "Проверьте интернет и откройте вкладку снова.",
    "map.youAreHere": "Вы здесь",

    "home.heroAlt": "Сулайман-Тоо, Ош",
    "home.tag": "ДРЕВНИЙ ОШ · 3000 ЛЕТ",
    "home.title": "Ош: сердце Шёлкового пути",
    "home.text": "Священная гора Сулайман-Тоо, древнейшие базары Востока, аромат тандырной самсы и живые ремёсла.",
    "home.cta": "Собрать маршрут →",
    "mode.label": "Как путешествуете",
    "mode.self": "Сам",
    "mode.guided": "С гидом",
    "onb.kicker": "ДОБРО ПОЖАЛОВАТЬ В ОШ",
    "onb.title": "Как путешествуешь?",
    "onb.text": "От этого зависит, что мы покажем первым. Поменять можно в любой момент.",
    "onb.selfTitle": "Сам",
    "onb.selfText": "Карта, свой маршрут на день, места и факты о городе.",
    "onb.selfTag": "Бесплатно",
    "onb.guidedTitle": "С гидом",
    "onb.guidedText": "Туры местных агентств: город, поездки и треккинг. Всё организуют за вас.",
    "onb.guidedTag": "Бронь в приложении",
    "home.mapCta": "Открыть карту",
    "home.guidedTag": "МЕСТНЫЕ ГИДЫ · ОШ",
    "home.guidedTitle": "Ош с теми, кто здесь живёт",
    "home.guidedText": "Экскурсии по городу, поездки на Памир и Иссык-Куль, треккинг в Алайских горах.",
    "home.guidedCta": "Все туры →",
    "home.picks": "Подборка туров",
    "home.seeAll": "Все туры",
    "home.agencies": "Агентства",
    "home.agencyTours": "{n} в каталоге",
    "home.agencyOpen": "Туры агентства",
    "label.self": "Самостоятельно · бесплатно",
    "label.guided": "С гидом · {agency}",
    "route.bridge": "Хотите с гидом?",
    "profile.mode": "Режим путешествия",
    "profile.modeAgain": "Показать выбор заново",

    "facts.title": "Интересные факты",
    "facts.summary": "Коротко о главном",
    "facts.close": "Закрыть",
    "facts.prev": "Предыдущий факт",
    "facts.next": "Следующий факт",
    "facts.dot": "Факт {n}",

    "route.kicker": "ПЛАНИРОВЩИК ДНЯ · ОШ",
    "route.title": "Составьте свой маршрут",
    "route.subtitle": "Добавьте места во вкладке «Туры» — мы построим удобный путь на день.",
    "route.modeLabel": "Как идти",
    "route.self": "🚶 Сами",
    "route.guide": "🧭 С гидом",
    "route.guideNote": "Местный гид проведёт по всем точкам ({n}) · от {price} с человека",
    "route.walk": "Пешком",
    "route.time": "Время",
    "route.points": "Точки",
    "route.listTitle": "Маршрут прогулки",
    "route.addPlace": "+ Добавить место",
    "route.emptyTitle": "Маршрут пока пуст",
    "route.emptyText": "Перейдите во вкладку «Туры», чтобы добавить Сулайман-Тоо, Базар Джайма или гончарную мастерскую.",
    "route.goTours": "Перейти в «Туры»",
    "route.leg": "🚶 {dist} от предыдущей точки",
    "route.hide": "Скрыть",
    "route.up": "Выше",
    "route.down": "Ниже",
    "route.remove": "Удалить",
    "route.pickGuide": "Выбрать тур с гидом",
    "route.navigate": "🧭 Открыть навигацию ({stops})",

    "unit.m": "{n} м",
    "unit.km": "{n} км",
    "dur.m": "{m} мин",
    "dur.h": "{h} ч",
    "dur.hm": "{h} ч {m} мин",
    "pl.days": { one: "{n} день", few: "{n} дня", many: "{n} дней", other: "{n} дня" },
    "pl.tours": { one: "{n} тур", few: "{n} тура", many: "{n} туров", other: "{n} тура" },

    "tours.kicker": "КАТАЛОГ ВПЕЧАТЛЕНИЙ",
    "tours.title": "Практики и туры",
    "tours.search": "Найти мастер-класс, базар или гору…",
    "tours.emptyTitle": "Ничего не нашли",
    "tours.emptyText": "Попробуйте другое слово или категорию «Все».",

    "profile.title": "Профиль",
    "profile.guest": "Гостевой доступ",
    "profile.guestNote": "Данные сохраняются на устройстве",
    "profile.soon": "Скоро",
    "profile.tickets": "Ваши билеты ({n})",
    "profile.noTickets": "Пока нет активных броней. Выберите тур, и билет появится здесь.",
    "profile.seeTours": "Смотреть туры",
    "profile.saved": "Избранное ({n})",
    "profile.noSaved": "Пока пусто. Нажмите ♥ на карточке тура, чтобы сохранить место.",
    "profile.language": "Язык приложения",
    "profile.currency": "Валюта",
    "profile.ratesNote": "Цены пересчитаны из USD по примерному курсу",
    "profile.notifs": "Уведомления о турах",
    "profile.help": "Помощь и поддержка",
    "profile.helpSoon": "Поддержка скоро появится. Контакт будет добавлен позже.",

    "detail.freeCancel": "✓ Бесплатная отмена за 24 ч",
    "detail.whatsOn": "Что будет",
    "detail.includes": "Что включено",
    "detail.meeting": "Точка встречи",
    "detail.pickDate": "Выбрать дату",

    "booking.title": "Бронирование",
    "booking.when": "Когда",
    "booking.today": "Сегодня",
    "booking.tomorrow": "Завтра",
    "booking.guests": "Гости",
    "booking.fewer": "Меньше гостей",
    "booking.more": "Больше гостей",
    "booking.contacts": "Контакты",
    "booking.name": "Ваше имя",
    "booking.contact": "Телефон или @telegram",
    "booking.note": "Гид свяжется с вами для подтверждения. Оплата на месте.",
    "booking.submit": "Отправить заявку · {total}",
    "booking.submitRequest": "Отправить заявку",
    "booking.sending": "Отправляем…",
    "booking.error": "Не удалось отправить заявку. Проверьте интернет и попробуйте ещё раз.",
    "ticket.cancelError": "Не удалось отменить бронь. Проверьте интернет и попробуйте ещё раз.",

    "ticket.title": "Ваш билет",
    "ticket.confirmed": "Подтверждено",
    "ticket.pending": "Заявка отправлена · ждёт подтверждения",
    "ticket.payOnSite": "К оплате на месте:",
    "ticket.code": "Код брони — покажите гиду",
    "ticket.cancel": "Отменить бронь",
    "ticket.keep": "Оставить",
    "ticket.confirmCancel": "Да, отменить",

    // Формы множественного числа: one / few / many / other (правила Intl.PluralRules)
    "pl.guests": { one: "{n} гость", few: "{n} гостя", many: "{n} гостей", other: "{n} гостя" },
    "pl.stops": { one: "{n} точка", few: "{n} точки", many: "{n} точек", other: "{n} точки" },
    "pl.reviews": { one: "{n} отзыв", few: "{n} отзыва", many: "{n} отзывов", other: "{n} отзыва" },
  },

  en: {
    "nav.home": "Osh Guide",
    "nav.map": "Map",
    "nav.route": "Route",
    "nav.tours": "Tours",
    "nav.profile": "Profile",
    "nav.label": "Navigation",

    "common.back": "Back",
    "common.search": "Search…",
    "common.nothing": "Nothing found",
    "common.save": "Save",
    "common.unsave": "Remove from saved",
    "common.details": "Details",
    "common.from": "from",
    "price.from": "from {price}",
    "price.request": "price on request",
    "detail.agencySite": "More on the {name} website",

    "card.inRoute": "✓ In route",
    "card.addRoute": "+ Add to route",

    "map.search": "Find a place on the map…",
    "map.locate": "My location",
    "map.locateError": "Couldn't get your location",
    "map.failedTitle": "Map is temporarily unavailable",
    "map.failedText": "Check your connection and reopen the tab.",
    "map.youAreHere": "You are here",

    "home.heroAlt": "Sulaiman-Too, Osh",
    "home.tag": "ANCIENT OSH · 3000 YEARS",
    "home.title": "Osh: heart of the Silk Road",
    "home.text": "The sacred Sulaiman-Too mountain, ancient bazaars of the East, tandoor samsa and living crafts.",
    "home.cta": "Plan a route →",
    "mode.label": "How you travel",
    "mode.self": "On my own",
    "mode.guided": "With a guide",
    "onb.kicker": "WELCOME TO OSH",
    "onb.title": "How do you travel?",
    "onb.text": "This decides what we show you first. You can switch any time.",
    "onb.selfTitle": "On my own",
    "onb.selfText": "A map, your own day route, places and facts about the city.",
    "onb.selfTag": "Free",
    "onb.guidedTitle": "With a guide",
    "onb.guidedText": "Tours by local agencies: city, trips and trekking. Everything is arranged for you.",
    "onb.guidedTag": "Book in the app",
    "home.mapCta": "Open map",
    "home.guidedTag": "LOCAL GUIDES · OSH",
    "home.guidedTitle": "Osh with people who live here",
    "home.guidedText": "City tours, trips to the Pamirs and Issyk-Kul, trekking in the Alay Mountains.",
    "home.guidedCta": "All tours →",
    "home.picks": "Tour picks",
    "home.seeAll": "All tours",
    "home.agencies": "Agencies",
    "home.agencyTours": "{n} in the catalogue",
    "home.agencyOpen": "Agency tours",
    "label.self": "On your own · free",
    "label.guided": "With a guide · {agency}",
    "route.bridge": "Want a guide?",
    "profile.mode": "Travel mode",
    "profile.modeAgain": "Show the choice again",

    "facts.title": "Interesting facts",
    "facts.summary": "Key points",
    "facts.close": "Close",
    "facts.prev": "Previous fact",
    "facts.next": "Next fact",
    "facts.dot": "Fact {n}",

    "route.kicker": "DAY PLANNER · OSH",
    "route.title": "Build your route",
    "route.subtitle": "Add places in the Tours tab and we'll build a convenient route for the day.",
    "route.modeLabel": "How to go",
    "route.self": "🚶 On my own",
    "route.guide": "🧭 With a guide",
    "route.guideNote": "A local guide will take you to all stops ({n}) · from {price} per person",
    "route.walk": "Walking",
    "route.time": "Time",
    "route.points": "Stops",
    "route.listTitle": "Walking route",
    "route.addPlace": "+ Add place",
    "route.emptyTitle": "Your route is empty",
    "route.emptyText": "Go to the Tours tab to add Sulaiman-Too, Jayma Bazaar or a pottery workshop.",
    "route.goTours": "Go to Tours",
    "route.leg": "🚶 {dist} from the previous stop",
    "route.hide": "Hide",
    "route.up": "Move up",
    "route.down": "Move down",
    "route.remove": "Remove",
    "route.pickGuide": "Choose a guided tour",
    "route.navigate": "🧭 Open navigation ({stops})",

    "unit.m": "{n} m",
    "unit.km": "{n} km",
    "dur.m": "{m} min",
    "dur.h": "{h} h",
    "dur.hm": "{h} h {m} min",
    "pl.days": { one: "{n} day", other: "{n} days" },
    "pl.tours": { one: "{n} tour", other: "{n} tours" },

    "tours.kicker": "EXPERIENCES",
    "tours.title": "Workshops & tours",
    "tours.search": "Find a workshop, bazaar or mountain…",
    "tours.emptyTitle": "Nothing found",
    "tours.emptyText": "Try another word or the “All” category.",

    "profile.title": "Profile",
    "profile.guest": "Guest access",
    "profile.guestNote": "Data is stored on this device",
    "profile.soon": "Soon",
    "profile.tickets": "Your tickets ({n})",
    "profile.noTickets": "No bookings yet. Pick a tour and your ticket will appear here.",
    "profile.seeTours": "Browse tours",
    "profile.saved": "Saved ({n})",
    "profile.noSaved": "Nothing here yet. Tap ♥ on a tour card to save it.",
    "profile.language": "App language",
    "profile.currency": "Currency",
    "profile.ratesNote": "Prices converted from USD at an approximate rate",
    "profile.notifs": "Tour notifications",
    "profile.help": "Help & support",
    "profile.helpSoon": "Support is coming soon. A contact will be added later.",

    "detail.freeCancel": "✓ Free cancellation up to 24 h before",
    "detail.whatsOn": "What you'll do",
    "detail.includes": "What's included",
    "detail.meeting": "Meeting point",
    "detail.pickDate": "Choose a date",

    "booking.title": "Booking",
    "booking.when": "When",
    "booking.today": "Today",
    "booking.tomorrow": "Tomorrow",
    "booking.guests": "Guests",
    "booking.fewer": "Fewer guests",
    "booking.more": "More guests",
    "booking.contacts": "Contact details",
    "booking.name": "Your name",
    "booking.contact": "Phone or @telegram",
    "booking.note": "The guide will contact you to confirm. Pay on site.",
    "booking.submit": "Send request · {total}",
    "booking.submitRequest": "Send request",
    "booking.sending": "Sending…",
    "booking.error": "Couldn't send the request. Check your connection and try again.",
    "ticket.cancelError": "Couldn't cancel the booking. Check your connection and try again.",

    "ticket.title": "Your ticket",
    "ticket.confirmed": "Confirmed",
    "ticket.pending": "Request sent · awaiting confirmation",
    "ticket.payOnSite": "Pay on site:",
    "ticket.code": "Booking code — show it to your guide",
    "ticket.cancel": "Cancel booking",
    "ticket.keep": "Keep it",
    "ticket.confirmCancel": "Yes, cancel",

    "pl.guests": { one: "{n} guest", other: "{n} guests" },
    "pl.stops": { one: "{n} stop", other: "{n} stops" },
    "pl.reviews": { one: "{n} review", other: "{n} reviews" },
  },
};

export const LANGUAGES = LANG_META.filter((l) => DICT[l.code]);

const metaOf = (lang) => LANG_META.find((l) => l.code === lang) || LANG_META[0];
export const localeOf = (lang) => metaOf(lang).locale;
export const isRtl = (lang) => Boolean(metaOf(lang).rtl);

function fill(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
}

export function translate(lang, key, vars) {
  const s = DICT[lang]?.[key] ?? DICT[BASE_LANG][key] ?? key;
  return typeof s === "string" ? fill(s, vars) : key;
}

export function pluralize(lang, key, n) {
  const forms = DICT[lang]?.[key] ?? DICT[BASE_LANG][key];
  if (!forms) return String(n);
  let cat = "other";
  try {
    cat = new Intl.PluralRules(localeOf(lang)).select(n);
  } catch {
    /* старый браузер — берём other */
  }
  return fill(forms[cat] ?? forms.other, { n });
}

// Карточка на нужном языке: поля из блока `item[lang]` перекрывают русские.
export function localize(item, lang) {
  if (!item || lang === BASE_LANG) return item;
  const tr = item[lang];
  return tr ? { ...item, ...tr } : item;
}

export function formatMoney(usd, currency, lang) {
  const c = CURRENCIES.find((x) => x.code === currency) || CURRENCIES[0];
  const value = Math.round(usd * c.rate);
  if (c.symbol) {
    let num = String(value);
    try {
      num = new Intl.NumberFormat(localeOf(lang), { maximumFractionDigits: 0 }).format(value);
    } catch {
      /* оставляем как есть */
    }
    return `${num} ${customSymbol(c, lang)}`;
  }
  const opts = { style: "currency", currency: c.code, maximumFractionDigits: 0, minimumFractionDigits: 0 };
  try {
    return new Intl.NumberFormat(localeOf(lang), { ...opts, currencyDisplay: "narrowSymbol" }).format(value);
  } catch {
    try {
      return new Intl.NumberFormat(localeOf(lang), opts).format(value);
    } catch {
      return `${value} ${c.code}`;
    }
  }
}

function customSymbol(c, lang) {
  return c.symbol[lang] ?? c.symbol.en ?? c.symbol[BASE_LANG] ?? c.code;
}

export function currencySymbol(code, lang) {
  const c = CURRENCIES.find((x) => x.code === code);
  if (c?.symbol) return customSymbol(c, lang);
  try {
    const parts = new Intl.NumberFormat(localeOf(lang), {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value || code;
  } catch {
    return code;
  }
}

// Название языка/валюты на текущем языке интерфейса («английский», «euro»…)
export function displayName(type, code, lang) {
  try {
    const name = new Intl.DisplayNames([localeOf(lang)], { type }).of(code);
    if (!name) return code;
    return name.charAt(0).toLocaleUpperCase(localeOf(lang)) + name.slice(1);
  } catch {
    return code;
  }
}

// "2026-11-11" → «11 ноября» / «November 11»
export function formatDate(key, lang) {
  const [y, m, d] = String(key).split("-").map(Number);
  if (!y || !m || !d) return key;
  try {
    return new Intl.DateTimeFormat(localeOf(lang), { day: "numeric", month: "long" }).format(new Date(y, m - 1, d));
  } catch {
    return key;
  }
}

export function weekdayShort(date, lang) {
  try {
    return new Intl.DateTimeFormat(localeOf(lang), { weekday: "short" }).format(date);
  } catch {
    return "";
  }
}

// Длительность в минутах. В карточке можно писать число минут (120)
// или строку: "2 часа", "1.5 часа", "45 мин", "2 h", "3 дня".
export function durationMinutes(duration) {
  if (typeof duration === "number") return duration;
  if (!duration) return 90;
  const hourMatch = String(duration).match(/(\d+(?:[.,]\d+)?)\s*(?:ч|час|h|hour)/i);
  const minMatch = String(duration).match(/(\d+)\s*(?:мин|min)/i);
  const dayMatch = String(duration).match(/(\d+)\s*(?:дн|ден|day)/i);
  if (dayMatch) return parseInt(dayMatch[1], 10) * 24 * 60;
  let minutes = 0;
  if (hourMatch) minutes += parseFloat(hourMatch[1].replace(",", ".")) * 60;
  if (minMatch) minutes += parseInt(minMatch[1], 10);
  if (!hourMatch && !minMatch) minutes = 90;
  return minutes;
}

export function formatDuration(mins, lang) {
  if (mins >= 24 * 60 && mins % (24 * 60) === 0) return pluralize(lang, "pl.days", mins / (24 * 60));
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return translate(lang, "dur.m", { m });
  return m ? translate(lang, "dur.hm", { h, m }) : translate(lang, "dur.h", { h });
}
