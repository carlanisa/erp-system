<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('marketplace_returns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('marketplace_order_id')->constrained('marketplace_orders')->cascadeOnDelete();
            $table->string('status', 32)->default('requested'); // requested|received|refunded|rejected
            $table->string('reason')->nullable();
            $table->string('condition', 16)->nullable(); // saleable|damaged
            $table->decimal('refund_amount', 15, 2)->default(0);
            $table->boolean('restocked')->default(false);
            $table->text('notes')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_returns');
    }
};
