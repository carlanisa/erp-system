<?php

namespace App\Models\Projects;

use App\Models\HRM\Employee;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Task extends Model
{
    protected $fillable = [
        'project_id', 'parent_task_id', 'assigned_to', 'assigned_by',
        'title', 'description', 'priority', 'status',
        'due_date', 'completed_at', 'recurrence', 'source', 'source_jd_id',
    ];

    protected $casts = [
        'due_date'     => 'date:Y-m-d',
        'completed_at' => 'datetime',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'parent_task_id');
    }

    public function subTasks(): HasMany
    {
        return $this->hasMany(Task::class, 'parent_task_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'assigned_to');
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'assigned_by');
    }

    public function checklist(): HasMany
    {
        return $this->hasMany(TaskChecklistItem::class)->orderBy('order');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(TaskAttachment::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(TaskComment::class)->latest();
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(TaskApproval::class)->latest();
    }
}
