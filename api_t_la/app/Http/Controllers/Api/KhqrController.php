<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KhqrTransaction;
use App\Models\Setting;
use App\Services\KhqrService;
use Illuminate\Http\Request;

class KhqrController extends Controller
{
    /**
     * Store a payment request: build a dynamic EMVCo/Bakong KHQR payload.
     */
    public function payload(Request $request, KhqrService $khqr)
    {
        $data = $request->validate([
            'amount' => 'required|numeric|min:0',
            'currency' => 'required|in:USD,KHR',
        ]);

        $setting = Setting::orderBy('settings_id')->first();

        if (!$setting || !$setting->bakong_account_id) {
            return response()->json([
                'message' => 'Bakong merchant account is not configured. Add your merchant details in Settings.',
                'errors' => ['bakong_account_id' => ['The merchant account is required.']],
            ], 422);
        }

        $currency = $data['currency'];
        $reference = $khqr->reference();

        $payload = $khqr->build([
            'amount' => (float) $data['amount'],
            'currency' => $currency,
            'reference' => $reference,
            'account_id' => $setting->bakong_account_id,
            'app_id' => $setting->bakong_app_id,
            'merchant_name' => trim($setting->merchant_name) ?: trim($setting->store_name) ?: 'COFFEE POS',
            'merchant_city' => trim((string) $setting->merchant_city),
            'category_code' => $setting->merchant_category_code,
        ]);

        $transaction = KhqrTransaction::create([
            'reference' => $reference,
            'amount' => $data['amount'],
            'currency' => $currency,
            'status' => 'PENDING',
            'payload' => $payload,
        ]);

        return response()->json([
            'message' => 'KHQR payload generated',
            'data' => [
                'reference' => $transaction->reference,
                'payload' => $payload,
                'amount' => (float) $transaction->amount,
                'currency' => $transaction->currency,
                'status' => $transaction->status,
                'merchant_name' => trim($setting->merchant_name) ?: trim((string) $setting->store_name),
            ],
        ], 200);
    }

    /**
     * Check the payment status of a generated KHQR request.
     */
    public function status(Request $request)
    {
        $data = $request->validate([
            'reference' => 'required|string',
        ]);

        $transaction = KhqrTransaction::where('reference', $data['reference'])->first();

        if (!$transaction) {
            return response()->json(['message' => 'Payment request not found.'], 404);
        }

        return response()->json([
            'message' => 'Status retrieved',
            'data' => [
                'reference' => $transaction->reference,
                'status' => $transaction->status,
                'amount' => (float) $transaction->amount,
                'currency' => $transaction->currency,
            ],
        ], 200);
    }

    /**
     * Webhook endpoint used by the Bakong Open API backend service to
     * notify the system that a payment succeeded (or failed).
     *
     * NOTE: In production this must verify the signature provided by the
     * Bakong Open API before trusting the payload.
     */
    public function callback(Request $request)
    {
        $data = $request->validate([
            'reference' => 'required|string',
            'status' => 'required|in:PENDING,PAID,FAILED,EXPIRED',
        ]);

        $transaction = KhqrTransaction::where('reference', $data['reference'])->first();

        if (!$transaction) {
            return response()->json(['message' => 'Payment request not found.'], 404);
        }

        $transaction->status = $data['status'];
        $transaction->save();

        return response()->json([
            'message' => 'Status updated',
            'data' => [
                'reference' => $transaction->reference,
                'status' => $transaction->status,
            ],
        ], 200);
    }
}