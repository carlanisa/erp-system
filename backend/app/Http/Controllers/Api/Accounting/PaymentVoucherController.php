<?php
namespace App\Http\Controllers\Api\Accounting;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Accounting\PaymentVoucher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentVoucherController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $q = PaymentVoucher::with(['account','bankAccount','lines.account','payments'])
            ->when($request->search, fn($q,$s) =>
                $q->where('payee','ilike',"%$s%")
                  ->orWhere('pv_number','ilike',"%$s%")
                  ->orWhere('reference','ilike',"%$s%")
            )
            ->when($request->status,      fn($q,$s) => $q->where('status',$s))
            ->when($request->branch_code, fn($q,$s) => $q->where('branch_code',$s))
            ->when($request->get('cancelled') === 'true',  fn($q) => $q->where('is_cancelled',true))
            ->when($request->get('cancelled') === 'false', fn($q) => $q->where('is_cancelled',false))
            ->orderByDesc('date')->orderByDesc('id');

        $paginated = $q->paginate($request->integer('per_page', 20));

        $total = PaymentVoucher::when($request->search, fn($q,$s) =>
                $q->where('payee','ilike',"%$s%")->orWhere('pv_number','ilike',"%$s%"))
            ->when($request->status, fn($q,$s) => $q->where('status',$s))
            ->where('is_cancelled', false)
            ->sum('amount');

        $data = $this->paginated($paginated);
        $responseData = json_decode($data->getContent(), true);
        $responseData['meta']['grand_total'] = (float) $total;
        return response()->json($responseData);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date'           => 'required|date',
            'posting_date'   => 'nullable|date',
            'payment_date'   => 'nullable|date',
            'branch_code'    => 'nullable|string|max:20',
            'payee'          => 'required|string|max:255',
            'account_id'     => 'nullable|exists:accounts,id',
            'bank_account_id'=> 'nullable|exists:accounts,id',
            'amount'         => 'required|numeric|min:0',
            'paid_amount'    => 'nullable|numeric|min:0',
            'bank_charges'   => 'nullable|numeric|min:0',
            'payment_method' => 'required|in:cash,cheque,bank_transfer',
            'cheque_number'  => 'nullable|string',
            'reference'      => 'nullable|string',
            'description'    => 'nullable|string',
            'agent'          => 'nullable|string|max:100',
            'area'           => 'nullable|string|max:100',
            'status'         => 'in:draft,posted',
            'lines'          => 'nullable|array',
            'lines.*.account_id'  => 'required_with:lines|exists:accounts,id',
            'lines.*.description' => 'nullable|string',
            'lines.*.amount'      => 'required_with:lines|numeric|min:0',
            'payments'              => 'nullable|array',
            'payments.*.payment_date' => 'required_with:payments|date',
            'payments.*.amount'       => 'required_with:payments|numeric|min:0.01',
            'payments.*.payee'        => 'nullable|string|max:255',
            'payments.*.account_id'   => 'nullable|exists:accounts,id',
            'payments.*.voucher_no'   => 'nullable|string|max:100',
            'payments.*.reference'    => 'nullable|string|max:255',
            'payments.*.notes'        => 'nullable|string|max:255',
        ]);

        $pv = DB::transaction(function () use ($data, $request) {
            $data['pv_number']    = $this->generateNumber();
            $data['branch_code']  = $data['branch_code'] ?? 'HQ';
            $data['created_by']   = $request->user()->id;
            $data['bank_charges'] = $data['bank_charges'] ?? 0;

            $lines    = $data['lines']    ?? [];
            $payments = $data['payments'] ?? [];
            unset($data['lines'], $data['payments']);

            // payment_vouchers.account_id is NOT NULL — default from first line when client only sends lines
            if (empty($data['account_id']) && !empty($lines)) {
                $data['account_id'] = $lines[0]['account_id'];
            }

            $pv = PaymentVoucher::create($data);

            foreach ($lines as $i => $line) {
                $pv->lines()->create([
                    'account_id'  => $line['account_id'],
                    'description' => $line['description'] ?? null,
                    'amount'      => $line['amount'],
                    'sort_order'  => $i,
                ]);
            }

            $this->syncPayments($pv, $payments, $request->user()->id);

            return $pv;
        });

        return $this->success($pv->load(['account','bankAccount','lines.account','payments']), 'Payment voucher created', 201);
    }

    public function show(PaymentVoucher $paymentVoucher): JsonResponse
    {
        return $this->success($paymentVoucher->load(['account','bankAccount','lines.account','payments','createdBy']));
    }

    public function update(Request $request, PaymentVoucher $paymentVoucher): JsonResponse
    {
        if ($paymentVoucher->is_cancelled) return $this->error('Cancelled voucher cannot be edited', 422);

        $data = $request->validate([
            'date'           => 'date',
            'posting_date'   => 'nullable|date',
            'payment_date'   => 'nullable|date',
            'branch_code'    => 'nullable|string|max:20',
            'payee'          => 'string|max:255',
            'account_id'     => 'nullable|exists:accounts,id',
            'bank_account_id'=> 'nullable|exists:accounts,id',
            'amount'         => 'numeric|min:0',
            'paid_amount'    => 'nullable|numeric|min:0',
            'bank_charges'   => 'nullable|numeric|min:0',
            'payment_method' => 'in:cash,cheque,bank_transfer',
            'cheque_number'  => 'nullable|string',
            'reference'      => 'nullable|string',
            'description'    => 'nullable|string',
            'agent'          => 'nullable|string|max:100',
            'area'           => 'nullable|string|max:100',
            'status'         => 'in:draft,posted,cancelled',
            'lines'          => 'nullable|array',
            'lines.*.account_id'  => 'required_with:lines|exists:accounts,id',
            'lines.*.description' => 'nullable|string',
            'lines.*.amount'      => 'required_with:lines|numeric|min:0',
            'payments'              => 'nullable|array',
            'payments.*.payment_date' => 'required_with:payments|date',
            'payments.*.amount'       => 'required_with:payments|numeric|min:0.01',
            'payments.*.payee'        => 'nullable|string|max:255',
            'payments.*.account_id'   => 'nullable|exists:accounts,id',
            'payments.*.voucher_no'   => 'nullable|string|max:100',
            'payments.*.reference'    => 'nullable|string|max:255',
            'payments.*.notes'        => 'nullable|string|max:255',
        ]);

        DB::transaction(function () use ($data, $paymentVoucher, $request) {
            $lines    = $data['lines']    ?? null;
            $payments = array_key_exists('payments', $data) ? $data['payments'] : null;
            unset($data['lines'], $data['payments']);

            // Mirror store(): keep account_id non-null using first line if caller omitted it
            if (array_key_exists('account_id', $data) && empty($data['account_id']) && !empty($lines)) {
                $data['account_id'] = $lines[0]['account_id'];
            }

            $paymentVoucher->update($data);

            if ($lines !== null) {
                $paymentVoucher->lines()->delete();
                foreach ($lines as $i => $line) {
                    $paymentVoucher->lines()->create([
                        'account_id'  => $line['account_id'],
                        'description' => $line['description'] ?? null,
                        'amount'      => $line['amount'],
                        'sort_order'  => $i,
                    ]);
                }
            }

            if ($payments !== null) {
                $this->syncPayments($paymentVoucher, $payments, $request->user()->id);
            }
        });

        return $this->success($paymentVoucher->fresh(['account','bankAccount','lines.account','payments']), 'Updated');
    }

    /**
     * Replace all payment installments on a voucher with the given list, then
     * recompute and persist paid_amount (sum of all payments) and payment_date
     * (latest payment_date) on the parent voucher.
     */
    private function syncPayments(PaymentVoucher $pv, array $payments, ?int $userId): void
    {
        $pv->payments()->delete();
        foreach ($payments as $p) {
            $pv->payments()->create([
                'payee'        => !empty($p['payee']) ? $p['payee'] : $pv->payee,  // default to voucher payee
                'account_id'   => !empty($p['account_id']) ? $p['account_id'] : $pv->bank_account_id,  // default to PV header bank
                'voucher_no'   => $p['voucher_no'] ?? null,
                'payment_date' => $p['payment_date'],
                'amount'       => $p['amount'],
                'reference'    => $p['reference'] ?? null,
                'notes'        => $p['notes']     ?? null,
                'created_by'   => $userId,
            ]);
        }
        $sum  = (float) $pv->payments()->sum('amount');
        $last = $pv->payments()->max('payment_date');
        $pv->update([
            'paid_amount'  => $sum,
            'payment_date' => $last,
        ]);
    }

    public function destroy(PaymentVoucher $paymentVoucher): JsonResponse
    {
        $paymentVoucher->delete();
        return $this->success(null, 'Deleted');
    }

    public function pdf(PaymentVoucher $paymentVoucher, \App\Services\PdfRenderer $renderer)
    {
        $pdf = $renderer->paymentVoucher($paymentVoucher);
        return $pdf->stream("{$paymentVoucher->pv_number}.pdf");
    }

    public function cancel(PaymentVoucher $paymentVoucher): JsonResponse
    {
        $paymentVoucher->update(['is_cancelled' => !$paymentVoucher->is_cancelled]);
        $msg = $paymentVoucher->is_cancelled ? 'Voucher cancelled' : 'Voucher restored';
        return $this->success($paymentVoucher, $msg);
    }

    private function generateNumber(): string
    {
        $last = PaymentVoucher::orderByRaw("CAST(SUBSTRING(pv_number FROM 4) AS INTEGER) DESC")->first();
        $next = $last ? ((int) substr($last->pv_number, 3)) + 1 : 1;
        $num  = 'PV-' . str_pad($next, 5, '0', STR_PAD_LEFT);
        while (PaymentVoucher::where('pv_number', $num)->exists()) {
            $next++; $num = 'PV-' . str_pad($next, 5, '0', STR_PAD_LEFT);
        }
        return $num;
    }
}
