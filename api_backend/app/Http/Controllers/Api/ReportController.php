<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function revenue(Request $request)
    {
        $daysParam = $request->route('days', 7);
        $isAllTime = $daysParam === 'all' || $daysParam === 'ALL';

        if (!$isAllTime) {
            $days = (int) $daysParam;

            if (!in_array($days, [1, 3, 7, 15, 30, 60])) {
                return response()->json([
                    'message' => 'Invalid days parameter. Allowed: 1, 3, 7, 15, 30, 60 or all',
                    'data' => null,
                ], 422);
            }
        } else {
            $days = 0;
        }

        // ── Custom Date Range (Start Date - End Date) ──
        // នៅពេលប្រើ start_date / end_date វាឈ្នះលើប៉ារ៉ាម៉ែត្រ days
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $isCustomRange = $startDate || $endDate;

        $startOfRange = Carbon::today()->subDays($days > 0 ? $days - 1 : 6)->startOfDay();
        $endOfRange = Carbon::now();

        if ($isCustomRange) {
            try {
                $start = $startDate ? Carbon::parse($startDate) : Carbon::today()->subDays($days > 0 ? $days - 1 : 6);
                $end = $endDate ? Carbon::parse($endDate) : Carbon::now();
            } catch (\Throwable $e) {
                return response()->json([
                    'message' => 'Invalid date format. Expected: YYYY-MM-DD',
                    'data' => null,
                ], 422);
            }

            if ($start->greaterThan($end)) {
                return response()->json([
                    'message' => 'End date cannot be earlier than start date.',
                    'data' => null,
                ], 422);
            }

            $startOfRange = $start->copy()->startOfDay();
            $endOfRange = $end->copy()->endOfDay();
            $days = (int) $startOfRange->diffInDays($endOfRange) + 1;
        } elseif ($isAllTime) {
            // ── All Time ── ចាប់ពី Order ដំបូងបំផុតរហូតដល់ពេលបច្ចុប្បន្ន
            $firstOrderDate = Order::whereNotNull('created_at')->min('created_at');
            $startOfRange = $firstOrderDate ? Carbon::parse($firstOrderDate)->startOfDay() : Carbon::today();
            $endOfRange = Carbon::now();
            $days = (int) $startOfRange->copy()->startOfDay()->diffInDays(Carbon::today()->startOfDay()) + 1;
        }

        // រយៈពេលមុន (Previous Period) មានចំនួនថ្ងៃស្មើគ្នា មុនរយៈពេលបច្ចុប្បន្ន
        $prevStart = $startOfRange->copy()->subDays($days)->startOfDay();
        $prevEnd = $startOfRange->copy()->subDay()->endOfDay();

        $period = Order::where('order_status', '!=', 'CANCELLED')
            ->whereBetween('created_at', [$startOfRange, $endOfRange])
            ->selectRaw('COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as order_count')
            ->first();

        $previous = Order::where('order_status', '!=', 'CANCELLED')
            ->whereBetween('created_at', [$prevStart, $prevEnd])
            ->selectRaw('COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as order_count')
            ->first();

        // បង្កើត labels ពី Start ដល់ End (ឬពីចង្វាក់ days mode)
        $labels = [];
        $series = [];
        $orderSeries = [];

        if ($days > 62) {
            // រយៈពេលវែង (All Time) → ប្រមូលតាមខែ ដើម្បីកុំឲ្យ Chart មានចំនុចច្រើនពេក
            $monthly = Order::where('order_status', '!=', 'CANCELLED')
                ->whereBetween('created_at', [$startOfRange, $endOfRange])
                ->selectRaw('DATE_FORMAT(created_at, "%Y-%m-01") as date, COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as order_count')
                ->groupBy('date')
                ->orderBy('date')
                ->get()
                ->keyBy('date');

            $monthStart = $startOfRange->copy()->startOfMonth();
            $monthEnd = $endOfRange->copy()->startOfMonth();
            for ($m = $monthStart->copy(); !$m->gt($monthEnd); $m->addMonth()) {
                $key = $m->format('Y-m-01');
                $labels[] = $m->format('M y');
                $series[] = round((float) ($monthly[$key]->revenue ?? 0), 2);
                $orderSeries[] = (int) ($monthly[$key]->order_count ?? 0);
            }
        } else {
            $daily = Order::where('order_status', '!=', 'CANCELLED')
                ->whereBetween('created_at', [$startOfRange, $endOfRange])
                ->selectRaw('DATE(created_at) as date, COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as order_count')
                ->groupBy('date')
                ->orderBy('date')
                ->get()
                ->keyBy('date');

            for ($i = $days - 1; $i >= 0; $i--) {
                $day = $startOfRange->copy()->addDays($i);
                $key = $day->format('Y-m-d');
                $labels[] = $day->format('M d');
                $series[] = round((float) ($daily[$key]->revenue ?? 0), 2);
                $orderSeries[] = (int) ($daily[$key]->order_count ?? 0);
            }
        }

        $topProducts = OrderDetail::join('orders', 'orders.order_id', '=', 'order_details.order_id')
            ->join('products', 'products.product_id', '=', 'order_details.product_id')
            ->where('orders.order_status', '!=', 'CANCELLED')
            ->whereBetween('orders.created_at', [$startOfRange, $endOfRange])
            ->select(
                'products.product_name',
                'products.product_id',
                DB::raw('SUM(order_details.quantity) as total_qty'),
                DB::raw('SUM(order_details.subtotal) as total_sales')
            )
            ->groupBy('products.product_id', 'products.product_name')
            ->orderByDesc('total_qty')
            ->limit(10)
            ->get();

        return response()->json([
            'message' => 'Revenue report retrieved successfully',
            'data' => [
                'days' => $days,
                'custom_range' => $isCustomRange,
                'period' => [
                    'start_date' => $startOfRange->format('Y-m-d'),
                    'end_date' => $endOfRange->format('Y-m-d'),
                ],
                'revenue' => round((float) $period->revenue, 2),
                'order_count' => (int) $period->order_count,
                'average_revenue_per_day' => round($days > 0 ? (float) $period->revenue / $days : 0, 2),
                'previous_period' => [
                    'revenue' => round((float) $previous->revenue, 2),
                    'order_count' => (int) $previous->order_count,
                ],
                'chart' => [
                    'labels' => $labels,
                    'revenue' => $series,
                    'orders' => $orderSeries,
                ],
                'top_products' => $topProducts,
            ],
        ], 200);
    }
}