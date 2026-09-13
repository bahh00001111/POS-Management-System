<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index()
    {
        $setting = Setting::orderBy('settings_id')->first();

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
        ]);

        $setting = Setting::orderBy('settings_id')->first();

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
        $setting->save();

        return response()->json([
            'message' => 'Settings saved successfully',
            'data' => $setting,
        ], 200);
    }
}