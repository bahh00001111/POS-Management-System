<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller {
    public function index() {
        $products = Cache::remember('products.with_relations', 300, function () {
            return Product::with('category', 'supplier')->get()->map(function ($product) {
                $product->image_url = $product->image ? url('storage/' . $product->image) : null;
                return $product;
            });
        });

        return response()->json([
            'message' => 'Products retrieved successfully',
            'data' => $products
        ], 200);
    }

    public function store(Request $request) {
        $request->validate([
            'category_id' => 'required|exists:categories,category_id',
            'product_name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'stock' => 'nullable|integer|min:0',
            'supplier_id' => 'nullable|exists:suppliers,supplier_id',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'is_professional' => 'boolean',
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('products', 'public');
        }

        $product = Product::create([
            'category_id' => $request->category_id,
            'product_name' => $request->product_name,
            'price' => $request->price,
            'stock' => $request->filled('stock') ? (int) $request->stock : 0,
            'supplier_id' => $request->supplier_id,
            'image' => $imagePath,
            'is_professional' => $request->boolean('is_professional'),
        ]);

        Cache::forget('products.with_relations');

        return response()->json([
            'message' => 'Product created successfully',
            'data' => $product->load('category')
        ], 201);
    }

    public function show($id) {
        $product = Product::with('category', 'supplier')->findOrFail($id);
        $product->image_url = $product->image ? url('storage/' . $product->image) : null;

        return response()->json([
            'message' => 'Product retrieved successfully',
            'data' => $product
        ], 200);
    }

    public function update(Request $request, $id) {
        $request->validate([
            'category_id' => 'required|exists:categories,category_id',
            'product_name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'stock' => 'nullable|integer|min:0',
            'supplier_id' => 'nullable|exists:suppliers,supplier_id',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'is_professional' => 'boolean',
        ]);

        $product = Product::findOrFail($id);

        if ($request->hasFile('image')) {
            if ($product->image) {
                Storage::disk('public')->delete($product->image);
            }
            $product->image = $request->file('image')->store('products', 'public');
        }

        $product->update([
            'category_id' => $request->category_id,
            'product_name' => $request->product_name,
            'price' => $request->price,
            'stock' => $request->filled('stock') ? (int) $request->stock : $product->stock,
            'supplier_id' => $request->supplier_id,
            'image' => $product->image,
            'is_professional' => $request->has('is_professional')
                ? $request->boolean('is_professional')
                : $product->is_professional,
        ]);

        Cache::forget('products.with_relations');

        // ពេលដាក់ស្តុកវិញ (stock > 0) សូមបិទការជូនដំណឹងស្តុកអស់/ជិតអស់របស់ផលិតផលនេះដោយស្វ័យប្រវត្តិ
        if ((int) $product->stock > 0) {
            \App\Models\SystemNotification::where('product_id', $product->product_id)
                ->whereIn('type', ['OUT_OF_STOCK', 'LOW_STOCK'])
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        }

        return response()->json([
            'message' => 'Product updated successfully',
            'data' => $product->load('category', 'supplier')
        ], 200);
    }

    public function destroy($id) {
        $product = Product::findOrFail($id);

        if ($product->image) {
            Storage::disk('public')->delete($product->image);
        }

        $product->delete();

        Cache::forget('products.with_relations');

        return response()->json([
            'message' => 'Product deleted successfully'
        ], 200);
    }
}
