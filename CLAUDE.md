# Osh Guide (ViaMia) — контекст для Claude Code

## Что это
Мобильное веб-приложение (PWA-стиль, ширина ~430px) про город Ош, Кыргызстан.
Две аудитории:
1. **Туристы без гида** — смотрят места, собирают маршрут на день, бронируют туры.
2. **Турагентства** — выкладывают туры и отвечают на заявки в кабинете внутри того же приложения (Профиль → «Вы турагентство?»). Модерация — Профиль → «Вы админ?».

Язык интерфейса — русский. Пользователь пишет по-русски, отвечать по-русски, коротко, строчными буквами, без длинных объяснений.

## Стек
- Vite + React 19, JS/JSX (не TypeScript)
- motion (импорт из `motion/react`, бывший framer-motion), lucide-react
- Карта — MapLibre GL (`npm maplibre-gl`) + векторные тайлы OpenFreeMap (бесплатно, без ключа). Всё в `src/OshMap.jsx` + `src/OshMap.css`: `ExploreMap` (вкладка «Карта») и `MiniMap`; в `App.jsx` грузятся лениво (`lazy`), чтобы ~1 МБ не шёл в главный бандл. Стиль OpenFreeMap (positron / dark) перекрашивается в палитру приложения в `recolor()`. Воркер подключён через `?worker&url` + `setWorkerUrl` (иначе под Vite не грузится), в `vite.config.js` — `worker.format: "es"`.
- Навигация — внутри приложения, без ссылок на Google. 2ГИС — только одна кнопка «Открыть в 2ГИС» (у места на карте и у тура; `twoGisPlace` в `src/twogis.js`), маршруты в 2ГИС не строим. `src/routing.js`: OSRM на серверах FOSSGIS (`routing.openstreetmap.de`, пешком/на машине, без ключа), не ответил — прямые линии пунктиром. Кнопка навигации во вкладке «Маршрут» → `navPlan` в `App` → `ExploreMap nav={…}`; «Маршрут» у места строит путь от геолокации (не в Оше / без геолокации — от центра).
- Пошаговый навигатор (как Google Maps / 2ГИС): `src/Navigator.jsx` + `Navigator.css` (плашка манёвра, камера за человеком с наклоном и поворотом, голос `speechSynthesis`, перестроение при сходе >35 м пешком / >60 м на машине, «вы прибыли» на каждой остановке, экран не гаснет — Wake Lock), `src/navigation.js` (геометрия: проекция на линию, манёвры из шагов OSRM, `primeSpeech` для iOS). Кнопка «Начать» в панели маршрута — если человек в Оше, иначе «Демо» (стрелка сама едет по маршруту). Подписи — ключи `nav.*`, голосовые расстояния — `pl.meters` / `pl.kilometers`. Ограничение веба: ведёт только при включённом экране, на iOS в фоне не работает.
- Места на карте (кафе, еда, музеи, мечети, рынки, парки, жильё, банкоматы, аптеки, больницы) — `src/places-osm.json`, выгрузка из OpenStreetMap; обновить: `node scripts/fetch-places.mjs`. Категории и цвета меток — `MAP_CATS` в `OshMap.jsx`, подписи — ключи `map.cat.*`.
- Стили — обычный CSS (`src/index.css`, `src/Facts.css`), без Tailwind в коде

