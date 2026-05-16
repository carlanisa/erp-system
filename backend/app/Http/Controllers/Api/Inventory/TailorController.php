<?php
namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Inventory\StockLocation;
use App\Models\Inventory\Tailor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TailorController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $q = Tailor::with('location')
            ->when($request->search, fn($q,$s) =>
                $q->where('name','ilike',"%$s%")
                  ->orWhere('tailor_code','ilike',"%$s%")
                  ->orWhere('phone','ilike',"%$s%")
                  ->orWhere('contact_person','ilike',"%$s%")
            )
            ->orderBy('tailor_code');
        return $this->success($q->get());
    }

    public function flat(): JsonResponse
    {
        return $this->success(Tailor::where('is_active', true)->orderBy('tailor_code')->get(['id','tailor_code','name','location_id']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tailor_code'    => 'nullable|string|max:50|unique:tailors,tailor_code',
            'name'           => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone'          => 'nullable|string|max:50',
            'email'          => 'nullable|email|max:255',
            'address'        => 'nullable|string',
            'payment_terms'  => 'nullable|string|max:50',
            'notes'          => 'nullable|string',
            'is_active'      => 'boolean',
        ]);
        $data['tailor_code'] = $data['tailor_code'] ?? $this->nextCode();

        $tailor = DB::transaction(function () use ($data) {
            $tailor = Tailor::create($data);
            // Auto-create matching stock_location of type=tailor for movement tracking
            $loc = StockLocation::create([
                'code'           => 'LOC-' . $tailor->tailor_code,
                'name'           => $tailor->name . ' (Tailor)',
                'type'           => 'tailor',
                'address'        => $tailor->address,
                'contact_person' => $tailor->contact_person,
                'phone'          => $tailor->phone,
                'is_active'      => true,
            ]);
            $tailor->update(['location_id' => $loc->id]);
            return $tailor->fresh('location');
        });

        return $this->success($tailor, 'Tailor created');
    }

    public function show(Tailor $tailor): JsonResponse
    {
        return $this->success($tailor->load('location'));
    }

    public function update(Request $request, Tailor $tailor): JsonResponse
    {
        $data = $request->validate([
            'tailor_code'    => 'sometimes|string|max:50|unique:tailors,tailor_code,'.$tailor->id,
            'name'           => 'sometimes|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone'          => 'nullable|string|max:50',
            'email'          => 'nullable|email|max:255',
            'address'        => 'nullable|string',
            'payment_terms'  => 'nullable|string|max:50',
            'notes'          => 'nullable|string',
            'is_active'      => 'boolean',
        ]);
        $tailor->update($data);

        // sync location attributes
        if ($tailor->location) {
            $tailor->location->update([
                'name'           => $tailor->name . ' (Tailor)',
                'address'        => $tailor->address,
                'contact_person' => $tailor->contact_person,
                'phone'          => $tailor->phone,
            ]);
        }

        return $this->success($tailor->fresh('location'), 'Updated');
    }

    public function destroy(Tailor $tailor): JsonResponse
    {
        $tailor->delete();
        return $this->success(null, 'Deleted');
    }

    private function nextCode(): string
    {
        $next = (Tailor::max('id') ?? 0) + 1;
        $code = 'TLR-' . str_pad($next, 4, '0', STR_PAD_LEFT);
        while (Tailor::where('tailor_code', $code)->exists()) {
            $next++; $code = 'TLR-' . str_pad($next, 4, '0', STR_PAD_LEFT);
        }
        return $code;
    }
}
