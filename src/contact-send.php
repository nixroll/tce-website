<?php
/* 21.08. Обработчик формы заявки (Contact - L / Catalog - L → Form - L,
 * см. form-l.njk) — единственный серверный код на сайте, всё остальное
 * статика. Принимает POST от contact-form.js (fetch на
 * '/contact-send.php'), проверяет обязательные поля и уводит заявку
 * по ТРЁМ независимым каналам:
 *   1) email на почту клиента через авторизованный SMTP hoster.by
 *      (smtp.hoster.by:465, SSL/TLS — см. mail-config.php);
 *   2) уведомление в Telegram-бот (telegram_notify() ниже) — Bot API,
 *      обычный HTTPS POST, без библиотек;
 *   3) строка в leads.ndjson рядом на сервере — локальный журнал заявок,
 *      подробности у appendLeadLog() ниже.
 * Каналы независимы: если один упал (например, письмо ушло, но
 * осело в спам-фильтре получателя — это в принципе не видно со
 * стороны отправителя, SMTP просто подтверждает приём) — остальные
 * всё равно сработают. Пользователю на сайте отвечаем успехом, если
 * сработал хотя бы email ИЛИ Telegram; journal.ndjson — тихий
 * подстраховочный канал, не влияет на ответ.
 *
 * Почему свой SMTP-клиент, а не PHPMailer: библиотеку негде было
 * подтянуть (packagist/github закрыты в песочнице, где писался этот
 * файл), да и не нужна — hoster.by это обычный shared-хостинг без
 * Composer "из коробки", а письмо тут одно простое текстовое, без
 * вложений. smtp_send_mail() ниже — минимальный клиент поверх
 * fsockopen(), написан по RFC 5321 (EHLO/AUTH LOGIN/MAIL FROM/RCPT
 * TO/DATA), проверяет код ответа сервера на каждом шаге.
 *
 * ВАЖНО про секреты: пароль от почты и токен Telegram-бота НЕ хранятся
 * в этом файле и не должны попадать в git (публичный репозиторий,
 * история необратима). Читаются из mail-config.php — тот лежит РЯДОМ,
 * прямо на сервере, создаётся вручную через файловый менеджер
 * хостинга и никогда не заливается вместе со сборкой сайта.
 * src/.htaccess блокирует прямую HTTP-раздачу mail-config.php и
 * leads.ndjson (там телефоны/email посетителей — тоже не для
 * посторонних глаз) — даже если кто-то узнает точный адрес, файлы
 * просто не отдадутся браузером.
 *
 * mail-config.example.php в корне репозитория — образец БЕЗ реальных
 * секретов, только для справки, что именно должно быть в
 * mail-config.php на сервере (включая опциональные
 * TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID — если их там нет, Telegram-канал
 * просто тихо пропускается, defined()-проверки ниже). */

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'method_not_allowed']);
    exit;
}

$configPath = __DIR__ . '/mail-config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    error_log('contact-send.php: mail-config.php not found on server');
    echo json_encode(['success' => false, 'error' => 'server_not_configured']);
    exit;
}
require $configPath;
/* Ожидаются константы: MAIL_SMTP_HOST, MAIL_SMTP_PORT, MAIL_SMTP_USER,
 * MAIL_SMTP_PASS, MAIL_TO — см. mail-config.example.php. */

/* Honeypot: скрытое поле "website" в form-l.njk (visually-hidden +
 * tabindex="-1" + autocomplete="off") — живой посетитель его не видит
 * и не может тронуть с клавиатуры, простые боты, заполняющие все поля
 * подряд, попадаются. Отвечаем success, чтобы бот не понял, что его
 * отсекли, письмо просто не отправляем. */
if (!empty($_POST['website'])) {
    echo json_encode(['success' => true]);
    exit;
}

function contactField($key) {
    return isset($_POST[$key]) ? trim((string) $_POST[$key]) : '';
}

$name       = contactField('name');
$phone      = contactField('phone');
$email      = contactField('email');
$message    = contactField('message');
$consent    = contactField('consent');
$sourcePage = contactField('source_page'); /* скрытое поле формы, см. form-l.njk — просто для контекста в письме/логе/Telegram, ничем не валидируется */

$errors = [];
if ($name === '') $errors[] = 'name';
if ($phone === '') $errors[] = 'phone';
if ($message === '') $errors[] = 'message';
if ($consent === '') $errors[] = 'consent';
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'email';

if ($errors) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'validation', 'fields' => $errors]);
    exit;
}

