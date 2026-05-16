<?php
namespace App\Models\Suppliers;

use App\Models\Accounting\Account;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseInvoiceLine extends Model
{
    protected $fillable = [
        'purchase_invoice_id', 'account_id', 'item_code', 'description',
        'color', 'size', 'qty', 'roll_count', 'uom', 'unit_cost', 'discount',
        'amount', 'sort_order',
    ];

    protected $casts = [
        'qty'        => 'float',
        'roll_count' => 'float',
        'unit_cost'  => 'float',
        'discount'   => 'float',
        'amount'     => 'float',
    ];

    public function purchaseInvoice(): BelongsTo { return $this->belongsTo(PurchaseInvoice::class); }
    public function account(): BelongsTo         { return $this->belongsTo(Account::class); }
}
