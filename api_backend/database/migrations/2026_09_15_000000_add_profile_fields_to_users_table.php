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
        Schema::table('users', function (Blueprint $table) {
            $table->string('email')->nullable()->unique()->after('full_name');
            $table->string('phone', 20)->nullable()->after('email');
            $table->string('pin_code')->nullable()->after('phone');
            $table->string('avatar')->nullable()->after('pin_code');
            $table->timestamp('last_login_at')->nullable()->after('is_professional');
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropColumn(['email', 'phone', 'pin_code', 'avatar', 'last_login_at']);
        });
    }
};