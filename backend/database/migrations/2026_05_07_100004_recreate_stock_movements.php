<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::dropIfExists('stock_movements');

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->string('movement_no')->unique();                              // SM-00001 / SI-00001 / SR-00001 etc
            $table->enum('type', [
                'receipt',          // generic receipt into a warehouse
                'issue',            // generic issue out
                'adjust',           // qty adjustment (no flow)
                'transfer',         // location -> location
                'send_tailor',      // warehouse -> tailor location (issue raw materials)
                'receive_tailor',   // tailor location -> warehouse (receive finished products)
            ]);
            $table->date('date');
            $table->foreignId('from_location_id')->nullable()->constrained('stock_locations')->nullOnDelete();
            $table->foreignId('to_location_id')->nullable()->constrained('stock_locations')->nullOnDelete();
            $table->foreignId('tailor_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();   // for receive_tailor: which finished product
            $table->foreignId('bom_id')->nullable()->constrained('bom_headers')->nullOnDelete();
            $table->decimal('total_qty', 14, 3)->default(0);
            $table->decimal('total_cost', 15, 2)->default(0);
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['draft', 'posted', 'cancelled'])->default('posted');
            $table->boolean('is_cancelled')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();

            $table->index(['type', 'date']);
        });

        Schema::create('stock_movement_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('movement_id')->constrained('stock_movements')->cascadeOnDelete();
            $table->foreignId('stock_item_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('qty', 14, 3);
            $table->string('uom')->nullable();
            $table->decimal('unit_cost', 15, 2)->default(0);
            $table->decimal('total_cost', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movement_lines');
        Schema::dropIfExists('stock_movements');

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained();
            $table->enum('type', ['in', 'out', 'adjustment', 'transfer']);
            $table->decimal('quantity', 12, 3);
            $table->decimal('unit_cost', 15, 2)->default(0);
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });
    }
};
