<?php
namespace App\Services;

use App\Models\Suppliers\PurchaseInvoice;
use App\Models\Accounting\PaymentVoucher;
use App\Models\Accounting\OfficialReceipt;
use App\Models\Accounting\ArDeposit;
use App\Models\Accounting\ApDeposit;
use App\Models\Sales\SaleInvoice;
use App\Models\CRM\CrmInvoice;
use App\Models\HRM\Payroll;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

class PdfRenderer
{
    public function purchaseInvoice(PurchaseInvoice $pi): \Barryvdh\DomPDF\PDF
    {
        $pi->loadMissing(['supplier','account','bankAccount','createdBy','lines.account.parent','payments.account']);
        $totalAmount = (float) ($pi->amount ?: $pi->lines->sum('amount'));
        return Pdf::loadView('pdf.purchase-invoice', [
            'pi'             => $pi,
            'amountInWords'  => $this->numberToWords($totalAmount),
        ])->setPaper('a4');
    }

    public function saleInvoice(SaleInvoice $si): \Barryvdh\DomPDF\PDF
    {
        $si->loadMissing(['customer','account','bankAccount','createdBy','lines','payments.account']);
        $totalAmount = (float) ($si->amount ?: $si->lines->sum('amount'));
        return Pdf::loadView('pdf.sale-invoice', [
            'si'             => $si,
            'amountInWords'  => $this->numberToWords($totalAmount),
        ])->setPaper('a4');
    }

    public function crmInvoice(CrmInvoice $ci): \Barryvdh\DomPDF\PDF
    {
        $ci->loadMissing(['customer','items','payments']);
        $totalAmount = (float) ($ci->amount ?: $ci->items->sum('line_total'));
        return Pdf::loadView('pdf.crm-invoice', [
            'ci'             => $ci,
            'amountInWords'  => $this->numberToWords($totalAmount),
        ])->setPaper('a4');
    }

    public function paymentVoucher(PaymentVoucher $pv): \Barryvdh\DomPDF\PDF
    {
        $pv->loadMissing(['account','bankAccount','createdBy','lines.account.parent','payments']);
        $totalAmount = (float) ($pv->amount ?: $pv->lines->sum('amount'));
        return Pdf::loadView('pdf.payment-voucher', [
            'pv'             => $pv,
            'amountInWords'  => $this->numberToWords($totalAmount),
        ])->setPaper('a4');
    }

    public function officialReceipt(OfficialReceipt $or): \Barryvdh\DomPDF\PDF
    {
        $or->loadMissing(['account','bankAccount','createdBy','lines.account.parent','payments']);
        $totalAmount = (float) ($or->amount ?: $or->lines->sum('amount'));
        return Pdf::loadView('pdf.official-receipt', [
            'or'             => $or,
            'amountInWords'  => $this->numberToWords($totalAmount),
        ])->setPaper('a4');
    }

    public function arDeposit(ArDeposit $ar): \Barryvdh\DomPDF\PDF
    {
        $ar->loadMissing(['customer','account','bankAccount','createdBy','lines.account.parent','payments']);
        $totalAmount = (float) ($ar->amount ?: $ar->lines->sum('amount'));
        return Pdf::loadView('pdf.ar-deposit', [
            'ar'             => $ar,
            'amountInWords'  => $this->numberToWords($totalAmount),
        ])->setPaper('a4');
    }

    public function apDeposit(ApDeposit $ap): \Barryvdh\DomPDF\PDF
    {
        $ap->loadMissing(['account','bankAccount','createdBy','lines.account.parent','payments']);
        $totalAmount = (float) ($ap->amount ?: $ap->lines->sum('amount'));
        return Pdf::loadView('pdf.ap-deposit', [
            'ap'             => $ap,
            'amountInWords'  => $this->numberToWords($totalAmount),
        ])->setPaper('a4');
    }

    public function payslip(Payroll $payroll): \Barryvdh\DomPDF\PDF
    {
        $payroll->loadMissing('employee', 'lines');

        // Malaysian statutory breakdown (Phase 5 will pull from masters / line items)
        $basic       = (float) $payroll->basic_salary;
        $totalDeduct = (float) $payroll->deductions;
        $epf         = round($basic * 0.11, 2);
        $socso       = round($basic * 0.005, 2);
        $eis         = round($basic * 0.002, 2);
        $pcb         = max(0, round($totalDeduct - $epf - $socso - $eis, 2));

        return Pdf::loadView('pdf.payslip', [
            'payroll'       => $payroll,
            'amountInWords' => $this->numberToWords((float) $payroll->net_salary),
            'breakdown'     => [
                'epf'       => $epf,
                'socso'     => $socso,
                'eis'       => $eis,
                'pcb'       => $pcb,
                'emp_epf'   => round($basic * ($basic <= 5000 ? 0.13 : 0.12), 2),
                'emp_socso' => round($basic * 0.0175, 2),
                'emp_eis'   => round($basic * 0.002, 2),
            ],
        ])->setPaper('a4');
    }

    /** English words for Malaysian Ringgit + Sen */
    public function numberToWords(float $n, string $currency = 'Ringgit', string $sub = 'Sen'): string
    {
        if (!is_finite($n) || $n < 0) return '—';
        if ($n == 0)                  return "Zero $currency Only";

        $ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
        $tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

        $under1000 = function (int $num) use (&$under1000, $ones, $tens): string {
            if ($num === 0)  return '';
            if ($num < 20)   return $ones[$num];
            if ($num < 100)  return $tens[(int) ($num / 10)] . ($num % 10 ? ' ' . $ones[$num % 10] : '');
            return $ones[(int) ($num / 100)] . ' Hundred' . ($num % 100 ? ' ' . $under1000($num % 100) : '');
        };

        $whole = function (int $num) use ($under1000): string {
            $bn = (int) ($num / 1000000000);
            $mn = (int) (($num % 1000000000) / 1000000);
            $th = (int) (($num % 1000000) / 1000);
            $rs = $num % 1000;
            $out = '';
            if ($bn) $out .= $under1000($bn) . ' Billion ';
            if ($mn) $out .= $under1000($mn) . ' Million ';
            if ($th) $out .= $under1000($th) . ' Thousand ';
            if ($rs) $out .= $under1000($rs);
            return trim($out);
        };

        $intPart  = (int) floor($n);
        $fracPart = (int) round(($n - $intPart) * 100);

        $out = $whole($intPart) . " $currency";
        if ($fracPart > 0) $out .= ' and ' . $under1000($fracPart) . " $sub";
        return $out . ' Only';
    }
}
