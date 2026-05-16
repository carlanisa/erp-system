<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('payment_voucher_payments', function (Blueprint $table) {
            $table->foreignId('account_id')->nullable()->after('payee')->constrained('accounts')->nullOnDelete();
            $table->string('voucher_no')->nullable()->after('account_id');
        });
    }

    public function down(): void
    {
        Schema::table('payment_voucher_payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('account_id');
            $table->dropColumn('voucher_no');
        });
    }
};
