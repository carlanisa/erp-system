<?php
/**
 * Fix last APP- SKU: ID=8977 → D4-2
 * Finds any record holding SKU "D4-2", renames it to "D4-2-OLD", then updates ID=8977.
 * Access: https://erp.earntodiemodapk.com/fix-d42.php?token=carlanisa2026
 * DELETE AFTER USE!
 */

$SECRET = 'carlanisa2026';
if (($_GET['token'] ?? '') !== $SECRET) {
    http_response_code(403); die('Forbidden');
}

header('Content-Type: text/plain; charset=utf-8');

require dirname(__DIR__) . '/vendor/autoload.php';
$app    = require_once dirname(__DIR__) . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== Fix D4-2 SKU ===\n\n";

$TARGET_ID  = 8977;
$TARGET_SKU = 'D4-2';

// Step 1: Show current state of ID=8977
$target = DB::table('products')->where('id', $TARGET_ID)->first();
if (!$target) {
    echo "❌ Product ID={$TARGET_ID} not found!\n";
    exit;
}
echo "Target product ID={$TARGET_ID}:\n";
echo "  Name:   {$target->name}\n";
echo "  SKU:    {$target->sku}\n";
echo "  Status: {$target->status}\n\n";

// Step 2: Find ALL records with exact SKU = "D4-2" (including archived, any status)
$conflicts = DB::table('products')
    ->where('sku', $TARGET_SKU)
    ->where('id', '!=', $TARGET_ID)
    ->get(['id', 'name', 'sku', 'status', 'deleted_at']);

echo "Records with SKU='{$TARGET_SKU}' (excluding target):\n";
if ($conflicts->isEmpty()) {
    echo "  (none found)\n\n";
} else {
    foreach ($conflicts as $c) {
        $deleted = $c->deleted_at ? " [soft-deleted: {$c->deleted_at}]" : "";
        echo "  ID={$c->id}  SKU={$c->sku}  Status={$c->status}{$deleted}  Name=" . substr($c->name, 0, 50) . "\n";
    }
    echo "\n";
}

// Step 3: Rename all conflicts
foreach ($conflicts as $c) {
    $newSku = 'D4-2-OLD-' . $c->id;
    DB::table('products')->where('id', $c->id)->update([
        'sku'        => $newSku,
        'updated_at' => now(),
    ]);
    echo "✅ Renamed ID={$c->id} from '{$c->sku}' to '{$newSku}'\n";
}

if (!$conflicts->isEmpty()) {
    echo "\n";
}

// Step 4: Update ID=8977 to correct SKU
$updated = DB::table('products')->where('id', $TARGET_ID)->update([
    'sku'        => $TARGET_SKU,
    'is_active'  => 1,
    'status'     => 'active',
    'updated_at' => now(),
]);

if ($updated) {
    echo "✅ ID={$TARGET_ID} updated → SKU='{$TARGET_SKU}'\n";
} else {
    echo "❌ Update failed or no rows changed\n";
}

// Step 5: Verify
$final = DB::table('products')->where('id', $TARGET_ID)->first();
echo "\nFinal state of ID={$TARGET_ID}:\n";
echo "  Name:   {$final->name}\n";
echo "  SKU:    {$final->sku}\n";
echo "  Status: {$final->status}\n\n";

// Step 6: Count remaining APP- SKUs
$appCount = DB::table('products')
    ->where('sku', 'LIKE', 'APP-%')
    ->whereNull('deleted_at')
    ->whereIn('status', ['active', 'archived'])
    ->count();

echo "Remaining APP- SKUs in products table: {$appCount}\n";

if ($appCount === 0) {
    echo "\n🎉 All products now have correct SKUs!\n";
} else {
    $appProds = DB::table('products')
        ->where('sku', 'LIKE', 'APP-%')
        ->whereNull('deleted_at')
        ->select(['id', 'name', 'sku', 'status'])
        ->limit(10)
        ->get();
    foreach ($appProds as $p) {
        echo "  ID={$p->id}  SKU={$p->sku}  Status={$p->status}  Name=" . substr($p->name, 0, 50) . "\n";
    }
}

echo "\n=== DONE ===\n";
echo "⚠️  DELETE THIS FILE: public/fix-d42.php\n";