/* Защита от header injection: перенос строки в поле формы мог бы
 * подмешать в письмо посторонние SMTP/MIME-заголовки. Само тело письма
 * ниже уходит в base64 (Content-Transfer-Encoding), поэтому там перенос
 * строк не проблема, — а вот в заголовки (From/Reply-To) идут только
 * name/email, их и чистим. */
function stripHeaderInjection($value) {
    return preg_replace('/[\r\n]+/', ' ', $value);
}
$headerSafeName  = stripHeaderInjection($name);
$headerSafeEmail = stripHeaderInjection($email);

$subject = 'Заявка с сайта thermoconcept.by';
$bodyLines = ['Новая заявка с сайта thermoconcept.by'];
if ($sourcePage !== '') {
    $bodyLines[] = 'Страница: ' . $sourcePage;
}
$bodyLines[] = '';
$bodyLines[] = 'Имя: ' . $name;
$bodyLines[] = 'Телефон: ' . $phone;
$bodyLines[] = 'Email: ' . ($email !== '' ? $email : '—');
$bodyLines[] = '';
$bodyLines[] = 'Сообщение:';
$bodyLines[] = $message;
$body = implode("\r\n", $bodyLines);

$replyToEmail = $headerSafeEmail !== '' ? $headerSafeEmail : MAIL_SMTP_USER;
$replyToName  = $headerSafeName !== '' ? $headerSafeName : 'Сайт thermoconcept.by';

/* Журнал заявок — тихий подстраховочный канал, пишется ПЕРВЫМ и
 * независимо от того, получится ли email/Telegram ниже: даже если оба
 * канала уведомлений откажут одновременно (сеть, неверный пароль,
 * недоступен Telegram и т.п.), сама заявка не потеряется — appendLeadLog()
 * гасит собственные ошибки, на общий ответ не влияет. */
appendLeadLog([
    'time'        => date('c'),
    'name'        => $name,
    'phone'       => $phone,
    'email'       => $email,
    'message'     => $message,
    'source_page' => $sourcePage,
    'ip'          => isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '',
]);

$emailOk = false;
try {
    smtp_send_mail(
        MAIL_SMTP_HOST,
        (int) MAIL_SMTP_PORT,
        MAIL_SMTP_USER,
        MAIL_SMTP_PASS,
        MAIL_TO,
        'Сайт thermoconcept.by',
        MAIL_SMTP_USER,
        $subject,
        $body,
        $replyToEmail,
        $replyToName
    );
    $emailOk = true;
} catch (Exception $e) {
    error_log('contact-send.php SMTP error: ' . $e->getMessage());
}

/* Telegram — второй, полностью независимый канал уведомлений.
 * TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID опциональны: если их нет в
 * mail-config.php (defined() ниже это ловит), канал просто тихо
 * пропускается — ничего не ломается для тех, кто ещё не подключил бота. */
$telegramOk = false;
$telegramBotToken = defined('TELEGRAM_BOT_TOKEN') ? TELEGRAM_BOT_TOKEN : '';
$telegramChatId   = defined('TELEGRAM_CHAT_ID') ? TELEGRAM_CHAT_ID : '';
if ($telegramBotToken !== '' && $telegramChatId !== '') {
    $telegramOk = telegram_notify($telegramBotToken, $telegramChatId, str_replace("\r\n", "\n", $body));
}

/* Успех для посетителя сайта — если сработал хотя бы один из "живых"
 * каналов уведомления (email или Telegram). Журнал в leads.ndjson —
 * подстраховка для владельца сайта, не входит в этот критерий: он не
 * заменяет уведомление, просто гарантирует, что заявка не потеряется
 * физически, даже если её не увидели сразу. */
if (!$emailOk && !$telegramOk) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'send_failed']);
    exit;
}

echo json_encode(['success' => true]);

/**
 * Локальный журнал заявок — leads.ndjson рядом с этим файлом (NDJSON:
 * один JSON-объект на строку, дописывается в конец — просто и надёжно
 * читать построчно, если понадобится смотреть/парсить вручную или
 * позже собрать простую страницу-просмотрщик). Ошибки записи гасятся
 * (@) намеренно: это подстраховочный канал, а не основной — сайт не
 * должен падать целиком, если вдруг не хватило прав на запись файла.
 * Защищён от прямой раздачи через src/.htaccess (там телефоны/email
 * посетителей).
 */
