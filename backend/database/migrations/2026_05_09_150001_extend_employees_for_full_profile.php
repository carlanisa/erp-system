<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            // Statutory / govt
            $table->string('epf_no', 50)->nullable()->after('cnic');
            $table->string('socso_no', 50)->nullable()->after('epf_no');
            $table->string('tax_no', 50)->nullable()->after('socso_no');

            // ID document
            $table->enum('ic_type', ['ic', 'passport'])->nullable()->after('tax_no');
            $table->string('ic_passport_no', 50)->nullable()->after('ic_type');

            // Bank
            $table->string('bank_name', 100)->nullable()->after('ic_passport_no');
            $table->string('bank_account_name', 150)->nullable()->after('bank_name');
            $table->string('bank_account_no', 50)->nullable()->after('bank_account_name');

            // Personal / location
            $table->string('location', 120)->nullable()->after('bank_account_no');
            $table->enum('gender', ['male', 'female', 'other'])->nullable()->after('location');
            $table->date('dob')->nullable()->after('gender');

            // Photo
            $table->string('image_path')->nullable()->after('dob');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn([
                'epf_no', 'socso_no', 'tax_no',
                'ic_type', 'ic_passport_no',
                'bank_name', 'bank_account_name', 'bank_account_no',
                'location', 'gender', 'dob', 'image_path',
            ]);
        });
    }
};
