<?php
namespace App\Models\Sales;

use App\Models\CRM\Customer;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalesOrder extends Model
{
    protected $fillable = [
        'so_number','customer_po_no','branch_code','date','expected_delivery_date',
        'customer_id','customer_id_storefront','amount','discount_total','tax_total','shipping_total',
        'status','is_cancelled','reference','description','agent','area','created_by',
        'source','storefront_status','payment_method','payment_reference',
        'shipping_zone_id','coupon_id','coupon_code',
        'shipping_address_json','billing_address_json',
    ];

    protected $casts = [
        'date'                   => 'date',
        'expected_delivery_date' => 'date',
        'amount'                 => 'float',
        'discount_total'         => 'float',
        'tax_total'              => 'float',
        'shipping_total'         => 'float',
        'is_cancelled'           => 'boolean',
        'shipping_address_json'  => 'array',
        'billing_address_json'   => 'array',
    ];

    public function customer(): BelongsTo  { return $this->belongsTo(Customer::class); }
    public function createdBy(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function lines(): HasMany       { return $this->hasMany(SalesOrderLine::class)->orderBy('sort_order'); }
    public function invoices(): HasMany    { return $this->hasMany(SaleInvoice::class); }
}
