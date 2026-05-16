'use client'

import { Mail, MessageCircle, Copy } from 'lucide-react'
import { useState } from 'react'

export type PaymentInstructions = {
  title?: string
  bank?: string
  account_name?: string
  account_number?: string
  reference?: string
  amount?: number
  contact_email?: string | null
  contact_phone?: string | null
  whatsapp_url?: string | null
  qr_image_url?: string | null
  notice?: string
  fields?: { label: string; value: string }[]
}

export function PaymentInstructionsCard({ data }: { data: PaymentInstructions }) {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = async (v: string, label: string) => {
    try { await navigator.clipboard.writeText(v); setCopied(label); setTimeout(() => setCopied(null), 1500) } catch {}
  }

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5">
      <h3 className="text-lg font-semibold">{data.title || 'Payment instructions'}</h3>
      <p className="mt-1 text-sm text-neutral-600">{data.notice}</p>

      <dl className="mt-4 divide-y divide-rose-100 rounded-lg bg-white">
        {data.bank          && <Row label="Bank"          value={data.bank} />}
        {data.account_name  && <Row label="Account name"  value={data.account_name} />}
        {data.account_number && <Row label="Account number" value={data.account_number} onCopy={() => copy(data.account_number!, 'Account number')} copied={copied === 'Account number'} />}
        {data.reference     && <Row label="Reference (must include in transfer)" value={data.reference} onCopy={() => copy(data.reference!, 'Reference')} copied={copied === 'Reference'} mono />}
        {data.amount !== undefined && <Row label="Amount" value={`RM${Number(data.amount).toFixed(2)}`} />}
        {(data.fields ?? []).map((f, i) => <Row key={i} label={f.label} value={f.value} />)}
      </dl>

      {data.qr_image_url && (
        <div className="mt-4 flex flex-col items-center rounded-lg bg-white p-4">
          <div className="mb-2 text-xs font-medium text-neutral-500">Scan to pay</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.qr_image_url} alt="Payment QR" className="h-48 w-48 rounded" />
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {data.whatsapp_url && (
          <a href={data.whatsapp_url} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600">
            <MessageCircle className="h-4 w-4" />
            Send receipt on WhatsApp
          </a>
        )}
        {data.contact_email && (
          <a href={`mailto:${data.contact_email}?subject=Payment%20receipt%20-%20${encodeURIComponent(data.reference || '')}`}
             className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-100">
            <Mail className="h-4 w-4" />
            Email receipt
          </a>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, onCopy, copied, mono }: { label: string; value: string; onCopy?: () => void; copied?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className={`flex items-center gap-2 font-medium ${mono ? 'font-mono' : ''}`}>
        {value}
        {onCopy && (
          <button onClick={onCopy} className="text-neutral-400 hover:text-rose-500" aria-label="Copy">
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
        {copied && <span className="text-xs text-emerald-600">Copied!</span>}
      </span>
    </div>
  )
}
