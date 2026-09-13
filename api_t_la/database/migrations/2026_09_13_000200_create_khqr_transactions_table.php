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
        Schema::create('khqr_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 50)->unique();
            $table->decimal('amount', 12, 2)->default(0);
            $table->string('currency', 3)->default('KHR');
            $table->string('status', 20)->default('PENDING');
            $table->text('payload')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('khqr_transactions');
    }
};