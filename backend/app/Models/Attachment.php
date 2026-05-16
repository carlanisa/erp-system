<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Attachment extends Model
{
    protected $fillable = [
        'attachable_type', 'attachable_id', 'original_filename',
        'stored_path', 'mime_type', 'size_bytes', 'label', 'uploaded_by',
    ];

    protected $casts = [
        'size_bytes' => 'integer',
    ];

    public function attachable(): MorphTo  { return $this->morphTo(); }
    public function uploadedBy(): BelongsTo { return $this->belongsTo(User::class, 'uploaded_by'); }
}
