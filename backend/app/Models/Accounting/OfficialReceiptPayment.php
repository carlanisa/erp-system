<?php
namespace App\Models\Accounting;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OfficialReceiptPayment extends Model
{
    protected $fillable = [
        'official_receipt_id', 'received_from', 'payment_date', 'amount', 'reference', 'notes', 'created_by',
    ];

    protected $casts = [
        'payment_date' => 'date',
        'amount'       => 'float',
    ];

    public function officialReceipt(): BelongsTo
    {
        return $this->belongsTo(OfficialReceipt::class);
    }
}
