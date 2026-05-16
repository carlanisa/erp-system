<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('payment_vouchers', function (Blueprint $table) {
            $table->decimal('paid_amount', 15, 2)->default(0)->after('amount');
            $table->date('payment_date')->nullable()->after('posting_date');
        });
    }

    public function down(): void
    {
        Schema::table('payment_vouchers', function (Blueprint $table) {
            $table->dropColumn(['paid_amount', 'payment_date']);
        });
    }
};
