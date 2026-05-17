<?php

namespace App\Services\Shopify;

use App\Models\Inventory\Product;
use App\Models\Media;
use App\Models\ShopifyImportSetting;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Pulls products from a Shopify Admin API, downloads each product's images,
 * stores them in the local media library with slugified filenames, and
 * attaches them to the matching ERP product (featured_image_url + gallery_urls).
 *
 * Match strategies:
 *   - sku    (default) — match Shopify variant SKU to ERP product or variant SKU
 *   - handle           — match Shopify product handle to ERP seo_slug
 *   - name             — case-insensitive name match
 */
class ShopifyImportService
{
    private const API_VERSION = '2024-10';
    private const PAGE_SIZE   = 50;

    /** @return array{ok:bool, message?:string, shop?:array, status?:int, hint?:string, url?:string, body?:string} */
    public function testConnection(ShopifyImportSetting $s): array
    {
        if (!$s->shopHost() || !$s->access_token) {
            return ['ok' => false, 'message' => 'Shop domain and access token are required.'];
        }
        $host = $s->shopHost();
        $url  = 'https://' . $host . '/admin/api/' . self::API_VERSION . '/shop.json';

        // Common mistake: pasting the Storefront API token (shpss_…) which is for
        // public, headless storefronts — it cannot read /admin/* endpoints. Catch
        // this early instead of letting Shopify return a generic 401.
        $token = $s->access_token;
        if (str_starts_with($token, 'shpss_')) {
            return [
                'ok' => false, 'status' => 0,
                'message' => 'Wrong token type — this is a Storefront API token.',
                'hint'    => "You copied the Storefront API access token (starts with shpss_).\nThe import needs the Admin API access token, which starts with shpat_.\n\nFix in Shopify Admin:\n1) Settings → Apps and sales channels → Develop apps\n2) Open your app\n3) API credentials tab\n4) Look for \"Admin API access token\" section (NOT \"Storefront API access token\")\n5) If you don't see it yet: Configuration tab → enable read_products → Save → top-right Install app → then come back to API credentials → Reveal the Admin token\n6) Paste the shpat_… token here",
                'url'     => $url,
                'body'    => "Detected token prefix: 'shpss_' — that's the Storefront API token, not the Admin API token.",
            ];
        }
        if (!str_starts_with($token, 'shpat_') && !str_starts_with($token, 'shpca_')) {
            return [
                'ok' => false, 'status' => 0,
                'message' => 'Token format does not look like a Shopify Admin token.',
                'hint'    => "Admin API access tokens start with 'shpat_'. You pasted a token that starts with: '" . substr($token, 0, 6) . "…'\n\nIn Shopify Admin → Settings → Apps and sales channels → Develop apps → open your app → API credentials → look for the 'Admin API access token' section (not 'Storefront API access token', not 'API key', not 'API secret key').",
                'url'     => $url,
            ];
        }

        // 1) Quick sanity on domain — Shopify Admin API ONLY works on *.myshopify.com,
        //    NOT on the customer-facing custom domain (carlanisa.com etc.). Surface
        //    this very early because it's the #1 cause of 403/404.
        if (!preg_match('/\.myshopify\.com$/i', $host)) {
            return [
                'ok' => false,
                'status' => 0,
                'message' => "Shop domain must end in .myshopify.com — got: $host",
                'hint' => "Open your Shopify admin: top-left shop switcher shows the .myshopify.com URL. Custom domain (carlanisa.com) is for customers, not the Admin API.",
                'url' => $url,
            ];
        }

        try {
            $resp = $this->req($s, 'shop.json');
        } catch (\Throwable $e) {
            return ['ok' => false, 'message' => 'Network error: ' . $e->getMessage(), 'url' => $url];
        }

        if ($resp->successful()) {
            $shop = $resp->json('shop');
            return ['ok' => true, 'shop' => [
                'name'    => $shop['name']  ?? null,
                'email'   => $shop['email'] ?? null,
                'plan'    => $shop['plan_display_name'] ?? null,
                'country' => $shop['country_name'] ?? null,
                'domain'  => $shop['domain']  ?? null,
            ]];
        }

        $status = $resp->status();
        $body   = substr($resp->body(), 0, 400);
        $hint   = $this->hintForStatus($status, $body);

        return [
            'ok'      => false,
            'status'  => $status,
            'message' => "Shopify returned HTTP $status",
            'hint'    => $hint,
            'url'     => $url,
            'body'    => $body,
        ];
    }

