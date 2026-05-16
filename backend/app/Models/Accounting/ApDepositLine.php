<?php
namespace App\Models\Accounting;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApDepositLine extends Model
{
    protected $fillable = ['ap_deposit_id', 'account_id', 'description', 'amount', 'sort_order'];
    protected $casts = ['amount' => 'float'];

    public function apDeposit(): BelongsTo { return $this->belongsTo(ApDeposit::class); }
    public function account(): BelongsTo   { return $this->belongsTo(Account::class); }
}
