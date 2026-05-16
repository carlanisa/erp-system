<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->foreignId('leave_type_id')->nullable()->after('type')->constrained('hrm_leave_types')->nullOnDelete();
            $table->string('reason_category', 60)->nullable()->after('leave_type_id');
            $table->string('contact_during_leave', 50)->nullable()->after('reason');
            $table->text('address_during_leave')->nullable()->after('contact_during_leave');
            $table->string('handover_person', 120)->nullable()->after('address_during_leave');
            $table->text('handover_notes')->nullable()->after('handover_person');
            $table->boolean('is_emergency')->default(false)->after('handover_notes');
            $table->enum('source', ['admin', 'employee', 'public'])->default('admin')->after('is_emergency');
            $table->timestamp('approved_at')->nullable()->after('admin_notes');
            $table->foreignId('approved_by')->nullable()->after('approved_at')->constrained('users')->nullOnDelete();
            $table->timestamp('email_sent_at')->nullable()->after('approved_by');
        });
    }

    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropForeign(['leave_type_id']);
            $table->dropForeign(['approved_by']);
            $table->dropColumn([
                'leave_type_id', 'reason_category',
                'contact_during_leave', 'address_during_leave',
                'handover_person', 'handover_notes',
                'is_emergency', 'source',
                'approved_at', 'approved_by', 'email_sent_at',
            ]);
        });
    }
};
