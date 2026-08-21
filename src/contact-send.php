<?php
/* 21.08. Обработчик формы заявки (Contact - L / Catalog - L → Form - L,
 * см. form-l.njk) — единственный серверный код на сайте, всё остальное
 * статика. Принимает POST от contact-form.js (fetch на
 * '/contact-send.php'), проверяет обязательные поля и отправляет письмо
 * на почту клиента через авторизованный SMTP hoster.by
 * (smtp.hoster.by:465, SSL/TLS — см. mail-config.php).
 *
 * Почему свой SMTP-клиент, а не PHPMailer: библиотеку негде было
 * подтянуть (packagist/github закрыты в песочнице, где писался этот
 * файл), да и не нужна — hoster.by это обычный shared-хостинг без
 * Composer "из коробки", а письмо тут одно простое текстовое, без
 * вложений. smtp_send_mail() ниже — минимальный клиент поверх
 * fsockopen(), написан по RFC 5321 (EHLO/AUTH LOGIN/MAIL FROM/RCPT
 * TO/DATA), проверяет код ответа сервера на каждом шаге.
 *
 * ВАЖНО про пароль: он НЕ хранится в этом файле и не должен попадать
 * в git (публичный репозиторий, история необратима). Читается из
 * mail-config.php — тот лежит РЯДОМ, прямо на сервере, создаётся
 * вручную через файловый менеджер хостинга (см. инструкцию, которая
 * шла в чате отдельным сообщением) и никогда не заливается вместе со
 * сборкой сайта. src/.htaccess блокирует прямую HTTP-раздачу файлов
 * mail-config*.php — даже если бы кто-то узнал точный адрес, файл
 * просто не отдастся браузеру.
 *
 * mail-config.example.php в корне репозитория — образец БЕЗ реального
 * пароля, только для справки, что именно должно быть в mail-config.php
 * на сервере. */

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

$name    = contactField('name');
$phone   = contactField('phone');
$email   = contactField('email');
$message = contactField('message');
$consent = contactField('consent');

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
$body = implode("\r\n", [
    'Новая заявка с сайта thermoconcept.by',
    '',
    'Имя: ' . $name,
    'Телефон: ' . $phone,
    'Email: ' . ($email !== '' ? $email : '—'),
    '',
    'Сообщение:',
    $message,
]);

$replyToEmail = $headerSafeEmail !== '' ? $headerSafeEmail : MAIL_SMTP_USER;
$replyToName  = $headerSafeName !== '' ? $headerSafeName : 'Сайт thermoconcept.by';

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
} catch (Exception $e) {
    error_log('contact-send.php SMTP error: ' . $e->getMessage());
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'send_failed']);
    exit;
}

echo json_encode(['success' => true]);

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
