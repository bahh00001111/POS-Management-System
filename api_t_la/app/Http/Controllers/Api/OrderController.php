<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderDetail;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderController extends Controller {

    public function index() {
        // ទាញយក Order ទាំងអស់ជាមួយ OrderDetails, Product និង Cashier (User)
        $orders = Order::with(['details.product', 'user'])
                        ->latest()
                        ->get();

        return response()->json([
            'success' => true,
            'data' => $orders
        ], 200);
    }

    public function store(Request $request) {
        $request->validate([
            'order_type' => 'required|in:DINE_IN,TAKEAWAY,DELIVERY',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,product_id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'nullable|numeric|min:0',
            'items.*.size' => 'nullable|string|max:50',
            'items.*.sugar_level' => 'nullable|string|max:50',
            'items.*.remarks' => 'nullable|string|max:500',
            'discount_type' => 'nullable|in:PERCENT,FIXED',
            'discount_value' => 'nullable|numeric|min:0',
            'delivery_method' => 'nullable|in:IN_HOUSE,THIRD_PARTY',
            'delivery_fee' => 'nullable|numeric|min:0',
            'customer_name' => 'nullable|string|max:255',
            'phone_number' => 'nullable|string|max:50',
            'delivery_address' => 'nullable|string|max:500',
            'delivery_platform' => 'nullable|string|max:100',
            'external_order_id' => 'nullable|string|max:255',
        ]);

        return DB::transaction(function () use ($request) {
            // ១. បង្កើត Queue Number អូតូសម្រាប់ថ្ងៃនេះ (ឧទាហរណ៍: #01, #02, #03)
            $todayOrdersCount = Order::whereDate('created_at', now()->today())->count();
            $queueNumber = '#' . str_pad($todayOrdersCount + 1, 2, '0', STR_PAD_LEFT);

            // ២. បង្កើត Invoice Number uniquely
            $invoice_number = 'INV-' . date('Ymd-His') . '-' . strtoupper(Str::random(4));

            // ៣. គណនា Subtotal ពី Unit Price របស់ Cart Item នីមួយៗ
            $itemData = [];
            $subtotal = 0;

            foreach ($request->items as $item) {
                $product = Product::where('product_id', $item['product_id'])->firstOrFail();

                $unitPrice = isset($item['price']) && is_numeric($item['price'])
                    ? (float) $item['price']
                    : (float) $product->price;
                $unitPrice = max(0, round($unitPrice, 2));

                $lineTotal = round($unitPrice * (int) $item['quantity'], 2);
                $subtotal += $lineTotal;

                $itemData[] = [
                    'product'    => $product,
                    'quantity'   => (int) $item['quantity'],
                    'unit_price' => $unitPrice,
                    'line_total' => $lineTotal,
                    'size'       => $item['size'] ?? null,
                    'sugar'      => $item['sugar_level'] ?? null,
                    'remarks'    => $item['remarks'] ?? null,
                ];
            }

            $subtotal = round($subtotal, 2);

            // ៤. គណនាចំនួនបញ្ចុះតម្លៃ (Discount) ដោយសុវត្ថិភាព
            $discountAmount = 0;
            if ($request->discount_type && $request->discount_value !== null) {
                $discountValue = max(0, (float) $request->discount_value);
                if ($request->discount_type === 'PERCENT') {
                    $discountAmount = round($subtotal * ($discountValue / 100), 2);
                } else {
                    $discountAmount = $discountValue;
                }
                $discountAmount = min($discountAmount, $subtotal);
            }

            $totalAmount = round($subtotal - $discountAmount, 2);

            // ៤.១ គណនា Delivery Fee (តែ Delivery ប៉ុណ្ណោះ)
            $deliveryFee = 0;
            if (strtoupper($request->order_type) === 'DELIVERY') {
                $deliveryFee = $request->delivery_fee !== null && is_numeric($request->delivery_fee)
                    ? max(0, round((float) $request->delivery_fee, 2))
                    : 0;
            }

            $totalAmount = round($subtotal + $deliveryFee - $discountAmount, 2);

            // ៥. បង្កើត Order record
            $order = Order::create([
                'invoice_number'     => $invoice_number,
                'queue_number'       => $queueNumber,
                'order_type'         => $request->order_type,
                'order_status'       => 'PENDING',
                'payment_status'     => 'PAID',
                'subtotal'           => $subtotal,
                'discount_type'      => $request->discount_type,
                'discount_value'     => $request->discount_value !== null ? (float) $request->discount_value : null,
                'discount_amount'    => $discountAmount,
                'delivery_method'    => $request->delivery_method,
                'delivery_fee'       => $deliveryFee,
                'customer_name'      => $request->customer_name,
                'phone_number'       => $request->phone_number,
                'delivery_address'   => $request->delivery_address,
                'delivery_platform'  => $request->delivery_platform,
                'external_order_id'  => $request->external_order_id,
                'total_amount'       => $totalAmount,
                'user_id'            => $request->user()->user_id ?? null, // Cashier Logged-in via Sanctum
            ]);

            // ៦. រក្សាទុក Order Details ជាមួយនឹង Modifiers
            foreach ($itemData as $item) {
                OrderDetail::create([
                    'order_id'    => $order->order_id,
                    'product_id'  => $item['product']->product_id,
                    'quantity'    => $item['quantity'],
                    'unit_price'  => $item['unit_price'],
                    'subtotal'    => $item['line_total'],
                    'size'        => $item['size'],
                    'sugar_level' => $item['sugar'],
                    'remarks'     => $item['remarks'],
                ]);
            }

            return response()->json([
                'message' => 'Order created successfully',
                'data' => $order->load('details.product', 'user')
            ], 201);
        });
    }

    public function show($id) {
        $order = Order::with(['details.product', 'user'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $order
        ], 200);
    }
}