import { apiClient } from './client'
import type { PaginatedResponse } from '@/types'

export const ticketImageLimit = 3
export const ticketImageMaxBytes = 5 * 1024 * 1024
export const ticketImageTypes = ['image/png', 'image/jpeg', 'image/webp']

export const ticketCategories = ['api', 'billing', 'account', 'other'] as const
export const ticketStatuses = ['waiting_support', 'waiting_user', 'resolved', 'closed'] as const
export type TicketCategory = typeof ticketCategories[number]
export type TicketStatus = typeof ticketStatuses[number]
export type TicketAction = 'reply' | 'resolve' | 'confirm' | 'reopen' | 'close'

export interface SupportTicket {
  id: number
  user_id: number
  subject: string
  category: TicketCategory
  status: TicketStatus
  version: number
  created_at: string
  updated_at: string
  /** Only in the requester's list: support has updated the ticket since they last opened it. */
  unread?: boolean
}

export interface TicketSummary {
  /** Requester: tickets with unseen support updates. Administrator: tickets waiting for support. */
  attention: number
  /** Changes whenever a ticket in scope is created or acted on. */
  activity: number
}

export interface TicketEvent {
  version: number
  actor_role: 'user' | 'admin'
  action: TicketAction | 'create'
  body: string
  image_count?: number
  created_at: string
}

export interface TicketKnowledge {
  revision: number
  published: boolean
  question: string
  answer: string
  updated_at: string
}

export interface TicketDetail extends SupportTicket {
  events: TicketEvent[]
  next_before?: number
  knowledge?: TicketKnowledge
}

export interface TicketCreate {
  subject: string
  category: TicketCategory
  body: string
}

const userPath = '/support-tickets'
const adminPath = '/admin/support-tickets'

// User and administrator screens share response shapes and use separate authenticated routes.
export function supportTicketsAPI(admin: boolean) {
  const path = admin ? adminPath : userPath
  return {
    async list(status: TicketStatus | '', page: number, pageSize: number, signal: AbortSignal) {
      const { data } = await apiClient.get<PaginatedResponse<SupportTicket>>(path, {
        params: { status: status || undefined, page, page_size: pageSize },
        signal
      })
      return data
    },
    async summary() {
      const { data } = await apiClient.get<TicketSummary>(`${path}/summary`)
      return data
    },
    async detail(id: number, signal: AbortSignal, before?: number) {
      const { data } = await apiClient.get<TicketDetail>(`${path}/${id}`, { params: { before }, signal })
      return data
    },
    async act(id: number, action: TicketAction, body: string, version: number, images: File[]) {
      const message = ticketMessage({ action, body, version }, images)
      await apiClient.post(`${path}/${id}/actions`, message.data, message.config)
    },
    async image(id: number, version: number, position: number, signal: AbortSignal) {
      const { data } = await apiClient.get<Blob>(`${path}/${id}/events/${version}/images/${position}`, {
        responseType: 'blob',
        signal
      })
      return data
    }
  }
}

export async function createSupportTicket(input: TicketCreate, idempotencyKey: string, images: File[]) {
  const message = ticketMessage(input, images)
  const { data } = await apiClient.post<{ id: number }>(userPath, message.data, {
    ...message.config,
    headers: { ...message.config?.headers, 'Idempotency-Key': idempotencyKey }
  })
  return data
}

export async function updateTicketKnowledge(id: number, input: Omit<TicketKnowledge, 'updated_at'>) {
  const { data } = await apiClient.put<TicketKnowledge>(`${adminPath}/${id}/knowledge`, input)
  return data
}

// Keep text-only requests on the existing JSON API.
function ticketMessage(input: object, images: File[]) {
  if (!images.length) return { data: input }
  const form = new FormData()
  form.append('payload', JSON.stringify(input))
  for (const file of images) form.append('images', file)
  return { data: form, config: { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 } }
}

// Keep the draft in the composer while explaining why attachments were rejected.
export function ticketImageErrorKey(error: unknown, images: File[]) {
  if (!images.length) return undefined
  const result = error as { status?: number; reason?: string; metadata?: Record<string, string> } | null
  if (result?.reason === 'SUPPORT_TICKET_IMAGE_QUOTA') {
    switch (result.metadata?.scope) {
      case 'ticket': return 'supportTickets.images.ticketQuota'
      case 'account': return 'supportTickets.images.accountQuota'
      default: return 'supportTickets.images.siteQuota'
    }
  }
  if (result?.status === 429) return 'supportTickets.images.rateLimited'
  if (result?.reason === 'SUPPORT_TICKET_UPLOAD_UNAVAILABLE') return 'supportTickets.images.unavailable'
  if (result?.status === 408) return 'supportTickets.images.timeout'
  if (result?.status === 413 || result?.reason === 'SUPPORT_TICKET_INVALID_IMAGE') return 'supportTickets.images.invalid'
  return undefined
}

export interface TicketImageSettings {
  user_rpm: number
  site_rpm: number
  ticket_max_images: number
  account_max_images: number
  account_max_mib: number
  site_max_images: number
  site_max_mib: number
}

export async function getTicketImageSettings() {
  const { data } = await apiClient.get<TicketImageSettings>('/admin/settings/support-ticket-images')
  return data
}

export async function saveTicketImageSettings(settings: TicketImageSettings) {
  const { data } = await apiClient.put<TicketImageSettings>('/admin/settings/support-ticket-images', settings)
  return data
}
