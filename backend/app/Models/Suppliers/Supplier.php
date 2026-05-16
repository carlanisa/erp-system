<?php
namespace App\Models\Suppliers;

use App\Models\Accounting\Account;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Supplier extends Model
{
    protected $fillable = [
        'supplier_code', 'account_id', 'name', 'contact_person', 'email', 'phone', 'mobile',
        'address', 'city', 'country', 'tax_number', 'payment_terms',
        'opening_balance', 'credit_limit', 'bank_name', 'bank_account_number',
        'notes', 'is_active',
    ];

    protected $casts = [
        'opening_balance' => 'float',
        'credit_limit'    => 'float',
        'is_active'       => 'boolean',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
