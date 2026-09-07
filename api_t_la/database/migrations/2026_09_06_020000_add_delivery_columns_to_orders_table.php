<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('delivery_method')->nullable()->after('order_type');
            $table->decimal('delivery_fee', 10, 2)->default(0)->after('delivery_method');
            $table->string('customer_name')->nullable()->after('delivery_fee');
            $table->string('phone_number')->nullable()->after('customer_name');
            $table->text('delivery_address')->nullable()->after('phone_number');
            $table->string('delivery_platform')->nullable()->after('delivery_address');
            $table->string('external_order_id')->nullable()->after('delivery_platform');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'delivery_method',
                'delivery_fee',
                'customer_name',
                'phone_number',
                'delivery_address',
                'delivery_platform',
                'external_order_id',
            ]);
        });
    }
};