<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class OrderController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        if ($user->isAdmin()) {
            // Admin can see all orders - build query without filtering yet
            $query = Order::query();
        } else {
            // Employee can only see their own orders
            $query = $user->orders();
        }

        // Add date filtering if provided - filter by created_at date
        if ($request->has('date') && $request->date) {
            \Log::info('Filtering orders by created_at date:', ['date' => $request->date]);
            
            // Check for both the exact date and the day before (to handle timezone display differences)
            // Example: Order created Oct 27 17:00 UTC displays as Oct 28 in local time (UTC+7)
            // So we need to include orders from UTC Oct 27 when filtering for local Oct 28
            $selectedDate = \Carbon\Carbon::parse($request->date);
            $dayBefore = $selectedDate->copy()->subDay()->format('Y-m-d');
            $selectedDay = $selectedDate->format('Y-m-d');
            
            $query->where(function($q) use ($dayBefore, $selectedDay) {
                $q->whereDate('created_at', $dayBefore)
                  ->orWhereDate('created_at', $selectedDay);
            });
        }

        // Add date range filtering if provided
        if ($request->has('start_date') && $request->start_date) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }

        if ($request->has('end_date') && $request->end_date) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        // Log the SQL query being generated
        \Log::info('Orders query SQL:', ['sql' => $query->toSql(), 'bindings' => $query->getBindings()]);
        
        $orders = $query->orderBy('created_at', 'desc')->get();
        
        \Log::info('Orders returned:', ['count' => $orders->count(), 'date_filter' => $request->date]);

        // Load user relationship after getting results to avoid filtering issues
        $orders->load('user');

        return response()->json($orders);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        \Log::info('Order creation request:', $request->all());
        
        $validator = Validator::make($request->all(), [
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'required|string|max:20',
            'customer_email' => 'nullable|email|max:255',
            'items' => 'required|array',
            'items.*.name' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.service_type' => 'required|in:wash_dry,wash_only,dry_only',
            'service_type' => 'nullable|in:wash_dry,wash_only,dry_only,mixed',
            'notes' => 'nullable|string',
            'pickup_date' => 'nullable|date',
            'delivery_date' => 'nullable|date',
            'delivery_method' => 'required|in:pickup,deliver',
        ]);

        if ($validator->fails()) {
            \Log::error('Order validation failed:', [
                'errors' => $validator->errors(),
                'request_data' => $request->all()
            ]);
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Validate based on delivery method
        if ($request->delivery_method === 'pickup' && !$request->pickup_date) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => ['pickup_date' => ['Pickup date is required for pickup orders']]
            ], 422);
        }

        if ($request->delivery_method === 'deliver' && !$request->delivery_date) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => ['delivery_date' => ['Delivery date is required for delivery orders']]
            ], 422);
        }

        // Clear opposite date based on delivery method
        $pickupDate = $request->delivery_method === 'pickup' ? $request->pickup_date : null;
        $deliveryDate = $request->delivery_method === 'deliver' ? $request->delivery_date : null;

        // Calculate total amount based on individual item service types
        $totalAmount = Order::calculateTotalAmount($request->items);
        
        // Determine service type based on items
        $serviceType = Order::determineServiceType($request->items);

        $order = Order::create([
            'user_id' => $request->user()->id,
            'customer_name' => $request->customer_name,
            'customer_phone' => $request->customer_phone,
            'customer_email' => $request->customer_email,
            'items' => $request->items,
            'service_type' => $serviceType,
            'total_amount' => $totalAmount,
            'notes' => $request->notes,
            'pickup_date' => $pickupDate,
            'delivery_date' => $deliveryDate,
            'delivery_method' => $request->delivery_method,
            'status' => 'pending', // Set default status
        ]);

        return response()->json($order->load('user'), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, string $id)
    {
        $user = $request->user();
        $order = Order::with('user')->findOrFail($id);

        // Check if user can view this order
        if (!$user->isAdmin() && $order->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($order);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $order = Order::findOrFail($id);

        // Only admin can update orders
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'customer_name' => 'sometimes|required|string|max:255',
            'customer_phone' => 'sometimes|required|string|max:20',
            'customer_email' => 'nullable|email|max:255',
            'items' => 'sometimes|required|array',
            'items.*.name' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.service_type' => 'required|in:wash_dry,wash_only,dry_only',
            'service_type' => 'sometimes|required|in:wash_dry,wash_only,dry_only,mixed',
            'status' => 'sometimes|required|in:pending,processing,ready,completed,cancelled',
            'notes' => 'nullable|string',
            'pickup_date' => 'nullable|date',
            'delivery_date' => 'nullable|date|after_or_equal:pickup_date',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $updateData = $request->all();
        
        // Recalculate total amount and service type if items changed
        if ($request->has('items')) {
            $items = $request->items;
            $updateData['total_amount'] = Order::calculateTotalAmount($items);
            $updateData['service_type'] = Order::determineServiceType($items);
        }

        $order->update($updateData);

        return response()->json($order->load('user'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $order = Order::findOrFail($id);

        // Only admin can delete orders
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $order->delete();

        return response()->json(['message' => 'Order deleted successfully']);
    }


    /**
     * Get statistics for admin dashboard
     */
    public function statistics(Request $request)
    {
        $user = $request->user();
        
        \Log::info('Statistics request from user:', [
            'user_id' => $user ? $user->id : 'null',
            'user_role' => $user ? $user->role : 'null',
            'is_admin' => $user ? $user->isAdmin() : 'null'
        ]);
        
        if (!$user || !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $totalOrders = Order::count();
        $pendingOrders = Order::where('status', 'pending')->count();
        $processingOrders = Order::where('status', 'processing')->count();
        $readyOrders = Order::where('status', 'ready')->count();
        $completedOrders = Order::where('status', 'completed')->count();
        $totalRevenue = Order::where('status', 'completed')->sum('total_amount') ?? 0;

        \Log::info('Statistics calculated:', [
            'total_orders' => $totalOrders,
            'pending_orders' => $pendingOrders,
            'processing_orders' => $processingOrders,
            'ready_orders' => $readyOrders,
            'completed_orders' => $completedOrders,
            'total_revenue' => $totalRevenue,
        ]);

        return response()->json([
            'total_orders' => $totalOrders ?? 0,
            'pending_orders' => $pendingOrders ?? 0,
            'processing_orders' => $processingOrders ?? 0,
            'ready_orders' => $readyOrders ?? 0,
            'completed_orders' => $completedOrders ?? 0,
            'total_revenue' => $totalRevenue ?? 0,
        ]);
    }

    /**
     * Search orders by customer name (public endpoint for customers)
     */
    public function searchByCustomerName(Request $request)
    {
        $customerName = $request->query('customer_name');
        
        \Log::info('Customer search request:', ['customer_name' => $customerName]);
        
        if (!$customerName) {
            return response()->json(['message' => 'Customer name is required'], 400);
        }

        // Use stricter matching - check both exact match and case-insensitive partial match
        $orders = Order::where(function($query) use ($customerName) {
                $query->where('customer_name', '=', $customerName)
                      ->orWhere('customer_name', 'LIKE', $customerName . ' %')  // Starts with
                      ->orWhere('customer_name', 'LIKE', '% ' . $customerName . '%'); // Contains as word
            })
            ->orderBy('created_at', 'desc')
            ->get();
        
        \Log::info('Customer search results:', ['count' => $orders->count(), 'customer_name' => $customerName]);

        return response()->json($orders);
    }

    /**
     * Get employee overview for admin
     */
    public function employeeOverview(Request $request)
    {
        $user = $request->user();
        
        if (!$user || !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $employees = \App\Models\User::where('role', 'employee')
            ->withCount('orders')
            ->orderBy('created_at', 'desc')
            ->get(['id', 'name', 'email', 'created_at']);

        $employeesData = $employees->map(function($employee) {
            return [
                'id' => $employee->id,
                'name' => $employee->name,
                'email' => $employee->email,
                'orders_count' => $employee->orders_count,
                'created_at' => $employee->created_at->format('Y-m-d H:i:s'),
                'created_at_formatted' => $employee->created_at->format('F j, Y'),
            ];
        });

        return response()->json($employeesData);
    }
}
