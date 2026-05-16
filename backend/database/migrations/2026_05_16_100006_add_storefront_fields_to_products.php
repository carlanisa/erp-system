<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('publish_to_website')->default(false)->after('is_active');
            $table->text('size_chart_md')->nullable()->after('publish_to_website');
            $table->index('publish_to_website');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['publish_to_website', 'size_chart_md']);
        });
    }
};
