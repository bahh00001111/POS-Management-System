<?php

namespace Tests\Feature;

use App\Services\KhqrService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Tests for KhqrService::checkPaymentByMd5() against the Bakong Open API.
 *
 * These tests use Http::fake() so NO external network calls and NO database
 * writes occur — the raw Bakong envelope is simulated and we only assert on
 * our normalized result contract.
 */
class BakongOpenApiServiceTest extends TestCase
{
    private const MD5 = 'abcd1234abcd1234abcd1234abcd1234';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.bakong.open_api_token' => 'test-open-api-token',
            'services.bakong.open_api_url' => 'https://api-bakong.nbc.gov.kh',
            'services.bakong.open_api_timeout' => 15,
            'services.bakong.open_api_connect_timeout' => 5,
            'services.bakong.open_api_retries' => 1,
            'services.bakong.open_api_retry_delay' => 200,
        ]);
    }

    public function test_returns_paid_when_bakong_confirms_the_transaction(): void
    {
        Http::fake([
            'api-bakong.nbc.gov.kh/v1/check_transaction_by_md5' => Http::response([
                'responseCode' => 0,
                'data' => [
                    'hash' => self::MD5,
                    'type' => 'SALE',
                    'amount' => 1250,
                    'currency' => 'usd',
                    'transactionDateTime' => '2026-09-16T10:00:00',
                ],
            ], 200),
        ]);

        $result = (new KhqrService())->checkPaymentByMd5(self::MD5);

        $this->assertSame('paid', $result['status']);
        $this->assertTrue($result['found']);
        $this->assertSame(0, $result['response_code']);
        $this->assertSame('SALE', $result['transaction']['type'] ?? null);
        $this->assertSame(self::MD5, $result['md5']);

        // Outbound request shape: correct auth header + JSON body.
        Http::assertSent(function ($request) {
            return $request->hasHeader('Authorization', 'Bearer test-open-api-token')
                && $request['md5'] === self::MD5
                && $request->url() === 'https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5';
        });
    }

    public function test_returns_unpaid_when_bakong_finds_no_transaction(): void
    {
        // The canonical "still waiting for payment" answer.
        Http::fake([
            'api-bakong.nbc.gov.kh/*' => Http::response([
                'responseCode' => 0,
                'errorCode' => 15,
                'message' => 'Transaction not found',
            ], 200),
        ]);

        $result = (new KhqrService())->checkPaymentByMd5(self::MD5);

        $this->assertSame('unpaid', $result['status']);
        $this->assertFalse($result['found']);
        $this->assertSame(15, $result['error_code']);
        $this->assertNull($result['transaction']);
    }

    public function test_returns_unpaid_when_envelope_is_empty_but_successful(): void
    {
        Http::fake([
            'api-bakong.nbc.gov.kh/*' => Http::response([
                'responseCode' => 0,
                'data' => null,
            ], 200),
        ]);

        $result = (new KhqrService())->checkPaymentByMd5(self::MD5);

        $this->assertSame('unpaid', $result['status']);
        $this->assertFalse($result['found']);
    }

    public function test_returns_error_on_unauthorized_token(): void
    {
        Http::fake([
            'api-bakong.nbc.gov.kh/*' => Http::response([
                'responseCode' => 6,
                'message' => 'Unauthorized',
            ], 401),
        ]);

        $result = (new KhqrService())->checkPaymentByMd5(self::MD5);

        $this->assertSame('error', $result['status']);
        $this->assertSame(401, $result['response_code']);
        $this->assertStringContainsString('token', strtolower($result['message']));
    }

    public function test_returns_error_on_server_failure(): void
    {
        Http::fake([
            'api-bakong.nbc.gov.kh/*' => Http::response(['message' => 'boom'], 500),
        ]);

        $result = (new KhqrService())->checkPaymentByMd5(self::MD5);

        $this->assertSame('error', $result['status']);
        $this->assertSame(500, $result['response_code']);
        $this->assertFalse($result['found']);
    }

    public function test_returns_error_when_the_network_connection_fails(): void
    {
        // Simulate a transport-level failure (never reaches the API).
        Http::fake(function () {
            throw new ConnectionException('Connection timed out', 0, null);
        });

        $result = (new KhqrService())->checkPaymentByMd5(self::MD5);

        $this->assertSame('error', $result['status']);
        $this->assertNull($result['response_code']);
        $this->assertStringContainsString('could not be reached', $result['message']);
    }

    public function test_returns_error_on_non_json_body(): void
    {
        Http::fake([
            'api-bakong.nbc.gov.kh/*' => Http::response('<html>bad gateway</html>', 200),
        ]);

        $result = (new KhqrService())->checkPaymentByMd5(self::MD5);

        $this->assertSame('error', $result['status']);
        $this->assertFalse($result['found']);
    }

    public function test_throws_when_token_is_not_configured(): void
    {
        config(['services.bakong.open_api_token' => null]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('BAKONG_OPEN_API_TOKEN');

        (new KhqrService())->checkPaymentByMd5(self::MD5);
    }

    public function test_throws_on_invalid_md5_format(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        (new KhqrService())->checkPaymentByMd5('not-a-hex-hash');
    }
}