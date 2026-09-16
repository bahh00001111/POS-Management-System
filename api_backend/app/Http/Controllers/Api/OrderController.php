<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderDetail;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderController extends Controller {

    public function index(Request $request) {
        // ទាញយក Order ជាមួយ OrderDetails, Product និង Cashier (User)
        // Filter តាមកាលបរិច្ឆេទ + Pagination ដើម្បីការពារ Unbounded Query នៅពេលទិន្នន័យធំ
        $start = $this->parseDate($request->get('start_date'), 'start_date');
        $end = $this->parseDate($request->get('end_date'), 'end_date');

        $perPage = (int) $request->get('per_page', 50);
        $perPage = max(1, min($perPage, 100));

        // Order History default only shows actually-paid orders; pass
        // payment_status=UNPAID or payment_status=all to see the rest.
        $paymentStatus = $request->get('payment_status', 'PAID');
        if ($paymentStatus === 'all') {
            $paymentStatus = null;
        }

        $orders = Order::with(['details.product', 'user'])
                        ->when($paymentStatus, fn ($query) => $query->where('payment_status', $paymentStatus))
                        ->when($start, fn ($query) => $query->where('created_at', '>=', $start->startOfDay()))
                        ->when($end, fn ($query) => $query->where('created_at', '<=', $end->endOfDay()))
                        ->latest()
                        ->paginate($perPage)
                        ->withQueryString();

        return response()->json([
            'success' => true,
            'data' => $orders
        ], 200);
    }

    // គណនា Revenue Statistics ដោយផ្ទាល់នៅក្នុង Database (SUM / COUNT) មិនចាំបាច់ទាញយក Order ទាំងអស់ទេ
    public function summary(Request $request) {
        $start = $this->parseDate($request->get('start_date'), 'start_date');
        $end = $this->parseDate($request->get('end_date'), 'end_date');

        // អនុវត្ត Date Range Filter ទៅលើ query ណាមួយ
        $applyRange = function ($query, $prefix = null) use ($start, $end) {
            $col = $prefix ? "{$prefix}.created_at" : 'created_at';
            if ($start) {
                $query->where($col, '>=', $start->startOfDay());
            }
            if ($end) {
                $query->where($col, '<=', $end->endOfDay());
            }
        };

        // ១. សរុប Revenue និងចំនួន Order (SUM ក្នុង Database)
        $totalsQuery = Order::where('order_status', '!=', 'CANCELLED');
        $applyRange($totalsQuery);
        $totals = $totalsQuery
            ->selectRaw('COALESCE(SUM(total_amount), 0) as total_revenue, COUNT(*) as total_orders')
            ->first();

        $totalRevenue = (float) $totals->total_revenue;
        $totalOrders = (int) $totals->total_orders;
        $avgOrderValue = $totalOrders > 0 ? round($totalRevenue / $totalOrders, 2) : 0;

        // ២. ចំនួន Items ដែលបានលក់ (SUM quantity ពី OrderDetails)
        $itemsQuery = DB::table('orders')
            ->join('order_details', 'orders.order_id', '=', 'order_details.order_id')
            ->where('orders.order_status', '!=', 'CANCELLED');
        $applyRange($itemsQuery, 'orders');
        $itemsSold = (int) $itemsQuery->sum('order_details.quantity');

        // ៣. ស្ថិតិថ្ងៃនេះ (Hero Banner) — ប្រើ whereBetween ជំនួស whereDate ដើម្បីចាប់ INDEX លើ created_at
        $todayStart = Carbon::today()->startOfDay();
        $todayEnd = Carbon::now();
        $todayRevenue = (float) Order::where('order_status', '!=', 'CANCELLED')
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->sum('total_amount');
        $todayOrders = (int) Order::where('order_status', '!=', 'CANCELLED')
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->count();

        // ៤. Revenue រយៈពេល ៧ថ្ងៃ (Chart)
        $weekStart = Carbon::today()->subDays(6)->startOfDay();
        $daily = Order::where('order_status', '!=', 'CANCELLED')
            ->where('created_at', '>=', $weekStart)
            ->selectRaw('DATE(created_at) as date, COALESCE(SUM(total_amount), 0) as revenue')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        $labels = [];
        $weekRevenue = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = Carbon::today()->subDays($i);
            $key = $day->format('Y-m-d');
            $labels[] = $day->format('D');
            $weekRevenue[] = round((float) ($daily[$key]->revenue ?? 0), 2);
        }

        // ៥. ចំនួន Order តាមប្រភេទ (DINE_IN / TAKEAWAY / DELIVERY)
        $typeQuery = Order::where('order_status', '!=', 'CANCELLED');
        $applyRange($typeQuery);
        $types = $typeQuery
            ->selectRaw('order_type, COUNT(*) as cnt')
            ->groupBy('order_type')
            ->get()
            ->pluck('cnt', 'order_type');

        $orderTypes = [
            'dine_in' => (int) ($types['DINE_IN'] ?? 0),
            'takeaway' => (int) ($types['TAKEAWAY'] ?? 0),
            'delivery' => (int) ($types['DELIVERY'] ?? 0),
            'total' => array_sum($types->all()),
        ];

        // ៦. ផលិតផលលក់ដាច់បំផុត (Top 5)
        $topProductsQuery = DB::table('order_details')
            ->join('orders', 'orders.order_id', '=', 'order_details.order_id')
            ->join('products', 'products.product_id', '=', 'order_details.product_id')
            ->where('orders.order_status', '!=', 'CANCELLED')
            ->select(
                'products.product_id',
                'products.product_name',
                DB::raw('SUM(order_details.quantity) as total_qty'),
                DB::raw('SUM(order_details.subtotal) as total_sales')
            )
            ->groupBy('products.product_id', 'products.product_name')
            ->orderByDesc('total_qty')
            ->limit(5);
        $applyRange($topProductsQuery, 'orders');
        $topProducts = $topProductsQuery->get();

        // ៧. Orders ថ្មីៗ (កំណត់តែ ៦ ដើម្បីកុំទាញយកទាំងអស់)
        $recentOrders = Order::with(['details.product', 'user'])
            ->latest()
            ->limit(6)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'total_revenue' => round($totalRevenue, 2),
                'total_orders' => $totalOrders,
                'items_sold' => $itemsSold,
                'avg_order_value' => $avgOrderValue,
                'today' => [
                    'revenue' => round($todayRevenue, 2),
                    'orders' => $todayOrders,
                ],
                'week' => [
                    'labels' => $labels,
                    'revenue' => $weekRevenue,
                ],
                'order_types' => $orderTypes,
                'top_products' => $topProducts,
                'recent_orders' => $recentOrders,
            ],
        ], 200);
    }

    // បំប្លែង string កាលបរិច្ឆេទឲ្យទៅជា Carbon ហើយផ្ទៀងផ្ទាត់ទម្រង់
    protected function parseDate($value, $label)
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable $e) {
            abort(422, "Invalid {$label}. Expected format: YYYY-MM-DD.");
        }
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
            'payment_status' => 'nullable|in:UNPAID,PAID',
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
            // ប្រើ whereBetween ជំនួស whereDate ដើម្បីចាប់ INDEX លើ created_at
            $todayOrdersCount = Order::whereBetween('created_at', [now()->startOfDay(), now()])->count();
            $queueNumber = '#' . str_pad($todayOrdersCount + 1, 2, '0', STR_PAD_LEFT);

            // ២. បង្កើត Invoice Number uniquely
            $invoice_number = 'INV-' . date('Ymd-His') . '-' . strtoupper(Str::random(4));

            // ៣. គណនា Subtotal ពី Unit Price របស់ Cart Item នីមួយៗ
            $itemData = [];
            $subtotal = 0;

            // Batch load all products (with supplier for notifications) once to avoid N+1 queries
            $productIds = collect($request->items)->pluck('product_id');
            $products = Product::with('supplier')
                ->whereIn('product_id', $productIds)
                ->get()
                ->keyBy('product_id');

            foreach ($request->items as $item) {
                $product = $products->get($item['product_id']);
                if (!$product) {
                    abort(404, "Product {$item['product_id']} not found");
                }

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
                'payment_status'     => in_array($request->payment_status, ['UNPAID', 'PAID']) ? $request->payment_status : 'UNPAID',
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

                // ៦.១ បន្ថយស្តុក (Stock) នៅពេលលក់ ហើយបង្កើតការជូនដំណឹងពេលស្តុកជិតអស់/អស់
                $product = $item['product'];
                $newStock = max(0, (int) $product->stock - (int) $item['quantity']);
                $product->update(['stock' => $newStock]);

                if ($product->wasChanged('stock')) {
                    $this->checkStockAndNotify($product, $newStock);
                }
            }

            \Illuminate\Support\Facades\Cache::forget('products.with_relations');

            return response()->json([
                'message' => 'Order created successfully',
                'data' => $order->load('details.product', 'user')
            ], 201);
        });
    }

    public function show($id) {
        $order = \Illuminate\Support\Facades\Cache::remember("orders.{$id}", 300, function () use ($id) {
            return Order::with(['details.product', 'user'])->findOrFail($id);
        });

        return response()->json([
            'success' => true,
            'data' => $order
        ], 200);
    }

    // ពិនិត្យស្តុក ហើយបង្កើត Notification ពេលស្តុកអស់ / ជិតអស់ (កុំពាក្យដដែលៗ)
    protected function checkStockAndNotify($product, $stock)
    {
        if ($stock > 0) return;

        $type = $stock <= 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK';
        $name = $product->product_name;
        $supplierId = $product->supplier_id;
        $supplierName = $product->supplier->supplier_name ?? null;

        $message = $type === 'OUT_OF_STOCK'
            ? ($supplierName
                ? "{$name} is out of stock — contact supplier {$supplierName} to restock."
                : "{$name} is out of stock — no supplier assigned yet.")
            : "{$name} is running low on stock.";

        // កុំបង្កើត Notification ថ្មីដដែលៗ៖ បើមានស្រាប់ (អានរួចឬមិនទាន់) កុំធ្វើអ្វី
        // បើអានរួច ហើយផលិតផលនោះមកអស់ស្តុកទៀត សូមបើក/ដាស់ Notification ចាស់វិញ មិនមែនបង្កើតថ្មីទេ
        $existing = \App\Models\SystemNotification::where('product_id', $product->product_id)
            ->where('type', $type)
            ->first();

        if ($existing) {
            if ($existing->read_at) {
                $existing->update([
                    'read_at' => null,
                    'message' => $message,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            return;
        }

        \App\Models\SystemNotification::create([
            'type' => $type,
            'title' => $type === 'OUT_OF_STOCK' ? 'Out of Stock' : 'Low Stock',
            'message' => $message,
            'product_id' => $product->product_id,
            'supplier_id' => $supplierId,
        ]);
    }
}