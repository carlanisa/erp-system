<?php

namespace Database\Seeders;

use App\Models\Accounting\Account;
use Illuminate\Database\Seeder;

class ChartOfAccountsSeeder extends Seeder
{
    public function run(): void
    {
        $tree = [
            // ── ASSETS ──────────────────────────────────────────
            ['code' => '1000', 'name' => 'Assets',                  'type' => 'asset',     'children' => [
                ['code' => '1100', 'name' => 'Current Assets',      'type' => 'asset',     'children' => [
                    ['code' => '1110', 'name' => 'Cash in Hand',    'type' => 'asset'],
                    ['code' => '1120', 'name' => 'Bank Account',    'type' => 'asset'],
                    ['code' => '1130', 'name' => 'Accounts Receivable', 'type' => 'asset'],
                    ['code' => '1140', 'name' => 'Inventory',       'type' => 'asset'],
                    ['code' => '1150', 'name' => 'Prepaid Expenses','type' => 'asset'],
                ]],
                ['code' => '1200', 'name' => 'Fixed Assets',        'type' => 'asset',     'children' => [
                    ['code' => '1210', 'name' => 'Equipment',       'type' => 'asset'],
                    ['code' => '1220', 'name' => 'Furniture & Fixtures', 'type' => 'asset'],
                    ['code' => '1230', 'name' => 'Vehicles',        'type' => 'asset'],
                    ['code' => '1290', 'name' => 'Accumulated Depreciation', 'type' => 'asset'],
                ]],
            ]],

            // ── LIABILITIES ──────────────────────────────────────
            ['code' => '2000', 'name' => 'Liabilities',             'type' => 'liability', 'children' => [
                ['code' => '2100', 'name' => 'Current Liabilities', 'type' => 'liability', 'children' => [
                    ['code' => '2110', 'name' => 'Accounts Payable','type' => 'liability'],
                    ['code' => '2120', 'name' => 'Tax Payable',     'type' => 'liability'],
                    ['code' => '2130', 'name' => 'Salary Payable',  'type' => 'liability'],
                    ['code' => '2140', 'name' => 'Advance from Customers', 'type' => 'liability'],
                ]],
                ['code' => '2200', 'name' => 'Long-term Liabilities','type' => 'liability','children' => [
                    ['code' => '2210', 'name' => 'Bank Loan',       'type' => 'liability'],
                ]],
            ]],

            // ── EQUITY ───────────────────────────────────────────
            ['code' => '3000', 'name' => 'Equity',                  'type' => 'equity',    'children' => [
                ['code' => '3100', 'name' => "Owner's Capital",     'type' => 'equity'],
                ['code' => '3200', 'name' => 'Retained Earnings',   'type' => 'equity'],
                ['code' => '3300', 'name' => 'Current Year Profit', 'type' => 'equity'],
            ]],

            // ── REVENUE ──────────────────────────────────────────
            ['code' => '4000', 'name' => 'Revenue',                 'type' => 'revenue',   'children' => [
                ['code' => '4100', 'name' => 'Service Revenue',     'type' => 'revenue'],
                ['code' => '4200', 'name' => 'Product Sales',       'type' => 'revenue'],
                ['code' => '4300', 'name' => 'Other Income',        'type' => 'revenue'],
            ]],

            // ── EXPENSES ─────────────────────────────────────────
            ['code' => '5000', 'name' => 'Expenses',                'type' => 'expense',   'children' => [
                ['code' => '5100', 'name' => 'Cost of Goods Sold',  'type' => 'expense'],
                ['code' => '5200', 'name' => 'Operating Expenses',  'type' => 'expense',   'children' => [
                    ['code' => '5210', 'name' => 'Salaries & Wages','type' => 'expense'],
                    ['code' => '5220', 'name' => 'Rent',            'type' => 'expense'],
                    ['code' => '5230', 'name' => 'Utilities',       'type' => 'expense'],
                    ['code' => '5240', 'name' => 'Marketing',       'type' => 'expense'],
                    ['code' => '5250', 'name' => 'Office Supplies', 'type' => 'expense'],
                    ['code' => '5260', 'name' => 'Transportation',  'type' => 'expense'],
                ]],
                ['code' => '5300', 'name' => 'Financial Expenses',  'type' => 'expense',   'children' => [
                    ['code' => '5310', 'name' => 'Bank Charges',    'type' => 'expense'],
                    ['code' => '5320', 'name' => 'Loan Interest',   'type' => 'expense'],
                ]],
                ['code' => '5400', 'name' => 'Depreciation',        'type' => 'expense'],
            ]],
        ];

        $this->insertTree($tree, null);
    }

    private function insertTree(array $items, ?int $parentId): void
    {
        foreach ($items as $item) {
            $children = $item['children'] ?? [];
            unset($item['children']);

            $account = Account::create([
                'code'      => $item['code'],
                'name'      => $item['name'],
                'type'      => $item['type'],
                'parent_id' => $parentId,
                'is_active' => true,
            ]);

            if ($children) {
                $this->insertTree($children, $account->id);
            }
        }
    }
}
