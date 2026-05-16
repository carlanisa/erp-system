<?php

namespace App\Models\CRM;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InstallmentSchedule extends Model
{
    protected $table = 'crm_installment_schedules';
    protected $fillable = [
        'plan_id','no','due_date','amount','paid_amount','paid_date',
        'status','reference','notes',
    ];
    protected $casts = [
        'due_date'    => 'date',
        'paid_date'   => 'date',
        'amount'      => 'float',
        'paid_amount' => 'float',
        'no'          => 'integer',
    ];

    public function plan(): BelongsTo { return $this->belongsTo(InstallmentPlan::class, 'plan_id'); }
}
