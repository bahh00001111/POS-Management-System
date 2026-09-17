<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KhqrTransaction;
use App\Models\Order;
use App\Models\Setting;
use App\Services\KhqrService;
use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class KhqrController extends Controller
{
    /**
     * Validate the Bakong merchant settings (DB) before generation.
     *
     * Returns an error payload (message + errors) when the account ID is
     * missing or not in the strict "username@bank" format, or null when OK.
     */
    private function merchantSettingError(Setting $setting): ?array
    {
        $accountId = strtolower(trim((string) $setting->bakong_account_id));

        if ($accountId === '') {
            return [
                'message' => 'Bakong merchant account is not configured. Add your merchant details in Settings.',
                'errors' => ['bakong_account_id' => ['The merchant account is required.']],
            ];
        }

        if (!preg_match('/^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9._-]*$/', $accountId)) {
            return [
                'message' => 'The Bakong account ID must use the "username@bank" format, e.g. "10824705@acleda", "champey_svay@bkrt00", or "sokha@aba", without spaces or special characters.',
                'errors' => ['bakong_account_id' => ["Invalid Bakong account ID format: '{$accountId}'"]],
            ];
        }

        return null;
    }

    /**
     * Generate a dynamic EMVCo/Bakong KHQR payload for an existing order.
     *
     * Creates a khqr_transactions record with status PENDING.
     *
     * @param Request $request body: order_id, amount, currency (USD|KHR)
     */
    public function generateQr(Request $request, KhqrService $khqr)
    {
        $data = $request->validate([
            'order_id' => 'required|integer|exists:orders,order_id',
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'required|in:USD,KHR',
            'expiration_timestamp' => 'nullable|integer',
        ]);

        $order = Order::findOrFail($data['order_id']);

        $setting = Setting::orderBy('settings_id')->first();

        if (!$setting) {
            return response()->json([
                'message' => 'Bakong merchant account is not configured. Add your merchant details in Settings.',
                'errors' => ['bakong_account_id' => ['The merchant account is required.']],
            ], 422);
        }

        if ($error = $this->merchantSettingError($setting)) {
            return response()->json($error, 422);
        }

        $currency = strtoupper($data['currency']);
        $reference = $khqr->reference();

        // Data prepared for NBC-compliant generation:
        //  - account ID is lowercased and forced to "username@bank" in the service
        //  - merchant name/city are sanitized + length-limited inside the service
        //  - category code falls back to 5999 inside the service
        $payloadData = [
            'amount' => (float) $data['amount'],
            'currency' => $currency,
            'reference' => $reference,
            'account_id' => trim($setting->bakong_account_id),
            'app_id' => trim((string) $setting->bakong_app_id),
            'merchant_name' => trim($setting->merchant_name) ?: trim($setting->store_name) ?: 'COFFEE POS',
            'merchant_city' => trim((string) $setting->merchant_city),
            'category_code' => $setting->merchant_category_code,
            'expiration_timestamp' => $request->input('expiration_timestamp'),
        ];

        // Output validation: build can only return a payload when the data
        // passes the NBC rules. On failure, log the full detail and reply
        // with a clear JSON error instead of emitting an invalid QR string.
        try {
            $generated = $khqr->build($payloadData);
        } catch (\InvalidArgumentException $e) {
            Log::error('KHQR generation rejected', [
                'reference' => $reference,
                'order_id' => $order->order_id,
                'reason' => json_decode($e->getMessage(), true) ?: $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Unable to generate a valid KHQR payload. Check your merchant settings (account ID, merchant name, city).',
                'errors' => ['merchant' => [json_decode($e->getMessage(), true)]],
            ], 422);
        }

        $payload = $generated['payload'];
        $md5 = $generated['md5'];

        // Debugging: capture the exact raw string that will be rendered as a QR.
        $khqr->logPayload($payload, [
            'order_id' => $order->order_id,
            'currency' => $currency,
            'amount' => $data['amount'],
        ]);

        $transaction = KhqrTransaction::create([
            'order_id' => $order->order_id,
            'reference' => $reference,
            'amount' => $data['amount'],
            'currency' => $currency,
            'status' => 'PENDING',
            'payload' => $payload,
            'md5' => $md5,
        ]);

        return response()->json([
            'message' => 'KHQR payload generated',
            'data' => [
                'reference' => $transaction->reference,
                'payload' => $payload,
                'md5' => $transaction->md5,
                'expires_at_ms' => $generated['expires_at_ms'] ?? null,
                'amount' => (float) $transaction->amount,
                'currency' => $transaction->currency,
                'status' => $transaction->status,
                'order_id' => $order->order_id,
                'merchant_name' => $payloadData['merchant_name'],
            ],
        ], 201);
    }

    /**
     * Check the payment status of a KHQR transaction by reference.
     */
    public function checkStatus($reference)
    {
        $transaction = KhqrTransaction::where('reference', $reference)->first();

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
                'order_id' => $transaction->order_id,
            ],
        ], 200);
    }

    /**
     * Mock payment simulator: marks a KHQR transaction as SUCCESS and
     * flips the linked order's payment_status to PAID.
     *
     * Used only for testing — no real bank sandbox required.
     */
    public function mockSuccess(Request $request)
    {
        $data = $request->validate([
            'reference' => 'required|string',
        ]);

        $transaction = KhqrTransaction::where('reference', $data['reference'])->first();

        if (!$transaction) {
            return response()->json(['message' => 'Payment request not found.'], 404);
        }

        DB::transaction(function () use ($transaction) {
            $transaction->status = 'SUCCESS';
            $transaction->save();

            $wasNewlyPaid = false;
            if ($transaction->order_id) {
                $wasNewlyPaid = Order::where('order_id', $transaction->order_id)
                    ->where('payment_status', '!=', 'PAID')
                    ->update(['payment_status' => 'PAID']) > 0;
            }

            if ($wasNewlyPaid) {
                DB::afterCommit(function () use ($transaction) {
                    $order = Order::find($transaction->order_id);
                    if ($order) {
                        app(TelegramService::class)->sendPaymentConfirmation(
                            $order,
                            (string) $transaction->reference
                        );
                    }
                });
            }
        });

        return response()->json([
            'message' => 'Payment marked as paid (mock)',
            'data' => [
                'reference' => $transaction->reference,
                'status' => $transaction->status,
                'order_id' => $transaction->order_id,
            ],
        ], 200);
    }

    /**
     * Store a payment request: build a dynamic EMVCo/Bakong KHQR payload.
     */
    public function payload(Request $request, KhqrService $khqr)
    {
        $data = $request->validate([
            'amount' => 'required|numeric|min:0',
            'currency' => 'required|in:USD,KHR',
            'expiration_timestamp' => 'nullable|integer',
        ]);

        $setting = Setting::orderBy('settings_id')->first();

        if (!$setting) {
            return response()->json([
                'message' => 'Bakong merchant account is not configured. Add your merchant details in Settings.',
                'errors' => ['bakong_account_id' => ['The merchant account is required.']],
            ], 422);
        }

        if ($error = $this->merchantSettingError($setting)) {
            return response()->json($error, 422);
        }

        $currency = $data['currency'];
        $reference = $khqr->reference();

        $payloadData = [
            'amount' => (float) $data['amount'],
            'currency' => $currency,
            'reference' => $reference,
            'account_id' => trim($setting->bakong_account_id),
            'app_id' => trim((string) $setting->bakong_app_id),
            'merchant_name' => trim($setting->merchant_name) ?: trim($setting->store_name) ?: 'COFFEE POS',
            'merchant_city' => trim((string) $setting->merchant_city),
            'category_code' => $setting->merchant_category_code,
            'expiration_timestamp' => $request->input('expiration_timestamp'),
        ];

        try {
            $generated = $khqr->build($payloadData);
        } catch (\InvalidArgumentException $e) {
            Log::error('KHQR generation rejected', [
                'reference' => $reference,
                'reason' => json_decode($e->getMessage(), true) ?: $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Unable to generate a valid KHQR payload. Check your merchant settings (account ID, merchant name, city).',
                'errors' => ['merchant' => [json_decode($e->getMessage(), true)]],
            ], 422);
        }

        $payload = $generated['payload'];
        $md5 = $generated['md5'];

        // Debugging: capture the exact raw string that will be rendered as a QR.
        $khqr->logPayload($payload, [
            'currency' => $currency,
            'amount' => $data['amount'],
        ]);

        $transaction = KhqrTransaction::create([
            'reference' => $reference,
            'amount' => $data['amount'],
            'currency' => $currency,
            'status' => 'PENDING',
            'payload' => $payload,
            'md5' => $md5,
        ]);

        return response()->json([
            'message' => 'KHQR payload generated',
            'data' => [
                'reference' => $transaction->reference,
                'payload' => $payload,
                'md5' => $transaction->md5,
                'expires_at_ms' => $generated['expires_at_ms'] ?? null,
                'amount' => (float) $transaction->amount,
                'currency' => $transaction->currency,
                'status' => $transaction->status,
                'merchant_name' => trim($setting->merchant_name) ?: trim((string) $setting->store_name),
            ],
        ], 201);
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

        DB::transaction(function () use ($transaction, $data) {
            $transaction->status = $data['status'] === 'PAID' ? 'SUCCESS' : $data['status'];
            $transaction->save();

            $wasNewlyPaid = false;
            if ($transaction->status === 'SUCCESS' && $transaction->order_id) {
                $wasNewlyPaid = Order::where('order_id', $transaction->order_id)
                    ->where('payment_status', '!=', 'PAID')
                    ->update(['payment_status' => 'PAID']) > 0;
            }

            if ($wasNewlyPaid) {
                DB::afterCommit(function () use ($transaction) {
                    $order = Order::find($transaction->order_id);
                    if ($order) {
                        app(TelegramService::class)->sendPaymentConfirmation(
                            $order,
                            (string) $transaction->reference
                        );
                    }
                });
            }
        });

        return response()->json([
            'message' => 'Status updated',
            'data' => [
                'reference' => $transaction->reference,
                'status' => $transaction->status,
            ],
        ], 200);
    }
}