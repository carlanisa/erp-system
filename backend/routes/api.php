<?php

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Accounting\AccountController;
use App\Http\Controllers\Api\Accounting\InvoiceController;
use App\Http\Controllers\Api\Accounting\PaymentController;
use App\Http\Controllers\Api\Accounting\PaymentVoucherController;
use App\Http\Controllers\Api\Accounting\OfficialReceiptController;
use App\Http\Controllers\Api\Accounting\JournalEntryController;
use App\Http\Controllers\Api\Accounting\ArDepositController;
use App\Http\Controllers\Api\Accounting\ApDepositController;
use App\Http\Controllers\Api\Accounting\BankReconciliationController;
use App\Http\Controllers\Api\CRM\CustomerController;
use App\Http\Controllers\Api\CRM\MasterController as CrmMasterController;
use App\Http\Controllers\Api\CRM\LeadController as CrmLeadController;
use App\Http\Controllers\Api\CRM\ActivityController as CrmActivityController;
use App\Http\Controllers\Api\CRM\QuotationController as CrmQuotationController;
use App\Http\Controllers\Api\CRM\InvoiceController as CrmInvoiceController;
use App\Http\Controllers\Api\CRM\InstallmentController as CrmInstallmentController;
use App\Http\Controllers\Api\Inventory\ProductController;
use App\Http\Controllers\Api\Inventory\ProductCategoryController;
use App\Http\Controllers\Api\Inventory\ProductTypeController;
use App\Http\Controllers\Api\Inventory\StockMovementController;
use App\Http\Controllers\Api\Inventory\StockDepartmentController;
use App\Http\Controllers\Api\Inventory\StockItemController;
use App\Http\Controllers\Api\Inventory\StockLocationController;
use App\Http\Controllers\Api\Inventory\TailorController;
use App\Http\Controllers\Api\Inventory\BomController;
use App\Http\Controllers\Api\Inventory\TailorOrderController;
use App\Http\Controllers\Api\Inventory\ProductCollectionController;
use App\Http\Controllers\Api\Inventory\InventorySettingsController;
use App\Http\Controllers\Api\HRM\EmployeeController;
use App\Http\Controllers\Api\HRM\AttendanceController;
use App\Http\Controllers\Api\HRM\DepartmentController as HrmDepartmentController;
use App\Http\Controllers\Api\HRM\DesignationController as HrmDesignationController;
use App\Http\Controllers\Api\HRM\LeaveTypeController;
use App\Http\Controllers\Api\HRM\HolidayController;
use App\Http\Controllers\Api\HRM\ShiftController;
use App\Http\Controllers\Api\HRM\LeaveController;
use App\Http\Controllers\Api\HRM\PayrollController;
use App\Http\Controllers\Api\HRM\AllowanceTypeController;
use App\Http\Controllers\Api\HRM\DeductionTypeController;
use App\Http\Controllers\Api\HRM\SalaryAdvanceController;
use App\Http\Controllers\Api\HRM\OfficeLocationController;
use App\Http\Controllers\Api\HRM\MobileAttendanceController;
use App\Http\Controllers\Api\HRM\JobDescriptionController;
use App\Http\Controllers\Api\Projects\ProjectController;
use App\Http\Controllers\Api\Projects\TaskController;
use App\Http\Controllers\Api\Projects\TaskCommentController;
use App\Http\Controllers\Api\AiChatController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\Suppliers\SupplierController;
use App\Http\Controllers\Api\Suppliers\PurchaseInvoiceController;
use App\Http\Controllers\Api\Sales\SalesOrderController;
use App\Http\Controllers\Api\Sales\SaleInvoiceController;
use App\Http\Controllers\Api\Sales\SaleReturnController;
use App\Http\Controllers\Api\Sales\PosController;
use App\Http\Controllers\Api\Sales\SalesReportController;
use App\Http\Controllers\Api\Sales\OrderManagement\MarketplaceOrderController;
use App\Http\Controllers\Api\Sales\OrderManagement\OrderPickController;
use App\Http\Controllers\Api\Sales\OrderManagement\AwbController;
use App\Http\Controllers\Api\Sales\OrderManagement\MarketplaceReturnController;
use App\Http\Controllers\Api\Sales\OrderManagement\ChannelController as MarketplaceChannelController;
use App\Http\Controllers\Api\Sales\OrderManagement\WebhookController as MarketplaceWebhookController;
use App\Http\Controllers\Api\AttachmentController;
use App\Http\Controllers\Api\EmailController;
use App\Http\Controllers\Api\SystemController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\TwoFactorController;
use App\Http\Controllers\Api\PermissionMatrixController;
use Illuminate\Support\Facades\Route;

// ─── Public ──────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('register',     [AuthController::class, 'register']);
    Route::post('login',        [AuthController::class, 'login']);
    Route::post('2fa/verify',   [AuthController::class, 'verifyTwoFactor']);
});

