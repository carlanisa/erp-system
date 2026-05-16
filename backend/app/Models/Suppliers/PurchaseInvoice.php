<?php
namespace App\Models\Suppliers;

use App\Models\Accounting\Account;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseInvoice extends Model
{
    protected $fillable = [
        'pi_number','supplier_invoice_no','branch_code','date','due_date','posting_date','payment_date',
        'supplier_id','account_id','bank_account_id','amount','paid_amount','bank_charges',
        'payment_method','cheque_number','reference','description','agent','area',
        'status','is_cancelled','created_by',
    ];

    protected $casts = [
        'date'         => 'date',
        'due_date'     => 'date',
        'posting_date' => 'date',
        'payment_date' => 'date',
        'amount'       => 'float',
        'paid_amount'  => 'float',
        'bank_charges' => 'float',
        'is_cancelled' => 'boolean',
    ];

    protected $appends = ['payment_status'];

    public function getPaymentStatusAttribute(): string
    {
        if ($this->paid_amount <= 0) return 'unpaid';
        if ($this->paid_amount >= $this->amount) return 'paid';
        return 'partial';
    }

    public function supplier(): BelongsTo    { return $this->belongsTo(Supplier::class); }
    public function account(): BelongsTo     { return $this->belongsTo(Account::class); }
    public function bankAccount(): BelongsTo { return $this->belongsTo(Account::class, 'bank_account_id'); }
    public function createdBy(): BelongsTo   { return $this->belongsTo(User::class, 'created_by'); }
    public function lines(): HasMany         { return $this->hasMany(PurchaseInvoiceLine::class)->orderBy('sort_order'); }
    public function payments(): HasMany      { return $this->hasMany(PurchaseInvoicePayment::class)->orderBy('payment_date'); }
}
