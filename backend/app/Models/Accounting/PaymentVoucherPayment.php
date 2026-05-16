<?php
namespace App\Models\Accounting;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentVoucherPayment extends Model
{
    protected $fillable = [
        'payment_voucher_id', 'payee', 'account_id', 'voucher_no',
        'payment_date', 'amount', 'reference', 'notes', 'created_by',
    ];

    protected $casts = [
        'payment_date' => 'date',
        'amount'       => 'float',
    ];

    public function paymentVoucher(): BelongsTo { return $this->belongsTo(PaymentVoucher::class); }
    public function account(): BelongsTo        { return $this->belongsTo(Account::class); }
}
