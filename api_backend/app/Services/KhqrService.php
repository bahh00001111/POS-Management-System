<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Builds an EMVCo Merchant-Presented QR payload compatible with the
 * Bakong KHQR standard (National Bank of Cambodia) for INDIVIDUAL /
 * solo merchants, matching the official NBC KHQR layout that ABA Mobile,
 * ACLEDA Mobile and the Bakong App scan successfully.
 *
 * ⚠️ CRITICAL — Tag 29 (Merchant Account Information) for individual /
 * solo-merchant KHQR (NBC KHQR Content Guideline v1.3 + current SDK):
 *
 *     Solo merchant/Individual: use tag 29; Global Unique Identifier in
 *     sub-tag 00 IS the customer's Bakong account Id.
 *
 *     So the payee account goes in sub-tag 00 directly, e.g.:
 *       29 -> { 00 = "10824705@acleda" }            <-- individual/solo
 *       29 -> { 00 = "khqr@devb", 01 = phone/acct } <-- remittance
 *       30 -> { 00 = acquiring Bakong ID, 01 = MID, 02 = bank } <-- merchant
 *
 * The static string "kh.gov.nbc.bakong" must NOT be placed in Tag 29
 * sub-tag 00 of an individual QR: ABA/ACLEDA parse that field as the
 * payee Bakong account and reject it (error "Invalid QR code. Please
 * ask receiver to present a new QR code"). The constant is still kept
 * below so the legacy layout can be re-enabled via TAG_29_GUID_IN_SUB_00
 * if an acquirer explicitly requires it.
 *
 * Compliance notes:
 *  - Every TLV value MUST be plain ASCII. Khmer Unicode / special
 *    characters are stripped during sanitization.
 *  - TLV length prefixes are BYTE lengths (strlen), NEVER character
 *    counts. Using mb_strlen corrupts the payload length of multi-byte
 *    strings and produces "Invalid QR Merchant Data" scanner errors.
 *  - Tag 53 uses the numeric ISO-4217 code ("840" USD / "116" KHR).
 *  - Tag 54 (amount): USD -> exactly 2 decimals, KHR -> whole integer.
 *    Static QR (amount <= 0): tag 54 omitted, tag 01 = "11".
 *    Dynamic QR (amount > 0): tag 54 included, tag 01 = "12".
 *  - Tag 62 sub-tags follow EMVCo: 01 Bill Number, 02 Mobile Number,
 *    03 Store Label, 07 Terminal Label.
 *  - Tag 99 (dynamic QR only): emitted on EVERY dynamic QR, with the
 *    expiration computed on the SERVER from config
 *    (services.bakong.khqr_ttl_minutes, default 15 min) so a faulty
 *    client TTL can never produce an instantly-expired QR. A caller may
 *    pass 'expiration_timestamp' (epoch seconds or ms) to override, but
 *    past/short values are ignored or clamped to a safe floor
 *    (services.bakong.khqr_min_lifetime_seconds). Inner sub-tags: 00 =
 *    creation, 01 = expiration — both epoch ms, 13 digits as enforced by
 *    the official SDK (INVALID_LENGTH.TIMESTAMP = 13). Static QRs carry
 *    no Tag 99.
 *  - Tag 63 CRC16/CCITT-FALSE (poly 0x1021, init 0xFFFF) is computed
 *    over the payload INCLUDING the "6304" tag+length prefix.
 *  - The returned MD5 is md5() of the ENTIRE QR string INCLUDING the
 *    trailing "6304XXXX" CRC — what Bakong's check_transaction_by_md5
 *    expects (identical to the official SDK, which hashes the already
 *    CRC-appended string).
 *  - Server-side payment confirmation is delegated to the Bakong Open
 *    API via {@see checkPaymentByMd5()}; the controller never trusts the
 *    QR alone, it confirms the md5 with NBC first.
 */
class KhqrService
{
    /**
     * Tag 29 sub-tag 00 content for individual/solo-merchant KHQR.
     *
     *   false (DEFAULT) — OFFICIAL NBC layout. Sub-tag 00 carries the
     *     Bakong Account ID directly; this is what ABA/ACLEDA/Bakong
     *     apps validate as the payee account.
     *
     *   true (LEGACY) — EMVCo-generic layout some older acquirers asked
     *     for: sub-tag 00 = "kh.gov.nbc.bakong", sub-tag 01 = account.
     *     Only enable if your acquirer explicitly requires it; the
     *     current NBC SDK and mobile apps reject this variant.
     */
    private const TAG_29_GUID_IN_SUB_00 = false;

    /** Bakong KHQR Global Unique Identifier (legacy layout only). */
    private const BAKONG_GUID = 'kh.gov.nbc.bakong';

    /** Numeric ISO-4217 currency codes accepted by KHQR. */
    private const CURRENCY_CODES = [
        'KHR' => '116',
        'USD' => '840',
    ];

    /** EMVCo Merchant Category Code fallback (General Retail). */
    private const DEFAULT_MCC = '5999';

    /** Default merchant city when none is configured. */
    private const DEFAULT_CITY = 'Phnom Penh';

    /** EMVCo caps every primary TLV value at 99 bytes (2-digit length). */
    private const MAX_TLV_VALUE_BYTES = 99;

    /** Sanitization budget per text field (EMVCo limits). */
    private const MERCHANT_NAME_MAX = 25;
    private const MERCHANT_CITY_MAX = 15;
    private const ACCOUNT_ID_MAX = 40;
    private const ACCOUNT_INFO_MAX = 40;
    private const BANK_INFO_MAX = 30;
    private const TEXT_FIELD_MAX = 25;
    private const MOBILE_MAX = 15;

    /** Tag 00 — Payload Format Indicator. */
    private const PFI = '01';

    /** Tag 01 — Point of Initiation Method. */
    private const STATIC_POI = '11';
    private const DYNAMIC_POI = '12';

    /** Primary tags (EMVCo + NBC). */
    private const TAG_MERCHANT_ACCOUNT_INFO = '29';

    /** Tag 29 sub-tags (NBC KHQR spec). */
    private const SUB_GLOBAL_ID = '00';
    private const SUB_ACCOUNT_ID = '01';
    private const SUB_ACQUIRING_BANK = '02';

    /** Tag 62 sub-tags (EMVCo Additional Data Field Template). */
    private const SUB_BILL_NUMBER = '01';
    private const SUB_MOBILE_NUMBER = '02';
    private const SUB_STORE_LABEL = '03';
    private const SUB_TERMINAL_LABEL = '07';

    /** Tag 99 — Timestamp template (NBC, dynamic QR only). */
    private const TAG_TIMESTAMP = '99';

    /** Tag 99 sub-tags: creation + expiration, Unix epoch in milliseconds. */
    private const SUB_CREATION_TIMESTAMP = '00';
    private const SUB_EXPIRATION_TIMESTAMP = '01';

    /** Official SDK enforces a 13-digit (ms) timestamp. */
    private const TIMESTAMP_MS_DIGITS = 13;

    /** Bakong Open API `responseCode` value meaning "success". */
    private const BAKONG_RESPONSE_OK = 0;

    /** Bakong Open API `errorCode` value meaning "no such transaction". */
    private const BAKONG_TXN_NOT_FOUND_CODE = 15;

    /**
     * Build a KHQR payload (+ tracking MD5) for an individual merchant.
     *
     * Point of Initiation is STATIC ("11") when amount <= 0 (tag 54
     * omitted) and DYNAMIC ("12") when amount > 0 (tag 54 included).
     *
     * @param array{
     *     amount?: float|int|string,
     *     currency?: 'KHR'|'USD',
     *     reference?: string,
     *     bill_number?: string,
     *     mobile_number?: string,
     *     store_label?: string,
     *     terminal_label?: string,
     *     expiration_timestamp?: int|string|null,
     *     account_id: string,
     *     account_information?: string|null,
     *     acquiring_bank?: string|null,
     *     app_id?: string|null,
     *     merchant_name?: string,
     *     merchant_city?: string,
     *     category_code?: string,
     * } $data
     *
     * @return array{payload: string, md5: string, expires_at_ms: int|null} raw
*         QR string + MD5 hash + Tag 99 expiry in ms (null on static QRs)
*
     * @throws \InvalidArgumentException when the data cannot produce a valid payload
     */
    public function build(array $data): array
    {
        $currency = strtoupper(trim((string) ($data['currency'] ?? 'KHR')));
        $amount = (float) ($data['amount'] ?? 0);
        $isDynamic = $amount > 0;

        // Tag 99 — Timestamp template. Emitted on EVERY dynamic QR. The
        // expiration is resolved on the server (config TTL, default 15 min)
        // so a faulty client value can never produce an instantly-expired
        // QR. Static QRs carry no Tag 99.
        $nowMs = (int) round(microtime(true) * 1000);
        $expirationTimestamp = $isDynamic
            ? $this->resolveExpirationTimestamp($data['expiration_timestamp'] ?? null, $nowMs)
            : null;

        // Tag 52 — Merchant Category Code: exactly 4 digits, else 5999.
        $categoryCode = trim((string) ($data['category_code'] ?? ''));
        if (!preg_match('/^\d{4}$/', $categoryCode)) {
            $categoryCode = self::DEFAULT_MCC;
        }

        // Tag 59 — Merchant Name: strip non-ASCII, uppercase, max 25 bytes.
        $merchantName = $this->sanitizeMerchantText($data['merchant_name'] ?? '', self::MERCHANT_NAME_MAX);

        // Tag 60 — Merchant City: strip non-ASCII, uppercase, max 15 bytes,
        //          fall back to Phnom Penh when nothing usable remains.
        $merchantCity = $this->sanitizeMerchantText($data['merchant_city'] ?? '', self::MERCHANT_CITY_MAX);
        if ($merchantCity === '') {
            $merchantCity = self::DEFAULT_CITY;
        }

        // Tag 29 inputs.
        $accountId = $this->normalizeAccountId($data['account_id'] ?? '');
        $accountInformation = $this->normalizeOptionalText(
            $data['account_information'] ?? null,
            self::ACCOUNT_INFO_MAX
        );
        $acquiringBank = $this->normalizeOptionalText(
            $data['acquiring_bank'] ?? $data['app_id'] ?? null,
            self::BANK_INFO_MAX
        );

        // Pre-build gate — mirrors the Bakong SDK "code 0" check.
        $this->assertValidPayload($currency, $amount, $merchantName);

        // Tag 00 — Payload Format Indicator.
        $payload = $this->formatTlv('00', self::PFI);

        // Tag 01 — Point of Initiation Method: 11 static / 12 dynamic.
        $payload .= $this->formatTlv('01', $isDynamic ? self::DYNAMIC_POI : self::STATIC_POI);

        // Tag 29 — Merchant Account Information.
        // Build the inner sub-tags first, then wrap ONCE inside tag 29.
        // The 29 length prefix is the combined BYTE length of the sub-tags,
        // computed dynamically by formatTlv() regardless of account length.
        $merchantAccountInfo = '';

        if (self::TAG_29_GUID_IN_SUB_00) {
            // LEGACY layout (only if the acquirer explicitly requires it).
            $merchantAccountInfo .= $this->formatTlv(self::SUB_GLOBAL_ID, self::BAKONG_GUID);
            $merchantAccountInfo .= $this->formatTlv(self::SUB_ACCOUNT_ID, $accountId);
            if ($acquiringBank !== '') {
                $merchantAccountInfo .= $this->formatTlv(self::SUB_ACQUIRING_BANK, $acquiringBank);
            }
        } else {
            // OFFICIAL NBC layout: sub-tag 00 IS the payee Bakong account.
            $merchantAccountInfo .= $this->formatTlv(self::SUB_GLOBAL_ID, $accountId);
            if ($accountInformation !== '') {
                $merchantAccountInfo .= $this->formatTlv(self::SUB_ACCOUNT_ID, $accountInformation);
            }
            if ($acquiringBank !== '') {
                $merchantAccountInfo .= $this->formatTlv(self::SUB_ACQUIRING_BANK, $acquiringBank);
            }
        }

        $payload .= $this->formatTlv(self::TAG_MERCHANT_ACCOUNT_INFO, $merchantAccountInfo);

        $payload .= $this->formatTlv('52', $categoryCode); // Merchant Category Code
        $payload .= $this->formatTlv('53', self::CURRENCY_CODES[$currency]); // Transaction Currency (840/116)
        if ($isDynamic) {
            $payload .= $this->formatTlv('54', $this->formatAmount($amount, $currency)); // Transaction Amount
        }
        $payload .= $this->formatTlv('58', 'KH'); // Country Code
        $payload .= $this->formatTlv('59', $merchantName); // Merchant Name (≤25 ASCII bytes)
        $payload .= $this->formatTlv('60', $merchantCity); // Merchant City (≤15 ASCII bytes)

        // Tag 62 — Additional Data Field Template (EMVCo sub-tags).
        $additionalData = '';

        $billNumber = $this->sanitizeMerchantText(
            $data['reference'] ?? $data['bill_number'] ?? '',
            self::TEXT_FIELD_MAX
        );
        if ($billNumber !== '') {
            $additionalData .= $this->formatTlv(self::SUB_BILL_NUMBER, $billNumber);
        }

        $mobileNumber = $this->normalizeMobileNumber($data['mobile_number'] ?? '');
        if ($mobileNumber !== '') {
            $additionalData .= $this->formatTlv(self::SUB_MOBILE_NUMBER, $mobileNumber);
        }

        $storeLabel = $this->sanitizeMerchantText($data['store_label'] ?? '', self::TEXT_FIELD_MAX);
        if ($storeLabel !== '') {
            $additionalData .= $this->formatTlv(self::SUB_STORE_LABEL, $storeLabel);
        }

        $terminalLabel = $this->sanitizeMerchantText($data['terminal_label'] ?? '', self::TEXT_FIELD_MAX);
        if ($terminalLabel !== '') {
            $additionalData .= $this->formatTlv(self::SUB_TERMINAL_LABEL, $terminalLabel);
        }

        if ($additionalData !== '') {
            $payload .= $this->formatTlv('62', $additionalData);
        }

        // Tag 99 — Timestamp template (NBC, dynamic only).
        // Inner layout matches the official SDK: sub-tag 00 = creation,
        // sub-tag 01 = expiration, each epoch in ms, 13 digits.
        if ($expirationTimestamp !== null) {
            $timestampInfo = $this->formatTlv(self::SUB_CREATION_TIMESTAMP, (string) $nowMs)
                . $this->formatTlv(self::SUB_EXPIRATION_TIMESTAMP, (string) $expirationTimestamp);

            $payload .= $this->formatTlv(self::TAG_TIMESTAMP, $timestampInfo);
        }

        // Tag 63 — CRC16/CCITT-FALSE. Compute over payload + "6304" prefix.
        $crcData = $payload . '6304';
        $fullPayload = $crcData . $this->crc16($crcData);

        // MD5 covers the ENTIRE string incl. CRC — matches the official SDK
        // (result.md5) and is the value Bakong's check_transaction_by_md5 expects.
        return [
            'payload' => $fullPayload,
            'md5' => md5($fullPayload),
            'expires_at_ms' => $expirationTimestamp,
        ];
    }

    /**
     * Return a unique, short reference used as the KHQR bill number.
     */
    public function reference(): string
    {
        return 'KH' . date('His') . strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
    }

    /**
     * Debugging aid: log the exact raw QR payload string and its length/CRC
     * BEFORE a QR image is rendered from it.
     */
    public function logPayload(string $payload, array $context = []): void
    {
        Log::debug('KHQR raw payload generated', array_merge($context, [
            'length' => strlen($payload),
            'crc' => substr($payload, -4),
            'md5' => md5($payload),
            'payload' => $payload,
        ]));
    }

    /**
     * Contact the Bakong Open API to confirm whether a payment was made
     * against a generated KHQR, using the QR's MD5 hash.
     *
     * Endpoint: POST {BASE}/v1/check_transaction_by_md5
     * Payload : {"md5": "<32-char md5 of the full QR string>"}
     * Auth    : Authorization: Bearer <BAKONG_OPEN_API_TOKEN>
     *
     * The md5 must be the SHA/MD5-style hash of the ENTIRE generated QR
     * payload INCLUDING the trailing "6304XXXX" CRC — that is exactly
     * what {@see \App\Services\KhqrService::build()} returns in 'md5'.
     *
     * Response contract (verified against the official NBC Open API):
     *   HTTP 200, responseCode === 0, data.hash present   -> PAID
     *   HTTP 200, responseCode === 0, errorCode 15 (no data) -> NOT PAID YET
     *   Anything else (non-zero responseCode)              -> service/upstream error
     *
     * Transport hardening:
     *   - connect + overall timeouts from config
     *   - bounded retries for TRANSIENT failures ONLY (connection errors
     *     and timeouts). 401/4xx/5xx API answers are never retried.
     *   - the token is never logged; only the md5 hash (safe) and status.
     *
     * @param  string  $md5  32-char lowercase hexadecimal fingerprint
     *
     * @return array{
     *     status: 'paid'|'unpaid'|'error',
     *     found: bool,
     *     response_code: int|null,
     *     error_code: int|null,
     *     message: string,
     *     transaction: array|null,
     *     md5: string,
     * } normalized result that the controller can act on without knowing
     *   Bakong's raw envelope
     *
     * @throws \InvalidArgumentException when the md5 format is invalid
     * @throws \RuntimeException         when the Open API token is not configured
     */
    public function checkPaymentByMd5(string $md5): array
    {
        // --- Preconditions -------------------------------------------------
        $token = (string) config('services.bakong.open_api_token');

        if ($token === '') {
            Log::error('Bakong Open API call aborted: token missing');

            throw new \RuntimeException(
                'Bakong Open API token is not configured. Set BAKONG_OPEN_API_TOKEN in the environment.'
            );
        }

        if (!preg_match('/^[a-f0-9]{32}$/i', $md5)) {
            throw new \InvalidArgumentException(json_encode([
                'errors' => ['md5' => ['MD5 must be a 32-character hexadecimal string.']],
                'input' => ['md5' => $md5],
            ], JSON_UNESCAPED_UNICODE));
        }

        // --- Build the request --------------------------------------------
        $endpoint = rtrim((string) config('services.bakong.open_api_url'), '/')
            . '/v1/check_transaction_by_md5';

        $retries = (int) config('services.bakong.open_api_retries', 1);

        try {
            $response = Http::withToken($token)
                ->acceptJson()
                ->asJson()
                ->connectTimeout((int) config('services.bakong.open_api_connect_timeout', 5))
                ->timeout((int) config('services.bakong.open_api_timeout', 15))
                // Retry ONLY transient transport failures. Bakong answers
                // 4xx/5xx with a JSON body we must read, so those are never
                // retried (the `when` callback receives a RequestException
                // for non-2xx responses and returns false).
                ->retry($retries, (int) config('services.bakong.open_api_retry_delay', 200), function (\Throwable $e) {
                    return $e instanceof ConnectionException;
                })
                ->post($endpoint, ['md5' => $md5]);
        } catch (ConnectionException $e) {
            // All retries exhausted / network unreachable.
            Log::warning('Bakong Open API unreachable', [
                'md5' => $md5,
                'error' => $e->getMessage(),
            ]);

            return $this->errorResult(
                $md5,
                'The Bakong payment gateway could not be reached. Please try again.',
                null,
                null
            );
        }

        // --- Interpret the answer -----------------------------------------
        $status = $response->status();
        $body = $response->json();

        if (!is_array($body)) {
            Log::warning('Bakong Open API returned a non-JSON response', [
                'md5' => $md5,
                'http_status' => $status,
                'body' => (string) $response->body(),
            ]);

            return $this->errorResult($md5, 'Unexpected response from the payment gateway.', $status, null);
        }

        $responseCode = $body['responseCode'] ?? null;
        $errorCode = $body['errorCode'] ?? null;
        $data = is_array($body['data'] ?? null) ? $body['data'] : null;

        // HTTP-level failure (>= 400). The retry policy above leaves these
        // for us to surface rather than swallowing them as "not paid".
        if ($status >= 400 || !$response->successful()) {
            Log::error('Bakong Open API request failed', [
                'md5' => $md5,
                'http_status' => $status,
                'error_code' => $errorCode,
                'response_code' => $responseCode,
            ]);

            return $this->errorResult(
                $md5,
                $status === 401
                    ? 'Bakong Open API rejected the developer token. Check BAKONG_OPEN_API_TOKEN.'
                    : 'The Bakong payment gateway returned an error (HTTP ' . $status . ').',
                $status,
                $errorCode
            );
        }

        // Authoritative success: responseCode "0" AND transaction data.
        if ((int) $responseCode === self::BAKONG_RESPONSE_OK && $data !== null) {
            Log::info('Bakong Open API: payment found for md5', [
                'md5' => $md5,
                'type' => $data['type'] ?? null,
                'currency' => $data['currency'] ?? null,
                'amount' => $data['amount'] ?? null,
            ]);

            return [
                'status' => 'paid',
                'found' => true,
                'response_code' => self::BAKONG_RESPONSE_OK,
                'error_code' => $errorCode,
                'message' => 'Payment confirmed by the Bakong Open API.',
                'transaction' => $data,
                'md5' => $md5,
            ];
        }

        // Valid envelope but the transaction is not registered (yet).
        // errorCode 15 = "transaction not found" — the normal answer while
        // the customer is still scanning / has not finished paying.
        if ((int) $responseCode === self::BAKONG_RESPONSE_OK) {
            if ($errorCode !== null && (int) $errorCode !== self::BAKONG_TXN_NOT_FOUND_CODE) {
                Log::warning('Bakong Open API: unexpected errorCode on success envelope', [
                    'md5' => $md5,
                    'error_code' => $errorCode,
                ]);
            }

            return [
                'status' => 'unpaid',
                'found' => false,
                'response_code' => self::BAKONG_RESPONSE_OK,
                'error_code' => $errorCode,
                'message' => 'No payment has been detected for this KHQR yet.',
                'transaction' => null,
                'md5' => $md5,
            ];
        }

        // Non-zero responseCode — treat as an upstream error.
        return $this->errorResult(
            $md5,
            'The Bakong payment gateway returned responseCode ' . var_export($responseCode, true) . '.',
            $status,
            $errorCode
        );
    }

    /**
     * Build a normalized "error" result used by {@see checkPaymentByMd5()}.
     *
     * @param  string    $md5       hashed QR fingerprint being checked
     * @param  string    $message   human-readable detail for the client
     * @param  int|null  $httpStatus  raw HTTP status (null when transport-level)
     * @param  int|null  $errorCode   Bakong errorCode (null when not given)
     *
     * @return array{status: string, found: bool, response_code: int|null, error_code: int|null, message: string, transaction: null, md5: string}
     */
    private function errorResult(string $md5, string $message, ?int $httpStatus, mixed $errorCode): array
    {
        return [
            'status' => 'error',
            'found' => false,
            'response_code' => $httpStatus,
            'error_code' => is_numeric($errorCode) ? (int) $errorCode : null,
            'message' => $message,
            'transaction' => null,
            'md5' => $md5,
        ];
    }

    /**
     * EMVCo TLV encoder: tag (2) + length (2) + value.
     *
     * The length prefix is the BYTE length (strlen) of the value, zero-padded
     * to exactly two digits ('0' -> '00', '9' -> '09'). mb_strlen must NOT be
     * used here — it returns character counts, which corrupt the byte-length
     * contract that KHQR scanners rely on.
     *
     * @throws \InvalidArgumentException when the encoded value exceeds 99 bytes
     */
    private function formatTlv(string $tag, string $value): string
    {
        $length = strlen($value); // byte length — never mb_strlen

        if ($length > self::MAX_TLV_VALUE_BYTES) {
            throw new \InvalidArgumentException(
                "TLV value for tag {$tag} exceeds 99 bytes ({$length}); KHQR/EMVCo 'var' fields cannot be encoded."
            );
        }

        return $tag . str_pad((string) $length, 2, '0', STR_PAD_LEFT) . $value;
    }

    /**
     * Strip everything except ASCII letters, digits and single spaces,
     * uppercase the result, and cap it at the EMVCo field maximum.
     *
     * Removes Khmer Unicode, exchange-rate symbols, ampersands, dashes, etc.
     * The output is guaranteed ASCII, so substr() byte-counting is safe.
     */
    private function sanitizeMerchantText(string $value, int $maxLength): string
    {
        $value = preg_replace('/[^A-Za-z0-9 ]/', ' ', $value) ?? '';
        $value = preg_replace('/\s+/', ' ', $value) ?? '';
        return substr(strtoupper(trim($value)), 0, $maxLength);
    }

    /**
     * Optional free-text field: lowercase, trim, cap to the field maximum.
     * Empty/whitespace input yields an empty string (field is then omitted).
     */
    private function normalizeOptionalText(?string $value, int $maxLength): string
    {
        $value = strtolower(trim((string) $value));

        return $value === '' ? '' : substr($value, 0, $maxLength);
    }

    /**
     * Bakong account ID rules (mirrors official SDK validation):
     *  - trim whitespace, lowercase
     *  - exactly one "@", non-empty username and bank suffix
     *  - ASCII letters/digits plus . - _ (bank suffix MAY contain digits,
     *    e.g. "champey_svay@bkrt00", "10824705@acleda", "username@aba")
     *
     * @throws \InvalidArgumentException when the format is invalid
     */
    private function normalizeAccountId(string $accountId): string
    {
        $accountId = strtolower(trim($accountId));

        if (!preg_match('/^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9._-]*$/', $accountId)) {
            throw new \InvalidArgumentException(json_encode([
                'errors' => [
                    "Bakong account ID must match the 'username@bank' format (e.g. '10824705@acleda', 'champey_svay@bkrt00', or 'sokha@aba') without spaces or special characters. Got: '{$accountId}'.",
                ],
                'input' => ['account_id' => $accountId],
            ], JSON_UNESCAPED_UNICODE));
        }

        return substr($accountId, 0, self::ACCOUNT_ID_MAX);
    }

    /**
     * EMVCo Tag 62 mobile number: digits only (E.164), optional leading '+',
     * capped at 15 digits. Empty/whitespace input is omitted.
     */
    private function normalizeMobileNumber(?string $value): string
    {
        $value = trim((string) $value);
        if ($value === '') {
            return '';
        }

        $value = preg_replace('/[^0-9]/', '', $value) ?? '';
        if ($value === '') {
            return '';
        }

        return substr($value, 0, self::MOBILE_MAX);
    }

    /**
     * Resolve the Tag 99 expiration timestamp (epoch ms) for a dynamic QR.
     *
     * Source of truth is the SERVER, not the client — this is what kills the
     * "Expired QR" bug:
     *
     *  1. Default:        now + services.bakong.khqr_ttl_minutes (15 min).
     *  2. Caller supplied a 10-digit seconds value  -> promoted to ms.
     *  3. Caller supplied a 13-digit ms value      -> used as-is.
     *  4. Value is missing / zero / wrong length    -> server default.
     *  5. Value is in the past                      -> server default.
     *  6. Value leaves less than khqr_min_lifetime_seconds (5 min) of life
     *     -> clamped forward to the floor, so pipeline latency + phone clock
     *     skew cannot burn the whole TTL before the customer scans.
     *
     * All decisions are logged (warning level) so operator bugs are visible.
     *
     * @param  int|string|null $value  caller-provided override (optional)
     * @param  int             $nowMs  current epoch ms (stamped once upstream)
     *
     * @return int 13-digit epoch ms, always strictly in the future
     */
    private function resolveExpirationTimestamp(int|string|null $value, int $nowMs): int
    {
        $ttlMs = ((int) config('services.bakong.khqr_ttl_minutes', 15)) * 60_000;
        $minLifetimeMs = ((int) config('services.bakong.khqr_min_lifetime_seconds', 300)) * 1000;

        $default = $nowMs + $ttlMs;

        // No override -> pure server TTL.
        if ($value === null || $value === '' || $value === 0) {
            return $default;
        }

        $exp = (int) $value;
        $digits = strlen((string) $exp);

        // Seconds -> milliseconds (10-digit -> 13-digit).
        if ($digits === 10) {
            $exp *= 1000;
        } elseif ($digits !== self::TIMESTAMP_MS_DIGITS) {
            // Caller bug: neither seconds nor ms. Never embed garbage in the
            // QR — fall back to the server TTL and make the error visible.
            Log::warning('KHQR expiration_timestamp ignored: not 10 or 13 digits', [
                'provided' => $value,
                'digits' => $digits,
            ]);

            return $default;
        }

        // Already in the past -> embedding it would guarantee "Expired QR".
        if ($exp <= $nowMs) {
            Log::warning('KHQR expiration_timestamp ignored: in the past; using server TTL', [
                'provided_epoch_ms' => $exp,
                'now_ms' => $nowMs,
            ]);

            return $default;
        }

        // Too short to survive the pipeline -> push to the safe floor.
        return max($exp, $nowMs + $minLifetimeMs);
    }

    /**
     * Gate before building the payload. Throws with full details so the
     * controller can log them and return a clear JSON error.
     */
    private function assertValidPayload(
        string $currency,
        float $amount,
        string $merchantName
    ): void {
        $errors = [];

        if (!isset(self::CURRENCY_CODES[$currency])) {
            $errors[] = "Unsupported currency '{$currency}'. Expected USD or KHR.";
        }

        if ($amount < 0) {
            $errors[] = 'Amount cannot be negative.';
        }

        if ($merchantName === '') {
            $errors[] = 'Merchant name is empty after sanitization (remove non-alphanumeric / Khmer characters).';
        } elseif (!preg_match('/^[A-Za-z0-9 ]+$/', $merchantName)) {
            $errors[] = 'Merchant name must be ASCII alphanumeric.';
        }

        if ($errors !== []) {
            throw new \InvalidArgumentException(json_encode([
                'errors' => $errors,
                'input' => ['currency' => $currency, 'amount' => $amount, 'merchant_name' => $merchantName],
            ], JSON_UNESCAPED_UNICODE));
        }
    }

    /**
     * CRC16/CCITT-FALSE (poly 0x1021, init 0xFFFF), uppercase 4-hex output.
     */
    private function crc16(string $data): string
    {
        $crc = 0xFFFF;
        $length = strlen($data);

        for ($i = 0; $i < $length; $i++) {
            $crc ^= (ord($data[$i]) << 8);
            for ($j = 0; $j < 8; $j++) {
                $crc = ($crc & 0x8000) ? (($crc << 1) ^ 0x1021) : ($crc << 1);
                $crc &= 0xFFFF;
            }
        }

        return strtoupper(sprintf('%04X', $crc));
    }

    /**
     * Amount formatting per Bakong/NBC:
     *  - USD -> string float with exactly 2 decimals (e.g. "0.01", "12.50")
     *  - KHR -> whole integer string only (KHR has no fractional riel)
     */
    private function formatAmount(float $amount, string $currency): string
    {
        if ($currency === 'KHR') {
            return (string) (int) round(max(0, $amount));
        }
        return number_format(max(0, $amount), 2, '.', '');
    }
}