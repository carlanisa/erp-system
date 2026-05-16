<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Leads ──
        Schema::create('crm_leads', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('phone', 32)->nullable();
            $t->string('email')->nullable();
            $t->foreignId('source_id')->nullable()->constrained('crm_lead_sources')->nullOnDelete();
            $t->foreignId('stage_id')->nullable()->constrained('crm_pipeline_stages')->nullOnDelete();
            $t->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $t->decimal('expected_value', 14, 2)->default(0);
            $t->date('expected_close_date')->nullable();
            $t->string('status', 16)->default('open');  // open | won | lost
            $t->text('description')->nullable();
            $t->text('notes')->nullable();
            $t->date('last_activity_date')->nullable();
            $t->timestamps();
            $t->index(['status', 'stage_id']);
        });

        // ── Activities (calls, emails, meetings, notes) ──
        Schema::create('crm_activities', function (Blueprint $t) {
            $t->id();
            $t->foreignId('activity_type_id')->nullable()->constrained('crm_activity_types')->nullOnDelete();
            $t->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $t->foreignId('lead_id')->nullable()->constrained('crm_leads')->nullOnDelete();
            $t->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->string('subject');
            $t->text('description')->nullable();
            $t->dateTime('scheduled_at')->nullable();
            $t->dateTime('completed_at')->nullable();
            $t->string('outcome', 32)->nullable(); // completed | rescheduled | no_show | cancelled
            $t->timestamps();
            $t->index(['scheduled_at']);
        });

        // ── Follow-ups (queued reminders generated from rules) ──
        Schema::create('crm_follow_ups', function (Blueprint $t) {
            $t->id();
            $t->foreignId('rule_id')->nullable()->constrained('crm_follow_up_rules')->nullOnDelete();
            $t->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $t->foreignId('lead_id')->nullable()->constrained('crm_leads')->nullOnDelete();
            $t->date('due_date');
            $t->string('channel', 16);
            $t->text('message')->nullable();
            $t->string('status', 16)->default('pending'); // pending | sent | done | snoozed | cancelled
            $t->dateTime('completed_at')->nullable();
            $t->timestamps();
            $t->index(['status', 'due_date']);
        });

        // ── Quotations ──
        Schema::create('crm_quotations', function (Blueprint $t) {
            $t->id();
            $t->string('quote_no', 32)->unique();
            $t->date('date');
            $t->date('valid_until')->nullable();
            $t->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $t->foreignId('lead_id')->nullable()->constrained('crm_leads')->nullOnDelete();
            $t->string('walk_in_name')->nullable();
            $t->decimal('subtotal', 14, 2)->default(0);
            $t->decimal('discount_total', 14, 2)->default(0);
            $t->decimal('tax_total', 14, 2)->default(0);
            $t->decimal('amount', 14, 2)->default(0);
            $t->string('status', 16)->default('draft'); // draft | sent | accepted | rejected | expired
            $t->text('terms')->nullable();
            $t->text('notes')->nullable();
            $t->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
            $t->index(['status', 'date']);
        });
        Schema::create('crm_quotation_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('quotation_id')->constrained('crm_quotations')->cascadeOnDelete();
            $t->string('description');
            $t->decimal('qty', 14, 4)->default(1);
            $t->decimal('unit_price', 14, 2)->default(0);
            $t->decimal('discount_pct', 5, 2)->default(0);
            $t->decimal('tax_pct', 5, 2)->default(0);
            $t->decimal('line_total', 14, 2)->default(0);
            $t->timestamps();
        });

        // ── Customer Invoice ──
        Schema::create('crm_invoices', function (Blueprint $t) {
            $t->id();
            $t->string('invoice_no', 32)->unique();
            $t->date('date');
            $t->date('due_date')->nullable();
            $t->string('branch_code', 16)->default('HQ');
            $t->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $t->string('walk_in_name')->nullable();
            $t->decimal('subtotal', 14, 2)->default(0);
            $t->decimal('discount_total', 14, 2)->default(0);
            $t->decimal('tax_total', 14, 2)->default(0);
            $t->decimal('amount', 14, 2)->default(0);
            $t->decimal('paid_amount', 14, 2)->default(0);
            $t->string('payment_method', 32)->nullable();
            $t->string('reference')->nullable();
            $t->text('notes')->nullable();
            $t->string('status', 16)->default('draft'); // draft | sent | partial | paid | cancelled
            $t->boolean('is_cancelled')->default(false);
            $t->timestamps();
            $t->index(['status', 'date']);
        });
        Schema::create('crm_invoice_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('invoice_id')->constrained('crm_invoices')->cascadeOnDelete();
            $t->string('description');
            $t->decimal('qty', 14, 4)->default(1);
            $t->decimal('unit_price', 14, 2)->default(0);
            $t->decimal('discount_pct', 5, 2)->default(0);
            $t->decimal('tax_pct', 5, 2)->default(0);
            $t->decimal('line_total', 14, 2)->default(0);
            $t->timestamps();
        });

        // ── Payment Installment Plans ──
        Schema::create('crm_installment_plans', function (Blueprint $t) {
            $t->id();
            $t->string('plan_no', 32)->unique();
            $t->foreignId('invoice_id')->nullable()->constrained('crm_invoices')->nullOnDelete();
            $t->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $t->date('start_date');
            $t->decimal('total_amount', 14, 2)->default(0);
            $t->unsignedSmallInteger('installments_count')->default(1);
            $t->decimal('paid_amount', 14, 2)->default(0);
            $t->string('status', 16)->default('active'); // active | completed | defaulted | cancelled
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->index(['status', 'start_date']);
        });
        Schema::create('crm_installment_schedules', function (Blueprint $t) {
            $t->id();
            $t->foreignId('plan_id')->constrained('crm_installment_plans')->cascadeOnDelete();
            $t->unsignedSmallInteger('no');
            $t->date('due_date');
            $t->decimal('amount', 14, 2)->default(0);
            $t->decimal('paid_amount', 14, 2)->default(0);
            $t->date('paid_date')->nullable();
            $t->string('status', 16)->default('pending'); // pending | paid | overdue
            $t->string('reference')->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->index(['status', 'due_date']);
        });

        // ── Marketing Campaigns ──
        Schema::create('crm_campaigns', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('channel', 16); // whatsapp | sms | email
            $t->text('audience_filter')->nullable(); // json segment
            $t->text('message_body');
            $t->dateTime('scheduled_at')->nullable();
            $t->dateTime('started_at')->nullable();
            $t->dateTime('completed_at')->nullable();
            $t->string('status', 16)->default('draft'); // draft | scheduled | running | done | cancelled
            $t->unsignedInteger('total_recipients')->default(0);
            $t->unsignedInteger('sent_count')->default(0);
            $t->unsignedInteger('delivered_count')->default(0);
            $t->unsignedInteger('failed_count')->default(0);
            $t->timestamps();
        });
        Schema::create('crm_campaign_recipients', function (Blueprint $t) {
            $t->id();
            $t->foreignId('campaign_id')->constrained('crm_campaigns')->cascadeOnDelete();
            $t->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $t->string('to_address')->nullable();
            $t->string('status', 16)->default('queued'); // queued | sent | delivered | failed
            $t->dateTime('sent_at')->nullable();
            $t->text('error')->nullable();
            $t->timestamps();
        });

        // ── Loyalty point ledger ──
        Schema::create('crm_loyalty_ledger', function (Blueprint $t) {
            $t->id();
            $t->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $t->date('date');
            $t->string('reason', 64); // earn_invoice | redeem | bonus | birthday | adjust
            $t->integer('points'); // positive earn, negative redeem
            $t->string('reference')->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->index(['customer_id', 'date']);
        });

        // ── Reviews & Feedback ──
        Schema::create('crm_feedback', function (Blueprint $t) {
            $t->id();
            $t->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $t->foreignId('invoice_id')->nullable()->constrained('crm_invoices')->nullOnDelete();
            $t->unsignedTinyInteger('rating')->nullable(); // 1-5
            $t->unsignedTinyInteger('nps_score')->nullable(); // 0-10
            $t->text('comment')->nullable();
            $t->string('source', 32)->default('internal'); // internal | google | facebook | tiktok
            $t->string('tags')->nullable();
            $t->string('status', 16)->default('open'); // open | in_progress | resolved | closed
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_feedback');
        Schema::dropIfExists('crm_loyalty_ledger');
        Schema::dropIfExists('crm_campaign_recipients');
        Schema::dropIfExists('crm_campaigns');
        Schema::dropIfExists('crm_installment_schedules');
        Schema::dropIfExists('crm_installment_plans');
        Schema::dropIfExists('crm_invoice_items');
        Schema::dropIfExists('crm_invoices');
        Schema::dropIfExists('crm_quotation_items');
        Schema::dropIfExists('crm_quotations');
        Schema::dropIfExists('crm_follow_ups');
        Schema::dropIfExists('crm_activities');
        Schema::dropIfExists('crm_leads');
    }
};
