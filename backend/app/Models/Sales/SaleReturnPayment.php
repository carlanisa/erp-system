<?php
namespace App\Models\Sales;

use App\Models\Accounting\Account;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleReturnPayment extends Model
{
    protected $fillable = [
        'sale_return_id','account_id','refunded_to','payment_date',
        'amount','payment_method','reference','notes','created_by',
    ];

    protected $casts = ['payment_date' => 'date', 'amount' => 'float'];

    public function saleReturn(): BelongsTo { return $this->belongsTo(SaleReturn::class); }
    public function account(): BelongsTo    { return $this->belongsTo(Account::class); }
    public function createdBy(): BelongsTo  { return $this->belongsTo(User::class, 'created_by'); }
}
