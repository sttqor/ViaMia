import { Sparkles, Hand, Compass, UtensilsCrossed, Landmark, Mountain } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// КАК ДОБАВИТЬ / ИЗМЕНИТЬ КАРТОЧКУ
//
// • Основной текст пишется по-русски прямо в карточке.
// • Перевод — блок `en: { ... }` внутри той же карточки. Можно переводить
//   не все поля: чего нет в `en`, покажется по-русски.
// • Цена `price` — всегда в USD. В приложении она сама пересчитается
//   в выбранную валюту.
// • Длительность `duration` — "2 часа", "1.5 часа", "45 мин" или число минут (120).
//   На другие языки она переводится автоматически.
// • У факта поле `expId` — id тура, который откроется по кнопке
//   (и покажется на мини-карте). Без него кнопка ведёт на вкладку `linkTab`.
// ─────────────────────────────────────────────────────────────

export const CITY = { name: "Ош", lat: 40.5283, lng: 72.7985 };

export const CATEGORIES = [
  { id: "all", label: "Все", en: { label: "All" }, Icon: Sparkles },
  { id: "practices", label: "Практики", en: { label: "Workshops" }, Icon: Hand },
  { id: "tours", label: "Экскурсии", en: { label: "Tours" }, Icon: Compass },
  { id: "food", label: "Еда", en: { label: "Food" }, Icon: UtensilsCrossed },
  { id: "culture", label: "Культура", en: { label: "Culture" }, Icon: Landmark },
  { id: "nature", label: "Природа", en: { label: "Nature" }, Icon: Mountain },
];