## Файлы
- `src/App.jsx` — каркас: заставка, вкладки (`TABS`), хранилище (`osh-guide-v1`), переходы между экранами (`AppScreens`).
- `src/views/*` — экраны: `HomeView`, `RouteView`, `ToursView`, `SavedView`, `ProfileView`, `Detail` (тур), `Booking`, `TicketView`.
- `src/components/ui.jsx` — общие куски экранов (`ExperienceCard`, `ChipRow`, `SaveHeart`, ленивые `ExploreMap` / `MiniMap` …); `src/components/shared.js` — пресеты анимаций (`SPRING`, `SCREEN_IN`, `TAP` …) и `priceText`.
- `src/data.js` — `EXPERIENCES` (туры), `CATEGORIES`, `FACTS`, `CITY`, `upcomingDates`, `makeCode`. Вверху файла — инструкция, как добавлять карточки.
- `src/Facts.jsx` + `src/Facts.css` — блок «Интересные факты» с нижним листом (портал в body).
- `src/HomeBlocks.jsx` — шапка с погодой (Open-Meteo, сама обновляется раз в 10 мин и при возврате в приложение, почасовой прогноз), быстрые кнопки, фразы на кыргызском (транскрипция `tr` + озвучка через `speechSynthesis`: ky → kk → ru), SOS.
- `src/Tips.jsx` + `src/Tips.css` — экран «Советы» (этикет), данные — `src/tips-data.js` (не `tips.js`: на Windows конфликтует с `Tips.jsx`).
- Экраны поверх вкладок без тура (`page` в `App`: `"saved"` — избранное, `"tips"` — советы) участвуют в истории «назад».
- Избранное, маршрут и брони сохраняются в `localStorage` (ключ `osh-guide-v1`).
- `src/i18n.js` — словари интерфейса (`DICT`: ru/en внутри, ещё 10 языков в `src/locales/*.js` — ky, kk, uz, tr, de, fr, es, zh, ja, ko), валюты с запасными курсами к USD, форматирование цен/дат/длительности. Новый ключ — добавить в ru, en и во все `locales/*.js`. Нет перевода карточки → en (для ky/kk/uz → ru), см. `fallbackOf`.
- `src/rates.js` — живые курсы валют (open.er-api.com, запасной — currency-api на jsdelivr), кэш 6 ч; в компонентах `money()`, `fmtRate(code)`, `ratesDate` из `useSettings()`.
- Восход/закат в шапке — из Open-Meteo на 2 дня: после заката показывается завтрашний рассвет, ночью по дуге идёт луна, есть отсчёт «закат через…».
- `src/SettingsProvider.jsx` + `src/settings-context.js` — язык/валюта/уведомления (ключ `osh-guide-settings`). В компонентах: `const { t, loc, money, plural, fmtDate, fmtDuration } = useSettings()`. Никаких строк интерфейса в JSX напрямую — только через `t()`.
- Перевод карточки — блок `en: {...}` внутри тура/факта/категории в `data.js`; `loc(item)` подставляет его. Цены в `data.js` всегда в USD. У факта `expId` — связанный тур.
- Туры и факты берутся через `useContent()` (`src/ContentProvider.jsx`): сначала кэш/`data.js`, потом свежие из Supabase. Напрямую `EXPERIENCES`/`FACTS` в компонентах не импортировать.
- Supabase: `src/supabase.js` (клиент, `null` без ключей), `src/api.js` (чтение туров/фактов, заявка, отмена по коду).
- Аккаунт: `src/AuthProvider.jsx` + `src/auth-context.js` (`useAuth()`: enabled/user/sendCode/verifyCode/signOut, `signInWithProvider("google"|"apple")`, `providers`), `src/Login.jsx` — вход по почте шестизначным кодом (OTP, без пароля) или через Google / Apple (`OAuthButtons` в `src/AuthParts.jsx`; в приложении — `mobile/lib/OAuthButtons.js` + `mobile/lib/oauth.js`). Кнопка провайдера видна, только если он включён в Supabase (`/auth/v1/settings`); настройка — `supabase/auth-setup.md`, раздел «Вход через Google и Apple» (Google настроен 25.11, Apple ждёт аккаунта разработчика). В Capacitor-сборке вход идёт через системный браузер — `nativeOAuth` в `src/native.js`, возврат `kg.viamia.app://auth`. Пароль приложение не хранит: в Supabase только bcrypt-хэш, это сказано в политике (`src/privacy-text.js`); меняется сбор или хранение данных → обновить политику (и дату) и анкеты в `playbooks/store-release/toolbox/store-listing.md`. Условия использования — `src/terms-text.js` (тот же экран `src/Privacy.jsx` с `kind="terms"`, адрес `/terms`, строка в профиле); заглушки [ТРЕБУЕТ ПРОВЕРКИ ЮРИСТОМ] заполнить до выпуска. Возврат входа в Capacitor принимается только после своего `nativeOAuth` (метка `osh-oauth-started`, 10 мин). Ссылки из базы — через `safeHttp` (`src/components/shared.js`).
- Вход не косметический: при входе гостевые избранное и маршрут **сливаются** с тем, что в аккаунте (таблица `profiles`), брони подтягиваются из базы по `user_id`; при выходе личное стирается с устройства — но только если слияние успело пройти (иначе данные остались бы только здесь). Логика — в `src/useAccountSync.js`, рефы `pulledFor` / `readyFor`; там же живое обновление броней по событиям.
- `booking_requests.user_id` проставляет триггер `booking_fill` из `auth.uid()`, из приложения его подделать нельзя. Свои брони читаем с явным `.eq("user_id", …)`: у владельца агентства есть и второе право на чтение, чужие заявки в билеты туриста попасть не должны.
- Настройка писем и шаблон — `supabase/auth-setup.md` и `supabase/email-otp.html`. Код в письме даёт `{{ .Token }}`, и вставить его нужно в **два** шаблона: «Confirm signup» (первый вход) и «Magic Link» (остальные). Без своего SMTP встроенная почта Supabase шлёт письма только участникам организации и не больше 2 в час. Схема и RLS — `supabase/schema.sql`; данные — `supabase/seed.sql`, генерируется `node scripts/make-seed.mjs` из `data.js`.
- Маршрут и избранное в localStorage — id туров; бронь хранит копию тура (`exp`), флаг `synced` (ушла ли в базу) и `id` строки в базе (для чата и «поездки»).
- Кабинет агентства и модерация — `src/agency/*` (`AgencyApp`, `BookingsTab`, `GuidesTab`, `TourEditor`, `AdminApp`). Аккаунт агентства или админа после входа сразу открывается в своём кабинете **без «назад» в туристическую часть** (роли — `src/RolesProvider.jsx` + `useRoles()` из `src/roles-context.js`, общие с телефоном; `onExit={null}` = рабочий режим); выход — снова туристическое приложение. Турист заходит в анкету агентства из профиля (`page` = "agency"). Запасные адреса `/agency`, `/admin` (`src/Root.jsx`). Строки — `src/locales/agency.js` (`ag.*`, `adm.*`, `chat.*`).
- Бронь после подтверждения — «поездка» в билете: `src/booking/TripBlock.jsx` (время встречи, гид, программа, связь, чат), `BookingChat.jsx` (чат туриста и агентства, Supabase Realtime), `EventsBell.jsx` (колокольчик), запросы — `src/booking/booking-api.js`. Бронь только из аккаунта: в форме брони сначала вход.
- Исправления безопасности после аудита 28.11 — `playbooks/store-release/toolbox/06-security.sql` (**не применён**: отмена брони только владельцем, поля агентства при создании заявки, заблокированное агентство, перепроверка при смене названия). Заголовки безопасности сайта — `vercel.json`.
- Права на бронь, чат, гидов, события — только в базе: `playbooks/booking-notifications/toolbox/01-booking.sql` (тест с откатом — `02-test-booking.sql`). Модерация агентств и туров — `playbooks/agency-cabinet/toolbox/01-agency.sql`.
- Push в веб-версии (Web Push, VAPID): база — `playbooks/booking-notifications/toolbox/04-push.sql` (триггер на `booking_events` → edge function `push-send`), воркер — `public/push-sw.js` (через `workbox.importScripts`), браузер — `src/push.js`, `src/PushSync.jsx` (в `main.jsx`), переключатель — `src/NotifsRow.jsx`; нажатие открывает `/?ticket=КОД`. Ключи: `VITE_VAPID_PUBLIC_KEY` (.env, Vercel), `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` — секреты функций. В Capacitor и Expo push пока нет.
- Отчёты о падениях — Sentry (`@sentry/react` в `src/main.jsx`, включается ключом `VITE_SENTRY_DSN` в `.env` и Vercel).
- Приложение для магазинов — Capacitor (`android/`, `ios/`, `capacitor.config.json`, `src/native.js`), облачная сборка — `codemagic.yaml`. После правок кода: `npm run build && npx cap sync`.

