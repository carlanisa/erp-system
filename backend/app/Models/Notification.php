<?php

namespace App\Models;

use App\Models\HRM\Employee;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    protected $fillable = [
        'employee_id', 'type', 'title', 'body',
        'link', 'channel', 'read_at', 'payload',
    ];

    protected $casts = [
        'payload' => 'array',
        'read_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
