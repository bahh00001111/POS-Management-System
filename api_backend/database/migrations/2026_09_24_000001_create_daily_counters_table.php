<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-day atomic order counters.
     *
     * OrderController::nextDailySequences() reserves a queue + invoice
     * sequence number from this table inside its DB transaction (FOR UPDATE),
     * which makes daily numbering unique even when several cashiers create
     * orders at the exact same time. A COUNT()-based queue number could hand
     * out duplicates under concurrency; a counter row cannot.
     */
    public function up(): void
    {
        Schema::create('daily_counters', function (Blueprint $table) {
            $table->date('counter_date')->primary();
            $table->unsignedBigInteger('queue_number')->default(0);
            $table->unsignedBigInteger('invoice_number')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_counters');
    }
};