<?php
/**
 * ONE-TIME Migration Runner — DELETE AFTER USE!
 * Access: https://erp.earntodiemodapk.com/run-migration.php?token=carlanisa2026
 */

$SECRET = 'carlanisa2026';

if (($_GET['token'] ?? '') !== $SECRET) {
    http_response_code(403);
    die('Forbidden');
}

// Bootstrap Laravel
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

header('Content-Type: text/plain');
echo "=== Migration Runner ===\n\n";

try {
    // Run specific migration
    $exitCode = \Illuminate\Support\Facades\Artisan::call('migrate', [
        '--path'  => 'database/migrations/2026_05_14_100001_create_product_collections_table.php',
        '--force' => true,
    ]);
    echo \Illuminate\Support\Facades\Artisan::output();
    echo "\nExit code: $exitCode\n";

    if ($exitCode === 0) {
        echo "\n✅ Migration successful!\n";
        echo "Now delete this file from server: public/run-migration.php\n";
    } else {
        echo "\n❌ Migration failed. Check above output.\n";
    }
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