    private function hintForStatus(int $status, string $body): string
    {
        if ($status === 401) {
            return 'Token is invalid or revoked. Re-open your Custom App in Shopify Admin → API credentials → reveal the Admin API access token → paste it again. If you regenerated it, the old one no longer works.';
        }
        if ($status === 402) {
            return 'Shopify account is past-due or frozen. Sort out billing in Shopify Admin first.';
        }
        if ($status === 403) {
            // Could be scope OR missing install
            if (stripos($body, 'access denied') !== false || stripos($body, 'unauthorized') !== false) {
                return 'The token does not have the required scope. Shopify Admin → Apps & sales channels → Develop apps → open your app → Configuration → enable read_products → Save → API credentials → "Reveal token" again and re-paste here.';
            }
            return 'Access denied. Three things to check, in order:\n1) Did you click "Install app" after configuring scopes? (most common)\n2) Is read_products checked under Configuration → Admin API access scopes?\n3) Did you copy the **Admin API access token** (not the API key)? It starts with shpat_.';
        }
        if ($status === 404) {
            return 'Shop not found at this domain. Make sure the .myshopify.com is correct — even if you use a custom domain, the Admin API URL uses the original *.myshopify.com hostname.';
        }
        if ($status === 423) return 'Shop is locked by Shopify.';
        if ($status === 429) return 'Rate-limited. Wait 30 seconds and try again.';
        if ($status >= 500)  return 'Shopify server error. Try again in a minute.';
        return 'Unexpected status — check the shop URL and token. Full response body is shown below.';
    }

    /** Returns the total product count on the Shopify shop. */
    public function totalCount(ShopifyImportSetting $s): int
    {
        $resp = $this->req($s, 'products/count.json');
        return $resp->successful() ? (int) ($resp->json('count') ?? 0) : 0;
    }

    /**
     * Run one chunk of the import. Returns the next page_info cursor or null when done.
     *
     * @return array{
     *   processed: int,
     *   matched: int,
     *   updated: int,
     *   downloaded: int,
     *   skipped: int,
     *   errors: array<string>,
     *   next_cursor: ?string,
     *   examples: array<int, array{shopify:string, matched:?int, images:int, action:string}>,
     * }
     */
    public function importChunk(ShopifyImportSetting $s, ?string $cursor = null): array
    {
        $params = ['limit' => self::PAGE_SIZE, 'fields' => 'id,title,handle,product_type,variants,images,image'];
        if ($cursor) $params['page_info'] = $cursor;

        $resp = $this->req($s, 'products.json', $params);
        if (!$resp->successful()) {
            return [
                'processed' => 0, 'matched' => 0, 'updated' => 0, 'downloaded' => 0, 'skipped' => 0,
                'errors' => ['Shopify API error: ' . $resp->status() . ' ' . substr($resp->body(), 0, 200)],
                'next_cursor' => null, 'examples' => [],
            ];
        }
        $products = $resp->json('products') ?? [];

        $matched = $updated = $downloaded = $skipped = 0;
        $errors  = [];
        $examples = [];

        foreach ($products as $sp) {
            $erp = $this->matchErpProduct($sp, $s->match_strategy);
            $images = $sp['images'] ?? [];

            if (!$erp) {
                $skipped++;
                if (count($examples) < 8) {
                    $examples[] = ['shopify' => $sp['title'] ?? '?', 'matched' => null, 'images' => count($images), 'action' => 'no-match'];
                }
                continue;
            }
            $matched++;

            if ($s->only_missing_images && (!empty($erp->featured_image_url) || !empty($erp->image_path))) {
                if (count($examples) < 8) {
                    $examples[] = ['shopify' => $sp['title'] ?? '?', 'matched' => $erp->id, 'images' => count($images), 'action' => 'skipped (has image)'];
                }
                continue;
            }
            if (empty($images)) {
                if (count($examples) < 8) {
                    $examples[] = ['shopify' => $sp['title'] ?? '?', 'matched' => $erp->id, 'images' => 0, 'action' => 'no images in Shopify'];
                }
                continue;
            }

            try {
                $urls = [];
                foreach ($images as $img) {
                    $src = $img['src'] ?? null;
                    if (!$src) continue;
                    $url = $this->downloadAndStore($src, $erp);
                    if ($url) { $urls[] = $url; $downloaded++; }
                }
                if (!empty($urls)) {
                    $erp->featured_image_url = $urls[0];
                    $erp->gallery_urls = array_slice($urls, 1);
                    $erp->save();
                    $updated++;
                    if (count($examples) < 8) {
                        $examples[] = ['shopify' => $sp['title'] ?? '?', 'matched' => $erp->id, 'images' => count($urls), 'action' => 'imported'];
                    }
                }
            } catch (\Throwable $e) {
                $errors[] = ($sp['title'] ?? '?') . ': ' . $e->getMessage();
                Log::warning('Shopify image import failed', ['product' => $sp['id'] ?? null, 'err' => $e->getMessage()]);
            }
        }

        // Cursor extraction from Link header
        $next = $this->parseNextCursor($resp);

        return [
            'processed'   => count($products),
            'matched'     => $matched,
            'updated'     => $updated,
            'downloaded'  => $downloaded,
            'skipped'     => $skipped,
            'errors'      => $errors,
            'next_cursor' => $next,
            'examples'    => $examples,
        ];
    }

