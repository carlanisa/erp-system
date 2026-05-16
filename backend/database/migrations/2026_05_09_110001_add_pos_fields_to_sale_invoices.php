<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('sale_invoices', function (Blueprint $table) {
            $table->string('walk_in_name')->nullable()->after('customer_id');
            $table->decimal('change_amount', 15, 2)->default(0)->after('paid_amount');
        });
        DB::statement('ALTER TABLE sale_invoices ALTER COLUMN customer_id DROP NOT NULL');

        Schema::table('sale_invoice_payments', function (Blueprint $table) {
            $table->decimal('tendered_amount', 15, 2)->nullable()->after('amount');
        });
    }

    public function down(): void
    {
        Schema::table('sale_invoices', function (Blueprint $table) {
            $table->dropColumn(['walk_in_name', 'change_amount']);
        });
        DB::statement('ALTER TABLE sale_invoices ALTER COLUMN customer_id SET NOT NULL');

        Schema::table('sale_invoice_payments', function (Blueprint $table) {
            $table->dropColumn('tendered_amount');
        });
    }
};
