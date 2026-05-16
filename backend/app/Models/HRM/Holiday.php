<?php

namespace App\Models\HRM;

use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{
    protected $table = 'hrm_holidays';

    protected $fillable = ['date', 'name', 'type', 'notes', 'is_active'];

    protected $casts = [
        'date'      => 'date:Y-m-d',
        'is_active' => 'boolean',
    ];
}
