// Советы туристу: обычаи и этикет в Оше.
//
// КАК ДОБАВИТЬ СОВЕТ: допишите объект в TIPS.
//   topic — id из TIP_TOPICS; kind — "must" (обязательно), "do" (принято), "dont" (не принято).
//   title/text — по-русски, блок en: { title, text } — перевод.
import { Bus, Coffee, Handshake, MoonStar, ShoppingBasket, Sparkles } from "lucide-react";

export const TIP_TOPICS = [
  { id: "all", label: "Все", en: { label: "All" }, Icon: Sparkles },
  { id: "mosque", label: "Мечеть", en: { label: "Mosque" }, Icon: MoonStar },
  { id: "table", label: "За столом", en: { label: "At the table" }, Icon: Coffee },
  { id: "people", label: "Общение", en: { label: "People" }, Icon: Handshake },
  { id: "bazaar", label: "Базар", en: { label: "Bazaar" }, Icon: ShoppingBasket },
  { id: "city", label: "В городе", en: { label: "Getting around" }, Icon: Bus },
];

export const TIPS = [
  // ── мечеть ──
  {
    id: "mosque-ablution",
    topic: "mosque",
    kind: "must",
    title: "Молятся только после омовения",
    text: "Перед намазом мусульмане совершают омовение — даарат: моют руки, лицо, рот, ноги. Для этого у мечети есть комната с кранами. Если вы пришли просто посмотреть, омовение не нужно, но приходите опрятными.",
    en: {
      title: "Prayer only after ablution",
      text: "Before prayer Muslims perform ablution (daarat): washing hands, face, mouth and feet. Mosques have a washroom for this. If you only come to look, ablution isn't required, but come neat and clean.",
    },
  },
  {
    id: "mosque-shoes",
    topic: "mosque",
    kind: "must",
    title: "Обувь снимают у входа",
    text: "На коврах мечети в обуви не ходят. Оставьте её на полке у двери. Носки лучше чистые и без дыр: сидеть придётся на полу.",
    en: {
      title: "Shoes off at the door",
      text: "Nobody walks on mosque carpets in shoes. Leave them on the rack by the door. Wear clean socks — you may sit on the floor.",
    },
  },
  {
    id: "mosque-dress",
    topic: "mosque",
    kind: "must",
    title: "Закрытые плечи и колени",
    text: "Мужчинам — без шорт и маек. Женщинам — длинная юбка или брюки, рукава и платок на голову. В больших мечетях платок часто дают у входа.",
    en: {
      title: "Cover shoulders and knees",
      text: "Men: no shorts or tank tops. Women: long skirt or trousers, sleeves and a headscarf. Larger mosques often lend scarves at the entrance.",
    },
  },
  {
    id: "mosque-friday",
    topic: "mosque",
    kind: "dont",
    title: "Не заходите во время намаза",
    text: "Пять раз в день мечеть занята молитвой, а в пятницу днём — главный намаз, жума: людей очень много. Приходите между молитвами и не проходите перед молящимися.",
    en: {
      title: "Don't enter during prayer",
      text: "The mosque is busy with prayer five times a day, and Friday midday prayer (juma) draws big crowds. Visit between prayers and never walk in front of someone praying.",
    },
  },
  {
    id: "mosque-photo",
    topic: "mosque",
    kind: "do",
    title: "Фото — только с разрешения",
    text: "Снимать архитектуру обычно можно, людей во время молитвы — нет. Если сомневаетесь, спросите у смотрителя: «Сүрөткө тартсам болобу?»",
    en: {
      title: "Photos only with permission",
      text: "Photographing the building is usually fine, people at prayer is not. When in doubt, ask the caretaker first.",
    },
  },

  // ── за столом ──
  {
    id: "table-tea",
    topic: "table",
    kind: "do",
    title: "Чай гостю наливают всегда",
    text: "В любом доме вам сразу нальют чай — отказываться не принято. Пиалу наполняют лишь наполовину: так хозяин может подливать чаще, это знак внимания. Полная пиала намекает, что гостю пора.",
    en: {
      title: "Guests always get tea",
      text: "Every host will pour you tea right away — it's polite to accept. The bowl is filled only halfway so the host can top it up often, a sign of care. A full bowl hints that it's time to leave.",
    },
  },
  {
    id: "table-bread",
    topic: "table",
    kind: "must",
    title: "Хлеб — святое",
    text: "Лепёшку (нан) не кладут лицевой стороной вниз, не бросают и не оставляют на земле. Её ломают руками и делят на всех. Упавший кусок поднимают.",
    en: {
      title: "Bread is sacred",
      text: "Flatbread (nan) is never placed upside down, thrown or left on the ground. It's broken by hand and shared. If a piece falls, pick it up.",
    },
  },
  {
    id: "table-seat",
    topic: "table",
    kind: "do",
    title: "Подождите, пока вас посадят",
    text: "Почётное место — тёр — дальше всего от входа, его отдают старшим или главному гостю. Не садитесь сами: хозяин покажет, где ваше место.",
    en: {
      title: "Wait to be seated",
      text: "The seat of honour (tör) is the one farthest from the door, kept for elders or the main guest. Don't pick a seat yourself — the host will show you.",
    },
  },
  {
    id: "table-try",
    topic: "table",
    kind: "do",
    title: "Попробуйте хоть немного",
    text: "Отказаться от угощения совсем — обидно для хозяев. Если не голодны, возьмите кусочек и похвалите: «Даамдуу!» — «Вкусно!».",
    en: {
      title: "Try at least a little",
      text: "Refusing food entirely can offend your hosts. If you're not hungry, take a small bite and say \"Daamduu!\" — \"Delicious!\".",
    },
  },
  {
    id: "table-enough",
    topic: "table",
    kind: "do",
    title: "Как сказать «мне хватит»",
    text: "Чай будут подливать, пока пиала пустеет. Чтобы остановиться, оставьте немного на дне или прикройте пиалу ладонью и скажите «Рахмат».",
    en: {
      title: "How to say \"I've had enough\"",
      text: "Tea keeps coming while your bowl is empty. To stop, leave a little at the bottom or cover the bowl with your hand and say \"Rakhmat\".",
    },
  },
  {
    id: "table-omin",
    topic: "table",
    kind: "do",
    title: "«Оомийн» в конце трапезы",
    text: "После еды старший читает короткое благословение — бата, а все проводят ладонями по лицу: «Оомийн». Можно повторить вместе со всеми — это оценят.",
    en: {
      title: "\"Oomiyn\" after the meal",
      text: "After eating, an elder says a short blessing (bata) and everyone passes their palms over their face: \"Oomiyn\". Joining in is appreciated.",
    },
  },

  // ── общение ──
  {
    id: "people-greet",
    topic: "people",
    kind: "do",
    title: "Рука к сердцу",
    text: "Мужчины здороваются за руку, часто двумя руками. С женщиной подождите — протянет ли она руку сама. Кивок с правой рукой у сердца — вежливо всегда.",
    en: {
      title: "Hand on heart",
      text: "Men shake hands, often with both hands. With women, wait to see if she offers her hand. A nod with your right hand on your heart is always polite.",
    },
  },
  {
    id: "people-elders",
    topic: "people",
    kind: "must",
    title: "Старшим — уважение",
    text: "Со старшими здороваются первыми, уступают им место в транспорте и не перебивают. К пожилым обращаются «эже» (к женщине) и «байке» (к мужчине).",
    en: {
      title: "Respect your elders",
      text: "Greet elders first, give up your seat and don't interrupt them. Address older women as \"eje\" and older men as \"baike\".",
    },
  },
  {
    id: "people-right",
    topic: "people",
    kind: "do",
    title: "Всё — правой рукой",
    text: "Деньги, еду и подарки передают правой рукой или двумя. Левой — невежливо.",
    en: {
      title: "Use your right hand",
      text: "Pass money, food and gifts with your right hand or both hands. Using the left is impolite.",
    },
  },
  {
    id: "people-photo",
    topic: "people",
    kind: "dont",
    title: "Не снимайте людей без спроса",
    text: "Особенно женщин и пожилых. Покажите на камеру и улыбнитесь — чаще всего разрешат.",
    en: {
      title: "Don't photograph people without asking",
      text: "Especially women and elders. Point at your camera and smile — most people will say yes.",
    },
  },
  {
    id: "people-langs",
    topic: "people",
    kind: "do",
    title: "Ош говорит на трёх языках",
    text: "Здесь слышно кыргызский, узбекский и русский. Русский понимают почти все, а пара слов по-кыргызски сразу растапливает лёд.",
    en: {
      title: "Osh speaks three languages",
      text: "You'll hear Kyrgyz, Uzbek and Russian. Most people understand Russian, and a couple of Kyrgyz words instantly break the ice.",
    },
  },

  // ── базар ──
  {
    id: "bazaar-haggle",
    topic: "bazaar",
    kind: "do",
    title: "Торговаться можно",
    text: "На базаре Жайма торг — часть игры. Называйте свою цену с улыбкой и не спешите. В магазинах и супермаркетах цены фиксированные.",
    en: {
      title: "Haggling is fine",
      text: "At Jayma Bazaar bargaining is part of the fun. Name your price with a smile and take your time. Shops and supermarkets have fixed prices.",
    },
  },
  {
    id: "bazaar-cash",
    topic: "bazaar",
    kind: "must",
    title: "Нужны наличные сомы",
    text: "На базаре карты берут редко. Держите при себе мелкие купюры — со сдачей с крупных бывает сложно.",
    en: {
      title: "Bring cash in som",
      text: "Cards are rarely accepted at the bazaar. Carry small notes — change for big ones can be hard to find.",
    },
  },
  {
    id: "bazaar-taste",
    topic: "bazaar",
    kind: "do",
    title: "Пробуйте перед покупкой",
    text: "Урюк, орехи, курут, мёд — продавцы сами предложат попробовать. Это нормально и ни к чему не обязывает.",
    en: {
      title: "Taste before you buy",
      text: "Dried apricots, nuts, kurut, honey — sellers will offer a taste. It's normal and doesn't oblige you to buy.",
    },
  },
  {
    id: "bazaar-pockets",
    topic: "bazaar",
    kind: "dont",
    title: "Не держите телефон в заднем кармане",
    text: "В толпе рядов легко потерять вещи. Сумку — перед собой, телефон — во внутренний карман.",
    en: {
      title: "Keep your phone out of back pockets",
      text: "It's easy to lose things in the crowded rows. Keep your bag in front and your phone in an inside pocket.",
    },
  },

  // ── в городе ──
  {
    id: "city-taxi",
    topic: "city",
    kind: "do",
    title: "Такси — через приложение",
    text: "Так цена известна заранее. Если ловите машину на улице, договоритесь о цене до посадки.",
    en: {
      title: "Order taxis via an app",
      text: "That way you know the fare upfront. If you hail a car on the street, agree on the price before getting in.",
    },
  },
  {
    id: "city-marshrutka",
    topic: "city",
    kind: "do",
    title: "В маршрутке платят на выходе",
    text: "Номер маршрута — на лобовом стекле. Оплата наличными водителю, когда выходите. Чтобы остановили, скажите водителю «Остановите здесь» — по-русски поймут.",
    en: {
      title: "Pay for minibuses when you get off",
      text: "The route number is on the windscreen. Pay the driver in cash as you get off. To stop, tell the driver — \"Ostanovite zdes\" (Russian for \"stop here\") is understood.",
    },
  },
  {
    id: "city-water",
    topic: "city",
    kind: "dont",
    title: "Не пейте воду из-под крана",
    text: "Берите бутилированную — она продаётся везде. Чай и горячие блюда — безопасно.",
    en: {
      title: "Don't drink tap water",
      text: "Buy bottled water — it's sold everywhere. Tea and hot dishes are safe.",
    },
  },
  {
    id: "city-ramadan",
    topic: "city",
    kind: "do",
    title: "В Рамадан — деликатно",
    text: "Многие постятся от рассвета до заката. Кафе работают, но есть и курить демонстративно на улице днём не стоит.",
    en: {
      title: "Be considerate during Ramadan",
      text: "Many people fast from dawn to sunset. Cafés stay open, but avoid eating or smoking conspicuously on the street during the day.",
    },
  },
  {
    id: "city-bill",
    topic: "city",
    kind: "do",
    title: "Проверьте счёт в кафе",
    text: "Плата за обслуживание часто уже включена в счёт. Если её нет, чаевые оставляют по желанию.",
    en: {
      title: "Check the bill at cafés",
      text: "A service charge is often already included. If not, tipping is up to you.",
    },
  },
];
