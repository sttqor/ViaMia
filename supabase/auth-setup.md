# Вход по почте и телефону — что настроить в Supabase

Код приложения готов. Осталось три шага в панели Supabase (проект **ViaMia**).
Без шага 2 письмо приходит без кода, без шага 3 — не приходит вообще никому,
кроме вас самих.

---

## 1. Обновить базу (1 минута)

Supabase → **SQL Editor** → вставить целиком `supabase/schema.sql` → **Run**.

Скрипт безопасно запускается повторно. Что добавилось:

- таблица `profiles` — избранное, маршрут и контакты в аккаунте;
- колонка `booking_requests.user_id` — бронь принадлежит человеку, а не устройству;
- правило доступа: турист видит только свои заявки, чужие — нет.

`user_id` проставляет сама база (триггер `booking_fill`), подделать его из приложения нельзя.

---

## 2. Положить код в письмо (2 минуты)

Supabase → **Authentication** → **Email Templates**.

Открыть **два** шаблона и в каждый вставить содержимое `supabase/email-otp.html`:

| Шаблон | Когда приходит |
|---|---|
| **Confirm signup** | первый вход человека (аккаунта ещё нет) |
| **Magic Link** | все следующие входы |

Если заполнить только один — половина людей получит письмо без кода.

Поле **Subject** в обоих:

```
Код входа в Osh Guide: {{ .Token }}
```

Почему так: по умолчанию в шаблоне только ссылка `{{ .ConfirmationURL }}`, а кода нет —
поэтому и пришло «письмо от Supabase без всякого кода». Код подставляет `{{ .Token }}`.

Ссылку в шаблон намеренно не кладём: антивирусы почты открывают ссылки сами,
и ссылка «сгорает» раньше, чем человек её нажмёт.

---

## 3. Свой отправитель (обязательно для реальных пользователей)

Пока не настроен свой SMTP, встроенная почта Supabase:

- шлёт письма **только на адреса участников вашей организации в Supabase** —
  любому другому туристу придёт ошибка `email_address_not_authorized`;
- ограничена **2 письмами в час** на весь проект.

То есть без этого шага вход работает только у вас. Настроить:

Supabase → **Authentication** → **Emails** → **SMTP Settings** → включить и вписать данные
почтового провайдера. После этого письма идут с вашего адреса и с вашим шаблоном —
Supabase в письме больше не упоминается.

Чем отправлять, если своего домена пока нет:

| Провайдер | Нужен домен | Бесплатно |
|---|---|---|
| **Brevo** | нет, хватит подтверждённого адреса | ~300 писем в день |
| **Gmail** (пароль приложения) | нет | ~500 писем в день |
| **Resend** | да, нужен свой домен | 3000 писем в месяц |

Для начала проще Brevo или Gmail. Когда появится свой домен (условно `oshguide.kg`) —
переключиться на Resend и отправителя `noreply@oshguide.kg`.

После включения SMTP Supabase ставит лимит **30 писем в час** — поднять можно в
**Authentication** → **Rate Limits**.

---

## 4. Вход по телефону +996 (тестовые коды)

Supabase → **Authentication** → **Sign In / Providers** → **Phone** → включить.

SMS-провайдера пока нет, поэтому:

1. **SMS provider** — выбрать Twilio и вписать любые заглушки (Account SID `AC000…`,
   Auth Token, Message Service SID) — без провайдера Supabase не даёт включить телефон.
   Настоящие SMS с заглушками не уйдут.
2. **Test Phone Numbers and OTPs** — вписать тестовые номера с постоянным кодом,
   по одному на строку (номер без «+»):
   ```
   996700000001=123456
   996555000002=123456
   ```
   На эти номера SMS не отправляется, код всегда `123456`. Ими можно входить,
   регистрироваться и привязывать телефон в профиле.
3. Когда появится настоящий шлюз (Twilio или местный через «Send SMS hook») —
   заменить заглушки. Код приложения менять не нужно.

## 5. Пароль и привязка второго способа входа

- **Authentication** → **Sign In / Providers** → **Email** → выключить
  **Secure email change** — иначе при привязке почты код уходит на два адреса.
- **Email Templates** → шаблон **Change Email Address**: так же, как в шаге 2,
  вставить `supabase/email-otp.html` и тему `Код входа в Osh Guide: {{ .Token }}` —
  по нему приходит код при привязке почты в профиле.
  ⚠️ Шаблоны можно менять **только после настройки своего SMTP** (шаг 3) — до этого
  Supabase шлёт стандартные письма со ссылкой, а не с кодом.
- **Authentication** → **Sign In / Providers** → **Email** → **Minimum password length**: 8.
  **Leaked password protection** доступна только на платном плане Pro.
- Как хранится пароль: приложение его никуда не сохраняет и сразу отдаёт Supabase. Supabase
  держит только **bcrypt-хэш** (`auth.users.encrypted_password`, префикс `$2a$`, проверено 25.11.2026),
  сам пароль из него не восстановить — его не видим ни мы, ни Supabase. В `user_metadata` лежит только
  флаг `has_password`. Это же сказано в политике (`src/privacy-text.js`, «Где хранятся данные»).

