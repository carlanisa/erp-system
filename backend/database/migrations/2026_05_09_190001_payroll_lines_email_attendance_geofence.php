<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── Payroll line items (earnings + deductions breakdown) ───
        Schema::create('payroll_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_id')->constrained()->cascadeOnDelete();
            $table->enum('line_type', ['earning', 'deduction']);
            $table->foreignId('allowance_type_id')->nullable()->constrained('hrm_allowance_types')->nullOnDelete();
            $table->foreignId('deduction_type_id')->nullable()->constrained('hrm_deduction_types')->nullOnDelete();
            $table->string('code', 30);                  // e.g. HRA, EPF_E
            $table->string('name', 120);                 // display label
            $table->decimal('amount', 12, 2);
            $table->string('calc_type', 12)->nullable(); // fixed / percent / statutory
            $table->boolean('is_taxable')->default(true);
            $table->boolean('is_epf_eligible')->default(false);
            $table->boolean('is_statutory')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->index(['payroll_id', 'line_type']);
        });

        // ─── Payroll: email tracking ───
        Schema::table('payrolls', function (Blueprint $table) {
            $table->timestamp('email_sent_at')->nullable()->after('paid_date');
            $table->string('email_sent_to')->nullable()->after('email_sent_at');
            $table->string('email_status', 20)->nullable()->after('email_sent_to'); // sent / failed / bounced
        });

        // ─── Leave: employee reply tracking ───
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->timestamp('employee_replied_at')->nullable()->after('email_sent_at');
            $table->text('response_notes')->nullable()->after('employee_replied_at');
        });

        // ─── HRM Office Locations (geofence anchors for mobile attendance) ───
        Schema::create('hrm_office_locations', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('name', 120);
            $table->text('address')->nullable();
            $table->decimal('lat', 10, 7);
            $table->decimal('lng', 10, 7);
            $table->integer('geofence_radius_m')->default(100);   // metres
            $table->string('contact_phone', 50)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // ─── Attendances: location + face match + device ───
        Schema::table('attendances', function (Blueprint $table) {
            $table->foreignId('office_location_id')->nullable()->after('status')->constrained('hrm_office_locations')->nullOnDelete();
            $table->enum('check_in_method', ['manual', 'face', 'biometric', 'self'])->default('manual')->after('office_location_id');
            $table->decimal('check_in_lat', 10, 7)->nullable()->after('check_in_method');
            $table->decimal('check_in_lng', 10, 7)->nullable()->after('check_in_lat');
            $table->decimal('check_out_lat', 10, 7)->nullable()->after('check_in_lng');
            $table->decimal('check_out_lng', 10, 7)->nullable()->after('check_out_lat');
            $table->decimal('face_match_score', 4, 3)->nullable()->after('check_out_lng');  // 0.000 → 1.000
            $table->boolean('within_geofence')->default(true)->after('face_match_score');
            $table->json('device_info')->nullable()->after('within_geofence');
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropForeign(['office_location_id']);
            $table->dropColumn([
                'office_location_id', 'check_in_method',
                'check_in_lat', 'check_in_lng',
                'check_out_lat', 'check_out_lng',
                'face_match_score', 'within_geofence', 'device_info',
            ]);
        });
        Schema::dropIfExists('hrm_office_locations');

        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropColumn(['employee_replied_at', 'response_notes']);
        });
        Schema::table('payrolls', function (Blueprint $table) {
            $table->dropColumn(['email_sent_at', 'email_sent_to', 'email_status']);
        });
        Schema::dropIfExists('payroll_lines');
    }
};
