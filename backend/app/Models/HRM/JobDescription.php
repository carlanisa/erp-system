<?php

namespace App\Models\HRM;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobDescription extends Model
{
    protected $table = 'hrm_job_descriptions';

    protected $fillable = [
        'designation_id', 'title', 'description',
        'responsibilities', 'kpis', 'ai_generated', 'is_active',
    ];

    protected $casts = [
        'responsibilities' => 'array',
        'kpis'             => 'array',
        'ai_generated'     => 'bool',
        'is_active'        => 'bool',
    ];

    public function designation(): BelongsTo
    {
        return $this->belongsTo(Designation::class);
    }
}
