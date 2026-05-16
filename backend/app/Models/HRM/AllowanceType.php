<?php

namespace App\Models\HRM;

use Illuminate\Database\Eloquent\Model;

class AllowanceType extends Model
{
    protected $table = 'hrm_allowance_types';

    protected $fillable = [
        'code', 'name', 'calc_type',
        'default_amount', 'default_percent',
        'is_taxable', 'is_epf_eligible',
        'color', 'is_active',
    ];

    protected $casts = [
        'default_amount'  => 'float',
        'default_percent' => 'float',
        'is_taxable'      => 'boolean',
        'is_epf_eligible' => 'boolean',
        'is_active'       => 'boolean',
    ];
}
