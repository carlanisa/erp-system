<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stock_departments', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('manager')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('stock_locations', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->enum('type', ['warehouse', 'tailor', 'store', 'transit'])->default('warehouse');
            $table->text('address')->nullable();
            $table->string('contact_person')->nullable();
            $table->string('phone')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('tailors', function (Blueprint $table) {
            $table->id();
            $table->string('tailor_code')->unique();
            $table->string('name');
            $table->string('contact_person')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('payment_terms')->nullable();
            $table->foreignId('location_id')->nullable()->constrained('stock_locations')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('stock_items', function (Blueprint $table) {
            $table->id();
            $table->string('item_code')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('type', ['fabric', 'accessory', 'raw_material', 'consumable'])->default('fabric');
            $table->foreignId('department_id')->nullable()->constrained('stock_departments')->nullOnDelete();
            $table->string('uom')->default('PCS');                       // METER / YARD / PCS / KG
            $table->string('color')->nullable();
            $table->string('size')->nullable();
            $table->decimal('current_stock', 14, 3)->default(0);
            $table->decimal('reorder_level', 14, 3)->default(0);
            $table->decimal('unit_cost', 15, 2)->default(0);
            $table->enum('costing_method', ['fifo', 'lifo', 'average'])->default('average');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_items');
        Schema::dropIfExists('tailors');
        Schema::dropIfExists('stock_locations');
        Schema::dropIfExists('stock_departments');
    }
};
