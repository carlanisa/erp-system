<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('payment_voucher_payments', function (Blueprint $table) {
            $table->string('payee')->nullable()->after('payment_voucher_id');
        });
    }

    public function down(): void
    {
        Schema::table('payment_voucher_payments', function (Blueprint $table) {
            $table->dropColumn('payee');
        });
    }
};
