<?php
namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;

class StockLocation extends Model
{
    protected $fillable = ['code','name','type','address','contact_person','phone','is_active'];
    protected $casts = ['is_active' => 'boolean'];
}
