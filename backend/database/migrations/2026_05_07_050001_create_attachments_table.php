<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Polymorphic attachments table — any model can have files attached.
        // Used by Purchase Invoices (External Document tab) for audit-ready scans.
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->morphs('attachable');                          // attachable_type + attachable_id
            $table->string('original_filename');
            $table->string('stored_path');                         // e.g. attachments/2026/05/abc.pdf
            $table->string('mime_type', 100)->nullable();
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->string('label')->nullable();                   // user-given label like "Original invoice scan"
            $table->foreignId('uploaded_by')->nullable()->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};
