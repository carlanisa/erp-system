<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('marketplace_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('channel_id')->constrained('marketplace_channels');
            $table->string('external_order_id', 64);
            $table->string('external_order_sn', 64)->nullable();
            $table->string('buyer_name')->nullable();
            $table->string('buyer_phone', 40)->nullable();
            $table->json('ship_address')->nullable();
            $table->string('status', 32)->default('pending_payment'); // pending_payment|paid|to_ship|shipped|delivered|return_requested|returned|refunded|cancelled
            $table->string('payment_status', 32)->nullable();
            $table->string('currency', 8)->default('MYR');
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('shipping_fee', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->string('awb_no', 80)->nullable();
            $table->string('courier', 80)->nullable();
            $table->string('awb_pdf_path', 255)->nullable();
            $table->date('ship_by_date')->nullable();
            $table->decimal('weight_kg', 8, 3)->nullable();
            $table->json('raw_payload')->nullable();
            $table->timestamp('placed_at')->nullable();
            $table->timestamp('packed_at')->nullable();
            $table->foreignId('packed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['channel_id', 'external_order_id']);
            $table->index('status');
            $table->index('awb_no');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_orders');
    }
};