Сделано 19.11.2026: телефон включён (заглушки Twilio, тестовые номера
`996700000001` и `996555000002`, код `123456`, действуют до 31.12.2026),
Secure email change выключен, минимальная длина пароля — 8.
SMTP — Gmail `viamiasupp@gmail.com` (пароль приложения Google, двухэтапная защита включена),
`smtp.gmail.com:587`, имя «Osh Guide». Шаблоны с `{{ .Token }}`: Confirm sign up, Magic link or OTP,
Change email address, Reauthentication. **Email OTP length = 6** (по умолчанию Supabase шлёт 8 цифр,
а приложение принимает 6).
Проверено: вход по коду почты и телефона, установка пароля, вход по паролю (неверный → «пароль не подошёл»).
Тестовый пароль — в `.env.example`.
Gmail — около 500 писем в день и может попадать в спам; со своим доменом перейти на Resend.

## 6. Что синхронизируется

`profiles.settings` (миграция уже применена, она же в `schema.sql`): язык, валюта, тема,
уведомления, режим «сам / с гидом». Плюс, как и раньше, избранное, маршрут и брони.
При входе то, что гость сам поменял на устройстве, перекрывает аккаунт; остальное берётся из аккаунта.

---

## Проверка

1. Открыть приложение → Профиль → **Войти**.
2. Ввести почту → прийти должно письмо **с вашего адреса** с шестизначным кодом.
3. Ввести код → в профиле появится «Ваш аккаунт» и почта.
4. Добавить место в избранное, выйти — избранное с устройства исчезает.
   Войти снова — возвращается из аккаунта. Это и значит, что вход настоящий.

## Вход через Google и Apple

Кнопки «Войти через Google / Apple» есть на сайте и в приложении (`src/AuthParts.jsx` → `OAuthButtons`, `mobile/lib/OAuthButtons.js`, `mobile/lib/oauth.js`).
Показываются **только те, что включены в Supabase** (приложение спрашивает `/auth/v1/settings`), так что недоделанная настройка не сломает экран входа.

### 0. Адреса возврата (один раз)
Supabase → Authentication → URL Configuration → Redirect URLs, добавить:
- `https://osh-explorer2.vercel.app/**` — сайт;
- `viamia://**` — приложение (вход через браузер возвращается на `viamia://auth`);
- `exp+viamia://auth` — тестовая dev-сборка (со звёздочками `exp+viamia://**` Supabase адрес не принимает);
- `kg.viamia.app://auth` — Capacitor-сборка для магазинов (выпуск 15.12, `src/native.js`);
- `http://localhost:5173/**` — проверка на компьютере.

Сделано 25.11.2026: Site URL = `https://osh-explorer2.vercel.app`, все адреса выше добавлены.

### 1. Google (бесплатно, ~15 минут)
1. console.cloud.google.com → создать проект «ViaMia».
2. APIs & Services → OAuth consent screen: External, название ViaMia, почта поддержки, логотип, политика `https://osh-explorer2.vercel.app/privacy`. Нажать Publish (иначе войдут только тестовые почты).
3. Credentials → Create credentials → OAuth client ID → **Web application**.
   Authorized redirect URIs: `https://wksvdvqxixyjguvbcqza.supabase.co/auth/v1/callback`.
4. Скопировать Client ID и Client secret → Supabase → Authentication → Sign In / Providers → **Google** → Enable, вставить, Save.

Сделано 25.11.2026: проект `viamia-515803`, клиент «ViaMia web», экран согласия без логотипа (логотип потребовал бы проверки Google), главная и `/privacy` указаны, статус **In production**; в Supabase Google включён (`/auth/v1/settings` → `google: true`).

### 2. Apple (нужен аккаунт Apple Developer, 99 $/год)
Если в приложении есть вход через Google, App Store требует и «Войти через Apple» (правило 4.8).
1. developer.apple.com → Certificates, IDs & Profiles → Identifiers → App ID `kg.viamia.app` → включить **Sign In with Apple**.
2. Identifiers → «+» → **Services IDs** → например `kg.viamia.web` → включить Sign In with Apple → Configure:
   Domains: `wksvdvqxixyjguvbcqza.supabase.co`, Return URLs: `https://wksvdvqxixyjguvbcqza.supabase.co/auth/v1/callback`.
3. Keys → «+» → включить Sign In with Apple → скачать `.p8` (скачивается один раз!), записать Key ID и Team ID.
4. Supabase → Providers → **Apple** → Enable:
   - Client IDs: `kg.viamia.app,kg.viamia.web` (первый — нативный вход на айфоне, второй — сайт и android);
   - Secret Key: сгенерировать из `.p8` (в окне Supabase есть ссылка на генератор). **Ключ живёт 6 месяцев** — поставить напоминание.

### Как это работает
- Сайт: переход к Google / Apple и обратно на ту же страницу, сессию подхватывает supabase-js.
- Айфон + Apple: нативное окно Apple → `signInWithIdToken` (с nonce).
- Android и Google на айфоне: защищённое окно браузера → `viamia://auth?code=…` → `exchangeCodeForSession` (PKCE).
- Capacitor-сборка (до замены на Expo): системный браузер `@capacitor/browser` → `kg.viamia.app://auth` (схема в `ios/App/App/Info.plist` и `AndroidManifest.xml`) → сессия в `src/native.js` (`nativeOAuth`, `appUrlOpen`). Встроенный webview Google не пускает.
- Новый человек через Google / Apple получает обычный аккаунт; профиль создаёт тот же триггер `handle_new_user`, слияние избранного и маршрута работает так же.
