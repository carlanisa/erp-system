<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('ar_deposits', function (Blueprint $table) {
            $table->date('posting_date')->nullable()->after('date');
            $table->date('payment_date')->nullable()->after('posting_date');
            $table->decimal('paid_amount', 15, 2)->default(0)->after('amount');
            $table->string('branch_code', 20)->default('HQ')->after('deposit_number');
            $table->string('cheque_number')->nullable()->after('payment_method');
            $table->string('agent')->nullable()->after('description');
            $table->string('area')->nullable()->after('agent');
            $table->boolean('is_cancelled')->default(false)->after('status');
            $table->foreignId('account_id')->nullable()->after('customer_id')->constrained('accounts');
        });

        Schema::create('ar_deposit_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ar_deposit_id')->constrained('ar_deposits')->cascadeOnDelete();
            $table->foreignId('account_id')->constrained('accounts');
            $table->string('description')->nullable();
            $table->decimal('amount', 15, 2);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->index(['ar_deposit_id', 'sort_order']);
        });

        Schema::create('ar_deposit_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ar_deposit_id')->constrained('ar_deposits')->cascadeOnDelete();
            $table->string('received_from')->nullable();
            $table->date('payment_date');
            $table->decimal('amount', 15, 2);
            $table->string('reference')->nullable();
            $table->string('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->index(['ar_deposit_id', 'payment_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ar_deposit_payments');
        Schema::dropIfExists('ar_deposit_lines');
        Schema::table('ar_deposits', function (Blueprint $table) {
            $table->dropForeign(['account_id']);
            $table->dropColumn(['posting_date','payment_date','paid_amount','branch_code','cheque_number','agent','area','is_cancelled','account_id']);
        });
    }
};
