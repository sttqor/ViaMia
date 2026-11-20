// Политика конфиденциальности — для App Store / Google Play и экрана в профиле.
// Меняете, что собираем (новый сервис, аналитика, push) — обновите текст и дату.
// Адрес для магазинов: https://osh-explorer2.vercel.app/privacy
export const PRIVACY_UPDATED = "2026-11-20";
export const SUPPORT_EMAIL = "viamiasupp@gmail.com";

export const PRIVACY = {
  ru: {
    title: "Политика конфиденциальности",
    intro:
      "ViaMia — путеводитель по Ошу: места, туры и бронирование у местных агентств. Здесь коротко и честно о том, какие данные мы получаем и зачем.",
    sections: [
      {
        h: "Что мы собираем",
        p: [
          "Почту или телефон — только если вы входите в аккаунт. Нужны, чтобы прислать код входа.",
          "Избранное и маршрут дня — хранятся на телефоне, а после входа ещё и в аккаунте, чтобы не потерялись.",
          "Заявку на бронь: имя, контакт для связи, дату и число гостей. Её видит агентство, которое проводит тур, — чтобы подтвердить и связаться с вами.",
          "Для турагентств: данные организации и документы для проверки. Их видят только само агентство и модератор ViaMia.",
          "Геолокацию — только на телефоне, когда вы нажимаете «Где я» на карте. На наш сервер она не отправляется.",
        ],
      },
      {
        h: "Чего мы не делаем",
        p: ["Не продаём и не передаём данные рекламщикам. В приложении нет рекламы, трекеров и сторонней аналитики."],
      },
      {
        h: "Где хранятся данные",
        p: [
          "Аккаунты, туры и заявки — в Supabase (облачная база данных). Приложение раздаётся через Vercel.",
          "Погода (Open-Meteo), карта (OpenFreeMap) и курсы валют запрашиваются напрямую с телефона — эти сервисы видят только обычный технический запрос, без ваших личных данных.",
          "Ссылки «Открыть в 2ГИС» открывают приложение или сайт 2ГИС — дальше действуют их правила.",
        ],
      },
      {
        h: "Сколько храним",
        p: [
          "Пока у вас есть аккаунт. Заявки на бронь остаются у агентства для учёта проведённых туров, но после удаления аккаунта больше не связаны с ним.",
        ],
      },
      {
        h: "Как удалить данные",
        p: [
          "Профиль → «Удалить аккаунт»: аккаунт, избранное и маршрут удаляются сразу и навсегда.",
          "Аккаунт турагентства удаляется через поддержку — чтобы не пропали заявки туристов.",
          "Данные только на телефоне удаляются вместе с приложением.",
        ],
      },
      {
        h: "Дети",
        p: ["Приложение не предназначено для детей младше 13 лет, и мы сознательно не собираем их данные."],
      },
      {
        h: "Связь",
        p: ["Вопросы и запросы на удаление — на почту поддержки ниже. Если политика изменится, мы обновим дату вверху."],
      },
    ],
  },
  en: {
    title: "Privacy policy",
    intro:
      "ViaMia is a guide to Osh: places, tours and booking with local agencies. Here is a short, honest summary of what data we get and why.",
    sections: [
      {
        h: "What we collect",
        p: [
          "Your email or phone — only if you sign in. We use it to send you a sign-in code.",
          "Saved places and your day route — stored on your phone and, once you sign in, in your account so they don't get lost.",
          "Booking requests: name, contact, date and number of guests. The agency running the tour sees them to confirm and contact you.",
          "For tour agencies: company details and documents for verification. Only the agency and the ViaMia moderator can see them.",
          "Location — only on your phone when you tap “My location” on the map. It is never sent to our server.",
        ],
      },
      {
        h: "What we don't do",
        p: ["We don't sell data or share it with advertisers. There are no ads, trackers or third-party analytics."],
      },
      {
        h: "Where data is stored",
        p: [
          "Accounts, tours and bookings are stored in Supabase (cloud database). The app is served by Vercel.",
          "Weather (Open-Meteo), maps (OpenFreeMap) and exchange rates are requested directly from your phone — these services only see a regular technical request, no personal data.",
          "“Open in 2GIS” links open the 2GIS app or website — their own rules apply there.",
        ],
      },
      {
        h: "How long we keep it",
        p: [
          "As long as you have an account. Booking requests stay with the agency for its records but are no longer linked to you after you delete your account.",
        ],
      },
      {
        h: "Deleting your data",
        p: [
          "Profile → “Delete account”: your account, saved places and route are deleted immediately and permanently.",
          "Agency accounts are deleted via support so tourists' bookings aren't lost.",
          "Data stored only on your phone is removed together with the app.",
        ],
      },
      {
        h: "Children",
        p: ["The app is not intended for children under 13, and we don't knowingly collect their data."],
      },
      {
        h: "Contact",
        p: ["Questions and deletion requests — email support below. If this policy changes, we'll update the date at the top."],
      },
    ],
  },
};
