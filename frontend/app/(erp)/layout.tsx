import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export const dynamic = 'force-dynamic'

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-col flex-1 ml-60 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
