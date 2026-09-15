<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Link each KHQR transaction to the order it is paying for so that
     * payment confirmation (real webhook or mock) can mark the order PAID.
     */
    public function up(): void
    {
        Schema::table('khqr_transactions', function (Blueprint $table) {
            $table->unsignedBigInteger('order_id')->nullable()->after('reference');

            $table->foreign('order_id')
                ->references('order_id')
                ->on('orders')
                ->nullOnDelete();

            $table->index('order_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('khqr_transactions', function (Blueprint $table) {
            $table->dropForeign(['order_id']);
            $table->dropIndex(['order_id']);
            $table->dropColumn('order_id');
        });
    }
};