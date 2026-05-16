<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('payment_voucher_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_voucher_id')->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->constrained();
            $table->text('description')->nullable();
            $table->decimal('amount', 15, 2)->default(0);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Also add bank_charges and posting_date to payment_vouchers
        Schema::table('payment_vouchers', function (Blueprint $table) {
            $table->decimal('bank_charges', 15, 2)->default(0)->after('amount');
            $table->date('posting_date')->nullable()->after('date');
            $table->string('agent')->nullable()->after('description');
            $table->string('area')->nullable()->after('agent');
        });
    }

    public function down(): void {
        Schema::dropIfExists('payment_voucher_lines');
        Schema::table('payment_vouchers', function (Blueprint $table) {
            $table->dropColumn(['bank_charges','posting_date','agent','area']);
        });
    }
};
