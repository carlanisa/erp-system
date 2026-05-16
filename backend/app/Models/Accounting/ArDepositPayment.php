<?php
namespace App\Models\Accounting;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArDepositPayment extends Model
{
    protected $fillable = ['ar_deposit_id', 'received_from', 'payment_date', 'amount', 'reference', 'notes', 'created_by'];
    protected $casts = ['payment_date' => 'date', 'amount' => 'float'];

    public function arDeposit(): BelongsTo { return $this->belongsTo(ArDeposit::class); }
}