## Мобильная версия на Expo (`mobile/`, в работе)
Замена Capacitor после выпуска 15.12: React Native + Expo Router, тот же id `kg.viamia.app` — выйдет обновлением.
- Общий код **не копируется**: туры, переводы, вход, api, `SettingsProvider`/`AuthProvider`/`ContentProvider` берутся из `../src` (`mobile/metro.config.js`: `lucide-react` → `lucide-react-native`, `./supabase` → `mobile/lib/supabase.js`, пакеты — из `mobile/node_modules`). В общем коде `document`/`window` — только с проверкой `typeof document`.
- `localStorage` в телефоне — `expo-sqlite/localStorage/install` (`mobile/index.js`).
- Экраны — `mobile/src/app/` (файл = экран), цвета — `useColors()` из `mobile/lib/theme.js` (значения из `design/tokens.css`).
- Пакеты ставить `EXPO_OFFLINE=1 npx expo install …` (api.expo.dev в облаке закрыт). Карта — нативный модуль, в Expo Go не работает: нужна dev-сборка (`npx eas-cli@latest build --profile development`, `mobile/eas.json`), потом `npx expo start`.
- Готово: каталог туров, экран тура, вход по коду, язык, избранное и маршрут (`mobile/lib/store.js` — тот же ключ `osh-guide-v1` и `useAccountSync`), бронь (`book/[id]`), билет и «поездка» с чатом (`ticket/[code]`, `lib/BookingChat.js`), «мои поездки», колокольчик (`BellButton` → `events`), карта (`(tabs)/map.js`, `@maplibre/maplibre-react-native`; стиль и категории — общий `src/mapStyle.js`). главная (`(tabs)/index.js`: погода, факты `fact/[id]`, фразы с озвучкой `expo-speech`, SOS; данные — общий `src/home-data.js`). Сборка apk — `.github/workflows/mobile-android.yml` (Actions → Artifacts, без аккаунта Expo). Вид: заставка (`lib/Splash.js`), капсула-навбар (`lib/TabBar.js`), стопка фраз (`lib/PhraseStack.js`), анимации — reanimated. Кабинет агентства (`app/agency/*`, `lib/agency/*`) и модерация (`app/admin.js`); общая логика формы тура — `src/agency/tour-form.js`. Первый запуск — `lib/Onboarding.js` («сам / с гидом», переключатель — во вкладке «Туры», `Segmented` в `lib/ui.js`). Главная 1-в-1 с сайтом: `lib/home/Weather.js` (дуга солнца — общий `sunInfo` в `src/home-data.js`), `lib/home/FactStory.js` (сторис), быстрые кнопки, красный SOS с листом; «Советы» — `app/tips.js` (данные `src/tips-data.js`). Туры, экран тура, маршрут и профиль — 1-в-1 с сайтом (`TourCard`/`ChipRow`/`Segmented` в `lib/ui.js`; общие `src/agencies.js`, `src/route-plan.js`); вход — `app/login.js`, выбор языка/валюты — `app/pick.js`. Дальше: маршрут на карте и навигатор (`/map?nav=1&ids=…`), push.

