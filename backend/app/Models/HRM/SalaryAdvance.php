<?php

namespace App\Models\HRM;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalaryAdvance extends Model
{
    protected $table = 'hrm_salary_advances';

    protected $fillable = [
        'employee_id', 'advance_date', 'amount',
        'installments', 'monthly_deduction', 'paid_amount',
        'status', 'reason', 'notes',
        'approved_by', 'approved_at',
    ];

    protected $casts = [
        'advance_date'      => 'date:Y-m-d',
        'amount'            => 'float',
        'monthly_deduction' => 'float',
        'paid_amount'       => 'float',
        'installments'      => 'integer',
        'approved_at'       => 'datetime',
    ];

    protected $appends = ['outstanding'];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'approved_by');
    }

    public function getOutstandingAttribute(): float
    {
        return max(0.0, (float) $this->amount - (float) $this->paid_amount);
    }
}
