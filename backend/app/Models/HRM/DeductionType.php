<?php

namespace App\Models\HRM;

use Illuminate\Database\Eloquent\Model;

class DeductionType extends Model
{
    protected $table = 'hrm_deduction_types';

    protected $fillable = [
        'code', 'name', 'calc_type',
        'default_amount', 'default_percent',
        'is_statutory', 'color', 'is_active',
    ];

    protected $casts = [
        'default_amount'  => 'float',
        'default_percent' => 'float',
        'is_statutory'    => 'boolean',
        'is_active'       => 'boolean',
    ];
}