// Public HRM endpoints (no auth) — staff self-service
Route::prefix('public')->group(function () {
    // List active leave types so the public form can show a dropdown
    Route::get('leave-types', function () {
        return response()->json([
            'success' => true,
            'data'    => \App\Models\HRM\LeaveType::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'days_per_year', 'is_paid', 'color']),
        ]);
    });
    Route::post('leave-apply', [LeaveController::class, 'publicApply']);
});

// ─── Marketplace webhooks (signed externally) ────────────────
Route::prefix('marketplace/webhook')->group(function () {
    Route::post('shopee',  [MarketplaceWebhookController::class, 'shopee']);
    Route::post('tiktok',  [MarketplaceWebhookController::class, 'tiktok']);
    Route::post('website', [MarketplaceWebhookController::class, 'website']);
});

// ─── Protected ───────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/me',      [AuthController::class, 'me']);

    // ── System utilities (cache management) ─────────────────
    Route::post('system/clear-cache', [SystemController::class, 'clearCache']);

    // ── Company / App Settings ──────────────────────────────
    Route::prefix('settings')->group(function () {
        Route::get('/',               [SettingsController::class, 'index']);
        Route::put('company',         [SettingsController::class, 'updateCompany']);
        Route::put('accounting',      [SettingsController::class, 'updateAccounting']);
        Route::put('system',          [SettingsController::class, 'updateSystem']);
        Route::put('notifications',   [SettingsController::class, 'updateNotifications']);
        Route::put('security',        [SettingsController::class, 'updateSecurity']);
        Route::post('logo',           [SettingsController::class, 'uploadLogo']);
    });

    // ── Two-Factor Authentication ───────────────────────────
    Route::prefix('2fa')->group(function () {
        Route::get('status',  [TwoFactorController::class, 'status']);
        Route::post('enable', [TwoFactorController::class, 'enable']);
        Route::post('confirm',[TwoFactorController::class, 'confirm']);
        Route::post('disable',[TwoFactorController::class, 'disable']);
    });

    // ── Roles & Permission Matrix ───────────────────────────
    Route::get ('permissions/matrix',         [PermissionMatrixController::class, 'matrix']);
    Route::post('permissions/users',          [PermissionMatrixController::class, 'storeUser']);
    Route::put ('permissions/users/{user}',   [PermissionMatrixController::class, 'updateUser']);

    // ── Accounting ──────────────────────────────────────────
    Route::prefix('accounting')->group(function () {
        Route::get('accounts/flat', [AccountController::class, 'flat']);
        Route::apiResource('accounts', AccountController::class);
        Route::apiResource('invoices', InvoiceController::class);
        Route::post('invoices/{invoice}/send',    [InvoiceController::class,  'markAsSent']);
        Route::post('invoices/{invoice}/payments',[PaymentController::class,  'store']);

        // General Ledger
        Route::apiResource('payment-vouchers',  PaymentVoucherController::class);
        Route::post('payment-vouchers/{paymentVoucher}/cancel', [PaymentVoucherController::class, 'cancel']);
        Route::get('payment-vouchers/{paymentVoucher}/pdf', [PaymentVoucherController::class, 'pdf']);
        Route::apiResource('official-receipts', OfficialReceiptController::class);
        Route::post('official-receipts/{officialReceipt}/cancel', [OfficialReceiptController::class, 'cancel']);
        Route::get('official-receipts/{officialReceipt}/pdf', [OfficialReceiptController::class, 'pdf']);
        Route::apiResource('journal-entries',   JournalEntryController::class);
        Route::apiResource('ar-deposits',            ArDepositController::class);
        Route::get('ar-deposits/{arDeposit}/pdf',    [ArDepositController::class, 'pdf']);
        Route::apiResource('ap-deposits',            ApDepositController::class);
        Route::get('ap-deposits/{apDeposit}/pdf',    [ApDepositController::class, 'pdf']);
        Route::apiResource('bank-reconciliations',   BankReconciliationController::class);
    });

    // ── CRM ─────────────────────────────────────────────────
    Route::prefix('crm')->group(function () {
        Route::apiResource('customers', CustomerController::class);

        // Master setup
        Route::get   ('lead-sources',                [CrmMasterController::class, 'indexSources']);
        Route::post  ('lead-sources',                [CrmMasterController::class, 'storeSource']);
        Route::put   ('lead-sources/{source}',       [CrmMasterController::class, 'updateSource']);
        Route::delete('lead-sources/{source}',       [CrmMasterController::class, 'destroySource']);

        Route::get   ('pipeline-stages',             [CrmMasterController::class, 'indexStages']);
        Route::post  ('pipeline-stages',             [CrmMasterController::class, 'storeStage']);
        Route::put   ('pipeline-stages/{stage}',     [CrmMasterController::class, 'updateStage']);
        Route::delete('pipeline-stages/{stage}',     [CrmMasterController::class, 'destroyStage']);

        Route::get   ('customer-groups',             [CrmMasterController::class, 'indexGroups']);
        Route::post  ('customer-groups',             [CrmMasterController::class, 'storeGroup']);
        Route::put   ('customer-groups/{group}',     [CrmMasterController::class, 'updateGroup']);
        Route::delete('customer-groups/{group}',     [CrmMasterController::class, 'destroyGroup']);

        Route::get   ('loyalty-tiers',               [CrmMasterController::class, 'indexTiers']);
        Route::post  ('loyalty-tiers',               [CrmMasterController::class, 'storeTier']);
        Route::put   ('loyalty-tiers/{tier}',        [CrmMasterController::class, 'updateTier']);
        Route::delete('loyalty-tiers/{tier}',        [CrmMasterController::class, 'destroyTier']);

        Route::get   ('activity-types',              [CrmMasterController::class, 'indexActTypes']);
        Route::post  ('activity-types',              [CrmMasterController::class, 'storeActType']);
        Route::put   ('activity-types/{activityType}',  [CrmMasterController::class, 'updateActType']);
        Route::delete('activity-types/{activityType}',  [CrmMasterController::class, 'destroyActType']);

        Route::get   ('follow-up-rules',             [CrmMasterController::class, 'indexRules']);
        Route::post  ('follow-up-rules',             [CrmMasterController::class, 'storeRule']);
        Route::put   ('follow-up-rules/{rule}',      [CrmMasterController::class, 'updateRule']);
        Route::delete('follow-up-rules/{rule}',      [CrmMasterController::class, 'destroyRule']);

        Route::get   ('message-templates',           [CrmMasterController::class, 'indexTemplates']);
        Route::post  ('message-templates',           [CrmMasterController::class, 'storeTemplate']);
        Route::put   ('message-templates/{template}',[CrmMasterController::class, 'updateTemplate']);
        Route::delete('message-templates/{template}',[CrmMasterController::class, 'destroyTemplate']);

        // Transactional
        Route::apiResource('leads',        CrmLeadController::class);
        Route::apiResource('activities',   CrmActivityController::class)->except(['show']);
        Route::apiResource('quotations',   CrmQuotationController::class);

        Route::apiResource('invoices',     CrmInvoiceController::class);
        Route::post('invoices/{invoice}/cancel', [CrmInvoiceController::class, 'cancel']);
        Route::get ('invoices/{invoice}/pdf',    [CrmInvoiceController::class, 'pdf']);

        Route::apiResource('installments', CrmInstallmentController::class);
        Route::post('installments/{installment}/schedules/{schedule}/pay', [CrmInstallmentController::class, 'pay']);
    });

    // ── Suppliers ───────────────────────────────────────────
    Route::prefix('suppliers')->group(function () {
        Route::get('flat', [SupplierController::class, 'flat']);
        Route::apiResource('list', SupplierController::class)->parameters(['list' => 'supplier']);

        Route::apiResource('purchase-invoices', PurchaseInvoiceController::class);
        Route::post('purchase-invoices/{purchaseInvoice}/cancel', [PurchaseInvoiceController::class, 'cancel']);
        Route::get('purchase-invoices/{purchaseInvoice}/pdf', [PurchaseInvoiceController::class, 'pdf']);
    });

    // ── Sales ───────────────────────────────────────────────
    Route::prefix('sales')->group(function () {
        // Sales Orders — Daily aggregator (pulls from sale_invoices)
        Route::get('orders/dashboard', [SalesOrderController::class, 'dashboard']);
        Route::apiResource('orders', SalesOrderController::class)->parameters(['orders' => 'salesOrder']);
        Route::post('orders/{salesOrder}/convert-to-invoice', [SalesOrderController::class, 'convertToInvoice']);

        // Sale Invoices
        Route::apiResource('invoices', SaleInvoiceController::class)->parameters(['invoices' => 'saleInvoice']);
        Route::post('invoices/{saleInvoice}/cancel', [SaleInvoiceController::class, 'cancel']);
        Route::get('invoices/{saleInvoice}/pdf',     [SaleInvoiceController::class, 'pdf']);

        // Sale Returns
        Route::apiResource('returns', SaleReturnController::class)->parameters(['returns' => 'saleReturn']);
        Route::post('returns/{saleReturn}/cancel', [SaleReturnController::class, 'cancel']);

        // POS
        Route::get('pos/products',           [PosController::class, 'products']);
        Route::post('pos/checkout',          [PosController::class, 'checkout']);
        Route::get('pos/receipt/{invoiceId}',[PosController::class, 'receipt']);
        Route::post('pos/daily-close',       [PosController::class, 'dailyClose']);

        // Reports
        Route::get('reports/summary',         [SalesReportController::class, 'summary']);
        Route::get('reports/by-customer',     [SalesReportController::class, 'byCustomer']);
        Route::get('reports/by-product',      [SalesReportController::class, 'byProduct']);
        Route::get('reports/by-agent',        [SalesReportController::class, 'byAgent']);
        Route::get('reports/returns-summary', [SalesReportController::class, 'returnsSummary']);

        // ── Order Management (marketplace + website orders) ──
        Route::prefix('order-management')->group(function () {
            Route::get('channels',                  [MarketplaceChannelController::class, 'index']);
            Route::get('channels/{code}/oauth',     [MarketplaceChannelController::class, 'oauthRedirect']);
            Route::post('channels/{code}/callback', [MarketplaceChannelController::class, 'oauthCallback']);
            Route::post('channels/{code}/sync',     [MarketplaceChannelController::class, 'syncNow']);

            Route::get('orders',                       [MarketplaceOrderController::class, 'index']);
            Route::post('orders',                      [MarketplaceOrderController::class, 'store']);
            Route::get('orders/{id}',                  [MarketplaceOrderController::class, 'show']);
            Route::post('orders/{id}/mark-paid',       [MarketplaceOrderController::class, 'markPaid']);
            Route::post('orders/{id}/cancel',          [MarketplaceOrderController::class, 'cancel']);

            Route::get('awb/pending',     [AwbController::class, 'pending']);
            Route::post('awb/bulk-pdf',   [AwbController::class, 'bulkPdf']);
            Route::get('awb/{id}/pdf',    [AwbController::class, 'pdf']);

            Route::post('pick/lookup',  [OrderPickController::class, 'lookupByAwb']);
            Route::post('pick/scan',    [OrderPickController::class, 'scanSku']);
            Route::post('pick/confirm', [OrderPickController::class, 'confirmPacked']);

            Route::get('returns',                    [MarketplaceReturnController::class, 'index']);
            Route::post('returns',                   [MarketplaceReturnController::class, 'store']);
            Route::post('returns/{id}/receive',      [MarketplaceReturnController::class, 'receive']);
            Route::post('returns/{id}/refund',       [MarketplaceReturnController::class, 'refund']);
        });
    });

    // ── Inventory ───────────────────────────────────────────
    Route::prefix('inventory')->group(function () {
        // Products (finished goods)
        Route::get('products/stats',      [ProductController::class,       'stats']);
        Route::get('products/categories', [ProductController::class,       'categories']);
        Route::get('products/{product}/cost', [ProductController::class,   'cost']);
        Route::get('products/{product}/schema', [ProductController::class, 'schema']);
        Route::post('products/{product}/generate-variants', [ProductController::class, 'generateVariants']);
        Route::post('products/ai-fill',         [ProductController::class, 'aiFill']);
        Route::apiResource('products',    ProductController::class);

        // Departments
        Route::get('departments/flat',    [StockDepartmentController::class, 'flat']);
        Route::apiResource('departments', StockDepartmentController::class)->parameters(['departments' => 'stockDepartment']);

        // Product Categories master (used by products dropdown)
        Route::apiResource('product-categories', ProductCategoryController::class)
            ->parameters(['product-categories' => 'productCategory']);

        // Product Types master (drives product_type field)
        Route::apiResource('product-types', ProductTypeController::class)
            ->parameters(['product-types' => 'productType']);

        // Product Collections master (groups of products e.g. "ARYANA KURUNG KEDAH | SONGKET")
        Route::get('product-collections/flat', [ProductCollectionController::class, 'flat']);
        Route::apiResource('product-collections', ProductCollectionController::class)
            ->parameters(['product-collections' => 'productCollection']);

        // Inventory global settings (SEO, Marketing Identity, etc.)
        Route::get('settings',  [InventorySettingsController::class, 'index']);
        Route::post('settings', [InventorySettingsController::class, 'upsert']);

        // Stock items (raw materials / fabric / accessories)
        Route::get('stock-items/flat',    [StockItemController::class, 'flat']);
        Route::apiResource('stock-items', StockItemController::class)->parameters(['stock-items' => 'stockItem']);

        // Stock locations (warehouse / tailor / store)
        Route::get('locations/flat',      [StockLocationController::class, 'flat']);
        Route::apiResource('locations',   StockLocationController::class)->parameters(['locations' => 'stockLocation']);

        // Tailors
        Route::get('tailors/flat',        [TailorController::class, 'flat']);
        Route::apiResource('tailors',     TailorController::class);

        // Bill of Material
        Route::apiResource('boms',        BomController::class)->parameters(['boms' => 'bom']);

        // Tailor Orders (production order lifecycle)
        Route::apiResource('tailor-orders', TailorOrderController::class)->parameters(['tailor-orders' => 'tailorOrder']);
        Route::post('tailor-orders/{tailorOrder}/issue',                 [TailorOrderController::class, 'issue']);
        Route::post('tailor-orders/{tailorOrder}/receive',               [TailorOrderController::class, 'receive']);
        Route::post('tailor-orders/{tailorOrder}/generate-bill',         [TailorOrderController::class, 'generateBill']);
        Route::delete('tailor-orders/{tailorOrder}/receipts/{receipt}',  [TailorOrderController::class, 'deleteReceipt']);

        // Stock movements (issue / receipt / adjust / transfer / send_tailor / receive_tailor)
        Route::apiResource('stock-movements', StockMovementController::class)->parameters(['stock-movements' => 'stockMovement']);
        Route::post('stock-movements/{stockMovement}/cancel', [StockMovementController::class, 'cancel']);
        Route::post('stock-movements/{stockMovement}/generate-tailor-bill', [StockMovementController::class, 'generateTailorBill']);
    });

    // ── HRM ─────────────────────────────────────────────────
    Route::prefix('hrm')->group(function () {
        // Master setup
        Route::apiResource('master-departments',  HrmDepartmentController::class)
             ->only(['index','store','update','destroy'])
             ->parameters(['master-departments' => 'department']);
        Route::apiResource('designations',        HrmDesignationController::class)->only(['index','store','update','destroy']);
        Route::apiResource('leave-types',         LeaveTypeController::class)->only(['index','store','update','destroy']);
        Route::apiResource('holidays',            HolidayController::class)->only(['index','store','update','destroy']);
        Route::apiResource('shifts',              ShiftController::class)->only(['index','store','update','destroy']);
        Route::apiResource('allowance-types',     AllowanceTypeController::class)->only(['index','store','update','destroy']);
        Route::apiResource('deduction-types',     DeductionTypeController::class)->only(['index','store','update','destroy']);
        Route::get('salary-advances/summary',     [SalaryAdvanceController::class, 'summary']);
        Route::apiResource('salary-advances',     SalaryAdvanceController::class)->only(['index','store','update','destroy']);
        Route::apiResource('office-locations',    OfficeLocationController::class)->only(['index','store','update','destroy']);

        Route::get('employees/stats',       [EmployeeController::class,  'stats']);
        Route::get('employees/departments', [EmployeeController::class,  'departments']);
        Route::post('employees/{employee}/image', [EmployeeController::class, 'uploadImage']);
        Route::apiResource('employees',     EmployeeController::class);

        Route::get('attendance',            [AttendanceController::class, 'index']);
        Route::post('attendance/bulk',      [AttendanceController::class, 'markBulk']);
        Route::post('attendance/single',    [AttendanceController::class, 'markSingle']);
        Route::get('attendance/{employee}/history', [AttendanceController::class, 'employeeHistory']);

        Route::apiResource('leaves',        LeaveController::class)->only(['index', 'store', 'show']);
        Route::post('leaves/{leave}/approve',     [LeaveController::class, 'approve']);
        Route::post('leaves/{leave}/reject',      [LeaveController::class, 'reject']);
        Route::post('leaves/{leave}/mark-replied',[LeaveController::class, 'markReplied']);

        Route::get('payroll',                 [PayrollController::class, 'index']);
        Route::post('payroll',                [PayrollController::class, 'store']);
        Route::post('payroll/generate',       [PayrollController::class, 'generate']);
        Route::get('payroll/{payroll}',       [PayrollController::class, 'show']);
        Route::put('payroll/{payroll}',       [PayrollController::class, 'update']);
        Route::get('payroll/{payroll}/pdf',   [PayrollController::class, 'pdf']);
        Route::post('payroll/{payroll}/pay',  [PayrollController::class, 'markPaid']);
        Route::delete('payroll/{payroll}',    [PayrollController::class, 'destroy']);
        Route::post('payroll/{payroll}/email',[PayrollController::class, 'email']);
        Route::post('payroll/email-bulk',     [PayrollController::class, 'emailBulk']);
    });

    // ── Projects & Tasks ────────────────────────────────────
    Route::apiResource('projects', ProjectController::class);

    Route::prefix('tasks')->group(function () {
        Route::get('my', [TaskController::class, 'myTasks']);
        Route::post('{task}/complete',              [TaskController::class, 'complete']);
        Route::post('{task}/approve',               [TaskController::class, 'approve']);
        Route::post('{task}/reject',                [TaskController::class, 'reject']);
        Route::post('{task}/attachments',           [TaskController::class, 'uploadAttachment']);
        Route::post('{task}/checklist',             [TaskController::class, 'addChecklistItem']);
        Route::post('{task}/checklist/{item}/toggle', [TaskController::class, 'toggleChecklistItem']);
        Route::post('{task}/comments',              [TaskCommentController::class, 'store']);
        Route::delete('comments/{comment}',         [TaskCommentController::class, 'destroy']);
    });
    Route::apiResource('tasks', TaskController::class);

    // ── HRM Job Descriptions ────────────────────────────────
    Route::prefix('hrm/job-descriptions')->group(function () {
        Route::post('{jobDescription}/generate-tasks', [JobDescriptionController::class, 'generateTasks']);
        Route::post('{jobDescription}/assign',         [JobDescriptionController::class, 'assignToEmployee']);
    });
    Route::apiResource('hrm/job-descriptions', JobDescriptionController::class);

    // ── AI Chat ─────────────────────────────────────────────
    Route::prefix('ai-chat')->group(function () {
        Route::get('conversations',                       [AiChatController::class, 'listConversations']);
        Route::post('conversations',                      [AiChatController::class, 'startConversation']);
        Route::get('conversations/{conversation}',        [AiChatController::class, 'show']);
        Route::post('conversations/{conversation}/message', [AiChatController::class, 'sendMessage']);
        Route::post('preferences/language',               [AiChatController::class, 'setLanguage']);
        Route::get('reports/employee/{employee}',         [AiChatController::class, 'employeeReport']);
        Route::get('reports/task/{task}',                 [AiChatController::class, 'taskReport']);
    });

    // ── Notifications ───────────────────────────────────────
    Route::prefix('notifications')->group(function () {
        Route::get('/',                  [NotificationController::class, 'index']);
        Route::get('unread-count',       [NotificationController::class, 'unreadCount']);
        Route::post('{notification}/read', [NotificationController::class, 'markRead']);
        Route::post('mark-all-read',     [NotificationController::class, 'markAllRead']);
        Route::post('push-token',        [NotificationController::class, 'registerPushToken']);
        Route::get('preferences',        [NotificationController::class, 'preferences']);
        Route::post('preferences',       [NotificationController::class, 'updatePreferences']);
    });

    // ── Mobile attendance (face + geofence) — staff app ──────
    Route::prefix('mobile/attendance')->group(function () {
        Route::get('offices',    [MobileAttendanceController::class, 'offices']);
        Route::post('check-in',  [MobileAttendanceController::class, 'checkIn']);
        Route::post('check-out', [MobileAttendanceController::class, 'checkOut']);
    });

    // ── Attachments (polymorphic file uploads) ──────────────
    Route::get('attachments',                       [AttachmentController::class, 'index']);
    Route::post('attachments',                      [AttachmentController::class, 'store']);
    Route::get('attachments/{attachment}/download', [AttachmentController::class, 'download']);
    Route::delete('attachments/{attachment}',       [AttachmentController::class, 'destroy']);

    // ── Email (send PI/PV/etc. with attachments to suppliers, auditors) ──
    Route::post('email/send',       [EmailController::class, 'send']);
    Route::post('email/batch-send', [EmailController::class, 'batchSend']);
    Route::get('email/history',     [EmailController::class, 'history']);

    // ── Dashboard ───────────────────────────────────────────
    Route::get('dashboard/stats', function () {
        return response()->json([
            'success' => true,
            'data' => [
                'revenue'     => \App\Models\Accounting\Invoice::where('status', 'paid')->sum('total'),
                'outstanding' => \App\Models\Accounting\Invoice::whereIn('status', ['sent','overdue'])->sum('total'),
                'customers'   => \App\Models\CRM\Customer::count(),
                'products'    => \App\Models\Inventory\Product::count(),
                'employees'   => \App\Models\HRM\Employee::count(),
                'invoices'    => \App\Models\Accounting\Invoice::count(),
            ],
        ]);
    });

    // ── Storefront admin (ERP staff manages the website) ─────
    Route::prefix('admin/storefront')->group(function () {
        // Storefront orders are surfaced via /sales/orders (sale_invoices with
        // source='online') — no separate admin/storefront/orders route.
        Route::get('shipping-zones', [\App\Http\Controllers\Storefront\Admin\ShippingZonesController::class, 'index']);
        Route::get('shipping-zones/{id}', [\App\Http\Controllers\Storefront\Admin\ShippingZonesController::class, 'show']);
        Route::post('shipping-zones', [\App\Http\Controllers\Storefront\Admin\ShippingZonesController::class, 'store']);
        Route::put('shipping-zones/{id}', [\App\Http\Controllers\Storefront\Admin\ShippingZonesController::class, 'update']);
        Route::delete('shipping-zones/{id}', [\App\Http\Controllers\Storefront\Admin\ShippingZonesController::class, 'destroy']);
        Route::get('ai-transcripts', [\App\Http\Controllers\Storefront\Admin\AiTranscriptsController::class, 'index']);
        Route::get('ai-transcripts/{id}', [\App\Http\Controllers\Storefront\Admin\AiTranscriptsController::class, 'show']);
        Route::patch('products/{id}/publish', [\App\Http\Controllers\Storefront\Admin\ProductPublishController::class, 'update']);

        Route::get('coupons', [\App\Http\Controllers\Storefront\Admin\CouponsController::class, 'index']);
        Route::post('coupons', [\App\Http\Controllers\Storefront\Admin\CouponsController::class, 'store']);
        Route::put('coupons/{id}', [\App\Http\Controllers\Storefront\Admin\CouponsController::class, 'update']);
        Route::delete('coupons/{id}', [\App\Http\Controllers\Storefront\Admin\CouponsController::class, 'destroy']);

        Route::get('payment-methods', [\App\Http\Controllers\Storefront\Admin\PaymentMethodsController::class, 'index']);
        Route::get('payment-methods/{id}', [\App\Http\Controllers\Storefront\Admin\PaymentMethodsController::class, 'show']);
        Route::post('payment-methods', [\App\Http\Controllers\Storefront\Admin\PaymentMethodsController::class, 'store']);
        Route::put('payment-methods/{id}', [\App\Http\Controllers\Storefront\Admin\PaymentMethodsController::class, 'update']);
        Route::delete('payment-methods/{id}', [\App\Http\Controllers\Storefront\Admin\PaymentMethodsController::class, 'destroy']);

        // Bundles
        Route::get('bundles', [\App\Http\Controllers\Storefront\Admin\BundlesController::class, 'index']);
        Route::get('bundles/{id}', [\App\Http\Controllers\Storefront\Admin\BundlesController::class, 'show']);
        Route::post('bundles', [\App\Http\Controllers\Storefront\Admin\BundlesController::class, 'store']);
        Route::put('bundles/{id}', [\App\Http\Controllers\Storefront\Admin\BundlesController::class, 'update']);
        Route::delete('bundles/{id}', [\App\Http\Controllers\Storefront\Admin\BundlesController::class, 'destroy']);

        // Cross-sell rules
        Route::get('cross-sell-rules', [\App\Http\Controllers\Storefront\Admin\CrossSellRulesController::class, 'index']);
        Route::post('cross-sell-rules', [\App\Http\Controllers\Storefront\Admin\CrossSellRulesController::class, 'store']);
        Route::put('cross-sell-rules/{id}', [\App\Http\Controllers\Storefront\Admin\CrossSellRulesController::class, 'update']);
        Route::delete('cross-sell-rules/{id}', [\App\Http\Controllers\Storefront\Admin\CrossSellRulesController::class, 'destroy']);

        // Voucher rules + issued offers log
        Route::get('voucher-rules', [\App\Http\Controllers\Storefront\Admin\VoucherRulesController::class, 'index']);
        Route::post('voucher-rules', [\App\Http\Controllers\Storefront\Admin\VoucherRulesController::class, 'store']);
        Route::put('voucher-rules/{id}', [\App\Http\Controllers\Storefront\Admin\VoucherRulesController::class, 'update']);
        Route::delete('voucher-rules/{id}', [\App\Http\Controllers\Storefront\Admin\VoucherRulesController::class, 'destroy']);
        Route::get('voucher-offers', [\App\Http\Controllers\Storefront\Admin\VoucherRulesController::class, 'issuedOffers']);

        // Theme + sections + announcement bars
        Route::get('theme-settings', [\App\Http\Controllers\Storefront\Admin\ThemeSettingsController::class, 'settings']);
        Route::put('theme-settings', [\App\Http\Controllers\Storefront\Admin\ThemeSettingsController::class, 'updateSettings']);
        Route::post('theme-settings/preset', [\App\Http\Controllers\Storefront\Admin\ThemeSettingsController::class, 'applyPreset']);
        Route::get('sections', [\App\Http\Controllers\Storefront\Admin\ThemeSettingsController::class, 'sections']);
        Route::post('sections', [\App\Http\Controllers\Storefront\Admin\ThemeSettingsController::class, 'storeSection']);
        Route::put('sections/{id}', [\App\Http\Controllers\Storefront\Admin\ThemeSettingsController::class, 'updateSection']);
        Route::delete('sections/{id}', [\App\Http\Controllers\Storefront\Admin\ThemeSettingsController::class, 'destroySection']);
        Route::post('sections/reorder', [\App\Http\Controllers\Storefront\Admin\ThemeSettingsController::class, 'reorderSections']);
        Route::get('announcement-bars', [\App\Http\Controllers\Storefront\Admin\ThemeSettingsController::class, 'bars']);
        Route::post('announcement-bars', [\App\Http\Controllers\Storefront\Admin\ThemeSettingsController::class, 'storeBar']);
        Route::put('announcement-bars/{id}', [\App\Http\Controllers\Storefront\Admin\ThemeSettingsController::class, 'updateBar']);
        Route::delete('announcement-bars/{id}', [\App\Http\Controllers\Storefront\Admin\ThemeSettingsController::class, 'destroyBar']);
    });
});

