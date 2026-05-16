<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Each installment is tagged with the supplier's GL account code (e.g. SUP-0001)
        // so the General Ledger / Cash Book Listing can show "PV → Suharto Contractor (SUP-0001)" per date.
        Schema::table('purchase_invoice_payments', function (Blueprint $table) {
            $table->foreignId('account_id')->nullable()->after('paid_to')->constrained('accounts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('purchase_invoice_payments', function (Blueprint $table) {
            $table->dropForeign(['account_id']);
            $table->dropColumn('account_id');
        });
    }
};
