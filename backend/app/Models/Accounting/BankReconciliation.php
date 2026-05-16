<?php
namespace App\Models\Accounting;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;

class BankReconciliation extends Model
{
    protected $fillable = [
        'account_id','month','year','statement_balance','book_balance','adjusted_balance','notes','status','created_by',
    ];
    protected $casts = ['statement_balance'=>'float','book_balance'=>'float','adjusted_balance'=>'float'];

    public function account(): BelongsTo   { return $this->belongsTo(Account::class); }
    public function createdBy(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
}
