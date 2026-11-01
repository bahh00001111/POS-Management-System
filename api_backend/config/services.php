<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme' => 'https',
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Bakong Open API (National Bank of Cambodia)
    |--------------------------------------------------------------------------
    |
    | The developer token issued by the NBC Open API portal. Never hard-code
    | it here — always load it from the environment:
    |
    |   BAKONG_OPEN_API_TOKEN=<token issued by the NBC portal>
    |   BAKONG_OPEN_API_URL=https://api-bakong.nbc.gov.kh
    |
    | All values are read via env() so they stay out of version control and
    | can differ per environment (local / staging / sandbox / production).
    |
    */
    'bakong' => [
        // Bearer token from the NBC Open API portal (used by
        // /v1/check_transaction_by_md5 and the transaction webhooks).
        'open_api_token' => env('BAKONG_OPEN_API_TOKEN'),

        // Base URL of the Bakong Open API. Sandbox and production hosts
        // differ — keep them switchable via .env instead of hard-coding.
        'open_api_url' => env('BAKONG_OPEN_API_URL', 'https://api-bakong.nbc.gov.kh'),

        // Whole-request timeout (seconds). Bakong occasionally holds
        // long-poll style requests open, so give it headroom.
        'open_api_timeout' => (int) env('BAKONG_OPEN_API_TIMEOUT', 15),

        // TCP/TLS connect timeout (seconds) — fail fast when the network
        // is unreachable instead of hanging on connect.
        'open_api_connect_timeout' => (int) env('BAKONG_OPEN_API_CONNECT_TIMEOUT', 5),

        // Number of additional attempts for TRANSIENT failures only
        // (connection errors / timeouts). Authorisation and business
        // errors are never retried by the service.
        'open_api_retries' => (int) env('BAKONG_OPEN_API_RETRIES', 1),

        // Milliseconds to wait between retry attempts.
        'open_api_retry_delay' => (int) env('BAKONG_OPEN_API_RETRY_DELAY', 200),

        // Shared secret used to verify the HMAC signature on the inbound
        // /khqr/callback webhook. The gateway signs the raw request body
        // with HMAC-SHA256 using this secret and sends it in the
        // `X-Bakong-Signature` header. Empty means webhooks are rejected.
        'webhook_secret' => env('BAKONG_WEBHOOK_SECRET', ''),

        // Tag 99 lifetime for DYNAMIC QRs. Expiration is always generated
        // on the SERVER (never trusted from the client), so a faulty client
        // TTL can never produce an instantly-expired QR. Static QRs carry
        // no Tag 99 at all.
        'khqr_ttl_minutes' => (int) env('BAKONG_QR_TTL_MINUTES', 15),

        // Hard floor for the QR lifetime. Any client-supplied expiration
        // that would leave less than this much time is clamped forward to
        // absorb DB/HTTP latency and phone-clock skew.
        'khqr_min_lifetime_seconds' => (int) env('BAKONG_QR_MIN_LIFETIME_SECONDS', 300),
    ],

];