export const EXPERIENCES = [
  {
    id: "pottery",
    title: "Гончарная практика: пиала своими руками",
    category: "practices",
    type: "Мастер-класс",
    place: "Мастерская Старого города",
    duration: "2 часа",
    rating: 4.9,
    reviews: 186,
    price: 18,
    badge: "Практика",
    lang: "RU · KY",
    image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=900&q=80",
    lat: 40.5294,
    lng: 72.7918,
    freeCancel: true,
    group: "до 8 человек",
    meeting: "Мастерская на ул. Курманжан Датка",
    description: "Местный гончар покажет, как крутить пиалу на круге. Вы унесёте своё изделие — практика, а не лекция.",
    highlights: ["Работа за гончарным кругом", "История ошской керамики", "Изделие с собой"],
    includes: ["Глина и обжиг", "Фартук", "Чай"],
    en: {
      title: "Pottery workshop: make your own piala",
      type: "Workshop",
      place: "Old Town workshop",
      badge: "Hands-on",
      group: "up to 8 people",
      meeting: "Workshop on Kurmanjan Datka St.",
      description: "A local potter shows you how to throw a piala bowl on the wheel. You take your piece home — hands-on, not a lecture.",
      highlights: ["Work at the potter's wheel", "History of Osh ceramics", "Take your bowl home"],
      includes: ["Clay and firing", "Apron", "Tea"],
    },
  },
  {
    id: "cooking",
    title: "Кулинарная практика: самса и лагман",
    category: "food",
    type: "Мастер-класс",
    place: "Дом у Джаймы",
    duration: "3 часа",
    rating: 4.8,
    reviews: 412,
    price: 29,
    badge: "Практика",
    lang: "RU · EN",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=900&q=80",
    lat: 40.5238,
    lng: 72.7974,
    freeCancel: true,
    group: "до 10 человек",
    meeting: "Вход на Базар Джайма, южные ворота",
    description: "Готовите с семьёй повара: тесто, начинка, лагман. Потом едите то, что сделали сами, на дворике.",
    highlights: ["Готовите сами, не смотрите со стороны", "Рецепты с собой", "Обед включён"],
    includes: ["Продукты", "Обед и чай", "Рецепты PDF"],
    en: {
      title: "Cooking class: samsa and lagman",
      type: "Workshop",
      place: "House near Jayma",
      badge: "Hands-on",
      group: "up to 10 people",
      meeting: "Jayma Bazaar, south gate",
      description: "Cook with a chef's family: dough, filling, lagman noodles. Then eat what you made in the courtyard.",
      highlights: ["You cook, not just watch", "Recipes to take home", "Lunch included"],
      includes: ["Ingredients", "Lunch and tea", "PDF recipes"],
    },
  },
  {
    id: "photo-walk",
    title: "Фотопрактика: золотой час в Старом городе",
    category: "practices",
    type: "Практика",
    place: "Старый город",
    duration: "2.5 часа",
    rating: 4.7,
    reviews: 98,
    price: 16,
    badge: "Практика",
    lang: "RU · EN",
    image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&q=80",
    lat: 40.529,
    lng: 72.791,
    freeCancel: true,
    group: "до 6 человек",
    meeting: "Площадь у южных ворот",
    description: "Короткий маршрут с фотографом: свет, кадр, люди на улице. Телефон или камера — без разницы.",
    highlights: ["Разбор 10 ваших кадров", "Точки с лучшим светом", "Малая группа"],
    includes: ["Гид-фотограф", "Маршрут", "Заметки по съёмке"],
    en: {
      title: "Photo walk: golden hour in the Old Town",
      type: "Workshop",
      place: "Old Town",
      badge: "Hands-on",
      group: "up to 6 people",
      meeting: "Square by the south gate",
      description: "A short walk with a photographer: light, framing, street life. Phone or camera — either works.",
      highlights: ["Review of 10 of your shots", "Spots with the best light", "Small group"],
      includes: ["Photographer guide", "Route", "Shooting notes"],
    },
  },
  {
    id: "sulaiman",
    title: "Восход на Сулайман-Тоо с местным гидом",
    category: "tours",
    type: "Экскурсия",
    place: "Сулайман-Тоо",
    duration: "3 часа",
    rating: 4.9,
    reviews: 1284,
    price: 22,
    badge: "Хит продаж",
    lang: "RU · EN · KY",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80",
    lat: 40.5275,
    lng: 72.7985,
    freeCancel: true,
    group: "до 12 человек",
    meeting: "Главный вход на Сулайман-Тоо",
    description: "Подъём до рассвета, пещеры, петроглифы и вид на Ферганскую долину. Гиды — из Оша, не приезжие шаблоны.",
    highlights: ["Священная гора ЮНЕСКО", "Рассвет над долиной", "Истории паломников"],
    includes: ["Лицензированный гид", "Входной билет", "Вода"],
    en: {
      title: "Sunrise on Sulaiman-Too with a local guide",
      type: "Tour",
      place: "Sulaiman-Too",
      badge: "Bestseller",
      group: "up to 12 people",
      meeting: "Main entrance to Sulaiman-Too",
      description: "Climb before dawn: caves, petroglyphs and a view over the Fergana Valley. Guides are from Osh, not scripted visitors.",
      highlights: ["Sacred UNESCO mountain", "Sunrise over the valley", "Pilgrims' stories"],
      includes: ["Licensed guide", "Entrance ticket", "Water"],
    },
  },
  {
    id: "bazaar",
    title: "Джайма: рынок с дегустацией специй",
    category: "food",
    type: "Гастротур",
    place: "Базар Джайма",
    duration: "2 часа",
    rating: 4.8,
    reviews: 756,
    price: 19,
    badge: "Рядом с центром",
    lang: "RU · EN",
    image: "https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=900&q=80",
    lat: 40.5233,
    lng: 72.7969,
    freeCancel: true,
    group: "до 8 человек",
    meeting: "Главные ворота базара Джайма",
    description: "Самса, курут, халва, ряды специй. Гид научит торговаться и не брать туристическую наценку.",
    highlights: ["5 дегустаций", "Как выбирать сухофрукты", "Скрытые ряды"],
    includes: ["Гид", "Дегустации", "Чай в чайхане"],
    en: {
      title: "Jayma Bazaar with a spice tasting",
      type: "Food tour",
      place: "Jayma Bazaar",
      badge: "Near the center",
      group: "up to 8 people",
      meeting: "Main gate of Jayma Bazaar",
      description: "Samsa, kurut, halva, rows of spices. Your guide teaches you to bargain and skip the tourist markup.",
      highlights: ["5 tastings", "How to pick dried fruit", "Hidden rows"],
      includes: ["Guide", "Tastings", "Tea at a chaikhana"],
    },
  },
  {
    id: "mosque",
    title: "Мечеть Равзат и исламская архитектура Оша",
    category: "culture",
    type: "Экскурсия",
    place: "Мечеть Равзат",
    duration: "1.5 часа",
    rating: 4.6,
    reviews: 321,
    price: 12,
    badge: null,
    lang: "RU · KY",
    image: "https://images.unsplash.com/photo-1564769625905-50e93615b405?w=900&q=80",
    lat: 40.526,
    lng: 72.794,
    freeCancel: true,
    group: "до 15 человек",
    meeting: "Площадь перед мечетью Равзат",
    description: "Спокойный маршрут по архитектуре и этикету. Платок для женщин выдаём на месте.",
    highlights: ["Архитектура и орнамент", "Правила посещения", "Коротко и по делу"],
    includes: ["Гид", "Платок при необходимости"],
    en: {
      title: "Ravzat Mosque and Islamic architecture of Osh",
      type: "Tour",
      place: "Ravzat Mosque",
      group: "up to 15 people",
      meeting: "Square in front of Ravzat Mosque",
      description: "A calm walk through architecture and etiquette. Headscarves for women are provided on site.",
      highlights: ["Architecture and ornament", "Visiting etiquette", "Short and to the point"],
      includes: ["Guide", "Headscarf if needed"],
    },
  },
  {
    id: "akbuura",
    title: "Рассветная прогулка вдоль Ак-Бууры",
    category: "nature",
    type: "Прогулка",
    place: "Река Ак-Буура",
    duration: "2 часа",
    rating: 4.7,
    reviews: 204,
    price: 14,
    badge: "На свежем воздухе",
    lang: "RU",
    image: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=900&q=80",
    lat: 40.518,
    lng: 72.81,
    freeCancel: true,
    group: "до 10 человек",
    meeting: "Мост у парка",
    description: "Тихий маршрут по берегу: мосты, птицы, утро города. Подходит, если не хотите крутой подъём.",
    highlights: ["Ровный маршрут", "Фото у реки", "Местный завтрак-опция"],
    includes: ["Гид", "Маршрут 3 км"],
    en: {
      title: "Sunrise walk along the Ak-Buura river",
      type: "Walk",
      place: "Ak-Buura River",
      badge: "Outdoors",
      group: "up to 10 people",
      meeting: "Bridge by the park",
      description: "A quiet riverside route: bridges, birds, the city waking up. Good if you'd rather skip a steep climb.",
      highlights: ["Flat route", "Photos by the river", "Optional local breakfast"],
      includes: ["Guide", "3 km route"],
    },
  },
  {
    id: "oldtown",
    title: "Пеший гид по Старому городу",
    category: "tours",
    type: "Экскурсия",
    place: "Старый город",
    duration: "2.5 часа",
    rating: 4.8,
    reviews: 540,
    price: 17,
    badge: "Бесплатная отмена",
    lang: "RU · EN",
    image: "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=900&q=80",
    lat: 40.5288,
    lng: 72.7905,
    freeCancel: true,
    group: "до 12 человек",
    meeting: "Чайхана у восточных ворот",
    description: "Дворы, дома старше века, чайхана. Гиды рассказывают семейные истории, а не википедию.",
    highlights: ["Жилые дворы", "Чай в конце", "Малые группы"],
    includes: ["Гид", "Чай"],
    en: {
      title: "Old Town walking tour",
      type: "Tour",
      place: "Old Town",
      badge: "Free cancellation",
      group: "up to 12 people",
      meeting: "Chaikhana by the east gate",
      description: "Courtyards, century-old houses, a chaikhana. Guides share family stories, not Wikipedia.",
      highlights: ["Residential courtyards", "Tea at the end", "Small groups"],
      includes: ["Guide", "Tea"],
    },
  },
];

