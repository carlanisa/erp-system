export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  // Each accounting page renders full-bleed inside the ERP shell — no sub-navigation strip.
  // Switch between modules via sidebar or the General Ledger home module grid.
  return <div className="flex flex-col h-full">{children}</div>
}
