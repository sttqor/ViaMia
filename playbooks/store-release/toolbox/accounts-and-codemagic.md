# что сделать пользователю: аккаунты и облачная сборка

## 1. apple developer (99 $/год) — лично
1. на iphone: поставить приложение **Apple Developer**, войти своим apple id (нужна двухфакторная защита).
2. «Enroll» → «Individual» → фото паспорта → оплата картой.
3. ждать письма «Welcome to the Apple Developer Program» (от пары дней до недели).
4. https://appstoreconnect.apple.com → My Apps → «+» → New App:
   платформа iOS, имя `ViaMia: гид по Ошу`, язык Russian, bundle id `kg.viamia.app`
   (если его нет в списке — Certificates, IDs & Profiles → Identifiers → «+» → App IDs → `kg.viamia.app`).
5. Users and Access → Integrations → App Store Connect API → «+» ключ с ролью **App Manager**.
   скачать `.p8`, записать Issuer ID и Key ID — понадобятся в codemagic.

## 2. google play console (25 $ один раз) — лично
1. https://play.google.com/console → создать аккаунт разработчика «Личный» → оплата, проверка паспорта и телефона.
2. «Создать приложение»: ViaMia, бесплатное, приложение.
3. **закрытое тестирование:** Тестирование → Закрытое → создать трек, добавить почты 12+ тестеров (gmail).
   тестеры жмут ссылку-приглашение, ставят приложение и **не удаляют 14 дней**. только потом откроется «Рабочая версия».
4. для автозагрузки из codemagic: Настройки → Доступ к API → сервисный аккаунт google cloud с ролью «Release manager», скачать json.

## 3. codemagic (бесплатно 500 минут в месяц)
1. https://codemagic.io → войти через github → добавить репозиторий `sttqor/ViaMia` → тип «Capacitor / codemagic.yaml».
2. Teams → Integrations → **App Store Connect**: имя `ViaMia ASC key`, Issuer ID, Key ID, файл `.p8`.
3. Code signing identities → iOS → сгенерировать сертификат и профиль для `kg.viamia.app` (кнопками, через ключ из шага 2).
4. Code signing identities → Android keystores → «Generate» с именем `viamia_upload_key`. **скачать и сохранить копию** — без неё обновлять приложение нельзя.
5. Environment variables:
   - группа `supabase`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (те же, что в vercel);
   - группа `google_play`: `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` = содержимое json из шага 2.4 (secure).
6. Start build → `ios-testflight` → через ~20 минут сборка в TestFlight, на iphone через приложение **TestFlight**.
7. Start build → `android-closed-test` → сборка появится черновиком в закрытом тесте.
   **первый раз** .aab надо загрузить в play console руками (скачать из Artifacts) — так google требует.

## android без codemagic (на windows)
нужен android studio: `npm run build && npx cap sync android && npx cap open android` → Build → Generate Signed Bundle.
