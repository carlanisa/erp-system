<?php

namespace App\Models\Projects;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskAttachment extends Model
{
    protected $fillable = ['task_id', 'uploaded_by', 'file_path', 'file_type', 'size', 'caption'];

    protected $appends = ['file_url'];

    public function getFileUrlAttribute(): ?string
    {
        if (!$this->file_path) return null;
        return asset('storage/' . ltrim($this->file_path, '/'));
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }
}
