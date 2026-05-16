'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, RefreshCw, Plus, Pencil, Trash2, Save, X, Loader2,
  Tag, GitBranch, UsersRound, Award, CheckSquare, Bell, MessageSquare, Layers,
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

// ─────────── types ───────────
type LeadSource     = { id: number; code: string; name: string; color: string; is_active: boolean }
type PipelineStage  = { id: number; name: string; color: string; win_probability: number; sort_order: number; is_active: boolean }
type CustomerGroup  = { id: number; code: string; name: string; color: string; default_discount_pct: number; credit_days: number; is_active: boolean }
type LoyaltyTier    = { id: number; name: string; threshold_amount: number; points_multiplier: number; color: string; perks: string | null; is_active: boolean }
type ActivityType   = { id: number; code: string; name: string; color: string; is_active: boolean }
type FollowUpRule   = { id: number; title: string; trigger: string; days_offset: number; channel: 'whatsapp'|'sms'|'email'|'task'; template: string | null; is_active: boolean }
type MsgTemplate    = { id: number; code: string; name: string; channel: 'whatsapp'|'sms'|'email'; body: string; is_active: boolean }

type SectionId = 'lead_sources' | 'pipeline_stages' | 'customer_groups' | 'loyalty_tiers' | 'activity_types' | 'follow_up_rules' | 'message_templates'

const TILES: { id: SectionId; label: string; desc: string; icon: any; color: string; bg: string; ring: string }[] = [
  { id: 'lead_sources',     label: 'Lead Sources',     desc: 'Walk-in · Web · Referral · FB · TikTok · Shopee', icon: Tag,           color: 'text-blue-700',    bg: 'bg-blue-50',    ring: 'hover:ring-blue-400' },
  { id: 'pipeline_stages',  label: 'Pipeline Stages',  desc: 'New · Contacted · Qualified · Proposal · Won',     icon: GitBranch,     color: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'hover:ring-emerald-400' },
  { id: 'customer_groups',  label: 'Customer Groups',  desc: 'VIP · Wholesale · Retail · Walk-in segments',     icon: UsersRound,    color: 'text-violet-700',  bg: 'bg-violet-50',  ring: 'hover:ring-violet-400' },
  { id: 'loyalty_tiers',    label: 'Loyalty Tiers',    desc: 'Bronze · Silver · Gold · Platinum thresholds',    icon: Award,         color: 'text-yellow-700',  bg: 'bg-yellow-50',  ring: 'hover:ring-yellow-400' },
  { id: 'activity_types',   label: 'Activity Types',   desc: 'Call · Email · Meeting · WhatsApp · Visit',       icon: CheckSquare,   color: 'text-cyan-700',    bg: 'bg-cyan-50',    ring: 'hover:ring-cyan-400' },
  { id: 'follow_up_rules',  label: 'Follow-up Rules',  desc: 'Auto-rules: pickup · dues · birthday · re-engage',icon: Bell,          color: 'text-rose-700',    bg: 'bg-rose-50',    ring: 'hover:ring-rose-400' },
  { id: 'message_templates',label: 'Message Templates',desc: 'Canned WhatsApp/SMS/Email with merge tags',       icon: MessageSquare, color: 'text-orange-700',  bg: 'bg-orange-50',  ring: 'hover:ring-orange-400' },
]

const COLOR_OPTIONS = ['blue','emerald','violet','yellow','rose','orange','cyan','amber','indigo','pink','slate']

