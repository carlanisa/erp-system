<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_lead_sources', function (Blueprint $t) {
            $t->id();
            $t->string('code', 32)->unique();
            $t->string('name');
            $t->string('color', 32)->default('blue');
            $t->boolean('is_active')->default(true);
            $t->unsignedSmallInteger('sort_order')->default(0);
            $t->timestamps();
        });

        Schema::create('crm_pipeline_stages', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('color', 32)->default('blue');
            $t->decimal('win_probability', 5, 2)->default(0);
            $t->unsignedSmallInteger('sort_order')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('crm_customer_groups', function (Blueprint $t) {
            $t->id();
            $t->string('code', 32)->unique();
            $t->string('name');
            $t->string('color', 32)->default('indigo');
            $t->decimal('default_discount_pct', 5, 2)->default(0);
            $t->unsignedSmallInteger('credit_days')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('crm_loyalty_tiers', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->decimal('threshold_amount', 14, 2)->default(0);
            $t->decimal('points_multiplier', 5, 2)->default(1);
            $t->string('color', 32)->default('amber');
            $t->text('perks')->nullable();
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('crm_activity_types', function (Blueprint $t) {
            $t->id();
            $t->string('code', 32)->unique();
            $t->string('name');
            $t->string('color', 32)->default('cyan');
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('crm_follow_up_rules', function (Blueprint $t) {
            $t->id();
            $t->string('title');
            $t->string('trigger', 64);
            $t->integer('days_offset')->default(0);
            $t->string('channel', 16)->default('whatsapp');
            $t->text('template')->nullable();
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('crm_message_templates', function (Blueprint $t) {
            $t->id();
            $t->string('code', 64)->unique();
            $t->string('name');
            $t->string('channel', 16)->default('whatsapp');
            $t->text('body');
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        // Extend customers with FK to group + tier (nullable)
        Schema::table('customers', function (Blueprint $t) {
            $t->foreignId('group_id')->nullable()->after('country')->constrained('crm_customer_groups')->nullOnDelete();
            $t->foreignId('loyalty_tier_id')->nullable()->after('group_id')->constrained('crm_loyalty_tiers')->nullOnDelete();
            $t->date('birthday')->nullable()->after('loyalty_tier_id');
            $t->date('anniversary')->nullable()->after('birthday');
            $t->integer('loyalty_points')->default(0)->after('anniversary');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $t) {
            $t->dropConstrainedForeignId('group_id');
            $t->dropConstrainedForeignId('loyalty_tier_id');
            $t->dropColumn(['birthday', 'anniversary', 'loyalty_points']);
        });
        Schema::dropIfExists('crm_message_templates');
        Schema::dropIfExists('crm_follow_up_rules');
        Schema::dropIfExists('crm_activity_types');
        Schema::dropIfExists('crm_loyalty_tiers');
        Schema::dropIfExists('crm_customer_groups');
        Schema::dropIfExists('crm_pipeline_stages');
        Schema::dropIfExists('crm_lead_sources');
    }
};
