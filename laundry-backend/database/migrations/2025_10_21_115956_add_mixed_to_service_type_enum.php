<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update the service_type enum to include 'mixed'
        DB::statement("ALTER TABLE orders MODIFY COLUMN service_type ENUM('wash_dry', 'wash_only', 'dry_only', 'mixed') DEFAULT 'wash_dry'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert the service_type enum to original values
        DB::statement("ALTER TABLE orders MODIFY COLUMN service_type ENUM('wash_dry', 'wash_only', 'dry_only') DEFAULT 'wash_dry'");
    }
};
