<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShopifyImportSetting extends Model
{
    protected $table = 'shopify_import_settings';

    protected $fillable = [
        'shop_domain', 'access_token', 'match_strategy', 'only_missing_images',
        'last_synced_at', 'last_shopify_count', 'last_imported_count',
    ];

    protected $casts = [
        'only_missing_images' => 'boolean',
        'last_synced_at'      => 'datetime',
    ];

    protected $hidden = ['access_token'];

    public static function current(): self
    {
        return self::first() ?? self::create([]);
    }

    /** Normalised shop hostname (strips https://, trailing slash). */
    public function shopHost(): ?string
    {
        if (!$this->shop_domain) return null;
        $h = preg_replace('#^https?://#i', '', trim($this->shop_domain));
        return rtrim($h, '/');
    }

    /** Display value with token masked. */
    public function maskedToken(): ?string
    {
        if (!$this->access_token) return null;
        return substr($this->access_token, 0, 8) . '…' . substr($this->access_token, -4);
    }
}
