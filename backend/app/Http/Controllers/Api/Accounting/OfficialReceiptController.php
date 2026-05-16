<?php
namespace App\Http\Controllers\Api\Accounting;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Accounting\OfficialReceipt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OfficialReceiptController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $q = OfficialReceipt::with(['account','bankAccount','lines.account','payments'])
            ->when($request->search, fn($q,$s) =>
                $q->where('received_from','ilike',"%$s%")
                  ->orWhere('or_number','ilike',"%$s%")
                  ->orWhere('reference','ilike',"%$s%")
            )
            ->when($request->status,      fn($q,$s) => $q->where('status',$s))
            ->when($request->branch_code, fn($q,$s) => $q->where('branch_code',$s))
            ->when($request->get('cancelled') === 'true',  fn($q) => $q->where('is_cancelled',true))
            ->when($request->get('cancelled') === 'false', fn($q) => $q->where('is_cancelled',false))
            ->orderByDesc('date')->orderByDesc('id');

        $paginated = $q->paginate($request->integer('per_page', 20));

        $total = OfficialReceipt::when($request->search, fn($q,$s) =>
                $q->where('received_from','ilike',"%$s%")->orWhere('or_number','ilike',"%$s%"))
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
            'received_from'  => 'required|string|max:255',
            'account_id'     => 'nullable|exists:accounts,id',
            'bank_account_id'=> 'nullable|exists:accounts,id',
            'amount'         => 'required|numeric|min:0',
            'paid_amount'    => 'nullable|numeric|min:0',
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
            'payments'                  => 'nullable|array',
            'payments.*.payment_date'   => 'required_with:payments|date',
            'payments.*.amount'         => 'required_with:payments|numeric|min:0.01',
            'payments.*.received_from'  => 'nullable|string|max:255',
            'payments.*.reference'      => 'nullable|string|max:255',
            'payments.*.notes'          => 'nullable|string|max:255',
        ]);

        $or = DB::transaction(function () use ($data, $request) {
            $data['or_number']   = $this->generateNumber();
            $data['branch_code'] = $data['branch_code'] ?? 'HQ';
            $data['created_by']  = $request->user()->id;

            $lines    = $data['lines']    ?? [];
            $payments = $data['payments'] ?? [];
            unset($data['lines'], $data['payments']);

            // official_receipts.account_id is NOT NULL — default from first line if only lines were sent
            if (empty($data['account_id']) && !empty($lines)) {
                $data['account_id'] = $lines[0]['account_id'];
            }

            $or = OfficialReceipt::create($data);

            foreach ($lines as $i => $line) {
                $or->lines()->create([
                    'account_id'  => $line['account_id'],
                    'description' => $line['description'] ?? null,
                    'amount'      => $line['amount'],
                    'sort_order'  => $i,
                ]);
            }

            $this->syncPayments($or, $payments, $request->user()->id);

            return $or;
        });

        return $this->success($or->load(['account','bankAccount','lines.account','payments']), 'Official receipt created', 201);
    }

    public function show(OfficialReceipt $officialReceipt): JsonResponse
    {
        return $this->success($officialReceipt->load(['account','bankAccount','lines.account','payments','createdBy']));
    }

    public function update(Request $request, OfficialReceipt $officialReceipt): JsonResponse
    {
        if ($officialReceipt->is_cancelled) return $this->error('Cancelled receipt cannot be edited', 422);

        $data = $request->validate([
            'date'           => 'date',
            'posting_date'   => 'nullable|date',
            'payment_date'   => 'nullable|date',
            'branch_code'    => 'nullable|string|max:20',
            'received_from'  => 'string|max:255',
            'account_id'     => 'nullable|exists:accounts,id',
            'bank_account_id'=> 'nullable|exists:accounts,id',
            'amount'         => 'numeric|min:0',
            'paid_amount'    => 'nullable|numeric|min:0',
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
            'payments'                  => 'nullable|array',
            'payments.*.payment_date'   => 'required_with:payments|date',
            'payments.*.amount'         => 'required_with:payments|numeric|min:0.01',
            'payments.*.received_from'  => 'nullable|string|max:255',
            'payments.*.reference'      => 'nullable|string|max:255',
            'payments.*.notes'          => 'nullable|string|max:255',
        ]);

        DB::transaction(function () use ($data, $officialReceipt, $request) {
            $lines    = $data['lines']    ?? null;
            $payments = array_key_exists('payments', $data) ? $data['payments'] : null;
            unset($data['lines'], $data['payments']);

            if (array_key_exists('account_id', $data) && empty($data['account_id']) && !empty($lines)) {
                $data['account_id'] = $lines[0]['account_id'];
            }

            $officialReceipt->update($data);

            if ($lines !== null) {
                $officialReceipt->lines()->delete();
                foreach ($lines as $i => $line) {
                    $officialReceipt->lines()->create([
                        'account_id'  => $line['account_id'],
                        'description' => $line['description'] ?? null,
                        'amount'      => $line['amount'],
                        'sort_order'  => $i,
                    ]);
                }
            }

            if ($payments !== null) {
                $this->syncPayments($officialReceipt, $payments, $request->user()->id);
            }
        });

        return $this->success($officialReceipt->fresh(['account','bankAccount','lines.account','payments']), 'Updated');
    }

    public function destroy(OfficialReceipt $officialReceipt): JsonResponse
    {
        $officialReceipt->delete();
        return $this->success(null, 'Deleted');
    }

    public function cancel(OfficialReceipt $officialReceipt): JsonResponse
    {
        $officialReceipt->update(['is_cancelled' => !$officialReceipt->is_cancelled]);
        $msg = $officialReceipt->is_cancelled ? 'Receipt cancelled' : 'Receipt restored';
        return $this->success($officialReceipt, $msg);
    }

    private function syncPayments(OfficialReceipt $or, array $payments, ?int $userId): void
    {
        $or->payments()->delete();
        foreach ($payments as $p) {
            $or->payments()->create([
                'received_from' => !empty($p['received_from']) ? $p['received_from'] : $or->received_from,
                'payment_date'  => $p['payment_date'],
                'amount'        => $p['amount'],
                'reference'     => $p['reference'] ?? null,
                'notes'         => $p['notes']     ?? null,
                'created_by'    => $userId,
            ]);
        }
        $sum  = (float) $or->payments()->sum('amount');
        $last = $or->payments()->max('payment_date');
        $or->update([
            'paid_amount'  => $sum,
            'payment_date' => $last,
        ]);
    }

    private function generateNumber(): string
    {
        $last = OfficialReceipt::orderByRaw("CAST(SUBSTRING(or_number FROM 4) AS INTEGER) DESC")->first();
        $next = $last ? ((int) substr($last->or_number, 3)) + 1 : 1;
        $num  = 'OR-' . str_pad($next, 5, '0', STR_PAD_LEFT);
        while (OfficialReceipt::where('or_number', $num)->exists()) {
            $next++; $num = 'OR-' . str_pad($next, 5, '0', STR_PAD_LEFT);
        }
        return $num;
    }

    public function pdf(OfficialReceipt $officialReceipt, \App\Services\PdfRenderer $renderer)
    {
        $pdf = $renderer->officialReceipt($officialReceipt);
        return $pdf->stream("{$officialReceipt->or_number}.pdf");
    }
}
