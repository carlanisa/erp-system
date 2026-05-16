<?php
namespace App\Models\Sales;

use App\Models\Accounting\Account;
use App\Models\CRM\Customer;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SaleReturn extends Model
{
    protected $fillable = [
        'sr_number','branch_code','date','posting_date','customer_id','sale_invoice_id',
        'account_id','bank_account_id','amount','refunded_amount','discount_total','tax_total',
        'settlement_method','reason','reference','description','agent','area',
        'status','is_cancelled','created_by',
    ];

    protected $casts = [
        'date'            => 'date',
        'posting_date'    => 'date',
        'amount'          => 'float',
        'refunded_amount' => 'float',
        'discount_total'  => 'float',
        'tax_total'       => 'float',
        'is_cancelled'    => 'boolean',
    ];

    protected $appends = ['settlement_status'];

    public function getSettlementStatusAttribute(): string
    {
        if ($this->settlement_method === 'credit_note') {
            return 'credited';
        }
        if ($this->refunded_amount <= 0) return 'pending';
        if ($this->refunded_amount >= $this->amount) return 'refunded';
        return 'partial';
    }

    public function customer(): BelongsTo    { return $this->belongsTo(Customer::class); }
    public function saleInvoice(): BelongsTo { return $this->belongsTo(SaleInvoice::class); }
    public function account(): BelongsTo     { return $this->belongsTo(Account::class); }
    public function bankAccount(): BelongsTo { return $this->belongsTo(Account::class, 'bank_account_id'); }
    public function createdBy(): BelongsTo   { return $this->belongsTo(User::class, 'created_by'); }
    public function lines(): HasMany         { return $this->hasMany(SaleReturnLine::class)->orderBy('sort_order'); }
    public function payments(): HasMany      { return $this->hasMany(SaleReturnPayment::class)->orderBy('payment_date'); }
}
