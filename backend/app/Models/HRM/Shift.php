<?php

namespace App\Models\HRM;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shift extends Model
{
    protected $table = 'hrm_shifts';

    protected $fillable = [
        'code', 'name', 'start_time', 'end_time',
        'break_minutes', 'working_days', 'is_active',
    ];

    protected $casts = [
        'working_days'  => 'array',
        'is_active'     => 'boolean',
        'break_minutes' => 'integer',
    ];

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }
}
