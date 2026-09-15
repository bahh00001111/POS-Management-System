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
        Schema::create('order_details', function (Blueprint $table) {
            $table->id('order_detail_id');
        
        // ប្រាប់ Laravel ឱ្យភ្ជាប់ order_id ទៅកាន់ column order_id លើ table orders
        $table->foreignId('order_id')
                ->constrained('orders', 'order_id')
                ->onDelete('cascade');
                
        // ប្រាប់ Laravel ឱ្យភ្ជាប់ product_id ទៅកាន់ column product_id លើ table products
        $table->foreignId('product_id')
                ->constrained('products', 'product_id')
                ->onDelete('cascade');

        $table->integer('quantity');
        $table->decimal('unit_price', 10, 2);
        $table->decimal('subtotal', 10, 2);
        $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_details');
    }
};
