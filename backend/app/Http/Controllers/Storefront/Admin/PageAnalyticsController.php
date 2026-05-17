<?php

namespace App\Http\Controllers\Storefront\Admin;

use App\Http\Controllers\Controller;
use App\Models\Storefront\PageView;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PageAnalyticsController extends Controller
{
    /** Aggregate stats — totals, last-7-days chart, by-page top, by-referrer. */
    public function summary(Request $request)
    {
        $days  = max(1, min(90, (int) $request->query('days', 30)));
        $since = now()->subDays($days);

        $total = PageView::where('viewed_at', '>=', $since)->count();

        $byDay = PageView::where('viewed_at', '>=', $since)
            ->selectRaw('DATE(viewed_at) as day, count(*) as count')
            ->groupBy('day')->orderBy('day')->get();

        $byPage = PageView::where('viewed_at', '>=', $since)
            ->selectRaw('page_slug, count(*) as count')
            ->groupBy('page_slug')->orderByDesc('count')->limit(20)->get();

        $byReferrer = PageView::where('viewed_at', '>=', $since)
            ->whereNotNull('referrer')
            ->selectRaw('referrer, count(*) as count')
            ->groupBy('referrer')->orderByDesc('count')->limit(10)->get();

        $byUtmSource = PageView::where('viewed_at', '>=', $since)
            ->whereNotNull('utm_source')
            ->selectRaw('utm_source, count(*) as count')
            ->groupBy('utm_source')->orderByDesc('count')->limit(10)->get();

        return response()->json([
            'days'        => $days,
            'total'       => $total,
            'by_day'      => $byDay,
            'by_page'     => $byPage,
            'by_referrer' => $byReferrer,
            'by_utm'      => $byUtmSource,
        ]);
    }

    /** Per-page detail. */
    public function forPage(Request $request, string $slug)
    {
        $days  = max(1, min(90, (int) $request->query('days', 30)));
        $since = now()->subDays($days);
        $q = PageView::where('page_slug', $slug)->where('viewed_at', '>=', $since);
        return response()->json([
            'slug'   => $slug,
            'days'   => $days,
            'total'  => (clone $q)->count(),
            'by_day' => (clone $q)->selectRaw('DATE(viewed_at) as day, count(*) as count')
                ->groupBy('day')->orderBy('day')->get(),
            'top_referrers' => (clone $q)->whereNotNull('referrer')
                ->selectRaw('referrer, count(*) as count')
                ->groupBy('referrer')->orderByDesc('count')->limit(10)->get(),
        ]);
    }
}
