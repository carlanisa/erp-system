<?php
namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * AI auto-fill for product master fields using Anthropic Claude.
 * Given a product name + optional context, returns a JSON object with all
 * marketing/SEO/categorisation fields filled in.
 */
class ProductAiAutofill
{
    private string $apiKey;
    private string $model;

    public function __construct()
    {
        $this->apiKey = (string) config('services.anthropic.api_key', '');
        $this->model  = (string) config('services.anthropic.model', 'claude-sonnet-4-5-20250929');
    }

    public function isConfigured(): bool
    {
        return $this->apiKey !== '';
    }

    /**
     * Returns ['ok' => bool, 'data' => array, 'message' => string]
     */
    public function fillFields(array $context): array
    {
        if (!$this->isConfigured()) {
            return [
                'ok'      => false,
                'message' => 'ANTHROPIC_API_KEY is not configured. Add it to backend/.env to enable AI auto-fill.',
                'data'    => $this->fallbackFields($context),
                'fallback'=> true,
            ];
        }

        $name      = $context['name']        ?? '';
        $type      = $context['product_type']?? 'apparel';
        $brand     = $context['brand']       ?? 'CARLANISA';
        $category  = $context['category']    ?? '';
        $colorHint = $context['color']       ?? '';
        $existingDesc = $context['description'] ?? '';

        $prompt = <<<PROMPT
You are a Malaysian e-commerce product data specialist. Given a product, return a JSON object filling in marketing, SEO, and Google Merchant Center fields. Be concise and SEO-optimised.

PRODUCT INPUT:
- Name: $name
- Type: $type
- Brand: $brand
- Category hint: $category
- Color hint: $colorHint
- Existing description: $existingDesc

REQUIREMENTS:
- Target market: Malaysia (primary), Singapore (secondary). Use English with occasional Bahasa Malaysia where relevant.
- Brand voice: modest fashion / premium textile, Malaysian Muslim audience.
- Be Google Shopping compliant (proper categories, conditions).
- Meta title <= 60 chars, meta description 140-155 chars (Google SERP optimal).
- Keywords: real search terms Malaysians type for this product.

RETURN ONLY valid JSON (no markdown, no commentary), with exactly these keys:
{
  "google_product_category": string (e.g. "1581 — Apparel & Accessories > Clothing > Dresses"),
  "fb_product_category":     string,
  "condition":               "new" | "refurbished" | "used",
  "gender":                  "female" | "male" | "unisex" | "",
  "age_group":               "adult" | "teen" | "kids" | "toddler" | "newborn" | "",
  "size_type":               "regular" | "petite" | "plus" | "tall" | "maternity" | "",
  "material":                string (e.g. "Cotton, Polyester"),
  "pattern":                 string (e.g. "Plain", "Floral"),
  "color":                   string (primary base color),
  "tags":                    string[] (3-6 relevant tags from: Eid 2026, Hari Raya, Festive, Bestseller, New Arrival, Modest, Modern, Traditional, Plus Size),
  "care_instructions":       string,
  "description_short":       string (1-line, <= 100 chars),
  "description":             string (3-5 sentences, marketing copy with bullet points if helpful),
  "seo_title":               string (<= 60 chars, include brand),
  "seo_description":         string (140-155 chars, include focus keyword early),
  "focus_keyword":           string (one phrase, 2-4 words, lowercase),
  "secondary_keywords":      string[] (5-10 related search terms, lowercase),
  "country_of_origin":       "Malaysia"
}
PROMPT;

        try {
            $response = Http::timeout(60)
                ->withHeaders([
                    'x-api-key'         => $this->apiKey,
                    'anthropic-version' => '2023-06-01',
                    'content-type'      => 'application/json',
                ])
                ->post('https://api.anthropic.com/v1/messages', [
                    'model'      => $this->model,
                    'max_tokens' => 1500,
                    'messages'   => [
                        ['role' => 'user', 'content' => $prompt],
                    ],
                ]);

            if (!$response->successful()) {
                Log::warning('Anthropic API error', ['status' => $response->status(), 'body' => $response->body()]);
                return [
                    'ok'      => false,
                    'message' => 'Claude API returned ' . $response->status() . ': ' . substr($response->body(), 0, 200),
                    'data'    => $this->fallbackFields($context),
                    'fallback'=> true,
                ];
            }

            $body = $response->json();
            $text = $body['content'][0]['text'] ?? '';
            // strip markdown code fences if present
            $text = preg_replace('/^```(?:json)?\s*|\s*```$/m', '', trim($text));
            $json = json_decode($text, true);

            if (!is_array($json)) {
                return [
                    'ok'      => false,
                    'message' => 'Claude returned non-JSON. Raw: ' . substr($text, 0, 200),
                    'data'    => $this->fallbackFields($context),
                    'fallback'=> true,
                ];
            }

            // attach algorithmic fields
            $json['gtin'] = $this->generateGtin13('9555888');

            return ['ok' => true, 'data' => $json, 'message' => 'AI auto-fill complete'];
        } catch (\Throwable $e) {
            Log::error('AI auto-fill exception', ['err' => $e->getMessage()]);
            return [
                'ok'      => false,
                'message' => 'AI service error: ' . $e->getMessage(),
                'data'    => $this->fallbackFields($context),
                'fallback'=> true,
            ];
        }
    }

