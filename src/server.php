<?php

$config = require_once __DIR__ . '/config.php';

// Подключаем конфиг

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/../vendor/autoload.php';


class MailService {
    private PHPMailer $mailer;
    private array $config;

    public function __construct(array $config) {
        $this->mailer = new PHPMailer(true);
        $this->config = $config;
        $this->configureSMTP();
    }

    private function configureSMTP(): void {
        $this->mailer->isSMTP();
        $this->mailer->Host = $this->config['smtp']['host'];
        $this->mailer->SMTPAuth = false;
        $this->mailer->Username = $this->config['smtp']['username'];
        $this->mailer->Password = $this->config['smtp']['password'];
        $this->mailer->SMTPSecure = $this->config['smtp']['encryption'];
        $this->mailer->Port = $this->config['smtp']['port'];
    } 
    
                         // 
    public function send(string $to, string $subject, string $body, string $replyToEmail, string $replyToName): bool {
        try {
            $this->mailer->clearAddresses();
            $this->mailer->setFrom($this->config['smtp']['username'], 'Website Form');
            $this->mailer->addAddress($to);
            $this->mailer->addReplyTo($replyToEmail, $replyToName);
            
            $this->mailer->Subject = $subject;
            $this->mailer->Body = $body;
            $this->mailer->isHTML(false);

            if (!$this->mailer->send()) {
                throw new RuntimeException('Mailer Error: ' . $this->mailer->ErrorInfo);
            }
            return true; //$this->mailer->send();
        } catch (Exception $e) {
            error_log("Mailer Error: {$this->mailer->ErrorInfo}");
            throw new RuntimeException("Failed to send email: " . $e->getMessage());
            return false;
        }
    }
}

class RecaptchaVerifier {
    public static function verify(string $response, array $config): bool {
        $data = [
            'secret' => $config['recaptcha']['secret'],
            'response' => $response
        ];

        $options = [
            'http' => [
                'header' => "Content-type: application/x-www-form-urlencoded\r\n",
                'method' => 'POST',
                'content' => http_build_query($data),
                'timeout' => 5
            ]
        ];

        $context = stream_context_create($options);
        $response = file_get_contents($config['recaptcha']['verify_url'], false, $context);
        
        return $response ? json_decode($response)->success : false;
    }
}

class FormProcessor {
    private array $data;
    private string $formType;
    private array $config;

    public function __construct(array $postData, array $config) {
        $this->formType = $postData['form_type'] ?? 'general_form';
        $this->data = $this->sanitizeInput($postData);
        $this->config = $config;
    }

    private function sanitizeInput(array $input): array {
        return [
            'full_name' => trim(strip_tags($input['full_name'] ?? '')),
            'email' => filter_var($input['email'] ?? '', FILTER_SANITIZE_EMAIL),
            'message' => trim(strip_tags($input['message'] ?? '')),
            'phone' => preg_replace('/[^0-9+]/', '', $input['phone'] ?? ''),
            'organization' => trim(strip_tags($input['organization'] ?? '')),
            'location' => trim(strip_tags($input['location'] ?? ''))
        ];
    }

    private function validate(): void {
        if (!filter_var($this->data['email'], FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('Invalid email address');
        }

        if ($this->formType === 'quote_form' && empty($this->data['phone'])) {
            throw new InvalidArgumentException('Phone number is required');
        }
    }

    public function process(): array {
        try {
            $this->validate();
            
            $mailService = new MailService($this->config);
            $emailConfig = $this->getEmailConfig();
            
            if ($mailService->send(
                $emailConfig['to'],
                $emailConfig['subject'],
                $this->buildMessage(),
                $this->data['email'],
                $this->data['full_name']
            )) {
                return ['status' => 'success', 'message' => 'Your message has been sent successfully!'];
            }
            
            throw new RuntimeException('Failed to send email');
            
        } catch (Exception $e) {
            error_log("Form Error: {$e->getMessage()}");
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }

    private function getEmailConfig(): array {
        switch ($this->formType) {
            case 'contact_form':
                return [
                    'to' => $this->config['emails']['contact'],
                    'subject' => "New Contact Form Submission from {$this->data['full_name']}"
                ];
            case 'quote_form':
                return [
                    'to' => $this->config['emails']['quote'],
                    'subject' => "New Quote Request from {$this->data['full_name']}"
                ];
            default:
                throw new InvalidArgumentException('Unknown form type');
        }
    }

    private function buildMessage(): string {
        $fields = [
            'Name' => $this->data['full_name'],
            'Email' => $this->data['email'],
            'Phone' => $this->data['phone'],
            'Organization' => $this->data['organization'],
            'Location' => $this->data['location'],
            'Message' => $this->data['message']
        ];

        $message = '';
        foreach ($fields as $label => $value) {
            if (!empty($value)) {
                $message .= "$label: $value\n";
            }
        }
        
        return trim($message);
    }
}

// Main execution
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    
    try {
        if (empty($_POST['g-recaptcha-response'])) {
            throw new RuntimeException('reCAPTCHA verification failed');
        }

        if (!RecaptchaVerifier::verify($_POST['g-recaptcha-response'], $config)) {
            throw new RuntimeException('Invalid reCAPTCHA');
        }

        $processor = new FormProcessor($_POST, $config);
        echo json_encode($processor->process());
        
    } catch (Exception $e) {
        error_log("System Error: {$e->getMessage()}");
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    
    exit;
}