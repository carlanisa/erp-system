<?php

namespace App\Models\Projects;

use App\Models\HRM\Employee;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskApproval extends Model
{
    protected $fillable = [
        'task_id', 'requested_by', 'approver_employee_id',
        'status', 'remarks', 'decided_at',
    ];

    protected $casts = ['decided_at' => 'datetime'];

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'requested_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'approver_employee_id');
    }
}
