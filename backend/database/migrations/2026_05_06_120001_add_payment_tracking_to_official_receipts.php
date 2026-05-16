<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('official_receipts', function (Blueprint $table) {
            $table->decimal('paid_amount', 15, 2)->default(0)->after('amount');
            $table->date('payment_date')->nullable()->after('date');
            $table->string('agent')->nullable()->after('description');
            $table->string('area')->nullable()->after('agent');
            $table->date('posting_date')->nullable()->after('date');
        });
    }

    public function down(): void
    {
        Schema::table('official_receipts', function (Blueprint $table) {
            $table->dropColumn(['paid_amount', 'payment_date', 'agent', 'area', 'posting_date']);
        });
    }
};
