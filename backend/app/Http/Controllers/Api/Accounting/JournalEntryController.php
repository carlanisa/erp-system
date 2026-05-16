<?php
namespace App\Http\Controllers\Api\Accounting;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalLine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class JournalEntryController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $q = JournalEntry::with('lines.account')
            ->when($request->search, fn($q,$s) => $q->where('description','ilike',"%$s%")->orWhere('number','ilike',"%$s%"))
            ->when($request->status, fn($q,$s) => $q->where('status',$s))
            ->orderByDesc('date');
        return $this->paginated($q->paginate($request->integer('per_page',15)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date'        => 'required|date',
            'description' => 'required|string',
            'reference'   => 'nullable|string',
            'status'      => 'in:draft,posted',
            'lines'       => 'required|array|min:2',
            'lines.*.account_id' => 'required|exists:accounts,id',
            'lines.*.type'       => 'required|in:debit,credit',
            'lines.*.amount'     => 'required|numeric|min:0.01',
            'lines.*.description'=> 'nullable|string',
        ]);

        // Validate debit = credit
        $totalDebit  = collect($data['lines'])->where('type','debit')->sum('amount');
        $totalCredit = collect($data['lines'])->where('type','credit')->sum('amount');
        if (round($totalDebit,2) !== round($totalCredit,2)) {
            return $this->error('Total debits must equal total credits', 422);
        }

        $entry = DB::transaction(function () use ($data, $request) {
            $entry = JournalEntry::create([
                'number'      => $this->generateNumber(),
                'date'        => $data['date'],
                'description' => $data['description'],
                'reference'   => $data['reference'] ?? null,
                'status'      => $data['status'] ?? 'draft',
                'created_by'  => $request->user()->id,
            ]);
            foreach ($data['lines'] as $line) {
                $entry->lines()->create($line);
            }
            return $entry;
        });

        return $this->success($entry->load('lines.account'), 'Journal entry created', 201);
    }

    public function show(JournalEntry $journalEntry): JsonResponse
    {
        return $this->success($journalEntry->load(['lines.account','createdBy']));
    }

    public function update(Request $request, JournalEntry $journalEntry): JsonResponse
    {
        if ($journalEntry->status === 'posted') return $this->error('Cannot edit posted entry', 422);

        $data = $request->validate([
            'date'        => 'date',
            'description' => 'string',
            'reference'   => 'nullable|string',
            'status'      => 'in:draft,posted',
            'lines'       => 'array|min:2',
            'lines.*.account_id' => 'required_with:lines|exists:accounts,id',
            'lines.*.type'       => 'required_with:lines|in:debit,credit',
            'lines.*.amount'     => 'required_with:lines|numeric|min:0.01',
            'lines.*.description'=> 'nullable|string',
        ]);

        DB::transaction(function () use ($data, $journalEntry) {
            $journalEntry->update(collect($data)->except('lines')->toArray());
            if (!empty($data['lines'])) {
                $journalEntry->lines()->delete();
                foreach ($data['lines'] as $line) {
                    $journalEntry->lines()->create($line);
                }
            }
        });

        return $this->success($journalEntry->fresh('lines.account'), 'Updated');
    }

    public function destroy(JournalEntry $journalEntry): JsonResponse
    {
        if ($journalEntry->status === 'posted') return $this->error('Cannot delete posted entry', 422);
        $journalEntry->delete();
        return $this->success(null, 'Deleted');
    }

    private function generateNumber(): string
    {
        $last = JournalEntry::orderByRaw("CAST(SUBSTRING(number FROM 4) AS INTEGER) DESC")->first();
        $next = $last ? ((int) substr($last->number, 3)) + 1 : 1;
        $num  = 'JE-' . str_pad($next, 4, '0', STR_PAD_LEFT);
        while (JournalEntry::where('number', $num)->exists()) { $next++; $num = 'JE-'.str_pad($next,4,'0',STR_PAD_LEFT); }
        return $num;
    }
}
