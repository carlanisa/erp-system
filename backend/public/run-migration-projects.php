<?php
/**
 * One-shot web migration runner for the Project & Task module.
 *
 * Trigger via:
 *   https://erp.earntodiemodapk.com/run-migration-projects.php?token=carlanisa2026
 *
 * Runs only the 4 new migrations from 2026_05_15 (projects/tasks, job descriptions,
 * ai chat tables, prefs+notifications). Safe to run multiple times — Laravel
 * skips migrations that have already been applied.
 *
 * Delete this file after a successful deploy.
 */

if (($_GET['token'] ?? '') !== 'carlanisa2026') {
    http_response_code(403);
    exit('Forbidden');
}

// Boot Laravel
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

header('Content-Type: text/plain; charset=utf-8');

echo "═══════════════════════════════════════════════════════════\n";
echo " Project & Task Module — Migration Runner\n";
echo "═══════════════════════════════════════════════════════════\n\n";

try {
    // Run pending migrations (Laravel will skip ones already applied)
    Artisan::call('migrate', ['--force' => true]);
    echo Artisan::output();

    echo "\n✅ Migration successful\n";

    // Quick sanity: list new tables
    echo "\n--- Tables created ---\n";
    foreach (['projects', 'tasks', 'task_checklist_items', 'task_attachments',
              'task_comments', 'task_approvals', 'hrm_job_descriptions',
              'ai_chat_conversations', 'ai_chat_messages',
              'employee_preferences', 'notifications'] as $t) {
        $exists = Schema::hasTable($t) ? '✅' : '❌';
        echo " $exists $t\n";
    }

    echo "\n--- Cache cleared ---\n";
    Artisan::call('config:clear');
    Artisan::call('route:clear');
    Artisan::call('cache:clear');
    echo "Done.\n";

    echo "\n⚠️  IMPORTANT: Delete this file (run-migration-projects.php) from public/ now.\n";
} catch (\Throwable $e) {
    echo "\n❌ ERROR: " . $e->getMessage() . "\n\n";
    echo $e->getTraceAsString();
}
