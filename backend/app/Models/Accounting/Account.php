<?php

namespace App\Models\Accounting;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Account extends Model
{
    protected $fillable = ['code', 'name', 'type', 'parent_id', 'description', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Account::class, 'parent_id')->orderBy('code');
    }

    public function journalLines(): HasMany
    {
        return $this->hasMany(JournalLine::class);
    }

    public function getBalanceAttribute(): float
    {
        $debits  = $this->journalLines()->where('type', 'debit')->sum('amount');
        $credits = $this->journalLines()->where('type', 'credit')->sum('amount');

        return in_array($this->type, ['asset', 'expense'])
            ? $debits - $credits
            : $credits - $debits;
    }
}
