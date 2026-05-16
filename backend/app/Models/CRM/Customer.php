<?php

namespace App\Models\CRM;

use App\Models\Accounting\Invoice;
use App\Models\Storefront\CustomerAddress;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Customer extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name', 'email', 'phone', 'address', 'city', 'country',
        'tax_number', 'credit_limit', 'notes', 'is_active',
        'password', 'email_verified_at', 'phone_verified_at',
        'remember_token', 'marketing_opt_in', 'default_state_code',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected $casts = [
        'credit_limit'       => 'float',
        'is_active'          => 'boolean',
        'marketing_opt_in'   => 'boolean',
        'email_verified_at'  => 'datetime',
        'phone_verified_at'  => 'datetime',
        'password'           => 'hashed',
    ];

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(CustomerAddress::class);
    }

    public function getBalanceAttribute(): float
    {
        return (float) $this->invoices()
            ->whereIn('status', ['sent', 'overdue'])
            ->sum('total');
    }
}
