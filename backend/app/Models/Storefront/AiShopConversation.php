<?php

namespace App\Models\Storefront;

use App\Models\CRM\Customer;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiShopConversation extends Model
{
    protected $table = 'ai_shop_conversations';

    protected $fillable = [
        'customer_id', 'session_token', 'cart_id',
        'transcript_json', 'last_intent', 'message_count', 'last_message_at',
    ];

    protected $casts = [
        'transcript_json' => 'array',
        'last_message_at' => 'datetime',
    ];

    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
    public function cart(): BelongsTo     { return $this->belongsTo(Cart::class, 'cart_id'); }
}
