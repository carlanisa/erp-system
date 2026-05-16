<?php
namespace App\Models\Accounting;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\User;

class OfficialReceipt extends Model
{
    protected $fillable = [
        'or_number','branch_code','date','posting_date','payment_date','received_from',
        'account_id','bank_account_id','amount','paid_amount','payment_method','cheque_number',
        'reference','description','agent','area','status','is_cancelled','created_by',
    ];

    protected $casts = [
        'date'         => 'date',
        'posting_date' => 'date',
        'payment_date' => 'date',
        'amount'       => 'float',
        'paid_amount'  => 'float',
        'is_cancelled' => 'boolean',
    ];

    protected $appends = ['payment_status'];

    public function getPaymentStatusAttribute(): string
    {
        if ($this->paid_amount <= 0) return 'unpaid';
        if ($this->paid_amount >= $this->amount) return 'paid';
        return 'partial';
    }

    public function account(): BelongsTo      { return $this->belongsTo(Account::class); }
    public function bankAccount(): BelongsTo  { return $this->belongsTo(Account::class, 'bank_account_id'); }
    public function createdBy(): BelongsTo    { return $this->belongsTo(User::class, 'created_by'); }
    public function lines(): HasMany          { return $this->hasMany(OfficialReceiptLine::class)->orderBy('sort_order'); }
    public function payments(): HasMany       { return $this->hasMany(OfficialReceiptPayment::class)->orderBy('payment_date'); }
}
