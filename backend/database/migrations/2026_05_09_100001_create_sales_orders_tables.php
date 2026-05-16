<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sales_orders', function (Blueprint $table) {
            $table->id();
            $table->string('so_number')->unique();                 // SO-00001
            $table->string('customer_po_no')->nullable();          // customer's PO reference
            $table->string('branch_code', 20)->default('HQ');
            $table->date('date');
            $table->date('expected_delivery_date')->nullable();
            $table->foreignId('customer_id')->constrained('customers');
            $table->decimal('amount', 15, 2)->default(0);
            $table->decimal('discount_total', 15, 2)->default(0);
            $table->decimal('tax_total', 15, 2)->default(0);
            $table->string('status')->default('draft');            // draft | confirmed | partially_invoiced | fully_invoiced | cancelled
            $table->boolean('is_cancelled')->default(false);
            $table->string('reference')->nullable();
            $table->text('description')->nullable();
            $table->string('agent')->nullable();
            $table->string('area')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
            $table->index(['date', 'branch_code']);
            $table->index('status');
        });

        Schema::create('sales_order_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_order_id')->constrained('sales_orders')->cascadeOnDelete();
            $table->foreignId('account_id')->nullable()->constrained('accounts');
            $table->string('item_code')->nullable();               // Product / ProductVariant SKU
            $table->string('description')->nullable();
            $table->string('color')->nullable();
            $table->string('size')->nullable();
            $table->decimal('qty', 15, 3)->default(1);
            $table->decimal('qty_invoiced', 15, 3)->default(0);    // running counter for partial invoicing
            $table->string('uom', 20)->default('UNIT');
            $table->decimal('unit_price', 15, 4)->default(0);
            $table->decimal('discount', 15, 2)->default(0);
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('amount', 15, 2);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->index(['sales_order_id', 'sort_order']);
            $table->index('item_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_order_lines');
        Schema::dropIfExists('sales_orders');
    }
};
