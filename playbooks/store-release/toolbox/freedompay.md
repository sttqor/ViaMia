# Оплата картой через Freedom Pay — что сделать, когда дадут ключи

Код готов и выложен, но выключен. Как работает:
1. Агентство подтверждает заявку → у туриста в билете кнопка «Оплатить картой · сумма».
2. Кнопка → функция `pay-init` (supabase) создаёт платёж → турист на странице оплаты Freedom Pay.
3. Freedom Pay сообщает результат в функцию `pay-result` → заявка помечается «Оплачено» (видно агентству
   во вкладке «Заявки» и туристу в билете), обоим приходит событие в колокольчик.
4. Оплаченную бронь турист сам не отменяет — пишет агентству, деньги возвращает агентство / поддержка.

Файлы: `supabase/functions/pay-init`, `supabase/functions/pay-result`, `supabase/functions/_shared/freedompay.js`
(тест подписи: `node supabase/functions/freedompay.test.mjs`), база — `05-payments.sql` (уже применён).

## Включить
1. Supabase → Edge Functions → Secrets:
   - `FREEDOMPAY_MERCHANT_ID`, `FREEDOMPAY_SECRET` — из кабинета Freedom Pay;
   - `FREEDOMPAY_CURRENCY` — `KGS` (по умолчанию) или `USD`, если мерчант принимает доллары;
   - `USD_TO_KGS` — курс (цены туров хранятся в USD), например `87.5`; для `KGS` обязателен;
   - `FREEDOMPAY_TESTING=1` — пока тестируем (тестовые карты из их документации), потом убрать;
   - `FREEDOMPAY_API` — если их адрес не `https://api.freedompay.kg`;
   - `SITE_URL` — куда вернуть туриста после оплаты (по умолчанию сайт на Vercel).
2. Vercel (и codemagic, группа `supabase`): `VITE_PAYMENTS=freedompay` → передеплой. Появится кнопка оплаты.
3. В кабинете Freedom Pay указать Result URL: `https://wksvdvqxixyjguvbcqza.supabase.co/functions/v1/pay-result`.

## Сверить с их документацией (написано по общему протоколу PayBox, их сайт из облака не открывался)
- адрес создания платежа: `…/init_payment.php`, ответ — XML с `pg_status`, `pg_redirect_url`;
- подпись `pg_sig` = md5(«имя скрипта;значения полей по алфавиту ключей;секрет»);
- для ответа на Result URL имя скрипта — `pay-result` (последняя часть адреса);
- поля результата: `pg_order_id`, `pg_payment_id`, `pg_amount`, `pg_currency`, `pg_result` (1 = оплачено).
Если что-то отличается — поправить `_shared/freedompay.js` и выложить функции заново.

## Перед включением для всех
- политика (`src/privacy-text.js`): строка «оплату картой принимает Freedom Pay, данные карты мы не видим и не храним»;
- анкеты магазинов (`store-listing.md`): «Financial Info → Purchase history», данные карты не собираем;
- договоры с агентствами: деньги приходят на твоё юрлицо, выплата агентству — после тура, комиссия.