export const ATTRACTIONS = [
  { id: "a1", name: "Сулайман-Тоо", hint: "Гора ЮНЕСКО", lat: 40.5275, lng: 72.7985, image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80" },
  { id: "a2", name: "Базар Джайма", hint: "Один из старейших базаров", lat: 40.5233, lng: 72.7969, image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80" },
  { id: "a3", name: "Мечеть Равзат", hint: "Главная мечеть города", lat: 40.526, lng: 72.794, image: "https://images.unsplash.com/photo-1548013146-72479768bada?w=600&q=80" },
];

let leafletPromise = null;

export function loadLeaflet() {
  if (typeof window !== "undefined" && window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const cssId = "leaflet-css";
    if (!document.getElementById(cssId)) {
      const css = document.createElement("link");
      css.id = cssId;
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.addEventListener("load", () => {
      const L = window.L;
      if (!L) {
        leafletPromise = null;
        script.remove();
        reject(new Error("Leaflet не загрузился"));
        return;
      }
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      resolve(L);
    }, { once: true });
    script.addEventListener("error", () => {
      // сбрасываем, чтобы при следующем открытии карты была новая попытка
      leafletPromise = null;
      script.remove();
      reject(new Error("Leaflet script error"));
    }, { once: true });
    document.head.appendChild(script);
  });
  return leafletPromise;
}

// Ключ даты по локальному времени (toISOString даёт UTC и ночью сдвигает день)
function localKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Ближайшие дни: { key: "2026-11-11", date: Date }. Подписи делаются на нужном языке в интерфейсе.
export function upcomingDates(count = 8) {
  const out = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    out.push({ key: localKey(d), date: d });
  }
  return out;
}

// Код брони. По нему турист отменяет заявку, поэтому он случайный (crypto), а не Math.random.
// Без похожих символов (0/O, 1/I), чтобы код было легко продиктовать гиду.
export function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const s = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `OSH-${s.slice(0, 4)}-${s.slice(4)}`;
}

