<?php
/**
 * ERP Code Installer — Collections + SEO + Category Update
 * Upload this to: public/ folder on server
 * Access: https://erp.earntodiemodapk.com/erp-installer.php?token=carlanisa2026
 * DELETE AFTER USE!
 */

$SECRET = 'carlanisa2026';
if (($_GET['token'] ?? '') !== $SECRET) {
    http_response_code(403); die('Forbidden');
}

header('Content-Type: text/plain; charset=utf-8');
$base = dirname(__DIR__);

echo "=== ERP Installer: Collections + SEO + Category ===\n\n";

// ─── 1. Create ProductCollection Model ───────────────────────
$modelDir = "$base/app/Models/Inventory";
$modelFile = "$modelDir/ProductCollection.php";
if (!file_exists($modelFile)) {
    $content = <<<'PHP'
<?php
namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ProductCollection extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'is_active', 'sort_order'];
    protected $casts = ['sort_order' => 'integer', 'is_active' => 'boolean'];

    protected static function booted(): void
    {
        static::saving(function (self $col) {
            if (empty($col->slug)) {
                $base = Str::slug($col->name);
                $slug = $base; $i = 1;
                while (self::where('slug', $slug)->where('id', '!=', $col->id ?? 0)->exists()) {
                    $slug = $base . '-' . (++$i);
                }
                $col->slug = $slug;
            }
        });
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'collection_id')->orderBy('name');
    }
}
PHP;
    file_put_contents($modelFile, $content);
    echo "✅ Created: app/Models/Inventory/ProductCollection.php\n";
} else {
    echo "ℹ️  Already exists: ProductCollection.php\n";
}

// ─── 2. Create ProductCollectionController ───────────────────
$ctrlDir = "$base/app/Http/Controllers/Api/Inventory";
$ctrlFile = "$ctrlDir/ProductCollectionController.php";
if (!file_exists($ctrlFile)) {
    $content = <<<'PHP'
<?php
namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Inventory\ProductCollection;
use Illuminate\Http\Request;

class ProductCollectionController extends Controller
{
    public function index()
    {
        $cols = ProductCollection::orderBy('sort_order')->orderBy('name')->get();
        return response()->json(['success' => true, 'data' => $cols]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:200',
            'slug'        => 'nullable|string|max:220|unique:product_collections,slug',
            'description' => 'nullable|string',
            'sort_order'  => 'nullable|integer|min:0',
            'is_active'   => 'nullable|boolean',
        ]);
        $col = ProductCollection::create($data + ['is_active' => $data['is_active'] ?? true]);
        return response()->json(['success' => true, 'data' => $col], 201);
    }

    public function show(ProductCollection $productCollection)
    {
        return response()->json(['success' => true, 'data' => $productCollection->load('products:id,name,sku,category,is_active')]);
    }

    public function update(Request $request, ProductCollection $productCollection)
    {
        $data = $request->validate([
            'name'        => 'sometimes|string|max:200',
            'slug'        => 'nullable|string|max:220|unique:product_collections,slug,' . $productCollection->id,
            'description' => 'nullable|string',
            'sort_order'  => 'nullable|integer|min:0',
            'is_active'   => 'nullable|boolean',
        ]);
        $productCollection->update($data);
        return response()->json(['success' => true, 'data' => $productCollection]);
    }

    public function destroy(ProductCollection $productCollection)
    {
        $productCollection->delete();
        return response()->json(['success' => true]);
    }

    public function flat()
    {
        $cols = ProductCollection::where('is_active', true)
            ->orderBy('sort_order')->orderBy('name')
            ->get(['id', 'name', 'slug']);
        return response()->json(['success' => true, 'data' => $cols]);
    }
}
PHP;
    file_put_contents($ctrlFile, $content);
    echo "✅ Created: ProductCollectionController.php\n";
} else {
    echo "ℹ️  Already exists: ProductCollectionController.php\n";
}

// ─── 3. Create InventorySettingsController ───────────────────
$settingsCtrlFile = "$ctrlDir/InventorySettingsController.php";
if (!file_exists($settingsCtrlFile)) {
    $content = <<<'PHP'
<?php
namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventorySettingsController extends Controller
{
    public function index()
    {
        $rows = DB::table('inventory_settings')->get();
        $map = [];
        foreach ($rows as $row) { $map[$row->key] = $row->value; }
        return response()->json(['success' => true, 'data' => $map]);
    }

    public function upsert(Request $request)
    {
        $payload = $request->validate([
            'settings'   => 'required|array',
            'settings.*' => 'nullable|string|max:2000',
            'group'      => 'nullable|string|max:50',
        ]);
        $group = $payload['group'] ?? 'general';
        foreach ($payload['settings'] as $key => $value) {
            DB::table('inventory_settings')->upsert(
                [['key' => $key, 'value' => $value, 'group' => $group, 'created_at' => now(), 'updated_at' => now()]],
                ['key'],
                ['value', 'group', 'updated_at']
            );
        }
        return response()->json(['success' => true, 'message' => 'Settings saved']);
    }
}
PHP;
    file_put_contents($settingsCtrlFile, $content);
    echo "✅ Created: InventorySettingsController.php\n";
} else {
    echo "ℹ️  Already exists: InventorySettingsController.php\n";
}

