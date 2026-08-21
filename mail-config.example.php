<?php
/* Образец mail-config.php — файла, который НЕ хранится в git и не
 * попадает в сборку сайта (см. eleventy.config.js и
 * src/contact-send.php). Этот файл (mail-config.example.php) —
 * просто справка, реального пароля тут нет и быть не должно.
 *
 * Как использовать:
 * 1. Скопируйте этот файл под именем mail-config.php.
 * 2. Впишите реальный пароль от ящика info@thermoconcept.by.
 * 3. Загрузите mail-config.php через файловый менеджер hoster.by
 *    (не через git!) в ту же папку на сервере, где лежит
 *    contact-send.php — то есть в корень сайта, рядом с index.html.
 *
 * src/.htaccess блокирует прямую HTTP-раздачу mail-config*.php, так
 * что даже если кто-то узнает точный адрес — файл не отдастся. */

define('MAIL_SMTP_HOST', 'smtp.hoster.by');
define('MAIL_SMTP_PORT', 465);
define('MAIL_SMTP_USER', 'info@thermoconcept.by');
define('MAIL_SMTP_PASS', 'ВПИШИТЕ_СЮДА_РЕАЛЬНЫЙ_ПАРОЛЬ_ЯЩИКА');
define('MAIL_TO', 'thermo.concept.engin@gmail.com');

/* Необязательно: уведомление в Telegram-бот при заявке (см.
 * telegram_notify() в contact-send.php). Если эти две строки убрать
 * или оставить пустыми — Telegram-канал просто не используется,
 * email и leads.ndjson продолжат работать как обычно.
 *
 * Как получить:
 * 1. Откройте в Telegram @BotFather, отправьте /newbot, следуйте
 *    подсказкам (имя бота, username) — в конце придёт токен вида
 *    "123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx".
 * 2. Напишите новому боту любое сообщение (например /start) — иначе
 *    он не сможет писать вам первым.
 * 3. Узнайте свой chat_id — проще всего через бота @userinfobot
 *    (напишите ему /start, он пришлёт ваш числовой Id). */
define('TELEGRAM_BOT_TOKEN', '');
define('TELEGRAM_CHAT_ID', '');
