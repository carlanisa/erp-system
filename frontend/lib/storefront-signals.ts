import { storefrontApi, getCartToken } from './storefront-api'

/**
 * Post a behavior signal to the backend. Returns optional intervention
 * (voucher + message + mood) the backend wants the UI to surface.
 */
export type Intervention = {
  ok: boolean
  mood: 'browsing' | 'ready_to_buy' | 'hesitant' | 'stalled' | 'leaving'
  voucher: null | {
    code: string
    voucher_type: 'free_shipping' | 'percent' | 'fixed'
    value: number
    min_subtotal: number
    headline: string | null
    subtext: string | null
    expires_at: string | null
    trigger: string | null
  }
  message: string | null
}

export async function sendSignal(event: string, payload: any = {}): Promise<Intervention | null> {
  const token = getCartToken()
  if (!token) return null
  try {
    const { data } = await storefrontApi.post('/signals', {
      event, payload, session_token: token,
    })
    return data as Intervention
  } catch {
    return null
  }
}
