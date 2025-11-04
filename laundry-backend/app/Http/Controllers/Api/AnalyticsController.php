<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AnalyticsController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        
        if (!$user || !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Service Type Distribution
        $serviceTypes = Order::select('service_type', DB::raw('count(*) as count'))
            ->groupBy('service_type')
            ->get()
            ->map(function ($item) {
                return [
                    'service_type' => $this->getServiceTypeDisplayName($item->service_type),
                    'count' => $item->count
                ];
            });

        // Day of Week Analysis
        $dayOfWeek = Order::select(
                DB::raw('DAYNAME(created_at) as day'),
                DB::raw('count(*) as count')
            )
            ->groupBy(DB::raw('DAYNAME(created_at)'))
            ->orderBy(DB::raw('DAYOFWEEK(created_at)'))
            ->get()
            ->map(function ($item) {
                return [
                    'day' => $item->day,
                    'count' => $item->count
                ];
            });

        // Revenue by Month (last 6 months)
        $revenue = Order::select(
                DB::raw('DATE_FORMAT(created_at, "%Y-%m") as period'),
                DB::raw('SUM(total_amount) as amount')
            )
            ->where('status', 'completed')
            ->where('created_at', '>=', Carbon::now()->subMonths(6))
            ->groupBy(DB::raw('DATE_FORMAT(created_at, "%Y-%m")'))
            ->orderBy('period')
            ->get()
            ->map(function ($item) {
                return [
                    'period' => Carbon::createFromFormat('Y-m', $item->period)->format('M Y'),
                    'amount' => (float) $item->amount
                ];
            });

        // Customer Frequency Analysis
        $customerFrequency = Order::select(
                'customer_name',
                DB::raw('count(*) as order_count'),
                DB::raw('SUM(total_amount) as total_spent')
            )
            ->groupBy('customer_name')
            ->orderBy('order_count', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($item) {
                return [
                    'customer_name' => $item->customer_name,
                    'order_count' => $item->order_count,
                    'total_spent' => (float) $item->total_spent
                ];
            });

        // Peak Hours Analysis
        $peakHours = Order::select(
                DB::raw('HOUR(created_at) as hour'),
                DB::raw('count(*) as count')
            )
            ->groupBy(DB::raw('HOUR(created_at)'))
            ->orderBy('hour')
            ->get()
            ->map(function ($item) {
                return [
                    'hour' => $item->hour . ':00',
                    'count' => $item->count
                ];
            });

        // Status Distribution
        $statusDistribution = Order::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(function ($item) {
                return [
                    'status' => ucfirst($item->status),
                    'count' => $item->count
                ];
            });

        return response()->json([
            'serviceTypes' => $serviceTypes,
            'dayOfWeek' => $dayOfWeek,
            'revenue' => $revenue,
            'customerFrequency' => $customerFrequency,
            'peakHours' => $peakHours,
            'statusDistribution' => $statusDistribution
        ]);
    }

    private function getServiceTypeDisplayName($serviceType)
    {
        $displayNames = [
            'wash_dry' => 'Wash & Dry',
            'wash_only' => 'Wash Only',
            'dry_only' => 'Dry Only',
            'mixed' => 'Mixed Services'
        ];

        return $displayNames[$serviceType] ?? $serviceType;
    }
}
