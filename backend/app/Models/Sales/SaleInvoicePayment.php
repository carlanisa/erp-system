<?php
namespace App\Models\Sales;

use App\Models\Accounting\Account;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleInvoicePayment extends Model
{
    protected $fillable = [
        'sale_invoice_id','account_id','received_from','payment_date',
        'amount','tendered_amount','payment_method','reference','notes','created_by',
    ];

    protected $casts = [
        'payment_date'    => 'date',
        'amount'          => 'float',
        'tendered_amount' => 'float',
    ];

    public function saleInvoice(): BelongsTo { return $this->belongsTo(SaleInvoice::class); }
    public function account(): BelongsTo     { return $this->belongsTo(Account::class); }
    public function createdBy(): BelongsTo   { return $this->belongsTo(User::class, 'created_by'); }
}
