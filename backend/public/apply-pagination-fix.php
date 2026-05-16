<?php
/**
 * ONE-TIME Patch — Pagination cap fix on ProductController.
 * Access: https://erp.earntodiemodapk.com/apply-pagination-fix.php?token=carlanisa2026
 *
 * After running successfully, DELETE this file from the server.
 */

$SECRET = 'carlanisa2026';
if (($_GET['token'] ?? '') !== $SECRET) {
    http_response_code(403);
    die('Forbidden');
}

header('Content-Type: text/plain; charset=utf-8');
echo "=== Pagination Cap Patch ===\n\n";

$target = __DIR__ . '/../app/Http/Controllers/Api/Inventory/ProductController.php';
if (!file_exists($target)) {
    echo "❌ Target file not found: $target\n";
    exit(1);
}

$contents = file_get_contents($target);
$backup   = $target . '.bak-' . date('YmdHis');

if (strpos($contents, '->paginate(20)') === false) {
    if (strpos($contents, "min((int) (\$request->per_page ?: 20), 500)") !== false) {
        echo "ℹ️  Already patched — nothing to do.\n";
        exit(0);
    }
    echo "⚠️  Could not find '->paginate(20)' literal. Skipping (manual fix needed).\n";
    exit(1);
}

if (!copy($target, $backup)) {
    echo "❌ Failed to write backup at $backup\n";
    exit(1);
}
echo "✅ Backup saved: " . basename($backup) . "\n";

$patched = str_replace(
    '->paginate(20)',
    '->paginate(min((int) ($request->per_page ?: 20), 500))',
    $contents
);

if ($patched === $contents) {
    echo "⚠️  Patch produced no changes.\n";
    exit(1);
}

if (file_put_contents($target, $patched) === false) {
    echo "❌ Write failed on $target\n";
    exit(1);
}

echo "✅ Patched ProductController.php — per_page param now respected (cap 500).\n";

// Clear opcache so the change takes effect immediately
if (function_exists('opcache_invalidate')) {
    opcache_invalidate($target, true);
    echo "✅ OPcache invalidated for ProductController.php\n";
}

// Clear Laravel route + config cache (best-effort)
try {
    require __DIR__ . '/../vendor/autoload.php';
    $app = require_once __DIR__ . '/../bootstrap/app.php';
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();
    \Illuminate\Support\Facades\Artisan::call('config:clear');
    \Illuminate\Support\Facades\Artisan::call('route:clear');
    \Illuminate\Support\Facades\Artisan::call('cache:clear');
    echo "✅ Laravel caches cleared.\n";
} catch (\Throwable $e) {
    echo "⚠️  Laravel cache clear failed: " . $e->getMessage() . "\n";
}

echo "\n🎉 Done! Verify with:\n";
echo "   curl 'https://erp.earntodiemodapk.com/api/inventory/products?per_page=500'\n";
echo "\n⚠️  IMPORTANT: ab is file ko server se DELETE kar dein:\n";
echo "   public/apply-pagination-fix.php\n";
