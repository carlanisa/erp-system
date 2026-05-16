<?php
namespace App\Http\Controllers\Api\Suppliers;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Accounting\Account;
use App\Models\Suppliers\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupplierController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $q = Supplier::with('account')
            ->when($request->search, fn($q,$s) =>
                $q->where('name','ilike',"%$s%")
                  ->orWhere('supplier_code','ilike',"%$s%")
                  ->orWhere('email','ilike',"%$s%")
                  ->orWhere('phone','ilike',"%$s%")
                  ->orWhere('contact_person','ilike',"%$s%")
            )
            ->when($request->get('is_active') !== null,
                fn($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name');

        return $this->paginated($q->paginate($request->integer('per_page', 50)));
    }

    public function flat(): JsonResponse
    {
        return $this->success(
            Supplier::with('account')
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id','supplier_code','account_id','name','contact_person','email','phone','mobile','address','city','country','tax_number','payment_terms'])
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'supplier_code'    => 'nullable|string|max:50|unique:suppliers,supplier_code',
            'name'             => 'required|string|max:255',
            'contact_person'   => 'nullable|string|max:255',
            'email'            => 'nullable|email|max:255',
            'phone'            => 'nullable|string|max:50',
            'mobile'           => 'nullable|string|max:50',
            'address'          => 'nullable|string',
            'city'             => 'nullable|string|max:100',
            'country'          => 'nullable|string|max:100',
            'tax_number'       => 'nullable|string|max:50',
            'payment_terms'    => 'nullable|string|max:100',
            'opening_balance'  => 'nullable|numeric',
            'credit_limit'     => 'nullable|numeric|min:0',
            'bank_name'        => 'nullable|string|max:255',
            'bank_account_number' => 'nullable|string|max:50',
            'notes'            => 'nullable|string',
            'is_active'        => 'boolean',
        ]);

        // Auto-generate supplier_code if not provided
        if (empty($data['supplier_code'])) {
            $data['supplier_code'] = $this->generateCode();
        }

        $supplier = DB::transaction(function () use ($data) {
            $supplier = Supplier::create($data);
            $this->syncAccount($supplier);
            return $supplier;
        });

        return $this->success($supplier->load('account'), 'Supplier created', 201);
    }

    public function show(Supplier $supplier): JsonResponse
    {
        return $this->success($supplier);
    }

    public function update(Request $request, Supplier $supplier): JsonResponse
    {
        $data = $request->validate([
            'supplier_code'    => 'sometimes|string|max:50|unique:suppliers,supplier_code,' . $supplier->id,
            'name'             => 'sometimes|string|max:255',
            'contact_person'   => 'nullable|string|max:255',
            'email'            => 'nullable|email|max:255',
            'phone'            => 'nullable|string|max:50',
            'mobile'           => 'nullable|string|max:50',
            'address'          => 'nullable|string',
            'city'             => 'nullable|string|max:100',
            'country'          => 'nullable|string|max:100',
            'tax_number'       => 'nullable|string|max:50',
            'payment_terms'    => 'nullable|string|max:100',
            'opening_balance'  => 'nullable|numeric',
            'credit_limit'     => 'nullable|numeric|min:0',
            'bank_name'        => 'nullable|string|max:255',
            'bank_account_number' => 'nullable|string|max:50',
            'notes'            => 'nullable|string',
            'is_active'        => 'boolean',
        ]);

        DB::transaction(function () use ($supplier, $data) {
            $supplier->update($data);
            $this->syncAccount($supplier);
        });

        return $this->success($supplier->load('account'), 'Supplier updated');
    }

    public function destroy(Supplier $supplier): JsonResponse
    {
        // Soft approach: deactivate the linked account too (don't delete — would break ledger history)
        if ($supplier->account_id) {
            Account::where('id', $supplier->account_id)->update(['is_active' => false]);
        }
        $supplier->delete();
        return $this->success(null, 'Supplier deleted');
    }

    private function generateCode(): string
    {
        $last = Supplier::orderByDesc('id')->first();
        $next = $last ? $last->id + 1 : 1;
        return 'SUP-' . str_pad($next, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Make sure each supplier has a sub-ledger account under "Accounts Payable" (2110).
     * Code = supplier_code, Name = supplier name. Updates existing if linked, creates if not.
     */
    private function syncAccount(Supplier $supplier): void
    {
        $apParent = Account::where('code', '2110')->first();   // Accounts Payable

        if ($supplier->account_id) {
            // Update existing linked account
            Account::where('id', $supplier->account_id)->update([
                'code'        => $supplier->supplier_code,
                'name'        => $supplier->name,
                'is_active'   => $supplier->is_active,
                'description' => $supplier->contact_person ? 'Supplier — ' . $supplier->contact_person : 'Supplier sub-ledger',
            ]);
            return;
        }

        // Avoid clashing with an existing account that already has this code
        $existing = Account::where('code', $supplier->supplier_code)->first();
        if ($existing) {
            $supplier->update(['account_id' => $existing->id]);
            return;
        }

        $acc = Account::create([
            'code'        => $supplier->supplier_code,
            'name'        => $supplier->name,
            'type'        => 'liability',
            'parent_id'   => $apParent?->id,
            'description' => $supplier->contact_person ? 'Supplier — ' . $supplier->contact_person : 'Supplier sub-ledger',
            'is_active'   => $supplier->is_active,
        ]);
        $supplier->update(['account_id' => $acc->id]);
    }
}
