<?php
namespace App\Models\Accounting;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApDepositPayment extends Model
{
    protected $fillable = ['ap_deposit_id', 'supplier_name', 'payment_date', 'amount', 'reference', 'notes', 'created_by'];
    protected $casts = ['payment_date' => 'date', 'amount' => 'float'];

    public function apDeposit(): BelongsTo { return $this->belongsTo(ApDeposit::class); }
}
