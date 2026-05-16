<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'role', 'company', 'is_active',
        'two_factor_secret', 'two_factor_enabled', 'two_factor_confirmed_at',
    ];

    protected $hidden = ['password', 'remember_token', 'two_factor_secret'];

    protected function casts(): array
    {
        return [
            'email_verified_at'        => 'datetime',
            'password'                 => 'hashed',
            'is_active'                => 'boolean',
            'two_factor_enabled'       => 'boolean',
            'two_factor_secret'        => 'encrypted',
            'two_factor_confirmed_at'  => 'datetime',
        ];
    }
}
