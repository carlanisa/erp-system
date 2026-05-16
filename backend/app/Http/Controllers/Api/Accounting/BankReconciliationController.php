<?php
namespace App\Http\Controllers\Api\Accounting;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Accounting\BankReconciliation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BankReconciliationController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $q = BankReconciliation::with('account')
            ->when($request->account_id, fn($q,$v) => $q->where('account_id',$v))
            ->when($request->year,       fn($q,$v) => $q->where('year',$v))
            ->when($request->status,     fn($q,$v) => $q->where('status',$v))
            ->orderByDesc('year')->orderByDesc('month');
        return $this->paginated($q->paginate($request->integer('per_page',20)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'account_id'        => 'required|exists:accounts,id',
            'month'             => 'required|integer|min:1|max:12',
            'year'              => 'required|integer|min:2000|max:2099',
            'statement_balance' => 'required|numeric',
            'book_balance'      => 'required|numeric',
            'adjusted_balance'  => 'required|numeric',
            'notes'             => 'nullable|string',
            'status'            => 'in:open,reconciled',
        ]);
        $data['created_by'] = $request->user()->id;

        // Check uniqueness
        $exists = BankReconciliation::where('account_id',$data['account_id'])
            ->where('month',$data['month'])->where('year',$data['year'])->exists();
        if ($exists) return $this->error('Reconciliation already exists for this account/month/year', 422);

        $rec = BankReconciliation::create($data);
        return $this->success($rec->load('account'), 'Reconciliation created', 201);
    }

    public function show(BankReconciliation $bankReconciliation): JsonResponse
    {
        return $this->success($bankReconciliation->load(['account','createdBy']));
    }

    public function update(Request $request, BankReconciliation $bankReconciliation): JsonResponse
    {
        $data = $request->validate([
            'statement_balance' => 'numeric',
            'book_balance'      => 'numeric',
            'adjusted_balance'  => 'numeric',
            'notes'             => 'nullable|string',
            'status'            => 'in:open,reconciled',
        ]);
        $bankReconciliation->update($data);
        return $this->success($bankReconciliation->load('account'), 'Updated');
    }

    public function destroy(BankReconciliation $bankReconciliation): JsonResponse
    {
        if ($bankReconciliation->status === 'reconciled') {
            return $this->error('Cannot delete a reconciled record', 422);
        }
        $bankReconciliation->delete();
        return $this->success(null, 'Deleted');
    }
}
