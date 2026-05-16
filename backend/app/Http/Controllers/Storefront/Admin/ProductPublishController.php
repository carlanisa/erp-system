<?php

namespace App\Http\Controllers\Storefront\Admin;

use App\Http\Controllers\Controller;
use App\Models\Inventory\Product;
use Illuminate\Http\Request;

class ProductPublishController extends Controller
{
    public function update(Request $request, int $id)
    {
        $product = Product::findOrFail($id);
        $data = $request->validate([
            'publish_to_website' => 'required|boolean',
            'seo_slug'           => 'nullable|string|max:200',
            'seo_title'          => 'nullable|string|max:200',
            'seo_description'    => 'nullable|string|max:500',
            'size_chart_md'      => 'nullable|string',
        ]);

        $channels = $product->channels ?? [];
        if ($data['publish_to_website'] && !in_array('web', $channels)) {
            $channels[] = 'web';
        } elseif (!$data['publish_to_website']) {
            $channels = array_values(array_filter($channels, fn($c) => $c !== 'web'));
        }
        $product->fill($data);
        $product->channels = $channels;
        $product->save();

        return response()->json($product);
    }
}
