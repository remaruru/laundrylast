<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Order extends Model
{
    protected $fillable = [
        'user_id',
        'customer_name',
        'customer_phone',
        'customer_email',
        'items',
        'total_amount',
        'status',
        'service_type', // Keep for backward compatibility
        'notes',
        'pickup_date',
        'delivery_date',
        'delivery_method',
    ];

    protected $casts = [
        'items' => 'array',
        'total_amount' => 'decimal:2',
        'pickup_date' => 'date',
        'delivery_date' => 'date',
    ];

    /**
     * Get the user that owns the order.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Calculate price based on service type.
     */
    public static function getServicePrice($serviceType)
    {
        $prices = [
            'wash_dry' => 100,
            'wash_only' => 60,
            'dry_only' => 50,
        ];

        return $prices[$serviceType] ?? 100;
    }

    /**
     * Calculate total amount for items with individual service types.
     */
    public static function calculateTotalAmount($items)
    {
        $total = 0;
        foreach ($items as $item) {
            $serviceType = $item['service_type'] ?? 'wash_dry';
            $quantity = $item['quantity'] ?? 1;
            $price = self::getServicePrice($serviceType);
            $total += $price * $quantity;
        }
        return $total;
    }

    /**
     * Determine service type based on items.
     */
    public static function determineServiceType($items)
    {
        if (empty($items)) {
            return 'wash_dry';
        }
        
        $serviceTypes = array_filter(array_column($items, 'service_type'));
        $uniqueServiceTypes = array_unique($serviceTypes);
        
        // If only one type of service
        if (count($uniqueServiceTypes) === 1) {
            return reset($uniqueServiceTypes);
        }
        
        // If multiple different service types, it's mixed
        if (count($uniqueServiceTypes) > 1) {
            return 'mixed';
        }
        
        // Default fallback
        return 'wash_dry';
    }

    /**
     * Get service type display name.
     */
    public function getServiceTypeDisplayAttribute()
    {
        $displayNames = [
            'wash_dry' => 'Wash & Dry',
            'wash_only' => 'Wash Only',
            'dry_only' => 'Dry Only',
        ];

        return $displayNames[$this->service_type] ?? 'Wash & Dry';
    }
}