## Дизайн (утверждённый стиль)
Макет: https://claude.ai/artifact/7zUSk4KrLpTE7MsphuV2tK
**Точная копия — в папке `design/`**: `tokens.css` (все переменные) и экраны `00-style.html` … `04-detail.html` с инлайн-стилями. Брать значения оттуда, не придумывать. Если макет обновится — пользователь положит новые файлы в `design/`.
- Один акцент: терракота `#D4532B` (hover `#B8431F`) — основные кнопки, активные точки.
- Тёмный: индиго `#1E2638` — текст, выбранные фильтры.
- Золото `#E9B44C` — только маленькие метки/теги.
- Фон песок `#FAF6F0`, подложки `#F1E9DD`, линии `#E8E0D4`, вторичный текст `#6B6459`, карточки белые.
- Бирюзу (`--turquoise`) и оранжевый `#ff5533` убрать — не смешивать цвета.
- Кнопки: высота 48, радиус 14 (основная — терракота, вторичная — белая с рамкой).
- Фильтры-чипы: высота 36, радиус 999. Иконки-кнопки: круг 44, белые с тонкой рамкой (без «стекла»).
- Карточки: радиус 20, рамка 1px, без тяжёлых теней.
- Шрифты: Manrope (интерфейс), Playfair Display (крупные заголовки).
- **Тёмная тема**: переключатель «Светлая / Тёмная / Авто» в профиле (`theme` в `useSettings()`, по умолчанию «Авто» = как в телефоне). Работает через `data-theme` на `<html>` и переопределение токенов в `:root[data-theme="dark"]` (`src/index.css`); скрипт в `index.html` ставит тему до загрузки React. Правила для новых стилей: цвета только через токены, без `#fff` и `rgba(...)` для фонов. `--ink` в тёмной теме — светлый текст; для заливки выбранного (чипы, ползунок) — `--solid`; для карточек, которые всегда тёмные (фраза дня, совет дня), — `--indigo`; стекло — `--glass` / `--glass-lens`. Палитры тёмной темы в `design/` нет — подобрана под светлую.
- Нижняя навигация: **как в iOS 26** (решение пользователя, заменяет макет) — `src/TabBar.jsx` + `src/TabBar.css`: стеклянная капсула, «линза» под выбранной вкладкой, перетаскивание пальцем, повторный тап — наверх, сворачивание при прокрутке (`src/useMinimizeOnScroll.js`). «Маршрут» выделен терракотовым кружком внутри капсулы (`accent: true` в `TABS`). **Без цифры-бейджа**.