// Интересные факты для главной страницы (кликабельные карточки)
export const FACTS = [
  {
    id: "older-than-rome",
    title: "Город старше Рима",
    emoji: "🏛️",
    short: "Археологические находки на склонах Сулайман-Тоо подтверждают свыше 3000 лет непрерывной городской истории.",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=85",
    tag: "История",
    body: [
      "Ош считается одним из древнейших городов Центральной Азии: на склонах и у подножия Сулайман-Тоо найдены следы поселений эпохи бронзы — это более трёх тысяч лет непрерывной городской жизни.",
      "Город вырос на пересечении ферганских торговых путей: здесь останавливались караваны, шедшие из Кашгара в Самарканд, и именно торговля сформировала характер ошских базаров, которые работают на тех же местах до сих пор.",
    ],
    points: [
      "Сулайман-Тоо — объект Всемирного наследия ЮНЕСКО (с 2009 года)",
      "На горе более 100 мест наскальных рисунков и культовых площадок",
      "Музей внутри горы устроен в естественной пещере",
    ],
    linkLabel: "Посмотреть туры по Сулайман-Тоо",
    linkTab: "tours",
    expId: "sulaiman",
    en: {
      title: "A city older than Rome",
      short: "Archaeological finds on the slopes of Sulaiman-Too point to more than 3,000 years of continuous urban history.",
      tag: "History",
      body: [
        "Osh is considered one of the oldest cities in Central Asia: Bronze Age settlement traces have been found on the slopes and at the foot of Sulaiman-Too — more than three thousand years of continuous city life.",
        "The city grew at a crossroads of Fergana trade routes: caravans travelling from Kashgar to Samarkand stopped here, and trade shaped the character of the Osh bazaars, which still operate in the same places today.",
      ],
      points: [
        "Sulaiman-Too has been a UNESCO World Heritage Site since 2009",
        "The mountain has over 100 sites with petroglyphs and places of worship",
        "A museum inside the mountain occupies a natural cave",
      ],
      linkLabel: "See Sulaiman-Too tours",
    },
  },
  {
    id: "devzira",
    emoji: "🍚",
    title: "Легендарный рис Девзира",
    short: "Главный сорт для ошского плова выращивают на местных полях Ферганской долины.",
    image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=1200&q=85",
    tag: "Кухня",
    body: [
      "Девзира — розовато-коричневый рис с плотным зерном, который выращивают в Ферганской долине. Именно он даёт ошскому плову характерную рассыпчатость: зерно впитывает бульон, но не разваривается.",
      "На базаре Девзиру узнают по мучному налёту и продольной бороздке: продавцы предлагают потереть зерно в ладонях — настоящий рис слегка скрипит и оставляет светлую пыль.",
    ],
    points: [
      "Рис вызревает дольше обычного — отсюда цена выше",
      "Перед готовкой его промывают и замачивают в тёплой солёной воде",
      "Ошский плов готовят на курдючном сале, морковь кладут двумя слоями",
    ],
    linkLabel: "Кулинарные практики Оша",
    linkTab: "tours",
    expId: "cooking",
    en: {
      title: "The legendary Devzira rice",
      short: "The key rice for Osh plov is grown in local fields of the Fergana Valley.",
      tag: "Cuisine",
      body: [
        "Devzira is a pinkish-brown, firm-grained rice grown in the Fergana Valley. It gives Osh plov its signature fluffiness: the grain soaks up the broth without turning mushy.",
        "At the bazaar you can spot Devzira by its powdery coating and a groove along the grain. Sellers invite you to rub it between your palms — real Devzira squeaks a little and leaves a light dust.",
      ],
      points: [
        "It ripens longer than ordinary rice — hence the higher price",
        "Before cooking it is rinsed and soaked in warm salted water",
        "Osh plov is cooked in tail fat, with carrots laid in two layers",
      ],
      linkLabel: "Cooking classes in Osh",
    },
  },
  {
    id: "jaima-bazaar",
    emoji: "🧺",
    title: "Базар, которому тысячи лет",
    short: "Базар Джайма тянется вдоль реки Ак-Буура и остаётся одним из крупнейших рынков Центральной Азии.",
    image: "https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=1200&q=85",
    tag: "Традиции",
    body: [
      "Джайма — не туристическая декорация, а живой рынок, который работает на берегу Ак-Бууры много столетий. Ряды растянуты почти на километр: специи, сухофрукты, ножи, тюбетейки, ткани, конская упряжь.",
      "Лучшее время — утро до 11:00: ещё прохладно, товар свежий, а торговцы охотнее угощают и рассказывают. Торг здесь — часть этикета, но вести его принято спокойно и с улыбкой.",
    ],
    points: [
      "Ножи ручной ковки — один из главных местных сувениров",
      "Курут, урюк и грецкий орех продают на вес, пробовать можно бесплатно",
      "Оплата чаще наличными в сомах — карту принимают не везде",
    ],
    linkLabel: "Экскурсии по базару",
    linkTab: "tours",
    expId: "bazaar",
    en: {
      title: "A bazaar thousands of years old",
      short: "Jayma Bazaar stretches along the Ak-Buura river and remains one of the largest markets in Central Asia.",
      tag: "Traditions",
      body: [
        "Jayma isn't a tourist set — it's a living market that has traded on the banks of the Ak-Buura for centuries. The rows run for almost a kilometre: spices, dried fruit, knives, skullcaps, fabrics, horse tack.",
        "The best time is the morning before 11:00: it's still cool, the goods are fresh, and traders are happier to offer a taste and chat. Bargaining is part of the etiquette, but it's done calmly and with a smile.",
      ],
      points: [
        "Hand-forged knives are one of the top local souvenirs",
        "Kurut, dried apricots and walnuts are sold by weight — tasting is free",
        "Cash in som is usual — cards aren't accepted everywhere",
      ],
      linkLabel: "Bazaar tours",
    },
  },
  {
    id: "silk-road-crossroads",
    emoji: "🐪",
    title: "Перекрёсток Шёлкового пути",
    short: "Через Ош проходила северная ветка Великого шёлкового пути в Ферганскую долину.",
    image: "https://images.unsplash.com/photo-1528181304800-259b08848526?w=1200&q=85",
    tag: "Шёлковый путь",
    body: [
      "Ош лежал на ответвлении Великого шёлкового пути, связывавшем Кашгар с Ферганой и далее с Самаркандом и Бухарой. Караваны шли через горные перевалы, и город служил последней большой остановкой перед подъёмом в Алайские горы.",
      "Этот транзит оставил городу многоязычие, ремесленные кварталы и кухню, в которой уживаются уйгурский лагман, узбекская самса и кыргызский бешбармак.",
    ],
    points: [
      "Отсюда начинается Памирский тракт — дорога к перевалам Алая",
      "В Старом городе сохранились кварталы ремесленников",
      "Город исторически двуязычный: кыргызский и узбекский",
    ],
    linkLabel: "Собрать маршрут по городу",
    linkTab: "route",
    en: {
      title: "A Silk Road crossroads",
      short: "A northern branch of the Great Silk Road ran through Osh into the Fergana Valley.",
      tag: "Silk Road",
      body: [
        "Osh lay on a branch of the Great Silk Road linking Kashgar with Fergana and on to Samarkand and Bukhara. Caravans crossed mountain passes, and the city was the last big stop before the climb into the Alay Mountains.",
        "That transit left the city its many languages, craft quarters and a cuisine where Uyghur lagman, Uzbek samsa and Kyrgyz beshbarmak sit side by side.",
      ],
      points: [
        "The Pamir Highway starts here — the road to the Alay passes",
        "Craft quarters survive in the Old Town",
        "The city is historically bilingual: Kyrgyz and Uzbek",
      ],
      linkLabel: "Plan a route around the city",
    },
  },
];
