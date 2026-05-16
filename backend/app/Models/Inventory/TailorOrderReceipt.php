<?php
namespace App\Models\Inventory;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TailorOrderReceipt extends Model
{
    protected $fillable = [
        'tailor_order_id','date','qty','reference','notes','movement_id','created_by',
    ];
    protected $casts = ['date' => 'date', 'qty' => 'float'];

    public function order(): BelongsTo    { return $this->belongsTo(TailorOrder::class, 'tailor_order_id'); }
    public function movement(): BelongsTo { return $this->belongsTo(StockMovement::class, 'movement_id'); }
    public function createdBy(): BelongsTo{ return $this->belongsTo(User::class, 'created_by'); }
}
