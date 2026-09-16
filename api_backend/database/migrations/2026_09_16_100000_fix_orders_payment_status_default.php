<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Fix the orders.payment_status DB default: a new order must NOT be
     * silently marked PAID. Only a confirmed payment may set it to PAID.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE orders MODIFY payment_status ENUM('UNPAID', 'PAID') NOT NULL DEFAULT 'UNPAID'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE orders MODIFY payment_status ENUM('UNPAID', 'PAID') NOT NULL DEFAULT 'PAID'");
    }
};