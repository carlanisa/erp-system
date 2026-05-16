<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class EmailSend extends Model
{
    protected $fillable = [
        'related_type', 'related_id', 'to_addresses', 'cc_addresses', 'bcc_addresses',
        'subject', 'body', 'attachment_ids', 'status', 'error_message',
        'sent_by', 'sent_at',
    ];

    protected $casts = [
        'attachment_ids' => 'array',
        'sent_at'        => 'datetime',
    ];

    public function related(): MorphTo  { return $this->morphTo(); }
    public function sentBy(): BelongsTo { return $this->belongsTo(User::class, 'sent_by'); }
}
