<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => ['https://pos-management-system-alpha.vercel.app'], 

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true, // 👈 ផ្លាស់ប្តូរពី false មកជា true វិញ ដើម្បីការពារបញ្ហា Header/Token ពេលផ្ញើ Request ពី Vercel
];