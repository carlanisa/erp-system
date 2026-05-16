<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Header — one production order per tailor + product + batch
        Schema::create('tailor_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_no')->unique();                   // TO-00001
            $table->string('branch_code', 20)->default('HQ');
            $table->date('date');
            $table->date('due_date')->nullable();
            $table->foreignId('tailor_id')->constrained();
            $table->foreignId('product_id')->constrained();
            $table->foreignId('bom_id')->nullable()->constrained('bom_headers')->nullOnDelete();
            $table->foreignId('from_location_id')->nullable()->constrained('stock_locations')->nullOnDelete();   // warehouse fabric leaves from
            $table->foreignId('to_location_id')->nullable()->constrained('stock_locations')->nullOnDelete();     // warehouse finished goods come into
            $table->decimal('order_qty', 14, 3);                    // how many units we asked for
            $table->decimal('received_qty', 14, 3)->default(0);     // running total received (sum of receipts)
            $table->decimal('expected_cost', 15, 2)->default(0);    // BOM × order_qty
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', [
                'draft','fabric_issued','partial_received','received','billed','cancelled'
            ])->default('draft');
            $table->boolean('is_cancelled')->default(false);
            $table->foreignId('send_movement_id')->nullable()->constrained('stock_movements')->nullOnDelete(); // the issued fabric movement
            $table->foreignId('bill_pi_id')->nullable()->constrained('purchase_invoices')->nullOnDelete();     // generated tailor bill
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();

            $table->index(['status','date']);
        });

        // Fabric send lines (snapshot of materials sent — initially copied from BOM × order_qty)
        Schema::create('tailor_order_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tailor_order_id')->constrained()->cascadeOnDelete();
            $table->enum('kind', ['material','tailor_service','overhead'])->default('material');
            $table->foreignId('stock_item_id')->nullable()->constrained()->nullOnDelete();
            $table->string('service_name')->nullable();             // for non-material lines
            $table->decimal('qty', 14, 3);
            $table->string('uom')->nullable();
            $table->decimal('unit_cost', 15, 2)->default(0);
            $table->decimal('total_cost', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Receipt installments (each time tailor returns some finished products)
        Schema::create('tailor_order_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tailor_order_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->decimal('qty', 14, 3);                          // pieces received this round
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('movement_id')->nullable()->constrained('stock_movements')->nullOnDelete(); // the receive_tailor movement created
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
        });

        // Add tailor_order_id back-ref on stock_movements for audit
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->foreignId('tailor_order_id')->nullable()->after('bom_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('tailor_order_id');
        });
        Schema::dropIfExists('tailor_order_receipts');
        Schema::dropIfExists('tailor_order_lines');
        Schema::dropIfExists('tailor_orders');
    }
};