    /**
     * Fallback: heuristic fill when AI is not configured.
     * Uses simple keyword detection for common Malaysian apparel terms.
     */
    public function fallbackFields(array $context): array
    {
        $name = strtolower($context['name'] ?? '');
        $type = $context['product_type'] ?? 'apparel';

        // simple keyword detection
        $isApparel = str_contains($name, 'kurung') || str_contains($name, 'baju') || str_contains($name, 'dress')
                  || str_contains($name, 'shirt')  || str_contains($name, 'kebaya');
        $isFabric  = $type === 'fabric' || str_contains($name, 'cotton') || str_contains($name, 'silk') || str_contains($name, 'fabric');

        return [
            'google_product_category' => $isApparel ? '1581 — Apparel & Accessories > Clothing > Dresses'
                                       : ($isFabric ? '128 — Arts & Entertainment > Hobbies > Crafts > Sewing & Quilting > Fabric' : ''),
            'fb_product_category'     => $isApparel ? 'Clothing & Accessories > Clothing > Dresses' : '',
            'condition'               => 'new',
            'gender'                  => $isApparel ? 'female' : '',
            'age_group'               => $isApparel ? 'adult' : '',
            'size_type'               => $isApparel ? 'regular' : '',
            'material'                => str_contains($name, 'cotton') ? 'Cotton' : '',
            'pattern'                 => str_contains($name, 'floral') ? 'Floral' : (str_contains($name, 'plain') ? 'Plain' : ''),
            'color'                   => $this->guessColor($name),
            'tags'                    => $isApparel ? ['Modest', 'Modern', 'Festive'] : [],
            'care_instructions'       => $isApparel ? 'Hand wash with cold water · Iron at low temperature · Do not bleach · Hang dry' : '',
            'description_short'       => '',
            'description'             => '',
            'seo_title'               => $context['name'] ?? '',
            'seo_description'         => '',
            'focus_keyword'           => strtolower($context['name'] ?? ''),
            'secondary_keywords'      => [],
            'country_of_origin'       => 'Malaysia',
            'gtin'                    => $this->generateGtin13('9555888'),
        ];
    }

    /**
     * Generate a valid GTIN-13 (EAN-13) with Malaysia prefix + check digit.
     * Default prefix 9555888 (Malaysia GS1) — 7 digits → + 5 random digits → check digit
     */
    private function generateGtin13(string $prefix = '9555888'): string
    {
        $body = $prefix . str_pad((string) random_int(0, 99999), 5, '0', STR_PAD_LEFT);
        // EAN-13 check digit: sum odd-positioned×1 + even-positioned×3, mod 10, then (10-x)%10
        $sum = 0;
        for ($i = 0; $i < 12; $i++) {
            $sum += (int) $body[$i] * (($i % 2 === 0) ? 1 : 3);
        }
        $check = (10 - ($sum % 10)) % 10;
        return $body . $check;
    }

    private function guessColor(string $name): string
    {
        $colors = ['black', 'white', 'navy', 'maroon', 'red', 'blue', 'green', 'pink', 'beige', 'cream', 'gold', 'silver', 'grey', 'brown'];
        foreach ($colors as $c) {
            if (str_contains($name, $c)) return ucfirst($c);
        }
        return '';
    }
}
