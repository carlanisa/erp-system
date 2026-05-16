<?php
namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockDepartment extends Model
{
    protected $fillable = ['code','name','manager','notes','is_active'];
    protected $casts = ['is_active' => 'boolean'];

    public function stockItems(): HasMany { return $this->hasMany(StockItem::class, 'department_id'); }
    public function products(): HasMany   { return $this->hasMany(Product::class, 'department_id'); }
}
