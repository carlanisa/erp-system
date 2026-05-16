<?php
namespace App\Http\Controllers\Api\Accounting;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Accounting\ApDeposit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ApDepositController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $q = ApDeposit::with(['account','bankAccount','lines.account','payments'])
            ->when($request->search, fn($q,$s) =>
                $q->where('supplier_name','ilike',"%$s%")
                  ->orWhere('deposit_number','ilike',"%$s%")
                  ->orWhere('reference','ilike',"%$s%")
            )
            ->when($request->status,      fn($q,$s) => $q->where('status',$s))
            ->when($request->branch_code, fn($q,$s) => $q->where('branch_code',$s))
            ->when($request->get('cancelled') === 'true',  fn($q) => $q->where('is_cancelled',true))
            ->when($request->get('cancelled') === 'false', fn($q) => $q->where('is_cancelled',false))
            ->orderByDesc('date')->orderByDesc('id');

        $paginated = $q->paginate($request->integer('per_page', 20));

        $total = ApDeposit::where('is_cancelled', false)->sum('amount');

        $data = $this->paginated($paginated);
        $responseData = json_decode($data->getContent(), true);
        $responseData['meta']['grand_total'] = (float) $total;
        return response()->json($responseData);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request, true);

        $dep = DB::transaction(function () use ($data, $request) {
            $data['deposit_number'] = $this->generateNumber();
            $data['branch_code']    = $data['branch_code'] ?? 'HQ';
            $data['created_by']     = $request->user()->id;

            $lines    = $data['lines']    ?? [];
            $payments = $data['payments'] ?? [];
            unset($data['lines'], $data['payments']);

            if (empty($data['account_id']) && !empty($lines)) {
                $data['account_id'] = $lines[0]['account_id'];
            }

            $dep = ApDeposit::create($data);

            foreach ($lines as $i => $line) {
                $dep->lines()->create([
                    'account_id'  => $line['account_id'],
                    'description' => $line['description'] ?? null,
                    'amount'      => $line['amount'],
                    'sort_order'  => $i,
                ]);
            }

            $this->syncPayments($dep, $payments, $request->user()->id);
            return $dep;
        });

        return $this->success($dep->load(['account','bankAccount','lines.account','payments']), 'A/P deposit created', 201);
    }

    public function show(ApDeposit $apDeposit): JsonResponse
    {
        return $this->success($apDeposit->load(['account','bankAccount','lines.account','payments','createdBy']));
    }

    public function update(Request $request, ApDeposit $apDeposit): JsonResponse
    {
        if ($apDeposit->is_cancelled) return $this->error('Cancelled deposit cannot be edited', 422);

        $data = $this->validatePayload($request, false);

        DB::transaction(function () use ($data, $apDeposit, $request) {
            $lines    = $data['lines']    ?? null;
            $payments = array_key_exists('payments', $data) ? $data['payments'] : null;
            unset($data['lines'], $data['payments']);

            if (array_key_exists('account_id', $data) && empty($data['account_id']) && !empty($lines)) {
                $data['account_id'] = $lines[0]['account_id'];
            }

            $apDeposit->update($data);

            if ($lines !== null) {
                $apDeposit->lines()->delete();
                foreach ($lines as $i => $line) {
                    $apDeposit->lines()->create([
                        'account_id'  => $line['account_id'],
                        'description' => $line['description'] ?? null,
                        'amount'      => $line['amount'],
                        'sort_order'  => $i,
                    ]);
                }
            }

            if ($payments !== null) {
                $this->syncPayments($apDeposit, $payments, $request->user()->id);
            }
        });

        return $this->success($apDeposit->fresh(['account','bankAccount','lines.account','payments']), 'Updated');
    }

    public function destroy(ApDeposit $apDeposit): JsonResponse
    {
        $apDeposit->delete();
        return $this->success(null, 'Deleted');
    }

    private function validatePayload(Request $request, bool $isStore): array
    {
        $req = $isStore ? 'required' : 'sometimes';
        return $request->validate([
            'date'           => "$req|date",
            'posting_date'   => 'nullable|date',
            'payment_date'   => 'nullable|date',
            'branch_code'    => 'nullable|string|max:20',
            'supplier_name'  => "$req|string|max:255",
            'account_id'     => 'nullable|exists:accounts,id',
            'bank_account_id'=> 'nullable|exists:accounts,id',
            'amount'         => "$req|numeric|min:0",
            'paid_amount'    => 'nullable|numeric|min:0',
            'payment_method' => "$req|in:cash,cheque,bank_transfer",
            'cheque_number'  => 'nullable|string',
            'reference'      => 'nullable|string',
            'description'    => 'nullable|string',
            'agent'          => 'nullable|string|max:100',
            'area'           => 'nullable|string|max:100',
            'status'         => 'in:pending,applied,refunded',
            'lines'                       => 'nullable|array',
            'lines.*.account_id'          => 'required_with:lines|exists:accounts,id',
            'lines.*.description'         => 'nullable|string',
            'lines.*.amount'              => 'required_with:lines|numeric|min:0',
            'payments'                    => 'nullable|array',
            'payments.*.payment_date'     => 'required_with:payments|date',
            'payments.*.amount'           => 'required_with:payments|numeric|min:0.01',
            'payments.*.supplier_name'    => 'nullable|string|max:255',
            'payments.*.reference'        => 'nullable|string|max:255',
            'payments.*.notes'            => 'nullable|string|max:255',
        ]);
    }

    private function syncPayments(ApDeposit $dep, array $payments, ?int $userId): void
    {
        $dep->payments()->delete();
        foreach ($payments as $p) {
            $dep->payments()->create([
                'supplier_name' => !empty($p['supplier_name']) ? $p['supplier_name'] : $dep->supplier_name,
                'payment_date'  => $p['payment_date'],
                'amount'        => $p['amount'],
                'reference'     => $p['reference'] ?? null,
                'notes'         => $p['notes']     ?? null,
                'created_by'    => $userId,
            ]);
        }
        $sum  = (float) $dep->payments()->sum('amount');
        $last = $dep->payments()->max('payment_date');
        $dep->update(['paid_amount' => $sum, 'payment_date' => $last]);
    }

    private function generateNumber(): string
    {
        $last = ApDeposit::orderByRaw("CAST(SUBSTRING(deposit_number FROM 5) AS INTEGER) DESC")->first();
        $next = $last ? ((int) substr($last->deposit_number, 4)) + 1 : 1;
        $num  = 'APD-' . str_pad($next, 5, '0', STR_PAD_LEFT);
        while (ApDeposit::where('deposit_number', $num)->exists()) { $next++; $num = 'APD-' . str_pad($next, 5, '0', STR_PAD_LEFT); }
        return $num;
    }

    public function pdf(ApDeposit $apDeposit, \App\Services\PdfRenderer $renderer)
    {
        $pdf = $renderer->apDeposit($apDeposit);
        return $pdf->stream("{$apDeposit->deposit_number}.pdf");
    }
}
