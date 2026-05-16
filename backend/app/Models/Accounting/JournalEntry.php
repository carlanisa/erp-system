<?php

namespace App\Models\Accounting;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JournalEntry extends Model
{
    protected $fillable = ['number', 'date', 'description', 'reference', 'status', 'created_by'];

    protected $casts = ['date' => 'date'];

    public function lines(): HasMany
    {
        return $this->hasMany(JournalLine::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getTotalDebitAttribute(): float
    {
        return (float) $this->lines()->where('type', 'debit')->sum('amount');
    }

    public function getTotalCreditAttribute(): float
    {
        return (float) $this->lines()->where('type', 'credit')->sum('amount');
    }

    public function isBalanced(): bool
    {
        return abs($this->total_debit - $this->total_credit) < 0.01;
    }
}
