<?php

namespace App\Models\HRM;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payroll extends Model
{
    protected $fillable = [
        'employee_id', 'month', 'year',
        'basic_salary', 'allowances', 'deductions', 'net_salary',
        'status', 'paid_date',
        'email_sent_at', 'email_sent_to', 'email_status',
    ];

    protected $casts = [
        'basic_salary'  => 'float',
        'allowances'    => 'float',
        'deductions'    => 'float',
        'net_salary'    => 'float',
        'paid_date'     => 'date:Y-m-d',
        'email_sent_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(PayrollLine::class)->orderBy('sort_order')->orderBy('id');
    }

    public function earnings(): HasMany
    {
        return $this->hasMany(PayrollLine::class)->where('line_type', 'earning')->orderBy('sort_order');
    }

    public function deductionLines(): HasMany
    {
        return $this->hasMany(PayrollLine::class)->where('line_type', 'deduction')->orderBy('sort_order');
    }
}
