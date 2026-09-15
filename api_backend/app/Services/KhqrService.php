<?php

namespace App\Services;

/**
 * Builds an EMVCo Merchant-Presented QR payload compatible with the
 * Bakong KHQR standard (National Bank of Cambodia).
 *
 * Structure: TLV fields + CRC16/CCITT-FALSE checksum (tag 63).
 */
class KhqrService
{
    private const GUID = 'KH.QB.01';

    private const CURRENCY_CODES = [
        'KHR' => '116',
        'USD' => '840',
    ];

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
     */
    public function build(array $data): string
    {
        $currency = strtoupper($data['currency'] ?? 'KHR');

        $payload = $this->tlv('00', '01'); // Payload Format Indicator
        $payload .= $this->tlv('01', '12'); // Point of Initiation: dynamic

        // Merchant Account Information (Bakong)
        $accountInfo = $this->tlv('00', self::GUID);
        $accountInfo .= $this->tlv('01', substr($data['account_id'], 0, 40));
        if (!empty($data['app_id'])) {
            $accountInfo .= $this->tlv('02', mb_substr($data['app_id'], 0, 30));
        }
        $payload .= $this->tlv('26', $accountInfo);

        $payload .= $this->tlv('52', substr($data['category_code'] ?? '5812', 0, 4)); // Merchant Category Code
        $payload .= $this->tlv('53', self::CURRENCY_CODES[$currency] ?? '116'); // Transaction Currency
        $payload .= $this->tlv('54', $this->formatAmount((float) $data['amount'], $currency)); // Transaction Amount
        $payload .= $this->tlv('58', 'KH'); // Country Code
        $payload .= $this->tlv('59', mb_substr($data['merchant_name'], 0, 25)); // Merchant Name
        $payload .= $this->tlv('60', mb_substr($data['merchant_city'] ?? '', 0, 15)); // Merchant City

        // Additional Data: bill number (reference)
        $payload .= $this->tlv('62', $this->tlv('05', mb_substr($data['reference'], 0, 25)));

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

    private function tlv(string $id, string $value): string
    {
        $len = mb_strlen($value);
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

    private function formatAmount(float $amount, string $currency): string
    {
        if ($currency === 'KHR') {
            return (string) (int) round(max(0, $amount));
        }
        return number_format(max(0, $amount), 2, '.', '');
    }
}