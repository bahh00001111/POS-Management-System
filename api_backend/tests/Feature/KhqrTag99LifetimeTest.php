<?php

namespace Tests\Feature;

use App\Services\KhqrService;
use Tests\TestCase;

/**
 * Verifies KhqrService's Tag 99 (expiration) behaviour that prevents the
 * "Expired QR" scanner error. No database or network involved.
 */
class KhqrTag99LifetimeTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.bakong.khqr_ttl_minutes' => 15,
            'services.bakong.khqr_min_lifetime_seconds' => 300,
        ]);
    }

    private function build(array $overrides = []): array
    {
        return (new KhqrService())->build(array_merge([
            'account_id' => 'test@aba',
            'merchant_name' => 'TEST STORE',
            'merchant_city' => 'Phnom Penh',
            'currency' => 'USD',
            'amount' => 12.5,
            'reference' => 'TTL-TEST',
        ], $overrides));
    }

    /** Extracts the Tag 99 expiration sub-value (sub-tag 01, 13 digits). */
    private function expirationOf(string $payload): ?int
    {
        $offset = 0;
        while ($offset + 4 <= strlen($payload)) {
            $tag = substr($payload, $offset, 2);
            $len = (int) substr($payload, $offset + 2, 2);
            $value = substr($payload, $offset + 4, $len);

            if ($tag === '99') {
                // Walk Tag 99's inner TLVs: 00 = creation, 01 = expiration.
                $innerOffset = 0;
                while ($innerOffset + 4 <= strlen($value)) {
                    $sub = substr($value, $innerOffset, 2);
                    $subLen = (int) substr($value, $innerOffset + 2, 2);

                    if ($sub === '01') {
                        return (int) substr($value, $innerOffset + 4, $subLen);
                    }

                    $innerOffset += 4 + $subLen;
                }

                return null;
            }

            $offset += 4 + $len;
        }

        return null;
    }

    public function test_dynamic_qr_without_client_value_uses_server_ttl(): void
    {
        $now = microtime(true) * 1000;
        $result = $this->build(); // <-- no expiration_timestamp

        $this->assertNotNull($result['expires_at_ms']);
        $this->assertNotNull($this->expirationOf($result['payload']));

        // TTL ~15 min, tolerant of the ms that elapsed between $now and stamp.
        $this->assertGreaterThan($now + 14 * 60_000 - 30_000, $result['expires_at_ms']);
        $this->assertLessThan($now + 15 * 60_000 + 30_000, $result['expires_at_ms']);
    }

    public function test_past_expiration_is_ignored_and_replaced_by_server_ttl(): void
    {
        $now = microtime(true);
        $result = $this->build(['expiration_timestamp' => (int) $now - 3600]); // 1 hour ago

        $exp = $result['expires_at_ms'];
        $this->assertGreaterThan($now * 1000 + 14 * 60_000, $exp);
    }

    public function test_ten_digit_seconds_expiration_is_promoted_to_ms(): void
    {
        $now = time();
        $result = $this->build(['expiration_timestamp' => $now + 3600]); // 10-digit seconds

        $expectedMs = ($now + 3600) * 1000;
        $this->assertSame(13, strlen((string) $result['expires_at_ms']));
        $this->assertEqualsWithDelta($expectedMs, $result['expires_at_ms'], 60_000);
        $this->assertSame($result['expires_at_ms'], $this->expirationOf($result['payload']));
    }

    public function test_very_short_expiration_is_clamped_to_minimum_lifetime(): void
    {
        $now = microtime(true) * 1000;
        $result = $this->build(['expiration_timestamp' => (int) $now + 60_000]); // 1 min

        // Must be no earlier than the 5-minute floor.
        $this->assertGreaterThanOrEqual($now + 299_000, $result['expires_at_ms']);
    }

    public function test_garbage_expiration_falls_back_to_server_ttl(): void
    {
        $now = microtime(true) * 1000;
        $result = $this->build(['expiration_timestamp' => 123]); // wrong length

        $this->assertGreaterThan($now + 14 * 60_000, $result['expires_at_ms']);
    }

    public function test_static_qr_carries_no_tag_99(): void
    {
        $result = $this->build(['amount' => 0]);

        $this->assertNull($result['expires_at_ms']);
        $this->assertNull($this->expirationOf($result['payload']));
    }
}