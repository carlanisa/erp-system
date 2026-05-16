<?php
namespace App\Models\Sales;

use App\Models\Accounting\Account;
use App\Models\CRM\Customer;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SaleInvoice extends Model
{
    protected $fillable = [
        'si_number','customer_invoice_no','branch_code','source','date','due_date',
        'posting_date','payment_date','customer_id','walk_in_name','sales_order_id','account_id','bank_account_id',
        'amount','paid_amount','change_amount','bank_charges','discount_total','tax_total',
        'payment_method','payment_reference','cheque_number','reference','description','agent','area',
        'status','storefront_status','is_cancelled','created_by',
        'shipping_zone_id','coupon_id','coupon_code','shipping_total',
        'shipping_address_json','billing_address_json',
    ];

    protected $casts = [
        'date'           => 'date',
        'due_date'       => 'date',
        'posting_date'   => 'date',
        'payment_date'   => 'date',
        'amount'         => 'float',
        'paid_amount'    => 'float',
        'change_amount'  => 'float',
        'bank_charges'   => 'float',
        'discount_total' => 'float',
        'tax_total'      => 'float',
        'shipping_total' => 'float',
        'is_cancelled'   => 'boolean',
        'shipping_address_json' => 'array',
        'billing_address_json'  => 'array',
    ];

    protected $appends = ['payment_status'];

    public function getPaymentStatusAttribute(): string
    {
        if ($this->paid_amount <= 0) return 'unpaid';
        if ($this->paid_amount >= $this->amount) return 'paid';
        return 'partial';
    }

    /** Legacy alias so storefront payment drivers and frontend code that still
     *  reads ->so_number / ?so= keep working. */
    public function getSoNumberAttribute(): string
    {
        return (string) $this->attributes['si_number'];
    }

    public function customer(): BelongsTo    { return $this->belongsTo(Customer::class); }
    public function salesOrder(): BelongsTo  { return $this->belongsTo(SalesOrder::class); }
    public function account(): BelongsTo     { return $this->belongsTo(Account::class); }
    public function bankAccount(): BelongsTo { return $this->belongsTo(Account::class, 'bank_account_id'); }
    public function createdBy(): BelongsTo   { return $this->belongsTo(User::class, 'created_by'); }
    public function lines(): HasMany         { return $this->hasMany(SaleInvoiceLine::class)->orderBy('sort_order'); }
    public function payments(): HasMany      { return $this->hasMany(SaleInvoicePayment::class)->orderBy('payment_date'); }
    public function returns(): HasMany       { return $this->hasMany(SaleReturn::class); }
}
