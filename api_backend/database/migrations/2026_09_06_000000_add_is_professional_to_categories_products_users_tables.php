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
        Schema::table('categories', function (Blueprint $table) {
            $table->boolean('is_professional')->default(false);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->boolean('is_professional')->default(false);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_professional')->default(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn('is_professional');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('is_professional');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_professional');
        });
    }
};