export default function CrmSetupPage() {
  const router = useRouter()
  const sp     = useSearchParams()
  const initial = (sp.get('tab') as SectionId) || null
  const [active, setActive] = useState<SectionId | null>(initial)

  // ─── Lead Sources ───
  const [sources, setSources]               = useState<LeadSource[]>([])
  const [newSource, setNewSource]           = useState({ code: '', name: '', color: 'blue' })
  const [editSourceId, setEditSourceId]     = useState<number | null>(null)
  const [editSource, setEditSource]         = useState<Partial<LeadSource>>({})
  const [savingSource, setSavingSource]     = useState(false)

  // ─── Pipeline Stages ───
  const [stages, setStages]                 = useState<PipelineStage[]>([])
  const [newStage, setNewStage]             = useState({ name: '', color: 'blue', win_probability: '20', sort_order: '1' })
  const [editStageId, setEditStageId]       = useState<number | null>(null)
  const [editStage, setEditStage]           = useState<Partial<PipelineStage>>({})
  const [savingStage, setSavingStage]       = useState(false)

  // ─── Customer Groups ───
  const [groups, setGroups]                 = useState<CustomerGroup[]>([])
  const [newGroup, setNewGroup]             = useState({ code: '', name: '', color: 'indigo', default_discount_pct: '0', credit_days: '0' })
  const [editGroupId, setEditGroupId]       = useState<number | null>(null)
  const [editGroup, setEditGroup]           = useState<Partial<CustomerGroup>>({})
  const [savingGroup, setSavingGroup]       = useState(false)

  // ─── Loyalty Tiers ───
  const [tiers, setTiers]                   = useState<LoyaltyTier[]>([])
  const [newTier, setNewTier]               = useState({ name: '', threshold_amount: '0', points_multiplier: '1', color: 'amber', perks: '' })
  const [editTierId, setEditTierId]         = useState<number | null>(null)
  const [editTier, setEditTier]             = useState<Partial<LoyaltyTier>>({})
  const [savingTier, setSavingTier]         = useState(false)

  // ─── Activity Types ───
  const [actTypes, setActTypes]             = useState<ActivityType[]>([])
  const [newAct, setNewAct]                 = useState({ code: '', name: '', color: 'cyan' })
  const [editActId, setEditActId]           = useState<number | null>(null)
  const [editAct, setEditAct]               = useState<Partial<ActivityType>>({})
  const [savingAct, setSavingAct]           = useState(false)

  // ─── Follow-up Rules ───
  const [rules, setRules]                   = useState<FollowUpRule[]>([])
  const [newRule, setNewRule]               = useState({ title: '', trigger: 'order_ready', days_offset: '1', channel: 'whatsapp' as const, template: '' })
  const [editRuleId, setEditRuleId]         = useState<number | null>(null)
  const [editRule, setEditRule]             = useState<Partial<FollowUpRule>>({})
  const [savingRule, setSavingRule]         = useState(false)

  // ─── Message Templates ───
  const [tpls, setTpls]                     = useState<MsgTemplate[]>([])
  const [newTpl, setNewTpl]                 = useState({ code: '', name: '', channel: 'whatsapp' as const, body: '' })
  const [editTplId, setEditTplId]           = useState<number | null>(null)
  const [editTpl, setEditTpl]               = useState<Partial<MsgTemplate>>({})
  const [savingTpl, setSavingTpl]           = useState(false)

  // ─── loaders ───
  const loadAll = useCallback(async () => {
    try {
      const [s, p, g, t, a, r, m] = await Promise.allSettled([
        api.get('/crm/lead-sources'),
        api.get('/crm/pipeline-stages'),
        api.get('/crm/customer-groups'),
        api.get('/crm/loyalty-tiers'),
        api.get('/crm/activity-types'),
        api.get('/crm/follow-up-rules'),
        api.get('/crm/message-templates'),
      ])
      if (s.status === 'fulfilled') setSources(s.value.data.data ?? s.value.data ?? [])
      if (p.status === 'fulfilled') setStages(p.value.data.data ?? p.value.data ?? [])
      if (g.status === 'fulfilled') setGroups(g.value.data.data ?? g.value.data ?? [])
      if (t.status === 'fulfilled') setTiers(t.value.data.data ?? t.value.data ?? [])
      if (a.status === 'fulfilled') setActTypes(a.value.data.data ?? a.value.data ?? [])
      if (r.status === 'fulfilled') setRules(r.value.data.data ?? r.value.data ?? [])
      if (m.status === 'fulfilled') setTpls(m.value.data.data ?? m.value.data ?? [])
    } catch {}
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ─── generic CRUD helpers ───
  async function crudCreate(endpoint: string, payload: any, setLoading: (v: boolean) => void, reset: () => void) {
    setLoading(true)
    try {
      await api.post(endpoint, payload)
      toast.success('Added')
      reset()
      loadAll()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Failed')
    } finally { setLoading(false) }
  }
  async function crudUpdate(endpoint: string, payload: any, setLoading: (v: boolean) => void, reset: () => void) {
    setLoading(true)
    try {
      await api.put(endpoint, payload)
      toast.success('Updated')
      reset()
      loadAll()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Failed')
    } finally { setLoading(false) }
  }
  async function crudDelete(endpoint: string) {
    if (!confirm('Delete this item?')) return
    try {
      await api.delete(endpoint)
      toast.success('Deleted')
      loadAll()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Failed')
    }
  }

  // ─────────────────────── HUB ───────────────────────
  if (!active) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/crm')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-4 h-4" /></button>
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <Layers className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">CRM Master Setup</h1>
            <p className="text-sm text-slate-500 mt-0.5">Configure sources, stages, groups, tiers, types, rules &amp; templates</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {TILES.map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setActive(t.id)}
                className={`card border ${t.bg} hover:shadow-lg ring-2 ring-transparent ${t.ring} transition-all flex flex-col items-center text-center py-6 gap-3`}>
                <div className={`w-16 h-16 ${t.bg} rounded-2xl flex items-center justify-center shadow-sm`}>
                  <Icon className={`w-8 h-8 ${t.color}`} />
                </div>
                <div>
                  <p className={`font-semibold text-sm ${t.color}`}>{t.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const activeTile = TILES.find(t => t.id === active)!
  const ActiveIcon = activeTile.icon

  // ─────────────────────── SECTION ───────────────────────
  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setActive(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-4 h-4" /></button>
          <div className={`w-10 h-10 ${activeTile.bg} rounded-xl flex items-center justify-center`}>
            <ActiveIcon className={`w-5 h-5 ${activeTile.color}`} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{activeTile.label}</h1>
            <p className="text-xs text-slate-500">{activeTile.desc}</p>
          </div>
        </div>
        <button onClick={loadAll} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="Refresh"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* ── Lead Sources ── */}
      {active === 'lead_sources' && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
            <input value={newSource.code} onChange={e => setNewSource({ ...newSource, code: e.target.value })} placeholder="CODE (e.g. FB)" className="input-field" />
            <input value={newSource.name} onChange={e => setNewSource({ ...newSource, name: e.target.value })} placeholder="Name (Facebook)" className="input-field" />
            <select value={newSource.color} onChange={e => setNewSource({ ...newSource, color: e.target.value })} className="input-field">
              {COLOR_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => crudCreate('/crm/lead-sources', newSource, setSavingSource, () => setNewSource({ code: '', name: '', color: 'blue' }))}
              disabled={savingSource || !newSource.code || !newSource.name}
              className="btn-primary flex items-center justify-center gap-2">
              {savingSource ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
            </button>
          </div>

          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-xs text-slate-500">
              <th className="text-left py-2 px-2 uppercase">Code</th>
              <th className="text-left py-2 px-2 uppercase">Name</th>
              <th className="text-left py-2 px-2 uppercase">Color</th>
              <th className="text-left py-2 px-2 uppercase">Active</th>
              <th></th>
            </tr></thead>
            <tbody>
              {sources.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-xs">No lead sources yet</td></tr>
              ) : sources.map(s => editSourceId === s.id ? (
                <tr key={s.id} className="border-b border-slate-50 bg-blue-50/30">
                  <td className="py-2 px-2"><input value={editSource.code ?? ''} onChange={e => setEditSource({ ...editSource, code: e.target.value })} className="input-field text-xs" /></td>
                  <td className="py-2 px-2"><input value={editSource.name ?? ''} onChange={e => setEditSource({ ...editSource, name: e.target.value })} className="input-field text-xs" /></td>
                  <td className="py-2 px-2"><select value={editSource.color ?? 'blue'} onChange={e => setEditSource({ ...editSource, color: e.target.value })} className="input-field text-xs">{COLOR_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}</select></td>
                  <td className="py-2 px-2"><input type="checkbox" checked={editSource.is_active ?? true} onChange={e => setEditSource({ ...editSource, is_active: e.target.checked })} /></td>
                  <td className="py-2 px-2 flex gap-1 justify-end">
                    <button onClick={() => crudUpdate(`/crm/lead-sources/${s.id}`, editSource, setSavingSource, () => { setEditSourceId(null); setEditSource({}) })} className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50"><Save className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setEditSourceId(null); setEditSource({}) }} className="p-1.5 rounded text-slate-500 hover:bg-slate-100"><X className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ) : (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 px-2 font-mono text-xs">{s.code}</td>
                  <td className="py-2 px-2">{s.name}</td>
                  <td className="py-2 px-2"><span className={`px-2 py-0.5 rounded text-xs bg-${s.color}-100 text-${s.color}-700`}>{s.color}</span></td>
                  <td className="py-2 px-2 text-xs">{s.is_active ? <span className="text-emerald-600">Active</span> : <span className="text-slate-400">Inactive</span>}</td>
                  <td className="py-2 px-2 flex gap-1 justify-end">
                    <button onClick={() => { setEditSourceId(s.id); setEditSource(s) }} className="p-1.5 rounded text-slate-500 hover:bg-slate-100"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => crudDelete(`/crm/lead-sources/${s.id}`)} className="p-1.5 rounded text-rose-500 hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pipeline Stages ── */}
      {active === 'pipeline_stages' && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
            <input value={newStage.name} onChange={e => setNewStage({ ...newStage, name: e.target.value })} placeholder="Stage name" className="input-field" />
            <select value={newStage.color} onChange={e => setNewStage({ ...newStage, color: e.target.value })} className="input-field">
              {COLOR_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" value={newStage.win_probability} onChange={e => setNewStage({ ...newStage, win_probability: e.target.value })} placeholder="Win %" className="input-field" />
            <input type="number" value={newStage.sort_order} onChange={e => setNewStage({ ...newStage, sort_order: e.target.value })} placeholder="Sort #" className="input-field" />
            <button onClick={() => crudCreate('/crm/pipeline-stages', newStage, setSavingStage, () => setNewStage({ name: '', color: 'blue', win_probability: '20', sort_order: '1' }))}
              disabled={savingStage || !newStage.name} className="btn-primary flex items-center justify-center gap-2">
              {savingStage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
            </button>
          </div>

          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-xs text-slate-500">
              <th className="text-left py-2 px-2 uppercase">Sort</th>
              <th className="text-left py-2 px-2 uppercase">Name</th>
              <th className="text-left py-2 px-2 uppercase">Color</th>
              <th className="text-left py-2 px-2 uppercase">Win %</th>
              <th className="text-left py-2 px-2 uppercase">Active</th>
              <th></th>
            </tr></thead>
            <tbody>
              {stages.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-xs">No stages yet</td></tr>
              ) : stages.sort((a, b) => a.sort_order - b.sort_order).map(s => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 px-2 text-xs">{s.sort_order}</td>
                  <td className="py-2 px-2 font-medium">{s.name}</td>
                  <td className="py-2 px-2"><span className={`px-2 py-0.5 rounded text-xs bg-${s.color}-100 text-${s.color}-700`}>{s.color}</span></td>
                  <td className="py-2 px-2 text-xs">{s.win_probability}%</td>
                  <td className="py-2 px-2 text-xs">{s.is_active ? <span className="text-emerald-600">Active</span> : <span className="text-slate-400">Inactive</span>}</td>
                  <td className="py-2 px-2 flex gap-1 justify-end">
                    <button onClick={() => crudDelete(`/crm/pipeline-stages/${s.id}`)} className="p-1.5 rounded text-rose-500 hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Customer Groups ── */}
      {active === 'customer_groups' && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-4">
            <input value={newGroup.code} onChange={e => setNewGroup({ ...newGroup, code: e.target.value })} placeholder="CODE" className="input-field" />
            <input value={newGroup.name} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} placeholder="Name" className="input-field md:col-span-2" />
            <input type="number" step="0.01" value={newGroup.default_discount_pct} onChange={e => setNewGroup({ ...newGroup, default_discount_pct: e.target.value })} placeholder="Disc %" className="input-field" />
            <input type="number" value={newGroup.credit_days} onChange={e => setNewGroup({ ...newGroup, credit_days: e.target.value })} placeholder="Credit days" className="input-field" />
            <button onClick={() => crudCreate('/crm/customer-groups', newGroup, setSavingGroup, () => setNewGroup({ code: '', name: '', color: 'indigo', default_discount_pct: '0', credit_days: '0' }))}
              disabled={savingGroup || !newGroup.name} className="btn-primary flex items-center justify-center gap-2">
              {savingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
            </button>
          </div>

          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-xs text-slate-500">
              <th className="text-left py-2 px-2 uppercase">Code</th>
              <th className="text-left py-2 px-2 uppercase">Name</th>
              <th className="text-left py-2 px-2 uppercase">Disc %</th>
              <th className="text-left py-2 px-2 uppercase">Credit Days</th>
              <th className="text-left py-2 px-2 uppercase">Active</th>
              <th></th>
            </tr></thead>
            <tbody>
              {groups.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-xs">No customer groups yet</td></tr>
              ) : groups.map(g => (
                <tr key={g.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 px-2 font-mono text-xs">{g.code}</td>
                  <td className="py-2 px-2 font-medium">{g.name}</td>
                  <td className="py-2 px-2 text-xs">{g.default_discount_pct}%</td>
                  <td className="py-2 px-2 text-xs">{g.credit_days} days</td>
                  <td className="py-2 px-2 text-xs">{g.is_active ? <span className="text-emerald-600">Active</span> : <span className="text-slate-400">Inactive</span>}</td>
                  <td className="py-2 px-2 flex gap-1 justify-end">
                    <button onClick={() => crudDelete(`/crm/customer-groups/${g.id}`)} className="p-1.5 rounded text-rose-500 hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Loyalty Tiers ── */}
      {active === 'loyalty_tiers' && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
            <input value={newTier.name} onChange={e => setNewTier({ ...newTier, name: e.target.value })} placeholder="Tier (Gold)" className="input-field" />
            <input type="number" value={newTier.threshold_amount} onChange={e => setNewTier({ ...newTier, threshold_amount: e.target.value })} placeholder="Spend ≥ RM" className="input-field" />
            <input type="number" step="0.01" value={newTier.points_multiplier} onChange={e => setNewTier({ ...newTier, points_multiplier: e.target.value })} placeholder="Mult (1.5)" className="input-field" />
            <input value={newTier.perks} onChange={e => setNewTier({ ...newTier, perks: e.target.value })} placeholder="Perks (free delivery)" className="input-field" />
            <button onClick={() => crudCreate('/crm/loyalty-tiers', newTier, setSavingTier, () => setNewTier({ name: '', threshold_amount: '0', points_multiplier: '1', color: 'amber', perks: '' }))}
              disabled={savingTier || !newTier.name} className="btn-primary flex items-center justify-center gap-2">
              {savingTier ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
            </button>
          </div>

          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-xs text-slate-500">
              <th className="text-left py-2 px-2 uppercase">Tier</th>
              <th className="text-left py-2 px-2 uppercase">Threshold</th>
              <th className="text-left py-2 px-2 uppercase">Multiplier</th>
              <th className="text-left py-2 px-2 uppercase">Perks</th>
              <th></th>
            </tr></thead>
            <tbody>
              {tiers.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-xs">No tiers yet</td></tr>
              ) : tiers.sort((a, b) => a.threshold_amount - b.threshold_amount).map(t => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 px-2 font-medium">{t.name}</td>
                  <td className="py-2 px-2 text-xs">RM {Number(t.threshold_amount).toLocaleString()}</td>
                  <td className="py-2 px-2 text-xs">{t.points_multiplier}×</td>
                  <td className="py-2 px-2 text-xs text-slate-500">{t.perks ?? '—'}</td>
                  <td className="py-2 px-2 flex gap-1 justify-end">
                    <button onClick={() => crudDelete(`/crm/loyalty-tiers/${t.id}`)} className="p-1.5 rounded text-rose-500 hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Activity Types ── */}
      {active === 'activity_types' && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
            <input value={newAct.code} onChange={e => setNewAct({ ...newAct, code: e.target.value })} placeholder="CODE (CALL)" className="input-field" />
            <input value={newAct.name} onChange={e => setNewAct({ ...newAct, name: e.target.value })} placeholder="Name (Phone Call)" className="input-field" />
            <select value={newAct.color} onChange={e => setNewAct({ ...newAct, color: e.target.value })} className="input-field">
              {COLOR_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => crudCreate('/crm/activity-types', newAct, setSavingAct, () => setNewAct({ code: '', name: '', color: 'cyan' }))}
              disabled={savingAct || !newAct.name} className="btn-primary flex items-center justify-center gap-2">
              {savingAct ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
            </button>
          </div>

          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-xs text-slate-500">
              <th className="text-left py-2 px-2 uppercase">Code</th>
              <th className="text-left py-2 px-2 uppercase">Name</th>
              <th className="text-left py-2 px-2 uppercase">Color</th>
              <th></th>
            </tr></thead>
            <tbody>
              {actTypes.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-slate-400 text-xs">No activity types yet</td></tr>
              ) : actTypes.map(a => (
                <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 px-2 font-mono text-xs">{a.code}</td>
                  <td className="py-2 px-2">{a.name}</td>
                  <td className="py-2 px-2 text-xs">{a.color}</td>
                  <td className="py-2 px-2 flex gap-1 justify-end">
                    <button onClick={() => crudDelete(`/crm/activity-types/${a.id}`)} className="p-1.5 rounded text-rose-500 hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Follow-up Rules ── */}
      {active === 'follow_up_rules' && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-4">
            <input value={newRule.title} onChange={e => setNewRule({ ...newRule, title: e.target.value })} placeholder="Rule title" className="input-field md:col-span-2" />
            <select value={newRule.trigger} onChange={e => setNewRule({ ...newRule, trigger: e.target.value })} className="input-field">
              <option value="order_ready">Order Ready</option>
              <option value="payment_due">Payment Due</option>
              <option value="quote_expiry">Quote Expiry</option>
              <option value="inactive">Inactive Customer</option>
              <option value="birthday">Birthday</option>
              <option value="post_purchase">Post-purchase</option>
            </select>
            <input type="number" value={newRule.days_offset} onChange={e => setNewRule({ ...newRule, days_offset: e.target.value })} placeholder="Days" className="input-field" />
            <select value={newRule.channel} onChange={e => setNewRule({ ...newRule, channel: e.target.value as any })} className="input-field">
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="task">Manual Task</option>
            </select>
            <button onClick={() => crudCreate('/crm/follow-up-rules', newRule, setSavingRule, () => setNewRule({ title: '', trigger: 'order_ready', days_offset: '1', channel: 'whatsapp', template: '' }))}
              disabled={savingRule || !newRule.title} className="btn-primary flex items-center justify-center gap-2">
              {savingRule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
            </button>
          </div>

          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-xs text-slate-500">
              <th className="text-left py-2 px-2 uppercase">Title</th>
              <th className="text-left py-2 px-2 uppercase">Trigger</th>
              <th className="text-left py-2 px-2 uppercase">Days</th>
              <th className="text-left py-2 px-2 uppercase">Channel</th>
              <th></th>
            </tr></thead>
            <tbody>
              {rules.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-xs">No follow-up rules yet</td></tr>
              ) : rules.map(r => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 px-2 font-medium">{r.title}</td>
                  <td className="py-2 px-2 text-xs text-slate-500">{r.trigger}</td>
                  <td className="py-2 px-2 text-xs">{r.days_offset > 0 ? `+${r.days_offset}` : r.days_offset}d</td>
                  <td className="py-2 px-2 text-xs">{r.channel}</td>
                  <td className="py-2 px-2 flex gap-1 justify-end">
                    <button onClick={() => crudDelete(`/crm/follow-up-rules/${r.id}`)} className="p-1.5 rounded text-rose-500 hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Message Templates ── */}
      {active === 'message_templates' && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-4">
            <input value={newTpl.code} onChange={e => setNewTpl({ ...newTpl, code: e.target.value })} placeholder="CODE" className="input-field" />
            <input value={newTpl.name} onChange={e => setNewTpl({ ...newTpl, name: e.target.value })} placeholder="Name" className="input-field md:col-span-2" />
            <select value={newTpl.channel} onChange={e => setNewTpl({ ...newTpl, channel: e.target.value as any })} className="input-field">
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
            <input value={newTpl.body} onChange={e => setNewTpl({ ...newTpl, body: e.target.value })} placeholder="Body — use {{name}}, {{points}}" className="input-field" />
            <button onClick={() => crudCreate('/crm/message-templates', newTpl, setSavingTpl, () => setNewTpl({ code: '', name: '', channel: 'whatsapp', body: '' }))}
              disabled={savingTpl || !newTpl.name} className="btn-primary flex items-center justify-center gap-2">
              {savingTpl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
            </button>
          </div>

          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-xs text-slate-500">
              <th className="text-left py-2 px-2 uppercase">Code</th>
              <th className="text-left py-2 px-2 uppercase">Name</th>
              <th className="text-left py-2 px-2 uppercase">Channel</th>
              <th className="text-left py-2 px-2 uppercase">Body Preview</th>
              <th></th>
            </tr></thead>
            <tbody>
              {tpls.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-xs">No templates yet</td></tr>
              ) : tpls.map(t => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 px-2 font-mono text-xs">{t.code}</td>
                  <td className="py-2 px-2 font-medium">{t.name}</td>
                  <td className="py-2 px-2 text-xs">{t.channel}</td>
                  <td className="py-2 px-2 text-xs text-slate-500 truncate max-w-[260px]">{t.body}</td>
                  <td className="py-2 px-2 flex gap-1 justify-end">
                    <button onClick={() => crudDelete(`/crm/message-templates/${t.id}`)} className="p-1.5 rounded text-rose-500 hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
