<?php
namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductLocation extends Model
{
    protected $fillable = ['product_id', 'stock_location_id', 'qty'];
    protected $casts    = ['qty' => 'float'];

    public function product(): BelongsTo  { return $this->belongsTo(Product::class); }
    public function location(): BelongsTo { return $this->belongsTo(StockLocation::class, 'stock_location_id'); }
}
