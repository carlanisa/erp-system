<?php

namespace App\Models\Projects;

use App\Models\HRM\Employee;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    protected $fillable = [
        'code', 'name', 'description', 'owner_employee_id',
        'start_date', 'end_date', 'status', 'priority',
    ];

    protected $casts = [
        'start_date' => 'date:Y-m-d',
        'end_date'   => 'date:Y-m-d',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'owner_employee_id');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }
}
