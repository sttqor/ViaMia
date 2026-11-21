# тексты для app store и google play

## общее
- **название:** ViaMia — гид по Ошу (app store: до 30 символов → `ViaMia: гид по Ошу`)
- **подзаголовок (ios, 30):** Места, туры и маршрут на день
- **краткое описание (google, 80):** Путеводитель по Ошу: места на карте, маршрут на день и туры от проверенных агентств
- **категория:** Путешествия (Travel)
- **возраст:** 4+ / «Для всех»
- **поддержка:** viamiasupp@gmail.com
- **политика:** https://osh-explorer2.vercel.app/privacy
- **id приложения:** `kg.viamia.app` (после первой загрузки поменять нельзя)

## полное описание (ru)
ViaMia — карманный гид по Ошу для тех, кто путешествует без экскурсовода.

• Карта города: кафе, национальная кухня, музеи, мечети, базары, парки, банкоматы, аптеки и больницы. Поиск, расстояние пешком и маршрут в 2ГИС одной кнопкой.
• Маршрут на день: соберите места и туры в один план и откройте его на карте.
• Туры от проверенных агентств Оша: что входит, сколько длится, где встреча и как проходит бронь. Бронь — это заявка: агентство подтверждает, оплата на месте.
• Работает без интернета: скачайте карту Оша в профиле — пригодится в горах и в роуминге.
• Погода, рассвет и закат, полезные фразы на кыргызском с озвучкой, советы по местному этикету и кнопка SOS.
• Светлая и тёмная тема.

Вы турагентство? Подайте заявку прямо в приложении: Профиль → «Вы турагентство?». После проверки документов ваши туры увидят туристы.

## full description (en)
ViaMia is a pocket guide to Osh, Kyrgyzstan, for travellers without a tour guide.

• City map: cafés, local food, museums, mosques, bazaars, parks, ATMs, pharmacies and hospitals. Search, walking distance and one-tap directions in 2GIS.
• Day route: put places and tours into one plan and open it on the map.
• Tours from verified Osh agencies: what's included, duration, meeting point and how booking works. Booking is a request — the agency confirms, you pay on site.
• Works offline: download the Osh map in your profile — handy in the mountains and when roaming.
• Weather, sunrise and sunset, useful Kyrgyz phrases with audio, local etiquette tips and an SOS button.
• Light and dark theme.

## ключевые слова (ios, 100 символов)
ош,кыргызстан,гид,туры,экскурсии,карта,маршрут,путешествие,osh,kyrgyzstan,travel,guide,tours

## скриншоты
- iphone 6.9" (1320×2868) и 6.5" (1284×2778), android телефон (1080×1920+), минимум 3, лучше 5:
  1. главная (погода, факты) 2. карта с карточкой места 3. маршрут дня на карте 4. тур: организатор «проверено» и шаги брони 5. билет «подтверждено»
- снимать на реальном телефоне в светлой теме, язык — русский (и отдельный набор на английском).

## анкеты магазинов (что отвечать)
- **apple «App Privacy»:** собираем «Contact Info → Email / Phone» (для входа, привязано к пользователю, не для трекинга), «User Content → Other» (заявки на бронь), «Identifiers → User ID». Трекинга нет. Геолокация — не собираем (только на устройстве). «Diagnostics → Crash Data» (sentry, если задан `VITE_SENTRY_DSN`): не привязано к пользователю, не для трекинга.
- **google «Data safety»:** то же + «App info and performance → Crash logs» (sentry, не передаётся третьим лицам для рекламы); шифрование при передаче — да (https); удаление — да, в приложении и по почте.
- **для проверки apple (App Review Information):** демо-вход — тестовый номер +996 555 000 002, код 123456 (`supabase/auth-setup.md`); в заметке: «Booking creates a request to a local agency, payment happens offline. No in-app purchases.»
- **оплата:** покупок в приложении нет; туры — услуги в реальном мире, правило apple 3.1.3(e), apple-оплата не нужна.
