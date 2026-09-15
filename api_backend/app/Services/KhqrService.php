<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

/**
 * Builds an EMVCo Merchant-Presented QR payload compatible with the
 * Bakong KHQR standard (National Bank of Cambodia).
 *
 * Structure: TLV fields + CRC16/CCITT-FALSE checksum (tag 63).
 *
 * NBC compliance notes:
 *  - Every TLV value must be plain ASCII. Khmer Unicode / special
 *    characters are NOT allowed and are stripped during sanitization.
 *  - TLV length prefixes are BYTE lengths (strlen), never character
 *    counts — using mb_strlen here corrupts the payload for multi-byte
 *    strings and makes scanners report "Invalid QR Merchant Data".
 *  - Tag 53 (currency) uses the numeric ISO-4217 code (116 / 840).
 *  - Tag 54 (amount): USD uses 2 decimals; KHR is a whole number.
 *  - The Bakong account ID must be lowercase "username@bank".
 */
class KhqrService
{
    private const GUID = 'KH.QB.01';

    private const CURRENCY_CODES = [
        'KHR' => '116',
        'USD' => '840',
    ];

    /** EMVCo Merchant Category Code fallback (General Retail). */
    private const DEFAULT_MCC = '5999';

    /** Default merchant city when none is configured. */
    private const DEFAULT_CITY = 'PHNOM PENH';

    /**
     * Build a dynamic (point-of-initiation 12) KHQR payload string.
     *
     * @param array{
     *     amount: float,
     *     currency: 'KHR'|'USD',
     *     reference: string,
     *     account_id: string,
     *     app_id: string|null,
     *     merchant_name: string,
     *     merchant_city: string,
     *     category_code: string,
     * } $data
     *
     * @throws \InvalidArgumentException when the data cannot produce a valid payload
     */
    public function build(array $data): string
    {
        $currency = strtoupper($data['currency'] ?? 'KHR');

        // Tag 52 — Merchant Category Code: exactly 4 digits, else 5999.
        $categoryCode = trim((string) ($data['category_code'] ?? ''));
        if (!preg_match('/^\d{4}$/', $categoryCode)) {
            $categoryCode = self::DEFAULT_MCC;
        }

        // Tag 59 — Merchant Name: strip non-ASCII, uppercase, max 25 chars.
        $merchantName = $this->sanitizeMerchantText($data['merchant_name'] ?? '', 25);

        // Tag 60 — Merchant City: strip non-ASCII, uppercase, max 15 chars,
        //          fall back to PHNOM PENH when nothing usable remains.
        $merchantCity = $this->sanitizeMerchantText($data['merchant_city'] ?? '', 15);
        if ($merchantCity === '') {
            $merchantCity = self::DEFAULT_CITY;
        }

        // Tag 26 — Bakong Account ID: lowercase + strict "username@bank" format.
        $accountId = $this->normalizeAccountId($data['account_id'] ?? '');
        $appId = $this->normalizeAppId($data['app_id'] ?? '');

        // Pre-build gate — mirrors the Bakong SDK "code 0" check.
        $this->assertValidPayload($currency, $data['amount'], $merchantName);

        $payload = $this->tlv('00', '01'); // Payload Format Indicator
        $payload .= $this->tlv('01', '12'); // Point of Initiation: dynamic

        // Merchant Account Information (Bakong GUID "KH.QB.01")
        $accountInfo = $this->tlv('00', self::GUID);
        $accountInfo .= $this->tlv('01', substr($accountId, 0, 40));
        if ($appId !== '') {
            $accountInfo .= $this->tlv('02', substr($appId, 0, 30));
        }
        $payload .= $this->tlv('26', $accountInfo);

        $payload .= $this->tlv('52', $categoryCode); // Merchant Category Code
        $payload .= $this->tlv('53', self::CURRENCY_CODES[$currency]); // Transaction Currency (numeric 840/116)
        $payload .= $this->tlv('54', $this->formatAmount((float) $data['amount'], $currency)); // Transaction Amount
        $payload .= $this->tlv('58', 'KH'); // Country Code
        $payload .= $this->tlv('59', $merchantName); // Merchant Name (≤25 ASCII)
        $payload .= $this->tlv('60', $merchantCity); // Merchant City (≤15 ASCII)

        // Additional Data: bill number (reference label)
        $payload .= $this->tlv('62', $this->tlv('05', substr($data['reference'], 0, 25)));

        $crcData = $payload . '6304';
        return $crcData . $this->crc16($crcData);
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
            'payload' => $payload,
        ]));
    }

    /**
     * Strip everything except ASCII letters, digits and single spaces,
     * uppercase the result, and cap it at the EMVCo field maximum.
     *
     * Removes Khmer Unicode, exchange-rate symbols, ampersands, dashes, etc.
     */
    private function sanitizeMerchantText(string $value, int $maxLength): string
    {
        $value = preg_replace('/[^A-Za-z0-9 ]/', ' ', $value) ?? '';
        $value = preg_replace('/\s+/', ' ', $value) ?? '';
        return mb_substr(strtoupper(trim($value)), 0, $maxLength);
    }

    /**
     * Bakong account ID rules:
     *  - trim whitespace, lowercase
     *  - strict "username@bank" format (e.g. "sokha@aba", "012345678@acleda")
     *
     * @throws \InvalidArgumentException when the format is invalid
     */
    private function normalizeAccountId(string $accountId): string
    {
        $accountId = strtolower(trim($accountId));

        if (!preg_match('/^[a-z0-9][a-z0-9._-]*@[a-z]{2,}$/', $accountId)) {
            throw new \InvalidArgumentException(json_encode([
                'errors' => [
                    "Bakong account ID must match the 'username@bank' format (e.g. 'sokha@aba' or '012345678@acleda') without spaces or special characters. Got: '{$accountId}'.",
                ],
                'input' => ['account_id' => $accountId],
            ], JSON_UNESCAPED_UNICODE));
        }

        return substr($accountId, 0, 40);
    }

    /**
     * Bakong app IDs are lowercase UUID-like tokens; trim + lowercase only.
     */
    private function normalizeAppId(?string $appId): string
    {
        return strtolower(trim((string) $appId));
    }

    /**
     * Gate before building the payload. Throws with full details so the
     * controller can log them and return a clear JSON error.
     */
    private function assertValidPayload(
        string $currency,
        mixed $amount,
        string $merchantName
    ): void {
        $errors = [];

        if (!isset(self::CURRENCY_CODES[$currency])) {
            $errors[] = "Unsupported currency '{$currency}'. Expected USD or KHR.";
        }

        if ((float) $amount <= 0) {
            $errors[] = 'Amount must be greater than zero.';
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
     * EMVCo TLV: tag (2) + length (2, BYTE length, hex-padded) + value.
     */
    private function tlv(string $id, string $value): string
    {
        $len = strlen($value); // byte length — never mb_strlen
        return $id . strtoupper(str_pad((string) $len, 2, '0', STR_PAD_LEFT)) . $value;
    }

    /**
     * CRC16/CCITT-FALSE (poly 0x1021, init 0xFFFF).
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
     *  - USD → string float with exactly 2 decimals (e.g. "2.00")
     *  - KHR → whole number only (KHR has no fractional riel)
     */
    private function formatAmount(float $amount, string $currency): string
    {
        if ($currency === 'KHR') {
            return (string) (int) round(max(0, $amount));
        }
        return number_format(max(0, $amount), 2, '.', '');
    }
}