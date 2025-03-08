<?php
require_once __DIR__ . '/../vendor/autoload.php'; // Папка vendor на уровень выше src

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../'); // .env тоже на уровень выше src
$dotenv->load();

return [
    'emails' => [
        'contact' => $_ENV['EMAIL_CONTACT'],
        'quote' => $_ENV['EMAIL_QUOTE'],
    ],
    'smtp' => [
        'host' => $_ENV['SMTP_HOST'],
        'username' => $_ENV['SMTP_USER'],
        'password' => $_ENV['SMTP_PASS'],
        'port' => $_ENV['SMTP_PORT'],
        'encryption' => $_ENV['SMTP_ENCRYPTION'],
    ],
    'recaptcha' => [
        'secret' => $_ENV['RECAPTCHA_SECRET'],
        'verify_url' => $_ENV['RECAPTCHA_VERIFY_URL'],
    ],
];