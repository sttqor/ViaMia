import { Sparkles, Hand, Compass, UtensilsCrossed, Car, Mountain } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// КАК ДОБАВИТЬ / ИЗМЕНИТЬ КАРТОЧКУ
//
// • Основной текст пишется по-русски прямо в карточке.
// • Перевод — блок `en: { ... }` внутри той же карточки. Можно переводить
//   не все поля: чего нет в `en`, покажется по-русски.
// • Цена `price` — всегда в USD (null — «цена по запросу»). В приложении она сама пересчитается
//   в выбранную валюту.
// • Длительность `duration` — "2 часа", "1.5 часа", "45 мин", "3 дня" или число минут (120).
//   На другие языки она переводится автоматически.
// • У факта поле `expId` — id тура, который откроется по кнопке
//   (и покажется на мини-карте). Без него кнопка ведёт на вкладку `linkTab`.
// ─────────────────────────────────────────────────────────────

export const CITY = { name: "Ош", lat: 40.5283, lng: 72.7985 };

export const CATEGORIES = [
  { id: "all", label: "Все", en: { label: "All" }, Icon: Sparkles },
  { id: "tours", label: "По городу", en: { label: "City tours" }, Icon: Compass },
  { id: "practices", label: "Практики", en: { label: "Workshops" }, Icon: Hand },
  { id: "food", label: "Еда", en: { label: "Food" }, Icon: UtensilsCrossed },
  { id: "trips", label: "Поездки", en: { label: "Trips" }, Icon: Car },
  { id: "trekking", label: "Треккинг", en: { label: "Trekking" }, Icon: Mountain },
];

