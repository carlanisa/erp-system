<?php
namespace App\Models\Suppliers;

use App\Models\Accounting\Account;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseInvoicePayment extends Model
{
    protected $fillable = [
        'purchase_invoice_id', 'account_id', 'paid_to', 'payment_date',
        'amount', 'reference', 'notes', 'created_by',
    ];
    protected $casts = ['payment_date' => 'date', 'amount' => 'float'];

    public function purchaseInvoice(): BelongsTo { return $this->belongsTo(PurchaseInvoice::class); }
    public function account(): BelongsTo         { return $this->belongsTo(Account::class); }
}
