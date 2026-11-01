<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // ដាក់ Domain របស់ Vercel របស់អ្នកនៅទីនេះ
    'allowed_origins' => ['https://pos-management-system-alpha.vercel.app'], 

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false, // ព្រោះយើងប្រើ Bearer Token មិនមែន Cookie
];