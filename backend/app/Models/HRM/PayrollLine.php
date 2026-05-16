<?php

namespace App\Models\HRM;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollLine extends Model
{
    protected $fillable = [
        'payroll_id', 'line_type',
        'allowance_type_id', 'deduction_type_id',
        'code', 'name', 'amount',
        'calc_type', 'is_taxable', 'is_epf_eligible', 'is_statutory',
        'sort_order',
    ];

    protected $casts = [
        'amount'           => 'float',
        'is_taxable'       => 'boolean',
        'is_epf_eligible'  => 'boolean',
        'is_statutory'     => 'boolean',
    ];

    public function payroll(): BelongsTo
    {
        return $this->belongsTo(Payroll::class);
    }
}
