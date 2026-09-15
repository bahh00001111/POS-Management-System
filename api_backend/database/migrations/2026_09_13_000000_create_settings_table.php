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
        Schema::create('settings', function (Blueprint $table) {
            $table->id('settings_id');
            $table->string('store_name', 255)->nullable();
            $table->string('store_address', 500)->nullable();
            $table->string('store_phone', 50)->nullable();
            $table->float('exchange_rate', 12, 2)->default(4000);
            $table->text('receipt_footer_text')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};