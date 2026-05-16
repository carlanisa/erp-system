<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('order_pick_mismatches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('marketplace_order_id')->constrained('marketplace_orders')->cascadeOnDelete();
            $table->string('expected_sku', 120)->nullable();
            $table->string('scanned_sku', 120);
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index('marketplace_order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_pick_mismatches');
    }
};
