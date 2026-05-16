<?php

namespace App\Models\Projects;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskChecklistItem extends Model
{
    protected $fillable = ['task_id', 'label', 'is_done', 'order'];

    protected $casts = ['is_done' => 'bool'];

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }
}
