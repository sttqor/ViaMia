// Политика конфиденциальности — для App Store / Google Play и экрана в профиле.
// Меняете, что собираем (новый сервис, аналитика, push) — обновите текст и дату.
// Адрес для магазинов: https://osh-explorer2.vercel.app/privacy
export const PRIVACY_UPDATED = "2026-11-25";
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
          "Если входите через Apple или Google — получаем от них только имя и почту (Apple может дать скрытый адрес вместо настоящего). Пароль от Apple или Google мы не видим.",
          "Имя и фото профиля — если вы их добавили (Профиль → нажать на имя). Имя видит агентство в вашей заявке на бронь, фото — только вы. При удалении аккаунта фото удаляется.",
          "Избранное и маршрут дня — хранятся на телефоне, а после входа ещё и в аккаунте, чтобы не потерялись.",
          "Заявку на бронь: имя, контакт для связи, дату и число гостей. Её видит агентство, которое проводит тур, — чтобы подтвердить и связаться с вами.",
          "Переписку по брони — сообщения в чате с агентством. Их видите вы и агентство, которое проводит тур.",
          "Для турагентств: данные организации и документы для проверки (их видят только само агентство и модератор ViaMia), фото туров (видны всем) и данные гидов — имя, телефон, фото (их видит турист после подтверждения брони).",
          "Геолокацию — только когда вы нажимаете «Где я», строите маршрут или включаете навигатор. На наш сервер она не отправляется; чтобы построить путь, координаты точек уходят в сервис маршрутов (см. ниже).",
        ],
      },
      {
        h: "Чего мы не делаем",
        p: ["Не продаём и не передаём данные рекламщикам. В приложении нет рекламы, трекеров и сторонней аналитики.", "Не используем искусственный интеллект: ваши данные и сообщения не передаются ИИ-сервисам и не используются для обучения моделей.", "Если приложение падает, отчёт об ошибке (модель телефона, версия системы, место сбоя в коде) уходит в Sentry — чтобы мы нашли и исправили баг. Имени, почты и телефона в отчёте нет."],
      },
      {
        h: "Где хранятся данные",
        p: [
          "Аккаунты, туры и заявки — в Supabase (облачная база данных). Приложение раздаётся через Vercel.",
          "Пароль, если вы его задали, хранится только в виде хэша (bcrypt) — из него нельзя восстановить сам пароль, поэтому его не видим ни мы, ни Supabase. Данные между телефоном и сервером идут по защищённому соединению (HTTPS).",
          "Погода (Open-Meteo), карта (OpenFreeMap), курсы валют (open.er-api.com, запасной — jsDelivr), шрифты (Google Fonts) и фото туров (сайты агентств, Unsplash, Supabase) запрашиваются напрямую с телефона — эти сервисы видят только обычный технический запрос (IP-адрес, тип устройства), без ваших личных данных.",
          "Маршруты и навигатор: координаты точек пути (и ваше место, если вы его включили) отправляются в сервис маршрутов OpenStreetMap (routing.openstreetmap.de, FOSSGIS e.V.) — без имени, почты и аккаунта.",
          "Вход через Google или Apple проходит на их страницах — дальше действуют их правила. Отчёты о падениях — в Sentry (см. выше).",
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
          "Профиль → «Удалить аккаунт»: аккаунт, избранное, маршрут и уведомления удаляются сразу и навсегда. Заявки и переписка по ним остаются у агентства, но больше не связаны с вашим аккаунтом.",
          "Фото, которые агентство убрало из тура или так и не сохранило, удаляются с сервера; при удалении тура — все его фото.",
          "Аккаунт турагентства: кабинет → «Данные» → «Удалить аккаунт агентства» — откроется письмо в поддержку, удалим агентство, туры, гидов и документы в течение 7 дней (заявки туристов остаются у них).",
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
          "If you sign in with Apple or Google, we only get your name and email from them (Apple may give us a private relay address instead). We never see your Apple or Google password.",
          "Profile name and photo — if you added them (Profile → tap your name). The agency sees your name in your booking request; only you see the photo. The photo is deleted when you delete your account.",
          "Saved places and your day route — stored on your phone and, once you sign in, in your account so they don't get lost.",
          "Booking requests: name, contact, date and number of guests. The agency running the tour sees them to confirm and contact you.",
          "Booking chat — messages with the agency. Only you and the agency running the tour can see them.",
          "For tour agencies: company details and documents for verification (only the agency and the ViaMia moderator see them), tour photos (public) and guide details — name, phone, photo (shown to the tourist after a booking is confirmed).",
          "Location — only when you tap “My location”, build a route or start the navigator. It is never sent to our server; to build a route, the route points are sent to a routing service (see below).",
        ],
      },
      {
        h: "What we don't do",
        p: ["We don't sell data or share it with advertisers. There are no ads, trackers or third-party analytics.", "We don't use artificial intelligence: your data and messages are not sent to AI services or used to train models.", "If the app crashes, an error report (device model, OS version, where in the code it failed) is sent to Sentry so we can fix the bug. It contains no name, email or phone number."],
      },
      {
        h: "Where data is stored",
        p: [
          "Accounts, tours and bookings are stored in Supabase (cloud database). The app is served by Vercel.",
          "If you set a password, only its hash (bcrypt) is stored. The password itself can't be recovered from it, so neither we nor Supabase can see it. Data between your phone and the server travels over an encrypted connection (HTTPS).",
          "Weather (Open-Meteo), maps (OpenFreeMap), exchange rates (open.er-api.com, backup — jsDelivr), fonts (Google Fonts) and tour photos (agency websites, Unsplash, Supabase) are requested directly from your phone — these services only see a regular technical request (IP address, device type), no personal data.",
          "Routes and the navigator: route point coordinates (and your location, if you turned it on) are sent to the OpenStreetMap routing service (routing.openstreetmap.de, FOSSGIS e.V.) — without your name, email or account.",
          "Signing in with Google or Apple happens on their pages — their own rules apply. Crash reports go to Sentry (see above).",
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
          "Profile → “Delete account”: your account, saved places, route and notifications are deleted immediately and permanently. Booking requests and their chat stay with the agency but are no longer linked to your account.",
          "Photos an agency removed from a tour or never saved are deleted from the server; deleting a tour deletes all its photos.",
          "Agency accounts: cabinet → “Profile” → “Delete agency account” opens an email to support; we delete the agency, tours, guides and documents within 7 days (tourists keep their bookings).",
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
