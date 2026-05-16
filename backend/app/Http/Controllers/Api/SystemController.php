<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

class SystemController extends Controller
{
    /**
     * Clear all backend caches (config, route, view, application).
     * Called from the ERP "Clear Cache" button in the header.
     */
    public function clearCache(): JsonResponse
    {
        $results = [];

        try {
            Artisan::call('cache:clear');
            $results['cache']  = trim(Artisan::output()) ?: 'Application cache cleared.';

            Artisan::call('config:clear');
            $results['config'] = trim(Artisan::output()) ?: 'Config cache cleared.';

            Artisan::call('route:clear');
            $results['route']  = trim(Artisan::output()) ?: 'Route cache cleared.';

            Artisan::call('view:clear');
            $results['view']   = trim(Artisan::output()) ?: 'View cache cleared.';

            // Compiled services + packages cache
            try {
                Artisan::call('clear-compiled');
                $results['compiled'] = trim(Artisan::output()) ?: 'Compiled services cleared.';
            } catch (\Throwable $e) {
                $results['compiled'] = 'skipped: '.$e->getMessage();
            }

            Log::info('Backend cache cleared via /api/system/clear-cache', [
                'user_id' => auth()->id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Backend cache cleared successfully.',
                'data'    => $results,
            ]);
        } catch (\Throwable $e) {
            Log::error('Cache clear failed', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Cache clear failed: '.$e->getMessage(),
                'data'    => $results,
            ], 500);
        }
    }
}
