<?php
namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Tailor extends Model
{
    protected $fillable = [
        'tailor_code','name','contact_person','phone','email','address',
        'payment_terms','location_id','supplier_id','notes','is_active',
    ];
    protected $casts = ['is_active' => 'boolean'];

    public function location(): BelongsTo { return $this->belongsTo(StockLocation::class, 'location_id'); }
    public function supplier(): BelongsTo { return $this->belongsTo(\App\Models\Suppliers\Supplier::class, 'supplier_id'); }
}
