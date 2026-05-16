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

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'anthropic' => [
        'api_key' => env('ANTHROPIC_API_KEY'),
        'model'   => env('ANTHROPIC_MODEL', 'claude-sonnet-4-5-20250929'),
    ],

    'stripe' => [
        'secret'  => env('STRIPE_SECRET'),
        'webhook' => env('STRIPE_WEBHOOK_SECRET'),
    ],

    'paypal' => [
        'mode'          => env('PAYPAL_MODE', 'sandbox'),
        'client_id'     => env('PAYPAL_CLIENT_ID'),
        'client_secret' => env('PAYPAL_CLIENT_SECRET'),
    ],

    'billplz' => [
        'key'           => env('BILLPLZ_KEY'),
        'collection_id' => env('BILLPLZ_COLLECTION_ID'),
        'sandbox'       => env('BILLPLZ_SANDBOX', true),
        'x_signature'   => env('BILLPLZ_X_SIGNATURE'),
    ],

    'toyyibpay' => [
        'secret'   => env('TOYYIBPAY_SECRET'),
        'category' => env('TOYYIBPAY_CATEGORY'),
        'sandbox'  => env('TOYYIBPAY_SANDBOX', true),
    ],

    'bank_transfer' => [
        'bank_name'      => env('BANK_NAME', 'Maybank'),
        'account_name'   => env('BANK_ACCOUNT_NAME', 'Modestwear Sdn Bhd'),
        'account_number' => env('BANK_ACCOUNT_NUMBER', '5141-2345-6789'),
    ],

];
