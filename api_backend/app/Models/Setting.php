<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasFactory;

    // ប្រាប់ Eloquent ថា Primary Key ឈ្មោះ settings_id
    protected $primaryKey = 'settings_id';

    protected $fillable = [
        'store_name',
        'store_address',
        'store_phone',
        'exchange_rate',
        'receipt_footer_text',
        'bakong_account_id',
        'bakong_app_id',
        'merchant_name',
        'merchant_city',
        'merchant_category_code',
        'merchant_currency',
        'telegram_bot_token',
        'telegram_chat_id',
        'telegram_enabled',
        'telegram_notify_orders',
        'telegram_notify_payments',
    ];

    protected $casts = [
        'exchange_rate' => 'float',
        'telegram_enabled' => 'boolean',
        'telegram_notify_orders' => 'boolean',
        'telegram_notify_payments' => 'boolean',
    ];
}