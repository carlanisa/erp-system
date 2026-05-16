<?php

namespace App\Http\Controllers\Api\CRM;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\CRM\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $customers = Customer::when($request->search, fn($q) =>
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%"))
            ->when($request->all === 'true', fn($q) => $q, fn($q) => $q->paginate(20));

        if ($request->all === 'true') {
            return $this->success($customers);
        }
        return $this->paginated($customers);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'email'       => 'nullable|email|unique:customers',
            'phone'       => 'nullable|string|max:20',
            'address'     => 'nullable|string',
            'city'        => 'nullable|string|max:100',
            'country'     => 'nullable|string|max:100',
            'tax_number'  => 'nullable|string|max:50',
            'credit_limit'=> 'nullable|numeric|min:0',
            'notes'       => 'nullable|string',
        ]);

        $customer = Customer::create($data);
        return $this->success($customer, 'Customer created', 201);
    }

    public function show(Customer $customer): JsonResponse
    {
        return $this->success($customer->load('invoices'));
    }

    public function update(Request $request, Customer $customer): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'email'       => 'nullable|email|unique:customers,email,' . $customer->id,
            'phone'       => 'nullable|string|max:20',
            'address'     => 'nullable|string',
            'city'        => 'nullable|string|max:100',
            'tax_number'  => 'nullable|string|max:50',
            'credit_limit'=> 'nullable|numeric|min:0',
        ]);

        $customer->update($data);
        return $this->success($customer, 'Customer updated');
    }

    public function destroy(Customer $customer): JsonResponse
    {
        if ($customer->invoices()->exists()) {
            return $this->error('Cannot delete customer with invoices', 422);
        }
        $customer->delete();
        return $this->success(null, 'Customer deleted');
    }
}
