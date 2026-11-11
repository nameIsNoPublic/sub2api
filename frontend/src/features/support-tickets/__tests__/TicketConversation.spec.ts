import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { TicketDetail, TicketStatus } from '@/api/supportTickets'
import TicketConversation from '../TicketConversation.vue'

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return { ...actual, useI18n: () => ({ t: (key: string) => key }) }
})

const api = { detail: vi.fn(), act: vi.fn(), image: vi.fn() }
vi.mock('@/api/supportTickets', async () => {
  const actual = await vi.importActual<typeof import('@/api/supportTickets')>('@/api/supportTickets')
  return { ...actual, supportTicketsAPI: () => api }
})

function detail(status: TicketStatus): TicketDetail {
  return {
    id: 7, user_id: 3, subject: 'Request failed', category: 'api', status, version: 4,
    created_at: '2026-11-10T08:00:00Z', updated_at: '2026-11-10T09:00:00Z',
    events: [{ version: 1, actor_role: 'user', action: 'create', body: 'It fails', created_at: '2026-11-10T08:00:00Z' }]
  }
}

async function open(status: TicketStatus, admin: boolean) {
  api.detail.mockResolvedValue(detail(status))
  const wrapper = mount(TicketConversation, {
    props: { id: 7, admin },
    global: { stubs: { TicketKnowledgeEditor: true, TicketImagePicker: true } }
  })
  await flushPromises()
  return wrapper
}

const actionButtons = (wrapper: Awaited<ReturnType<typeof open>>) =>
  wrapper.findAll('button').map(button => button.text()).filter(text => text.startsWith('supportTickets.action.'))

describe('TicketConversation actions', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    ['waiting_support', false, ['reply', 'close']],
    ['waiting_user', true, ['reply', 'resolve', 'close']],
    ['resolved', false, ['confirm', 'reopen']],
    ['resolved', true, ['close']],
    ['closed', false, ['reopen']],
    ['closed', true, ['reopen']]
  ] as const)('offers the %s actions to admin=%s', async (status, admin, expected) => {
    const wrapper = await open(status, admin)
    expect(actionButtons(wrapper)).toEqual(expected.map(action => `supportTickets.action.${action}`))
  })

  it('closes without a note and requires a reason to reopen', async () => {
    api.act.mockResolvedValue(undefined)
    const wrapper = await open('waiting_user', false)
    const close = wrapper.findAll('button').find(button => button.text() === 'supportTickets.action.close')!
    expect(close.attributes('disabled')).toBeUndefined()
    await close.trigger('click')
    await flushPromises()
    expect(api.act).toHaveBeenCalledWith(7, 'close', '', 4, [])

    const reopened = await open('closed', true)
    expect(reopened.text()).toContain('supportTickets.closedHint')
    const reopen = reopened.findAll('button').find(button => button.text() === 'supportTickets.action.reopen')!
    expect(reopen.attributes('disabled')).toBeDefined()
    await reopened.get('#ticket-reply').setValue('Following up')
    expect(reopen.attributes('disabled')).toBeUndefined()
  })

  it('asks the page to collapse the details', async () => {
    const wrapper = await open('waiting_support', false)
    await wrapper.get('button[aria-label="supportTickets.collapse"]').trigger('click')
    expect(wrapper.emitted('collapse')).toHaveLength(1)
  })
})