// ─── Storefront (public + customer-auth) ──────────────────────
Route::prefix('storefront')->group(function () {
    // Public
    Route::get('products', [\App\Http\Controllers\Storefront\CatalogController::class, 'products']);
    Route::get('products/{slug}', [\App\Http\Controllers\Storefront\CatalogController::class, 'product']);
    Route::get('categories', [\App\Http\Controllers\Storefront\CatalogController::class, 'categories']);

    Route::get('cart', [\App\Http\Controllers\Storefront\CartController::class, 'show']);
    Route::post('cart/items', [\App\Http\Controllers\Storefront\CartController::class, 'addItem']);
    Route::patch('cart/items/{id}', [\App\Http\Controllers\Storefront\CartController::class, 'updateItem']);
    Route::delete('cart/items/{id}', [\App\Http\Controllers\Storefront\CartController::class, 'removeItem']);
    Route::post('shipping/quote', [\App\Http\Controllers\Storefront\CartController::class, 'shippingQuote']);

    Route::get('ai/greeting', [\App\Http\Controllers\Storefront\AiChatController::class, 'greeting']);
    Route::post('ai/chat', [\App\Http\Controllers\Storefront\AiChatController::class, 'chat']);

    Route::post('coupons/apply', [\App\Http\Controllers\Storefront\CouponController::class, 'apply']);
    Route::post('coupons/remove', [\App\Http\Controllers\Storefront\CouponController::class, 'remove']);

    Route::get('payment-methods', function () {
        return \App\Models\Storefront\PaymentMethod::where('enabled', true)
            ->orderBy('sort_order')
            ->get(['code', 'driver', 'label']);
    });

    // Bundles + cross-sell + behavior
    Route::get('bundles', [\App\Http\Controllers\Storefront\BundleController::class, 'index']);
    Route::get('bundles/{slug}', [\App\Http\Controllers\Storefront\BundleController::class, 'show']);
    Route::get('bundles/for-product/{productId}', [\App\Http\Controllers\Storefront\BundleController::class, 'forProduct']);
    Route::post('bundles/{id}/add-to-cart', [\App\Http\Controllers\Storefront\BundleController::class, 'addToCart']);

    // Theme + dynamic homepage sections
    Route::get('theme', [\App\Http\Controllers\Storefront\ThemeController::class, 'theme']);

    Route::get('suggestions/cart', [\App\Http\Controllers\Storefront\SuggestionsController::class, 'forCart']);
    Route::get('suggestions/product/{productId}', [\App\Http\Controllers\Storefront\SuggestionsController::class, 'forProduct']);
    Route::post('signals', [\App\Http\Controllers\Storefront\SuggestionsController::class, 'signal']);
    Route::get('vouchers/live', [\App\Http\Controllers\Storefront\SuggestionsController::class, 'liveVouchers']);

    Route::post('auth/register', [\App\Http\Controllers\Storefront\AuthController::class, 'register']);
    Route::post('auth/login', [\App\Http\Controllers\Storefront\AuthController::class, 'login']);

    Route::post('checkout', [\App\Http\Controllers\Storefront\CheckoutController::class, 'placeOrder']);
    Route::post('checkout/pay/{orderId}/{driver}', [\App\Http\Controllers\Storefront\PaymentController::class, 'createIntent']);
    Route::get('orders/{soNumber}/instructions', [\App\Http\Controllers\Storefront\PaymentController::class, 'instructions']);

    // Public webhooks
    Route::post('webhooks/{driver}', [\App\Http\Controllers\Storefront\PaymentController::class, 'webhook']);

    // Customer-authenticated
    Route::middleware('auth:customer')->group(function () {
        Route::post('auth/logout', [\App\Http\Controllers\Storefront\AuthController::class, 'logout']);
        Route::get('me', [\App\Http\Controllers\Storefront\AuthController::class, 'me']);
        Route::get('orders', [\App\Http\Controllers\Storefront\AccountController::class, 'orders']);
        Route::get('orders/{id}', [\App\Http\Controllers\Storefront\AccountController::class, 'order']);
        Route::get('addresses', [\App\Http\Controllers\Storefront\AddressController::class, 'index']);
        Route::post('addresses', [\App\Http\Controllers\Storefront\AddressController::class, 'store']);
        Route::put('addresses/{id}', [\App\Http\Controllers\Storefront\AddressController::class, 'update']);
        Route::delete('addresses/{id}', [\App\Http\Controllers\Storefront\AddressController::class, 'destroy']);
        Route::get('wishlist', [\App\Http\Controllers\Storefront\WishlistController::class, 'index']);
        Route::post('wishlist', [\App\Http\Controllers\Storefront\WishlistController::class, 'add']);
        Route::delete('wishlist/{productId}', [\App\Http\Controllers\Storefront\WishlistController::class, 'remove']);
    });
});
