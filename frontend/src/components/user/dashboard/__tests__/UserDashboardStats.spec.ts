import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mockPush }) }))

// t() 回显 key；带参数时附上 JSON，便于断言计数
vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, params?: Record<string, unknown>) =>
        params ? `${key}:${JSON.stringify(params)}` : key
    })
  }
})

import UserDashboardStats from '../UserDashboardStats.vue'
import type { UserDashboardStats as UserStatsType } from '@/api/usage'

function makeStats(over: Partial<UserStatsType> = {}): UserStatsType {
  return {
    total_api_keys: 1,
    active_api_keys: 1,
    total_requests: 0,
    total_input_tokens: 0,
    total_output_tokens: 0,
    total_cache_creation_tokens: 0,
    total_cache_read_tokens: 0,
    total_tokens: 0,
    total_cost: 0,
    total_actual_cost: 0,
    today_requests: 0,
    today_input_tokens: 0,
    today_output_tokens: 0,
    today_cache_creation_tokens: 0,
    today_cache_read_tokens: 0,
    today_tokens: 0,
    today_cost: 0,
    today_actual_cost: 0,
    average_duration_ms: 0,
    rpm: 0,
    tpm: 0,
    by_platform: [],
    ...over
  }
}

function mountStats(stats: UserStatsType, isSimple = false) {
  return mount(UserDashboardStats, {
    props: { stats, balance: 0, isSimple },
    global: { stubs: { Icon: true } }
  })
}

describe('UserDashboardStats 账户概览', () => {
  it('账户概览不再展示按平台拆分', () => {
    const w = mountStats(
      makeStats({
        by_platform: [
          {
            platform: 'openai',
            total_requests: 1,
            total_tokens: 10,
            total_actual_cost: 1,
            today_requests: 1,
            today_tokens: 10,
            today_actual_cost: 1
          }
        ]
      })
    )
    expect(w.find('[data-testid="platform-card"]').exists()).toBe(false)
    expect(w.text()).not.toContain('dashboard.platformBreakdown')
  })

  it('隐藏余额时移除金额和可反推余额的可用天数，支持再次显示', async () => {
    const w = mountStats(makeStats())
    await w.setProps({
      balance: 1234.56,
      trend: [
        {
          date: '2026-11-10',
          requests: 1,
          input_tokens: 1,
          output_tokens: 0,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_tokens: 1,
          cost: 10,
          actual_cost: 10
        }
      ]
    })
    expect(w.get('[data-testid="account-balance"]').text()).toBe('$1,234.56')
    expect(w.text()).toContain('ui52.dashboard.hero.days:{"days":"123"}')
    await w
      .get('button[aria-label="ui52.dashboard.hero.hideBalance"]')
      .trigger('click')
    expect(w.get('[data-testid="account-balance"]').text()).toBe('••••••')
    expect(
      w.get('[data-testid="account-balance"]').attributes('title')
    ).toBeUndefined()
    expect(w.text()).not.toContain('1,234.56')
    expect(w.text()).not.toContain('ui52.dashboard.hero.days')
    expect(
      w
        .get('button[aria-label="ui52.dashboard.hero.showBalance"]')
        .attributes('aria-pressed')
    ).toBe('true')
    await w
      .get('button[aria-label="ui52.dashboard.hero.showBalance"]')
      .trigger('click')
    expect(w.get('[data-testid="account-balance"]').text()).toBe('$1,234.56')
  })

  it('Token 构成条合并缓存创建和读取，三段占比合计为 100%', () => {
    const w = mountStats(
      makeStats({
        total_tokens: 100,
        total_input_tokens: 20,
        total_output_tokens: 10,
        total_cache_creation_tokens: 30,
        total_cache_read_tokens: 40
      })
    )
    const segments = w.findAll('.token-track > span')
    expect(segments.map((segment) => segment.attributes('style'))).toEqual([
      'width: 20%;',
      'width: 10%;',
      'width: 70%;'
    ])
    expect(w.get('.token-legend').text()).toContain('dashboard.cache 70')
    expect(w.text()).toContain(
      'ui52.dashboard.metrics.cacheShare:{"percent":"40.0"}'
    )
  })

  it('零用量与缺失趋势不渲染虚构曲线或无效占比', () => {
    const w = mountStats(makeStats({ total_api_keys: 0, active_api_keys: 0 }))
    expect(
      w
        .findAll('.token-track > span')
        .every((segment) => segment.attributes('style') === 'width: 0%;')
    ).toBe(true)
    expect(w.find('[role="meter"]').exists()).toBe(false)
    expect(w.findAll('.overview-spark')).toHaveLength(0)
    expect(w.html()).not.toMatch(/NaN|Infinity/)
  })

  it('四个账户操作跳转到现有页面', async () => {
    mockPush.mockClear()
    const w = mountStats(makeStats())
    for (const button of w.findAll('.balance-panel__actions button'))
      await button.trigger('click')
    expect(mockPush.mock.calls.map((call) => call[0])).toEqual([
      '/purchase',
      '/keys',
      '/redeem',
      '/usage'
    ])
  })
})
