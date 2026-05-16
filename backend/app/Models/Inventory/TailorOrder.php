<?php
namespace App\Models\Inventory;

use App\Models\User;
use App\Models\Suppliers\PurchaseInvoice;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TailorOrder extends Model
{
    protected $fillable = [
        'order_no','branch_code','date','due_date','tailor_id','product_id','bom_id',
        'from_location_id','to_location_id','order_qty','received_qty','expected_cost',
        'reference','notes','status','is_cancelled','send_movement_id','bill_pi_id','created_by',
    ];
    protected $casts = [
        'date'         => 'date',
        'due_date'     => 'date',
        'order_qty'    => 'float',
        'received_qty' => 'float',
        'expected_cost'=> 'float',
        'is_cancelled' => 'boolean',
    ];

    public function tailor(): BelongsTo       { return $this->belongsTo(Tailor::class); }
    public function product(): BelongsTo      { return $this->belongsTo(Product::class); }
    public function bom(): BelongsTo          { return $this->belongsTo(BomHeader::class, 'bom_id'); }
    public function fromLocation(): BelongsTo { return $this->belongsTo(StockLocation::class, 'from_location_id'); }
    public function toLocation(): BelongsTo   { return $this->belongsTo(StockLocation::class, 'to_location_id'); }
    public function createdBy(): BelongsTo    { return $this->belongsTo(User::class, 'created_by'); }
    public function sendMovement(): BelongsTo { return $this->belongsTo(StockMovement::class, 'send_movement_id'); }
    public function bill(): BelongsTo         { return $this->belongsTo(PurchaseInvoice::class, 'bill_pi_id'); }

    public function lines(): HasMany    { return $this->hasMany(TailorOrderLine::class)->orderBy('sort_order'); }
    public function receipts(): HasMany { return $this->hasMany(TailorOrderReceipt::class)->orderBy('date'); }
}
