<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('subtotal', 10, 2)->default(0)->after('total_amount');
            $table->string('discount_type')->nullable()->after('subtotal');
            $table->decimal('discount_value', 10, 2)->nullable()->after('discount_type');
            $table->decimal('discount_amount', 10, 2)->default(0)->after('discount_value');
        });

        // អនុញ្ញាតឱ្យ Order Type មាន DELIVERY បន្ថែម
        DB::statement("ALTER TABLE orders MODIFY order_type ENUM('DINE_IN', 'TAKEAWAY', 'DELIVERY') NOT NULL DEFAULT 'TAKEAWAY'");

        Schema::table('order_details', function (Blueprint $table) {
            $table->string('size')->nullable()->after('subtotal');
            $table->string('sugar_level')->nullable()->after('size');
            $table->string('remarks', 500)->nullable()->after('sugar_level');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_details', function (Blueprint $table) {
            $table->dropColumn(['size', 'sugar_level', 'remarks']);
        });

        DB::statement("ALTER TABLE orders MODIFY order_type ENUM('DINE_IN', 'TAKEAWAY') NOT NULL DEFAULT 'TAKEAWAY'");

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['subtotal', 'discount_type', 'discount_value', 'discount_amount']);
        });
    }
};