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
        Schema::table('khqr_transactions', function (Blueprint $table) {
            $table->string('md5', 32)->nullable()->index()->after('payload');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('khqr_transactions', function (Blueprint $table) {
            $table->dropColumn('md5');
        });
    }
};