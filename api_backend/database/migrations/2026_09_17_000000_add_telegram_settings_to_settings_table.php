<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add Telegram bot notification settings to the settings table.
     */
    public function up(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->string('telegram_bot_token', 255)->nullable();
            $table->string('telegram_chat_id', 100)->nullable();
            $table->boolean('telegram_enabled')->default(true);
            $table->boolean('telegram_notify_orders')->default(true);
            $table->boolean('telegram_notify_payments')->default(true);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn([
                'telegram_bot_token',
                'telegram_chat_id',
                'telegram_enabled',
                'telegram_notify_orders',
                'telegram_notify_payments',
            ]);
        });
    }
};