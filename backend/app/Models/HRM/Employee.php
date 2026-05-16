<?php

namespace App\Models\HRM;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Employee extends Model
{
    protected $fillable = [
        'employee_code', 'name', 'email', 'phone',
        'department', 'designation',
        'department_id', 'designation_id', 'shift_id',
        'join_date', 'basic_salary', 'status', 'address', 'cnic',
        'epf_no', 'socso_no', 'tax_no',
        'ic_type', 'ic_passport_no',
        'bank_name', 'bank_account_name', 'bank_account_no',
        'location', 'gender', 'dob', 'image_path',
    ];

    protected $casts = [
        'join_date'    => 'date:Y-m-d',
        'dob'          => 'date:Y-m-d',
        'basic_salary' => 'float',
    ];

    protected $appends = ['image_url'];

    public function getImageUrlAttribute(): ?string
    {
        if (!$this->image_path) return null;
        return asset('storage/' . ltrim($this->image_path, '/'));
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function payrolls(): HasMany
    {
        return $this->hasMany(Payroll::class);
    }

    public function dept(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

    public function desig(): BelongsTo
    {
        return $this->belongsTo(Designation::class, 'designation_id');
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    public function assignedTasks(): HasMany
    {
        return $this->hasMany(\App\Models\Projects\Task::class, 'assigned_to');
    }

    public function preferences()
    {
        return $this->hasOne(EmployeePreference::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(\App\Models\Notification::class)->latest();
    }
}
