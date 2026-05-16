<?php
namespace App\Models\Accounting;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OfficialReceiptLine extends Model
{
    protected $fillable = [
        'official_receipt_id', 'account_id', 'description', 'amount', 'sort_order',
    ];

    protected $casts = [
        'amount' => 'float',
    ];

    public function officialReceipt(): BelongsTo
    {
        return $this->belongsTo(OfficialReceipt::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
