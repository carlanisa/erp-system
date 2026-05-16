<?php

namespace App\Services\Payments\Drivers;

use App\Models\Storefront\PaymentMethod;

/**
 * Drivers prefer per-method config saved in the DB (admin-configurable),
 * then fall back to .env / config/services.php values.
 */
trait ReadsDriverConfig
{
    protected function methodConfig(string $driver): array
    {
        $row = PaymentMethod::where('driver', $driver)->where('enabled', true)->first();
        return $row?->config ?? [];
    }

    /** Get a single config value: DB first, env/services.php fallback. */
    protected function cfg(string $driver, string $key, ?string $fallbackKey = null, mixed $fallback = null): mixed
    {
        $cfg = $this->methodConfig($driver);
        if (array_key_exists($key, $cfg) && $cfg[$key] !== '' && $cfg[$key] !== null) {
            return $cfg[$key];
        }
        if ($fallbackKey) {
            $val = config($fallbackKey);
            if ($val !== null && $val !== '') return $val;
        }
        return $fallback;
    }
}
