<?php

namespace App\Models\HRM;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveRequest extends Model
{
    protected $fillable = [
        'employee_id', 'leave_type_id',
        'from_date', 'to_date',
        'type', 'reason_category', 'reason',
        'contact_during_leave', 'address_during_leave',
        'handover_person', 'handover_notes',
        'is_emergency', 'source',
        'status', 'admin_notes',
        'approved_at', 'approved_by',
        'email_sent_at', 'employee_replied_at', 'response_notes',
    ];

    protected $casts = [
        'from_date'           => 'date:Y-m-d',
        'to_date'             => 'date:Y-m-d',
        'is_emergency'        => 'boolean',
        'approved_at'         => 'datetime',
        'email_sent_at'       => 'datetime',
        'employee_replied_at' => 'datetime',
    ];

    protected $appends = ['days'];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function leaveType(): BelongsTo
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'approved_by');
    }

    public function getDaysAttribute(): int
    {
        if (!$this->from_date || !$this->to_date) return 0;
        return (int) $this->from_date->diffInDays($this->to_date) + 1;
    }
}
