<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Audit log for every email sent from the system —
        // records who sent what to whom, with which attachments, and the SMTP response.
        Schema::create('email_sends', function (Blueprint $table) {
            $table->id();
            $table->morphs('related');                          // related_type + related_id (PI, PV, etc.)
            $table->text('to_addresses');                       // comma-separated
            $table->text('cc_addresses')->nullable();
            $table->text('bcc_addresses')->nullable();
            $table->string('subject');
            $table->text('body')->nullable();
            $table->json('attachment_ids')->nullable();         // ids of Attachment rows included
            $table->string('status')->default('queued');        // queued | sent | failed
            $table->text('error_message')->nullable();
            $table->foreignId('sent_by')->nullable()->constrained('users');
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_sends');
    }
};
