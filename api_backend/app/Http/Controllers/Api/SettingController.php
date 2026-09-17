<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SettingController extends Controller
{
    public function index()
    {
        $setting = Cache::remember('settings.singleton', 3600, function () {
            return Setting::first();
        });

        if (!$setting) {
            return response()->json([
                'message' => 'Settings retrieved successfully',
                'data' => [
                    'store_name' => null,
                    'store_address' => null,
                    'store_phone' => null,
                    'exchange_rate' => 4000,
                    'receipt_footer_text' => null,
                    'bakong_account_id' => null,
                    'bakong_app_id' => null,
                    'merchant_name' => null,
                    'merchant_city' => null,
                    'merchant_category_code' => '5812',
                    'merchant_currency' => 'KHR',
                    'telegram_bot_token' => null,
                    'telegram_chat_id' => null,
                    'telegram_enabled' => true,
                    'telegram_notify_orders' => true,
                    'telegram_notify_payments' => true,
                ],
            ], 200);
        }

        return response()->json([
            'message' => 'Settings retrieved successfully',
            'data' => $setting,
        ], 200);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'store_name' => 'nullable|string|max:255',
            'store_address' => 'nullable|string|max:500',
            'store_phone' => 'nullable|string|max:50',
            'exchange_rate' => 'required|numeric|min:1',
            'receipt_footer_text' => 'nullable|string|max:2000',
            'bakong_account_id' => 'nullable|string|max:100',
            'bakong_app_id' => 'nullable|string|max:100',
            'merchant_name' => 'nullable|string|max:255',
            'merchant_city' => 'nullable|string|max:100',
            'merchant_category_code' => 'nullable|string|max:4',
            'merchant_currency' => 'nullable|in:KHR,USD',
            'telegram_bot_token' => 'nullable|string|max:255',
            'telegram_chat_id' => 'nullable|string|max:100',
            'telegram_enabled' => 'nullable|boolean',
            'telegram_notify_orders' => 'nullable|boolean',
            'telegram_notify_payments' => 'nullable|boolean',
        ]);

        $setting = Cache::remember('settings.singleton', 3600, function () {
            return Setting::first();
        });

        if (!$setting) {
            $setting = new Setting();
        }

        $setting->store_name = $validated['store_name'] ?? null;
        $setting->store_address = $validated['store_address'] ?? null;
        $setting->store_phone = $validated['store_phone'] ?? null;
        $setting->exchange_rate = $validated['exchange_rate'];
        $setting->receipt_footer_text = $validated['receipt_footer_text'] ?? null;
        $setting->bakong_account_id = $validated['bakong_account_id'] ?? null;
        $setting->bakong_app_id = $validated['bakong_app_id'] ?? null;
        $setting->merchant_name = $validated['merchant_name'] ?? null;
        $setting->merchant_city = $validated['merchant_city'] ?? null;
        $setting->merchant_category_code = $validated['merchant_category_code'] ?? '5812';
        $setting->merchant_currency = $validated['merchant_currency'] ?? 'KHR';
        $setting->telegram_bot_token = $validated['telegram_bot_token'] ?? null;
        $setting->telegram_chat_id = $validated['telegram_chat_id'] ?? null;
        $setting->telegram_enabled = (bool) ($validated['telegram_enabled'] ?? true);
        $setting->telegram_notify_orders = (bool) ($validated['telegram_notify_orders'] ?? true);
        $setting->telegram_notify_payments = (bool) ($validated['telegram_notify_payments'] ?? true);
        $setting->save();

        Cache::forget('settings.singleton');

        return response()->json([
            'message' => 'Settings saved successfully',
            'data' => $setting,
        ], 200);
    }

    /**
     * Send a test message through the configured Telegram bot.
     *
     * POST /api/settings/send-telegram-test
     */
    public function sendTelegramTest()
    {
        $setting = Cache::remember('settings.singleton', 3600, function () {
            return Setting::first();
        });

        if (!$setting || !trim((string) $setting->telegram_bot_token) || !trim((string) $setting->telegram_chat_id)) {
            return response()->json([
                'message' => 'Telegram is not configured. Add your bot token and chat ID first.',
            ], 422);
        }

        $telegram = app(TelegramService::class);
        $sent = $telegram->sendTestMessage($setting->store_name ?? '');

        if (!$sent) {
            return response()->json([
                'message' => 'Could not send the test message.',
                'error' => $telegram->lastError ?? 'Telegram service unavailable',
            ], 502);
        }

        return response()->json([
            'message' => 'Test message sent to your Telegram chat.',
        ], 200);
    }
}