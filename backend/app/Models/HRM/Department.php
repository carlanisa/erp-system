<?php

namespace App\Models\HRM;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Department extends Model
{
    protected $table = 'hrm_departments';

    protected $fillable = ['code', 'name', 'manager', 'notes', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function designations(): HasMany
    {
        return $this->hasMany(Designation::class);
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }
}
