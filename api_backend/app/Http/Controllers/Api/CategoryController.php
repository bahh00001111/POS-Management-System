<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Cache::remember('categories.with_products', 300, function () {
            // withCount ផ្ទុកតែចំនួន products (មិនមែន rows ទាំងអស់) -> payload ស្រាលជាង
            return Category::withCount('products')->get()->map(function ($category) {
                $category->image_url = $category->image ? url('storage/' . $category->image) : null;
                return $category;
            });
        });

        return response()->json([
            'message' => 'Categories retrieved successfully',
            'data' => $categories
        ], 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'category_name' => 'required|string|max:255|unique:categories,category_name',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'is_professional' => 'boolean',
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('categories', 'public');
        }

        $category = Category::create([
            'category_name' => $request->category_name,
            'image' => $imagePath,
            'is_professional' => $request->boolean('is_professional'),
        ]);

        Cache::forget('categories.with_products');

        return response()->json([
            'message' => 'Category created successfully',
            'data' => $category
        ], 201);
    }

    public function show($id)
    {
        // កែមកប្រើ where ជាមួយ category_id
        $category = Category::with('products')->where('category_id', $id)->firstOrFail();
        $category->image_url = $category->image ? url('storage/' . $category->image) : null;

        return response()->json([
            'message' => 'Category retrieved successfully',
            'data' => $category
        ], 200);
    }

    public function update(Request $request, $id)
    {
        // បន្ថែម category_id ក្នុង unique validation rule
        $request->validate([
            'category_name' => 'required|string|max:255|unique:categories,category_name,' . $id . ',category_id',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp,avif|max:2048',
            'is_professional' => 'boolean',
        ]);

        $category = Category::where('category_id', $id)->firstOrFail();

        if ($request->hasFile('image')) {
            if ($category->image) {
                Storage::disk('public')->delete($category->image);
            }
            $category->image = $request->file('image')->store('categories', 'public');
        }

        $category->update([
            'category_name' => $request->category_name,
            'image' => $category->image,
            'is_professional' => $request->has('is_professional')
                ? $request->boolean('is_professional')
                : $category->is_professional,
        ]);

        Cache::forget('categories.with_products');

        return response()->json([
            'message' => 'Category updated successfully',
            'data' => $category
        ], 200);
    }

    public function destroy($id)
    {
        $category = Category::where('category_id', $id)->firstOrFail();

        try {
            $category->delete();
        } catch (\Illuminate\Database\QueryException $e) {
            // RESTRICT on products.category_id blocks the delete so historical
            // data is never cascaded away — surface a friendly error instead.
            if ($this->isForeignKeyViolation($e)) {
                return response()->json([
                    'message' => 'Cannot delete this category because it still has products.',
                    'status'  => 'error',
                ], 409);
            }
            throw $e;
        }

        if ($category->image) {
            Storage::disk('public')->delete($category->image);
        }

        Cache::forget('categories.with_products');

        return response()->json([
            'message' => 'Category deleted successfully'
        ], 200);
    }
}