function appendLeadLog(array $lead) {
    $logPath = __DIR__ . '/leads.ndjson';
    $line = json_encode($lead, JSON_UNESCAPED_UNICODE) . "\n";
    @file_put_contents($logPath, $line, FILE_APPEND | LOCK_EX);
}

/**
 * Уведомление в Telegram через Bot API (обычный HTTPS POST на
 * api.telegram.org, без библиотек). Сначала пробует curl (почти всегда
 * есть на shared-хостинге), при отсутствии — file_get_contents поверх
 * stream_context (нужен allow_url_fopen, тоже почти всегда включён).
 * Возвращает false при любой проблеме — вызывающий код это учитывает
 * при решении, отвечать ли посетителю успехом (см. выше), сам ничего
 * не бросает, чтобы не мешать остальным каналам.
 */
function telegram_notify($botToken, $chatId, $text) {
    $url = 'https://api.telegram.org/bot' . $botToken . '/sendMessage';
    $payload = ['chat_id' => $chatId, 'text' => $text];

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query($payload),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
        ]);
        $response = curl_exec($ch);
        $ok = $response !== false;
        curl_close($ch);
        return $ok;
    }

    $context = stream_context_create([
        'http' => [
            'method'        => 'POST',
            'header'        => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content'       => http_build_query($payload),
            'timeout'       => 10,
            'ignore_errors' => true,
        ],
    ]);
    $response = @file_get_contents($url, false, $context);
    return $response !== false;
}

/**
 * Минимальный SMTP-клиент: подключается по SSL (порт 465 — "неявный"
 * TLS, соединение шифруется сразу, в отличие от STARTTLS на 587),
 * авторизуется (AUTH LOGIN) и отправляет одно текстовое письмо.
 * На каждом шаге ждём ожидаемый код ответа сервера — при несовпадении
 * бросаем Exception, вызывающий код (catch выше) превращает это в
 * понятный JSON-ответ клиенту, не раскрывая деталей наружу (сама
 * причина уходит в error_log — искать в логах хостинга).
 */
function smtp_send_mail($host, $port, $username, $password, $toEmail, $fromName, $fromEmail, $subject, $body, $replyToEmail, $replyToName) {
    $timeout = 15;
    $socket = @fsockopen('ssl://' . $host, $port, $errno, $errstr, $timeout);
    if (!$socket) {
        throw new Exception('connect_failed: ' . $errstr);
    }
    stream_set_timeout($socket, $timeout);

    $expect = function ($expectedCode) use ($socket) {
        $response = '';
        while ($line = fgets($socket, 515)) {
            $response .= $line;
            /* Многострочный ответ SMTP: "250-..." — есть продолжение,
             * "250 ..." (пробел на 4-й позиции) — последняя строка. */
            if (isset($line[3]) && $line[3] === ' ') break;
        }
        $code = (int) substr($response, 0, 3);
        if ($code !== $expectedCode) {
            throw new Exception('unexpected_response: ' . trim($response));
        }
        return $response;
    };
    $send = function ($command) use ($socket) {
        fwrite($socket, $command . "\r\n");
    };

    $expect(220);

    $send('EHLO thermoconcept.by');
    $expect(250);

    $send('AUTH LOGIN');
    $expect(334);
    $send(base64_encode($username));
    $expect(334);
    $send(base64_encode($password));
    $expect(235);

    $send('MAIL FROM:<' . $fromEmail . '>');
    $expect(250);

    $send('RCPT TO:<' . $toEmail . '>');
    $expect(250);

    $send('DATA');
    $expect(354);

    $headers = [
        'From: =?UTF-8?B?' . base64_encode($fromName) . '?= <' . $fromEmail . '>',
        'To: <' . $toEmail . '>',
        'Reply-To: =?UTF-8?B?' . base64_encode($replyToName) . '?= <' . $replyToEmail . '>',
        'Subject: =?UTF-8?B?' . base64_encode($subject) . '?=',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        'Date: ' . date('r'),
    ];

    /* Тело в base64: самый надёжный способ провезти кириллицу и не
     * споткнуться о строку из одной точки — по SMTP она означает конец
     * DATA, вручную экранировать ("byte-stuffing") лишний источник
     * багов, base64 снимает вопрос целиком. */
    $encodedBody = chunk_split(base64_encode($body));

    $message = implode("\r\n", $headers) . "\r\n\r\n" . $encodedBody . "\r\n.";
    $send($message);
    $expect(250);

    $send('QUIT');
    fclose($socket);
}
