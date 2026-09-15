<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->index('created_at');
            $table->index(['order_status', 'created_at']);
        });

        Schema::table('order_details', function (Blueprint $table) {
            $table->index('product_id');
            $table->index('order_id');
        });

        Schema::table('system_notifications', function (Blueprint $table) {
            $table->index(['product_id', 'type']);
            $table->index(['read_at', 'created_at']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->index('category_id');
            $table->index('supplier_id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['order_status', 'created_at']);
            $table->dropIndex(['created_at']);
        });

        Schema::table('order_details', function (Blueprint $table) {
            $table->dropIndex(['product_id']);
            $table->dropIndex(['order_id']);
        });

        Schema::table('system_notifications', function (Blueprint $table) {
            $table->dropIndex(['product_id', 'type']);
            $table->dropIndex(['read_at', 'created_at']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['category_id']);
            $table->dropIndex(['supplier_id']);
        });
    }
};