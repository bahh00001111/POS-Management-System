<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SupplierController extends Controller
{
    public function index()
    {
        // withCount ផ្ទុកតែលេខរាប់ មិនមែន Products ទាំងអស់ -> កាត់បន្ថយ payload ជាច្រើន
        // Cache 5 នាទី ព្រោះ Supplier ប្រែប្រួលតិចតួច (Invalidate ពេល CRUD)
        $suppliers = Cache::remember('suppliers.with_count', 300, function () {
            return Supplier::withCount('products')->get();
        });

        return response()->json([
            'message' => 'Suppliers retrieved successfully',
            'data' => $suppliers,
        ], 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'supplier_name' => 'required|string|max:255',
            'contact_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
        ]);

        $supplier = Supplier::create($request->only([
            'supplier_name',
            'contact_name',
            'phone',
            'email',
            'address',
        ]));

        Cache::forget('suppliers.with_count');

        return response()->json([
            'message' => 'Supplier created successfully',
            'data' => $supplier,
        ], 201);
    }

    public function show($id)
    {
        $supplier = Supplier::with('products')->findOrFail($id);

        return response()->json([
            'message' => 'Supplier retrieved successfully',
            'data' => $supplier,
        ], 200);
    }

    public function update(Request $request, $id)
    {
        $supplier = Supplier::findOrFail($id);

        $request->validate([
            'supplier_name' => 'required|string|max:255',
            'contact_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
        ]);

        $supplier->update($request->only([
            'supplier_name',
            'contact_name',
            'phone',
            'email',
            'address',
        ]));

        Cache::forget('suppliers.with_count');

        return response()->json([
            'message' => 'Supplier updated successfully',
            'data' => $supplier,
        ], 200);
    }

    public function destroy($id)
    {
        $supplier = Supplier::findOrFail($id);
        $supplier->delete();

        Cache::forget('suppliers.with_count');

        return response()->json([
            'message' => 'Supplier deleted successfully',
        ], 200);
    }
}