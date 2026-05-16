<?php

namespace App\Models\CRM;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InstallmentPlan extends Model
{
    protected $table = 'crm_installment_plans';
    protected $fillable = [
        'plan_no','invoice_id','customer_id','start_date','total_amount',
        'installments_count','paid_amount','status','notes',
    ];
    protected $casts = [
        'start_date' => 'date',
        'total_amount' => 'float',
        'paid_amount' => 'float',
        'installments_count' => 'integer',
    ];
    protected $appends = ['outstanding','paid_installments'];

    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
    public function invoice(): BelongsTo  { return $this->belongsTo(CrmInvoice::class, 'invoice_id'); }
    public function schedules(): HasMany  { return $this->hasMany(InstallmentSchedule::class, 'plan_id')->orderBy('no'); }

    public function getOutstandingAttribute(): float
    {
        return (float) max(0, $this->total_amount - $this->paid_amount);
    }
    public function getPaidInstallmentsAttribute(): int
    {
        return (int) $this->schedules()->where('status', 'paid')->count();
    }
}
