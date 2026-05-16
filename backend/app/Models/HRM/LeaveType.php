<?php

namespace App\Models\HRM;

use Illuminate\Database\Eloquent\Model;

class LeaveType extends Model
{
    protected $table = 'hrm_leave_types';

    protected $fillable = [
        'code', 'name', 'days_per_year',
        'is_paid', 'carry_forward', 'color', 'is_active',
    ];

    protected $casts = [
        'is_paid'       => 'boolean',
        'carry_forward' => 'boolean',
        'is_active'     => 'boolean',
        'days_per_year' => 'integer',
    ];
}