## Состояние (24.11.2026)
- Сделано: Supabase (живой проект «ViaMia»), кабинет агентств с модерацией, туры агентств с меткой «проверено», бронь-заявка → подтверждение → «поездка» с гидом и чатом, колокольчик, офлайн-карта, навигатор, политика и удаление аккаунта, Sentry, Capacitor-проекты.
- 22–24.11: приложение переписано на Expo / React Native (`mobile/`, см. раздел выше) — все экраны туриста, кабинет агентства и модерация (агентство и админ после входа сразу в своём кабинете, без «назад» в туристическую часть — `mobile/lib/roles.js`); анимации по единым правилам (`mobile/lib/motion.js`, на сайте — пружины без отскока, лесенка 30 мс); вход через Google / Apple; проверка кода тремя агентами и исправления (realtime-подписки с уникальной темой, слияние аккаунта, бронь без `crypto` в Hermes и др.).
- 24.11 ветка `claude/adoring-carson-1x2z8l` слита в `main`, сайт на Vercel обновлён.
- Цель — выпуск в App Store и Google Play **15.12.2026**, аккаунты разработчика личные, юрлица нет. Чем выпускаемся (Capacitor или Expo) — решить после проверки Expo-сборки на телефоне.
- Ждёт пользователя: почта для кодов входа (Brevo SMTP в Supabase); Google-вход (OAuth-клиент в Google Cloud + Supabase, ~15 мин); аккаунты Apple / Google Play; 12 тестеров для Google (тест начать **до 1.12**); проверка apk (Actions → mobile-android → Run workflow); решение по фото туров с bestofosh.com (в приложении не грузятся — сайт отдаёт их только браузерам; подделывать заголовки нельзя) и по правке триггеров для админа со своим агентством (`is_trusted()` в `01-agency.sql`).
- Потом: push-уведомления, письма-уведомления, оплата Freedom Pay (нужно юрлицо) вместе с корзиной, переводы на 10 языков.

## Выпуск в магазины
Плейбуки: выпуск — `playbooks/store-release/PLAYBOOK.md`; кабинет и модерация — `playbooks/agency-cabinet/PLAYBOOK.md`; бронь, чат, уведомления — `playbooks/booking-notifications/PLAYBOOK.md`. Сводка для нового чата — `playbooks/HANDOFF.md`.

## Правила
- Перед изменениями запускать `npm run lint`, после — `npm run build`.
- Не коммитить и не пушить без просьбы пользователя.
- Не придумывать реальные цены/контакты агентств — ставить заглушки.
- В коммитах и PR — без подписи Claude: никаких `Co-Authored-By`, `Claude-Session`, «Generated with Claude Code».

## Граф кода (graphify)
Граф проекта — `graphify-out/` (`GRAPH_REPORT.md`, `graph.json`). Если задача длиннее 17 слов — сначала смотреть в граф (`GRAPH_REPORT.md`, при необходимости `/graphify query`), потом в код. После каждого изменения кода обновлять граф (`/graphify --update`).
