<?php

namespace App\Models\Storefront;

use App\Models\CRM\Customer;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerAddress extends Model
{
    protected $fillable = [
        'customer_id', 'label', 'name', 'phone', 'line1', 'line2',
        'city', 'state_code', 'postcode', 'country',
        'is_default_shipping', 'is_default_billing',
    ];

    protected $casts = [
        'is_default_shipping' => 'boolean',
        'is_default_billing'  => 'boolean',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
