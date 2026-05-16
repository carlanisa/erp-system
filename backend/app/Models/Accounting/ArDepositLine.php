<?php
namespace App\Models\Accounting;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArDepositLine extends Model
{
    protected $fillable = ['ar_deposit_id', 'account_id', 'description', 'amount', 'sort_order'];
    protected $casts = ['amount' => 'float'];

    public function arDeposit(): BelongsTo { return $this->belongsTo(ArDeposit::class); }
    public function account(): BelongsTo   { return $this->belongsTo(Account::class); }
}
