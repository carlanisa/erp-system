<?php

namespace App\Http\Controllers\Api\Accounting;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Accounting\Invoice;
use App\Models\Accounting\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    use ApiResponse;

    public function store(Request $request, Invoice $invoice): JsonResponse
    {
        if ($invoice->status === 'paid') {
            return $this->error('Invoice is already fully paid', 422);
        }

        $data = $request->validate([
            'date'      => 'required|date',
            'amount'    => 'required|numeric|min:0.01|max:' . $invoice->amount_due,
            'method'    => 'required|in:cash,bank_transfer,cheque,card',
            'reference' => 'nullable|string|max:100',
            'notes'     => 'nullable|string',
        ]);

        $payment = Payment::create([...$data, 'invoice_id' => $invoice->id]);

        if ($invoice->fresh()->amount_due <= 0) {
            $invoice->update(['status' => 'paid']);
        }

        return $this->success($payment, 'Payment recorded', 201);
    }
}
