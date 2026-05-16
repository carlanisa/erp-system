<?php

namespace App\Models\Storefront;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VoucherOffer extends Model
{
    protected $table = 'storefront_voucher_offers';

    protected $fillable = [
        'rule_id', 'code', 'session_token', 'customer_id',
        'voucher_type', 'value', 'min_subtotal',
        'headline', 'subtext', 'expires_at', 'used_at', 'shown_at', 'trigger',
    ];

    protected $casts = [
        'value'        => 'float',
        'min_subtotal' => 'float',
        'expires_at'   => 'datetime',
        'used_at'      => 'datetime',
        'shown_at'     => 'datetime',
    ];

    public function rule(): BelongsTo { return $this->belongsTo(VoucherRule::class, 'rule_id'); }

    public function isLive(): bool
    {
        return !$this->used_at && $this->expires_at && $this->expires_at->isFuture();
    }
}
