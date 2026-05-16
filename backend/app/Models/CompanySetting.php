<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanySetting extends Model
{
    protected $table = 'company_settings';

    protected $guarded = [];

    protected $casts = [
        'accounting'    => 'array',
        'system'        => 'array',
        'notifications' => 'array',
        'security'      => 'array',
    ];

    public static function current(): self
    {
        $row = static::find(1);
        if ($row) return $row;

        return static::create([
            'id'           => 1,
            'company_name' => 'My Company',
            'accounting'   => self::defaultAccounting(),
            'system'       => self::defaultSystem(),
            'notifications'=> self::defaultNotifications(),
            'security'     => self::defaultSecurity(),
        ]);
    }

    public static function defaultAccounting(): array
    {
        return [
            'currency'           => 'MYR',
            'currency_symbol'    => 'RM',
            'fiscal_year_start'  => '01',
            'tax_rate'           => '6',
            'default_branch'     => 'HQ',
            'invoice_prefix'     => 'INV',
            'pv_prefix'          => 'PV',
            'or_prefix'          => 'OR',
            'je_prefix'          => 'JE',
            'payment_terms'      => '30',
            'decimal_places'     => '2',
        ];
    }

    public static function defaultSystem(): array
    {
        return [
            'language'       => 'en',
            'timezone'       => 'Asia/Kuala_Lumpur',
            'date_format'    => 'DD MMM YYYY',
            'time_format'    => '12h',
            'theme'          => 'light',
            'items_per_page' => '20',
        ];
    }

    public static function defaultNotifications(): array
    {
        return [
            'invoice_due'      => true,
            'payment_received' => true,
            'low_stock'        => true,
            'payroll_due'      => true,
            'leave_request'    => true,
            'email_notify'     => true,
            'system_notify'    => true,
        ];
    }

    public static function defaultSecurity(): array
    {
        return [
            'session_timeout_minutes' => 30,
            'password_min_length'     => 8,
            'require_2fa_for_admins'  => false,
        ];
    }
}
