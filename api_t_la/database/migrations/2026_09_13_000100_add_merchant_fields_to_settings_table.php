<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->string('bakong_account_id', 100)->nullable();
            $table->string('bakong_app_id', 100)->nullable();
            $table->string('merchant_name', 255)->nullable();
            $table->string('merchant_city', 100)->nullable();
            $table->string('merchant_category_code', 4)->default('5812');
            $table->string('merchant_currency', 3)->default('KHR');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn([
                'bakong_account_id',
                'bakong_app_id',
                'merchant_name',
                'merchant_city',
                'merchant_category_code',
                'merchant_currency',
            ]);
        });
    }
};