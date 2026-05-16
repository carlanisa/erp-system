<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Rules engine config — admin tunes triggers, types, values, caps
        Schema::create('storefront_voucher_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            // Trigger that fires this rule:
            //   threshold_near  = subtotal between threshold_min and free-shipping bar
            //   idle_in_cart    = customer idle in cart > idle_seconds
            //   exit_intent     = cursor leaves viewport top
            //   add_to_cart_first = first item added in a session
            //   ai_concierge    = explicitly granted by the AI
            $table->enum('trigger', ['threshold_near', 'idle_in_cart', 'exit_intent', 'add_to_cart_first', 'ai_concierge']);
            // What kind of voucher to forge:
            $table->enum('voucher_type', ['free_shipping', 'percent', 'fixed']);
            $table->decimal('value', 10, 2)->default(0); // percent or fixed RM
            $table->decimal('min_subtotal', 10, 2)->default(0);
            $table->integer('valid_minutes')->default(20);
            $table->integer('max_per_session')->default(1);
            $table->integer('idle_seconds')->nullable();      // for idle_in_cart
            $table->decimal('threshold_min', 10, 2)->nullable(); // for threshold_near
            $table->string('headline')->nullable();           // shown to customer in the offer
            $table->string('subtext')->nullable();
            $table->boolean('active')->default(true);
            $table->integer('priority')->default(100);
            $table->timestamps();
            $table->index(['trigger', 'active', 'priority']);
        });

        // Issued vouchers (one-off codes tied to a session)
        Schema::create('storefront_voucher_offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rule_id')->nullable()->constrained('storefront_voucher_rules')->nullOnDelete();
            $table->string('code', 60)->unique();
            $table->string('session_token', 64)->index();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->enum('voucher_type', ['free_shipping', 'percent', 'fixed']);
            $table->decimal('value', 10, 2)->default(0);
            $table->decimal('min_subtotal', 10, 2)->default(0);
            $table->string('headline')->nullable();
            $table->string('subtext')->nullable();
            $table->timestamp('expires_at')->index();
            $table->timestamp('used_at')->nullable();
            $table->timestamp('shown_at')->nullable();
            $table->string('trigger', 30)->nullable();
            $table->timestamps();
        });

        // Behavior signals — feed the intervention engine
        Schema::create('storefront_cart_signals', function (Blueprint $table) {
            $table->id();
            $table->string('session_token', 64)->index();
            $table->foreignId('cart_id')->nullable()->constrained('storefront_carts')->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            // added | removed | qty_changed | idle | exit_intent | scroll_checkout | hover_checkout | abandoned
            $table->string('event', 30);
            $table->json('payload')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storefront_cart_signals');
        Schema::dropIfExists('storefront_voucher_offers');
        Schema::dropIfExists('storefront_voucher_rules');
    }
};