// Туры агентства Best of Osh (bestofosh.com), собраны с сайта 13.11.2026.
// price: null — «цена по запросу». Цены на сайте в евро, здесь — в USD по курсу из i18n.js (EUR 0.86).
// rating/reviews: null — своих отзывов пока нет, в карточке не показываются.
export const EXPERIENCES = [
  {
    id: "walking",
    title: "Пешая экскурсия по Ошу",
    category: "tours",
    type: "Экскурсия",
    place: "Центр Оша",
    duration: "2 часа",
    price: 17.44,
    rating: null,
    reviews: null,
    lang: "EN",
    image: "https://bestofosh.com/wp-content/uploads/2019/05/Lenin-statue-in-Osh-e1559745162625.webp",
    lat: 40.531,
    lng: 72.795,
    agencyName: "Best of Osh",
    url: "https://bestofosh.com/osh-city-walking-tour/",
    meeting: "Детали встречи — по согласованию с Best of Osh",
    description: "Главная улица, зелёные парки и история Оша: досоветская, советская и современная, а также культура и известные люди города.",
    highlights: [
      "Каждый день",
      "Старт в 9:00 и 16:00",
      "Гид — местный житель"
    ],
    en: {
      title: "Osh city walking tour",
      type: "Walking tour",
      place: "Central Osh",
      meeting: "Meeting details are arranged with Best of Osh",
      description: "Walk the central street and green parks and hear about Osh's pre-Soviet, Soviet and modern history, culture and famous people.",
      highlights: [
        "Every day",
        "Starts at 9:00 and 16:00",
        "Local guide"
      ]
    }
  },
  {
    id: "bread",
    title: "Хлеб в тандыре: мастер-класс",
    category: "practices",
    type: "Мастер-класс",
    place: "Тандырная мастерская",
    duration: "2 часа",
    price: 23.26,
    rating: null,
    reviews: null,
    badge: "Практика",
    lang: "EN",
    image: "https://bestofosh.com/wp-content/uploads/2025/03/bread-baking-tour-osh-1.webp",
    lat: 40.526,
    lng: 72.8,
    agencyName: "Best of Osh",
    url: "https://bestofosh.com/osh-bread-baking/",
    meeting: "Детали встречи — по согласованию с Best of Osh",
    description: "Пекарские традиции Оша: мастерская тандыров и местная пекарня. Сами формуете и печёте лепёшку и едите её за местным завтраком.",
    highlights: [
      "Каждый день",
      "Старт в 9:00",
      "Завтрак со своим хлебом"
    ],
    en: {
      title: "Bread-baking tour",
      type: "Workshop",
      place: "Tandoor workshop",
      meeting: "Meeting details are arranged with Best of Osh",
      description: "Discover Osh's baking traditions: a tandoor workshop and a local bakery. Shape and bake your own bread and enjoy it with a local breakfast.",
      highlights: [
        "Every day",
        "Starts at 9:00",
        "Breakfast with your own bread"
      ],
      badge: "Hands-on"
    }
  },
  {
    id: "plov",
    title: "Плов с нуля: кулинарный мастер-класс",
    category: "food",
    type: "Мастер-класс",
    place: "Дом местной семьи",
    duration: "4 часа",
    price: 40.7,
    rating: null,
    reviews: null,
    badge: "Практика",
    lang: "EN",
    image: "https://bestofosh.com/wp-content/uploads/2025/03/plov-cooking-tour-osh.webp",
    lat: 40.52,
    lng: 72.81,
    agencyName: "Best of Osh",
    url: "https://bestofosh.com/plov-cooking-tour/",
    meeting: "Детали встречи — по согласованию с Best of Osh",
    description: "Главное блюдо Центральной Азии с нуля: выбираете продукты, режете и готовите плов в традиционной обстановке.",
    highlights: [
      "Каждый день",
      "Старт в 15:00",
      "Покупка продуктов на базаре"
    ],
    en: {
      title: "Plov Cooking 101",
      type: "Cooking class",
      place: "Local family home",
      meeting: "Meeting details are arranged with Best of Osh",
      description: "Cook Central Asia's iconic dish from scratch: pick your groceries, chop the ingredients and cook plov in a traditional setting.",
      highlights: [
        "Every day",
        "Starts at 15:00",
        "Grocery shopping at the bazaar"
      ],
      badge: "Hands-on"
    }
  },
  {
    id: "sulaiman",
    title: "Экскурсия на Сулайман-Тоо",
    category: "tours",
    type: "Экскурсия",
    place: "Сулайман-Тоо",
    duration: "2 часа",
    price: 23.26,
    rating: null,
    reviews: null,
    badge: "Хит",
    lang: "EN",
    image: "https://bestofosh.com/wp-content/uploads/2019/05/Sulaiman-Too-House-of-Babur-1024x768.jpg",
    lat: 40.5275,
    lng: 72.7985,
    agencyName: "Best of Osh",
    url: "https://bestofosh.com/sulaiman-too-tour/",
    meeting: "Детали встречи — по согласованию с Best of Osh",
    description: "Главная достопримечательность Оша — гора Сулайман-Тоо: древняя и средневековая история, местные верования и панорама города.",
    highlights: [
      "Вторник–воскресенье",
      "Старт в 9:00 и 15:00",
      "Дом Бабура на вершине"
    ],
    en: {
      title: "Sulaiman-Too tour",
      type: "Tour",
      place: "Sulaiman-Too",
      meeting: "Meeting details are arranged with Best of Osh",
      description: "Visit Osh's main sight, Sulaiman-Too Mountain: ancient and medieval history, local beliefs and panoramic views.",
      highlights: [
        "Tuesday to Sunday",
        "Starts at 9:00 and 15:00",
        "Babur's House at the top"
      ],
      badge: "Top pick"
    }
  },
  {
    id: "food-tour",
    title: "Гастротур по Ошу",
    category: "food",
    type: "Гастротур",
    place: "Кафе и чайханы Оша",
    duration: "3 часа",
    price: 34.88,
    rating: null,
    reviews: null,
    lang: "EN",
    image: "https://bestofosh.com/wp-content/uploads/2025/03/osh-food-tour.webp",
    lat: 40.5233,
    lng: 72.7969,
    agencyName: "Best of Osh",
    url: "https://bestofosh.com/food-tour/",
    meeting: "Детали встречи — по согласованию с Best of Osh",
    description: "Ош — гастрономическая столица Кыргызстана. Лучшие кафе, рестораны и чайханы и философия местной кухни.",
    highlights: [
      "Вт, ср, чт, сб, вс",
      "Старт в 11:00",
      "Несколько заведений за тур"
    ],
    en: {
      title: "Osh food tour",
      type: "Food tour",
      place: "Cafés and teahouses of Osh",
      meeting: "Meeting details are arranged with Best of Osh",
      description: "Discover the food capital of Kyrgyzstan through its cuisine and cooking philosophy at the best cafés, restaurants and teahouses.",
      highlights: [
        "Tue, Wed, Thu, Sat, Sun",
        "Starts at 11:00",
        "Several places in one tour"
      ]
    }
  },
  {
    id: "pamir",
    title: "Памирский тракт",
    category: "trips",
    type: "Поездка из Оша",
    place: "Памир",
    duration: "8 дней",
    price: null,
    rating: null,
    reviews: null,
    lang: "EN",
    image: "https://bestofosh.com/wp-content/uploads/2025/03/Pamir-highway-tours.webp",
    lat: 38.17,
    lng: 73.96,
    agencyName: "Best of Osh",
    url: "https://bestofosh.com/pamir-highway-tour/",
    meeting: "Детали встречи — по согласованию с Best of Osh",
    description: "Путешествие по «крыше мира»: нетронутая природа, самобытные культуры и эпичные виды. Апрель–ноябрь, маршрут можно менять.",
    highlights: [
      "Апрель–ноябрь",
      "Большие высоты",
      "Маршрут под вас"
    ],
    en: {
      title: "Pamir Highway tour",
      type: "Trip from Osh",
      place: "Pamir",
      meeting: "Meeting details are arranged with Best of Osh",
      description: "An odyssey across the Roof of the World: pristine nature, authentic cultures and epic scenery. April–November, customizable.",
      highlights: [
        "April–November",
        "High altitudes",
        "Customizable route"
      ]
    }
  },
  {
    id: "sary-chelek",
    title: "Сары-Челек: природа во всей красе",
    category: "trips",
    type: "Поездка из Оша",
    place: "Озеро Сары-Челек",
    duration: "3 дня",
    price: null,
    rating: null,
    reviews: null,
    lang: "EN",
    image: "https://bestofosh.com/wp-content/uploads/2025/03/Sary-Chelek.webp",
    lat: 41.87,
    lng: 71.96,
    agencyName: "Best of Osh",
    url: "https://bestofosh.com/tour-to-sary-chelek-2/",
    meeting: "Детали встречи — по согласованию с Best of Osh",
    description: "Завораживающее горное озеро, заповедная флора и фауна и походы по нетронутой природе.",
    highlights: [
      "Горное озеро",
      "Заповедник",
      "Лёгкие походы"
    ],
    en: {
      title: "Sary-Chelek: nature at its best",
      type: "Trip from Osh",
      place: "Sary-Chelek Lake",
      meeting: "Meeting details are arranged with Best of Osh",
      description: "A mesmerizing alpine lake, protected flora and fauna and hikes through pristine nature.",
      highlights: [
        "Alpine lake",
        "Nature reserve",
        "Easy hikes"
      ]
    }
  },
  {
    id: "arslanbob",
    title: "Арсланбоб: легенды леса",
    category: "trips",
    type: "Поездка из Оша",
    place: "Арсланбоб",
    duration: "2 дня",
    price: null,
    rating: null,
    reviews: null,
    lang: "EN",
    image: "https://bestofosh.com/wp-content/uploads/2025/03/Tours-Arslanbob-e1741240149937.webp",
    lat: 41.33,
    lng: 72.94,
    agencyName: "Best of Osh",
    url: "https://bestofosh.com/tour-to-arslanbob/",
    meeting: "Детали встречи — по согласованию с Best of Osh",
    description: "Крупнейший в мире ореховый лес, панорамы, водопады и пещеры и необычное село со своей культурой.",
    highlights: [
      "Ореховый лес",
      "Водопады и пещеры",
      "Сельская жизнь"
    ],
    en: {
      title: "Arslanbob: forest legends",
      type: "Trip from Osh",
      place: "Arslanbob",
      meeting: "Meeting details are arranged with Best of Osh",
      description: "The world's largest walnut forest, panoramic views, waterfalls and caves, and a village with its own culture.",
      highlights: [
        "Walnut forest",
        "Waterfalls and caves",
        "Village life"
      ]
    }
  },
  {
    id: "issyk-kul",
    title: "Лучшее на Иссык-Куле",
    category: "trips",
    type: "Поездка",
    place: "Иссык-Куль",
    duration: "5 дней",
    price: null,
    rating: null,
    reviews: null,
    lang: "EN",
    image: "https://bestofosh.com/wp-content/uploads/2025/03/tour-to-issykul-1.webp",
    lat: 42.45,
    lng: 77.2,
    agencyName: "Best of Osh",
    url: "https://bestofosh.com/best-of-issyk-kul/",
    meeting: "Детали встречи — по согласованию с Best of Osh",
    description: "Пять дней вокруг жемчужины Кыргызстана: природа, культура, кухня, национальные напитки и мёд.",
    highlights: [
      "5 дней",
      "Природа и кухня",
      "Напитки и мёд"
    ],
    en: {
      title: "Best of Issyk-Kul",
      type: "Trip",
      place: "Issyk-Kul",
      meeting: "Meeting details are arranged with Best of Osh",
      description: "Five days around the pearl of Kyrgyzstan: nature, culture and food, national drinks and honey.",
      highlights: [
        "5 days",
        "Nature and food",
        "Drinks and honey"
      ]
    }
  },
  {
    id: "lenin-hike",
    title: "Поход вокруг пика Ленина (4 дня)",
    category: "trekking",
    type: "Треккинг",
    place: "Алайская долина",
    duration: "4 дня",
    price: null,
    rating: null,
    reviews: null,
    lang: "EN",
    image: "https://bestofosh.com/wp-content/uploads/2024/06/Lenin-Peak-Hike.webp",
    lat: 39.53,
    lng: 72.87,
    agencyName: "Best of Osh",
    url: "https://bestofosh.com/hike-around-the-lenin-peak/",
    meeting: "Детали встречи — по согласованию с Best of Osh",
    description: "Лучшее в Алайских горах: захватывающие виды и время с настоящими кочевниками.",
    highlights: [
      "Пик Ленина",
      "Кочевники",
      "Сложность выше средней"
    ],
    en: {
      title: "Hike around Lenin Peak (4 days)",
      type: "Trek",
      place: "Alay Valley",
      meeting: "Meeting details are arranged with Best of Osh",
      description: "The best of the Alay Mountains: breathtaking scenery and time with real nomads.",
      highlights: [
        "Lenin Peak",
        "Nomads",
        "Medium to hard"
      ]
    }
  },
  {
    id: "alay-5",
    title: "Высоты Алая (5 дней)",
    category: "trekking",
    type: "Треккинг",
    place: "Алайские горы",
    duration: "5 дней",
    price: null,
    rating: null,
    reviews: null,
    lang: "EN",
    image: "https://bestofosh.com/wp-content/uploads/2024/06/Hike-Tulpar-Kul.webp",
    lat: 39.6,
    lng: 72.9,
    agencyName: "Best of Osh",
    url: "https://bestofosh.com/heights-of-alay-trek/",
    meeting: "Детали встречи — по согласованию с Best of Osh",
    description: "Самый популярный треккинг: эпичные Алайские горы, нетронутая природа и кочевая культура. 3 дня пешком.",
    highlights: [
      "Середина июня — начало сентября",
      "3 дня пешком",
      "Кочевая культура"
    ],
    en: {
      title: "Heights of Alay (5 days)",
      type: "Trek",
      place: "Alay Mountains",
      meeting: "Meeting details are arranged with Best of Osh",
      description: "The bestselling trek: epic Alay mountains, pristine nature and nomadic culture. 3 days of hiking.",
      highlights: [
        "Mid-June to early September",
        "3 days of hiking",
        "Nomadic culture"
      ]
    }
  },
  {
    id: "alay-7",
    title: "Высоты Алая (7 дней)",
    category: "trekking",
    type: "Треккинг",
    place: "Алайские горы",
    duration: "7 дней",
    price: null,
    rating: null,
    reviews: null,
    lang: "EN",
    image: "https://bestofosh.com/wp-content/uploads/2024/06/Hike-Lenin-Peak.webp",
    lat: 39.6,
    lng: 72.9,
    agencyName: "Best of Osh",
    url: "https://bestofosh.com/7-days-trek-from-osh-city-heights-of-alay/",
    meeting: "Детали встречи — по согласованию с Best of Osh",
    description: "Величественная природа юга: реки, пастбища и озёра, сельская и кочевая жизнь.",
    highlights: [
      "Реки и озёра",
      "Пастбища",
      "Сельская жизнь"
    ],
    en: {
      title: "Heights of Alay (7 days)",
      type: "Trek",
      place: "Alay Mountains",
      meeting: "Meeting details are arranged with Best of Osh",
      description: "The majestic nature of the south: rivers, pastures and lakes, rural and nomadic life.",
      highlights: [
        "Rivers and lakes",
        "Pastures",
        "Rural life"
      ]
    }
  },
  {
    id: "alay-9",
    title: "Высоты Алая (9 дней)",
    category: "trekking",
    type: "Треккинг",
    place: "Алайские горы",
    duration: "9 дней",
    price: null,
    rating: null,
    reviews: null,
    lang: "EN",
    image: "https://bestofosh.com/wp-content/uploads/2024/06/Hiking-around-Lenin-Peak.webp",
    lat: 39.6,
    lng: 72.9,
    agencyName: "Best of Osh",
    url: "https://bestofosh.com/heights-of-alay-9-days/",
    meeting: "Детали встречи — по согласованию с Best of Osh",
    description: "Длинная версия популярного треккинга по Алайским горам: природа и кочевая культура.",
    highlights: [
      "9 дней",
      "Алайские горы",
      "Кочевая культура"
    ],
    en: {
      title: "Heights of Alay (9 days)",
      type: "Trek",
      place: "Alay Mountains",
      meeting: "Meeting details are arranged with Best of Osh",
      description: "The long version of the bestselling Alay trek: pristine nature and nomadic culture.",
      highlights: [
        "9 days",
        "Alay Mountains",
        "Nomadic culture"
      ]
    }
  },
  {
    id: "yukhin-4",
    title: "Пик Юхина за 4 дня",
    category: "trekking",
    type: "Восхождение",
    place: "Пик Юхина",
    duration: "4 дня",
    price: null,
    rating: null,
    reviews: null,
    lang: "EN",
    image: "https://bestofosh.com/wp-content/uploads/2025/06/AKXN1612.webp",
    lat: 39.45,
    lng: 72.85,
    agencyName: "Best of Osh",
    url: "https://bestofosh.com/yukhin-peak-4-days/",
    meeting: "Детали встречи — по согласованию с Best of Osh",
    description: "Восхождение на один из любимых пиков для акклиматизации: нетронутая природа, сельская и кочевая жизнь.",
    highlights: [
      "Акклиматизационный пик",
      "Средне — сложно",
      "Кочевая жизнь"
    ],
    en: {
      title: "Yukhin Peak in 4 days",
      type: "Climb",
      place: "Yukhin Peak",
      meeting: "Meeting details are arranged with Best of Osh",
      description: "Climb one of the favourite acclimatization peaks: pristine nature, rural and nomadic life.",
      highlights: [
        "Acclimatization peak",
        "Moderate to challenging",
        "Nomadic life"
      ]
    }
  },
  {
    id: "yukhin-8",
    title: "Пик Юхина за 8 дней",
    category: "trekking",
    type: "Восхождение",
    place: "Пик Юхина",
    duration: "8 дней",
    price: null,
    rating: null,
    reviews: null,
    lang: "EN",
    image: "https://bestofosh.com/wp-content/uploads/2025/06/IMG-20231106-WA00091.webp",
    lat: 39.45,
    lng: 72.85,
    agencyName: "Best of Osh",
    url: "https://bestofosh.com/8-days-yukhin-peak/",
    meeting: "Детали встречи — по согласованию с Best of Osh",
    description: "Длинная программа восхождения на пик Юхина с акклиматизацией. Середина июня — начало сентября.",
    highlights: [
      "8 дней",
      "Сложно",
      "Июнь — сентябрь"
    ],
    en: {
      title: "Yukhin Peak in 8 days",
      type: "Climb",
      place: "Yukhin Peak",
      meeting: "Meeting details are arranged with Best of Osh",
      description: "A longer Yukhin Peak climb with acclimatization. Mid-June to early September.",
      highlights: [
        "8 days",
        "Challenging",
        "June to September"
      ]
    }
  },
  {
    id: "horse-4",
    title: "Конный поход по Алаю (4 дня)",
    category: "trekking",
    type: "Конный тур",
    place: "Алайские горы",
    duration: "4 дня",
    price: null,
    rating: null,
    reviews: null,
    lang: "EN",
    image: "https://bestofosh.com/wp-content/uploads/2025/12/Horse-riding-tour-osh.webp",
    lat: 39.65,
    lng: 73.0,
    agencyName: "Best of Osh",
    url: "https://bestofosh.com/horse-trekking-from-osh/",
    meeting: "Детали встречи — по согласованию с Best of Osh",
    description: "Четыре дня верхом по Алайским горам.",
    highlights: [
      "Верхом",
      "Алайские горы",
      "4 дня"
    ],
    en: {
      title: "4-day horse trek in Alay",
      type: "Horse trek",
      place: "Alay Mountains",
      meeting: "Meeting details are arranged with Best of Osh",
      description: "Four days on horseback in the Alay Mountains.",
      highlights: [
        "On horseback",
        "Alay Mountains",
        "4 days"
      ]
    }
  },
  {
    id: "horse-5",
    title: "Конный поход по Алаю (5 дней)",
    category: "trekking",
    type: "Конный тур",
    place: "Алайские горы",
    duration: "5 дней",
    price: null,
    rating: null,
    reviews: null,
    lang: "EN",
    image: "https://bestofosh.com/wp-content/uploads/2025/12/horse-riding-tours-kyrgyzstan.webp",
    lat: 39.65,
    lng: 73.0,
    agencyName: "Best of Osh",
    url: "https://bestofosh.com/5-day-horse-riding-trek-from-osh-kyrgyzstan/",
    meeting: "Детали встречи — по согласованию с Best of Osh",
    description: "Пять дней верхом по Алаю. Подходит новичкам с базовым опытом езды.",
    highlights: [
      "Верхом",
      "Для новичков с опытом",
      "5 дней"
    ],
    en: {
      title: "5-day horse trek in Alay",
      type: "Horse trek",
      place: "Alay Mountains",
      meeting: "Meeting details are arranged with Best of Osh",
      description: "Five days riding in Alay. Suitable for beginners with basic riding experience.",
      highlights: [
        "On horseback",
        "Beginners with some experience",
        "5 days"
      ]
    }
  },
  {
    id: "horse-9",
    title: "Конный поход по Алаю (9 дней)",
    category: "trekking",
    type: "Конный тур",
    place: "Алайские горы",
    duration: "9 дней",
    price: null,
    rating: null,
    reviews: null,
    lang: "EN",
    image: "https://bestofosh.com/wp-content/uploads/2025/12/Horse-riding-tours-from-Osh-city.webp",
    lat: 39.65,
    lng: 73.0,
    agencyName: "Best of Osh",
    url: "https://bestofosh.com/9-day-horse-riding-from-osh-city-in-the-alay-mountains/",
    meeting: "Детали встречи — по согласованию с Best of Osh",
    description: "Девять дней верхом по Алайским горам. Средне — сложно, нужен базовый опыт езды.",
    highlights: [
      "Верхом",
      "9 дней",
      "Нужен опыт езды"
    ],
    en: {
      title: "9-day horse trek in Alay",
      type: "Horse trek",
      place: "Alay Mountains",
      meeting: "Meeting details are arranged with Best of Osh",
      description: "Nine days riding in the Alay Mountains. Moderate to challenging; basic riding experience needed.",
      highlights: [
        "On horseback",
        "9 days",
        "Riding experience needed"
      ]
    }
  }
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
    linkLabel: "Мастер-класс по плову",
    linkTab: "tours",
    expId: "plov",
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
      linkLabel: "Plov cooking class",
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
    linkLabel: "Гастротур по Ошу",
    linkTab: "tours",
    expId: "food-tour",
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
      linkLabel: "Osh food tour",
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
