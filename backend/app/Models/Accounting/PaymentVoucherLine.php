<?php
namespace App\Models\Accounting;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentVoucherLine extends Model
{
    protected $fillable = [
        'payment_voucher_id', 'account_id', 'description', 'amount', 'sort_order',
    ];

    protected $casts = ['amount' => 'float'];

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function paymentVoucher(): BelongsTo
    {
        return $this->belongsTo(PaymentVoucher::class);
    }
}
