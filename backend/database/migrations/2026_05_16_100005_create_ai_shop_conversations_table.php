<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ai_shop_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('session_token', 64)->index();
            $table->foreignId('cart_id')->nullable()->constrained('storefront_carts')->nullOnDelete();
            $table->json('transcript_json')->nullable();
            $table->string('last_intent')->nullable();
            $table->integer('message_count')->default(0);
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_shop_conversations');
    }
};
