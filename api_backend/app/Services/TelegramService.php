<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Sends notifications to a Telegram chat via the Bot API.
 *
 * The bot token and target chat ID are stored in the settings table
 * (editable from the Settings screen). Every send is purposefully
 * fail-safe: when the bot is not configured or Telegram is unreachable we
 * log a warning and return false instead of breaking the POS flow.
 */
class TelegramService
{
    /**
     * Last human-readable error from Telegram (null when all good).
     */
    public ?string $lastError = null;

    public function __construct()
    {
        $this->lastError = null;
    }
    /**
     * Resolve the singleton settings row (no caching here — the Settings
     * screen edits these values live and we never want a stale token).
     */
    private function settings(): ?Setting
    {
        return Setting::orderBy('settings_id')->first();
    }

    /**
     * Whether a token + chat ID pair is configured and the master switch is on.
     */
    public function isConfigured(): bool
    {
        $setting = $this->settings();

        if (!$setting || !$setting->telegram_enabled) {
            return false;
        }

        return trim((string) $setting->telegram_bot_token) !== ''
            && trim((string) $setting->telegram_chat_id) !== '';
    }

    /**
     * Send a plain-text message to the configured Telegram chat.
     *
     * @param  string  $text  message body (line breaks preserved)
     *
     * @return bool true when Telegram accepted the message
     */
    public function sendMessage(string $text): bool
    {
        $setting = $this->settings();

        if (!$setting || !$setting->telegram_enabled) {
            return false;
        }

        $token = trim((string) $setting->telegram_bot_token);
        $chatId = trim((string) $setting->telegram_chat_id);

        if ($token === '' || $chatId === '') {
            $this->lastError = 'Missing bot token or chat ID';
            return false;
        }

        if ($text === '') {
            return true;
        }

        try {
            $response = Http::acceptJson()
                ->connectTimeout(5)
                ->timeout(10)
                ->post("https://api.telegram.org/bot{$token}/sendMessage", [
                    'chat_id' => $chatId,
                    'text' => $text,
                    'disable_web_page_preview' => true,
                ]);

            if (!$response->successful()) {
                $body = (string) $response->body();
                Log::warning('Telegram message rejected', [
                    'http_status' => $response->status(),
                    'body' => substr($body, 0, 400),
                ]);

                try {
                    $decoded = json_decode($body, true);
                    $this->lastError = $decoded['description'] ?? ('HTTP ' . $response->status());
                } catch (\Throwable) {
                    $this->lastError = 'HTTP ' . $response->status();
                }
                return false;
            }

            $this->lastError = null;
            return true;
        } catch (\Throwable $e) {
            $this->lastError = $e->getMessage();
            Log::warning('Telegram send failed', [
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Send a "new order / sale" notification. Returns false when silently skipped.
     *
     * @param  Order  $order  created order (may be UNPAID for KHQR flow)
     * @param  array  $items  line items: [['product' => Product, 'quantity' => int, 'line_total' => float, 'size' => ?string, 'sugar' => ?string], ...]
     */
    public function sendSaleNotification(Order $order, array $items = []): bool
    {
        $setting = $this->settings();
        if (!$this->isConfigured() || !$setting->telegram_notify_orders) {
            return false;
        }

        return $this->sendMessage($this->formatSaleMessage($order, $items));
    }

    /**
     * Send a KHQR payment-confirmation notification. Returns false when silently skipped.
     */
    public function sendPaymentConfirmation(Order $order, string $reference = '', array $bakongData = []): bool
    {
        $setting = $this->settings();
        if (!$this->isConfigured() || !$setting->telegram_notify_payments) {
            return false;
        }

        return $this->sendMessage($this->formatPaymentMessage($order, $reference, $bakongData));
    }

    /**
     * Send a simple test message so the user can verify the bot + chat ID.
     */
    public function sendTestMessage(string $storeName = ''): bool
    {
        $storeName = trim($storeName);
        $lines = [];
        $lines[] = '✅ Telegram bot connected';
        $lines[] = '════════════════════';
        $lines[] = 'Your cafe POS is now sending notifications to this chat.';
        if ($storeName !== '') {
            $lines[] = 'Store: ' . $storeName;
        }
        $lines[] = 'Time: ' . now()->format('Y-m-d H:i:s');

        return $this->sendMessage(implode("\n", $lines));
    }

    private function formatSaleMessage(Order $order, array $items): string
    {
        $lines = [];
        $lines[] = '🆕 NEW ORDER';
        $lines[] = '════════════════════';
        $lines[] = '🧾 Invoice: ' . ($order->invoice_number ?: "#{$order->order_id}");
        $lines[] = '🪑 Type: ' . $this->orderTypeLabel($order->order_type);
        $lines[] = '💳 Payment: ' . $this->paymentLabel($order->payment_status);

        if ($order->customer_name) {
            $lines[] = '👤 Customer: ' . $order->customer_name;
        }
        if ($order->phone_number) {
            $lines[] = '📞 Phone: ' . $order->phone_number;
        }
        if ($order->delivery_platform) {
            $lines[] = '🛵 Platform: ' . $order->delivery_platform;
        }
        if ((float) $order->delivery_fee > 0) {
            $lines[] = '🚚 Delivery fee: ' . $this->money($order->delivery_fee);
        }
        if ($order->user) {
            $name = $order->user->full_name ?: $order->user->username;
            if ($name) {
                $lines[] = '👨‍💼 Cashier: ' . $name;
            }
        }

        if ($items) {
            $lines[] = '────────────────────────';
            foreach ($items as $item) {
                $product = $item['product'] ?? null;
                $name = $product->product_name ?? ('Product #' . ($item['product_id'] ?? '?'));
                $qty = (int) ($item['quantity'] ?? 1);
                $lineTotal = (float) ($item['line_total'] ?? 0);
                $parts = [$name];
                if (!empty($item['size'])) {
                    $parts[] = "({$item['size']})";
                }
                if (!empty($item['sugar'])) {
                    $parts[] = "sugar:{$item['sugar']}";
                }
                $lines[] = '  • ' . implode(' ', $parts) . " x{$qty} — {$this->money($lineTotal)}";
            }
        }

        $lines[] = '════════════════════';
        $lines[] = '💰 TOTAL: ' . $this->money($order->total_amount);
        $lines[] = '🕒 ' . optional($order->created_at)->format('Y-m-d H:i');

        return implode("\n", $lines);
    }

    private function formatPaymentMessage(Order $order, string $reference, array $bakongData): string
    {
        $lines = [];
        $lines[] = '✅ KHQR PAYMENT CONFIRMED';
        $lines[] = '════════════════════';
        $lines[] = '🧾 Invoice: ' . ($order->invoice_number ?: "#{$order->order_id}");
        $lines[] = '🪑 Type: ' . $this->orderTypeLabel($order->order_type);
        if ($reference !== '') {
            $lines[] = '🧾 Ref: ' . $reference;
        }
        if (!empty($bakongData['hash'])) {
            $lines[] = '🔗 Hash: ' . $bakongData['hash'];
        }
        if (!empty($bakongData['type'])) {
            $lines[] = '🏦 Channel: ' . $bakongData['type'];
        }
        if (!empty($bakongData['timestamp'])) {
            $lines[] = '🕒 Paid at: ' . $bakongData['timestamp'];
        }

        $lines[] = '════════════════════';
        $lines[] = '💰 Amount: ' . $this->money($order->total_amount);

        return implode("\n", $lines);
    }

    private function orderTypeLabel(?string $type): string
    {
        return match (strtoupper((string) $type)) {
            'DINE_IN' => 'Dine-in',
            'TAKEAWAY' => 'Takeaway',
            'DELIVERY' => 'Delivery',
            default => $type ?: '—',
        };
    }

    private function paymentLabel(?string $status): string
    {
        return strtoupper((string) $status) === 'PAID'
            ? '✅ Paid'
            : '⏳ Unpaid (awaiting confirmation)';
    }

    private function money(float|int|string|null $amount): string
    {
        return '$' . number_format((float) $amount, 2);
    }
}