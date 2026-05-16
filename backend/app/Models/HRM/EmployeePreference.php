<?php

namespace App\Models\HRM;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeePreference extends Model
{
    protected $fillable = [
        'employee_id', 'preferred_language', 'push_token',
        'email_notifications', 'push_notifications',
    ];

    protected $casts = [
        'email_notifications' => 'bool',
        'push_notifications'  => 'bool',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