    // ─────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────

    private function matchErpProduct(array $sp, string $strategy): ?Product
    {
        if ($strategy === 'handle' && !empty($sp['handle'])) {
            $p = Product::where('seo_slug', $sp['handle'])->first();
            if ($p) return $p;
            // fall through to name fallback
        }
        if ($strategy === 'name' && !empty($sp['title'])) {
            return Product::whereRaw('LOWER(name) = ?', [strtolower($sp['title'])])->first();
        }
        // Default + fallback: SKU. Try each variant SKU against Product.sku and Variant.sku
        $skus = collect($sp['variants'] ?? [])->pluck('sku')->filter()->all();
        foreach ($skus as $sku) {
            $p = Product::where('sku', $sku)->first();
            if ($p) return $p;
        }
        // Last resort: name
        if (!empty($sp['title'])) {
            $p = Product::whereRaw('LOWER(name) = ?', [strtolower($sp['title'])])->first();
            if ($p) return $p;
        }
        return null;
    }

    /** Download a single image to /storage/media/{slug}.ext and create a Media row. */
    private function downloadAndStore(string $url, Product $erp): ?string
    {
        $resp = Http::timeout(30)->get($url);
        if (!$resp->successful()) return null;

        $body = $resp->body();
        $mime = $resp->header('Content-Type') ?: 'image/jpeg';
        $ext  = match (true) {
            str_contains($mime, 'png')  => 'png',
            str_contains($mime, 'webp') => 'webp',
            str_contains($mime, 'gif')  => 'gif',
            default                     => 'jpg',
        };

        $baseSlug = Str::slug($erp->seo_slug ?: $erp->name) ?: ('product-' . $erp->id);
        $candidate = "$baseSlug.$ext";
        $i = 2;
        while (Storage::disk('public')->exists("media/$candidate")) {
            $candidate = "$baseSlug-$i.$ext"; $i++;
        }
        Storage::disk('public')->put("media/$candidate", $body);

        [$w, $h] = @getimagesizefromstring($body) ?: [null, null];
        Media::create([
            'filename'      => $candidate,
            'original_name' => basename(parse_url($url, PHP_URL_PATH) ?: $candidate),
            'mime_type'     => $mime,
            'size'          => strlen($body),
            'width'         => $w ?: null,
            'height'        => $h ?: null,
            'alt_text'      => $erp->name,
            'folder'        => 'products',
        ]);

        return '/storage/media/' . $candidate;
    }

    private function req(ShopifyImportSetting $s, string $path, array $query = []): Response
    {
        $url = 'https://' . $s->shopHost() . '/admin/api/' . self::API_VERSION . '/' . ltrim($path, '/');
        return Http::withHeaders([
            'X-Shopify-Access-Token' => $s->access_token,
            'Accept' => 'application/json',
        ])->timeout(30)->get($url, $query);
    }

    private function parseNextCursor(Response $resp): ?string
    {
        $link = $resp->header('Link') ?: $resp->header('link');
        if (!$link) return null;
        // <https://...&page_info=XYZ>; rel="next"
        if (preg_match('/<[^>]*page_info=([^&>]+)[^>]*>;\s*rel="next"/i', $link, $m)) {
            return $m[1];
        }
        return null;
    }
}
