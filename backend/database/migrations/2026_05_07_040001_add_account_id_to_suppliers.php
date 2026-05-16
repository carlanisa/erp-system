<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            // Each supplier gets a sub-ledger account under Accounts Payable.
            // This makes the supplier_code selectable from the A/C Code picker.
            $table->foreignId('account_id')->nullable()->after('supplier_code')->constrained('accounts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropForeign(['account_id']);
            $table->dropColumn('account_id');
        });
    }
};