// ─── 4. Create Migration ─────────────────────────────────────
$migDir  = "$base/database/migrations";
$migFile = "$migDir/2026_05_14_100001_create_product_collections_table.php";
if (!file_exists($migFile)) {
    $content = <<<'PHP'
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('product_collections')) {
            Schema::create('product_collections', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('slug')->unique();
                $table->text('description')->nullable();
                $table->unsignedTinyInteger('sort_order')->default(0);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (Schema::hasTable('products') && !Schema::hasColumn('products', 'collection_id')) {
            Schema::table('products', function (Blueprint $table) {
                $table->foreignId('collection_id')
                      ->nullable()
                      ->after('department_id')
                      ->constrained('product_collections')
                      ->nullOnDelete();
            });
        }

        if (!Schema::hasTable('inventory_settings')) {
            Schema::create('inventory_settings', function (Blueprint $table) {
                $table->id();
                $table->string('key')->unique();
                $table->text('value')->nullable();
                $table->string('group', 50)->default('general');
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('products', 'collection_id')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropConstrainedForeignId('collection_id');
            });
        }
        Schema::dropIfExists('product_collections');
        Schema::dropIfExists('inventory_settings');
    }
};
PHP;
    file_put_contents($migFile, $content);
    echo "✅ Created: migration file\n";
} else {
    echo "ℹ️  Migration file already exists\n";
}

// ─── 5. Update routes/api.php ────────────────────────────────
$routesFile = "$base/routes/api.php";
$routes = file_get_contents($routesFile);
if (strpos($routes, 'ProductCollectionController') === false) {
    // Add use statements
    $routes = str_replace(
        "use App\\Http\\Controllers\\Api\\Inventory\\TailorOrderController;",
        "use App\\Http\\Controllers\\Api\\Inventory\\TailorOrderController;\nuse App\\Http\\Controllers\\Api\\Inventory\\ProductCollectionController;\nuse App\\Http\\Controllers\\Api\\Inventory\\InventorySettingsController;",
        $routes
    );
    // Add routes after product-types
    $routes = str_replace(
        "        // Stock items (raw materials / fabric / accessories)",
        "        // Product Collections master\n        Route::get('product-collections/flat', [ProductCollectionController::class, 'flat']);\n        Route::apiResource('product-collections', ProductCollectionController::class)\n            ->parameters(['product-collections' => 'productCollection']);\n\n        // Inventory global settings (SEO, Marketing Identity, etc.)\n        Route::get('settings',  [InventorySettingsController::class, 'index']);\n        Route::post('settings', [InventorySettingsController::class, 'upsert']);\n\n        // Stock items (raw materials / fabric / accessories)",
        $routes
    );
    file_put_contents($routesFile, $routes);
    echo "✅ Updated: routes/api.php\n";
} else {
    echo "ℹ️  Routes already updated\n";
}

// ─── 6. Update Product model ─────────────────────────────────
$productModel = "$base/app/Models/Inventory/Product.php";
$model = file_get_contents($productModel);
if (strpos($model, 'collection_id') === false) {
    $model = str_replace(
        "'default_bom_id', 'category', 'department_id', 'uom',",
        "'default_bom_id', 'category', 'department_id', 'collection_id', 'uom',",
        $model
    );
    $model = str_replace(
        "public function department(): BelongsTo { return \$this->belongsTo(StockDepartment::class, 'department_id'); }",
        "public function department(): BelongsTo  { return \$this->belongsTo(StockDepartment::class, 'department_id'); }\n    public function collection(): BelongsTo  { return \$this->belongsTo(ProductCollection::class, 'collection_id'); }",
        $model
    );
    file_put_contents($productModel, $model);
    echo "✅ Updated: Product.php model\n";
} else {
    echo "ℹ️  Product.php already updated\n";
}

// ─── 7. Run Migration ─────────────────────────────────────────
echo "\n🔄 Running migration...\n";
try {
    require $base . '/vendor/autoload.php';
    $app = require_once $base . '/bootstrap/app.php';
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();

    $exitCode = Illuminate\Support\Facades\Artisan::call('migrate', [
        '--path'  => 'database/migrations/2026_05_14_100001_create_product_collections_table.php',
        '--force' => true,
    ]);
    echo Illuminate\Support\Facades\Artisan::output();

    if ($exitCode === 0) {
        echo "\n✅ Migration complete!\n";
    } else {
        echo "\n⚠️  Migration had issues. Exit code: $exitCode\n";
    }

    // Clear route cache
    Illuminate\Support\Facades\Artisan::call('route:clear');
    Illuminate\Support\Facades\Artisan::call('config:clear');
    echo "✅ Cache cleared\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "   " . $e->getFile() . ":" . $e->getLine() . "\n";
}

echo "\n=== DONE ===\n";
echo "⚠️  DELETE THIS FILE NOW: public/erp-installer.php\n";
echo "   rm " . __FILE__ . "\n";
