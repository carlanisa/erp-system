<?php

namespace App\Http\Controllers\Api\Accounting;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Accounting\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $accounts = Account::with('children.children.children')
            ->whereNull('parent_id')
            ->orderBy('code')
            ->get();

        return $this->success($accounts);
    }

    public function flat(): JsonResponse
    {
        $accounts = Account::orderBy('code')->get(['id', 'code', 'name', 'type', 'parent_id']);
        return $this->success($accounts);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'      => 'required|string|unique:accounts',
            'name'      => 'required|string|max:255',
            'type'      => 'required|in:asset,liability,equity,revenue,expense',
            'parent_id' => 'nullable|exists:accounts,id',
            'description' => 'nullable|string',
        ]);

        $account = Account::create($data);
        return $this->success($account, 'Account created', 201);
    }

    public function show(Account $account): JsonResponse
    {
        return $this->success($account->load('children', 'parent'));
    }

    public function update(Request $request, Account $account): JsonResponse
    {
        $data = $request->validate([
            'code'      => 'sometimes|string|unique:accounts,code,' . $account->id,
            'name'      => 'sometimes|string|max:255',
            'type'      => 'sometimes|in:asset,liability,equity,revenue,expense',
            'parent_id' => 'nullable|exists:accounts,id',
            'description' => 'nullable|string',
        ]);

        $account->update($data);
        return $this->success($account, 'Account updated');
    }

    public function destroy(Account $account): JsonResponse
    {
        if ($account->children()->exists()) {
            return $this->error('Cannot delete account with sub-accounts', 422);
        }
        $account->delete();
        return $this->success(null, 'Account deleted');
    }
}
