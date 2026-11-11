import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserMonitorView } from '@/api/channelMonitor'

const mocks = vi.hoisted(() => ({ list: vi.fn(), matrix: vi.fn(), mode: 'v1' }))
vi.mock('@/api/channelMonitor', () => ({
  channelMonitorUserAPI: { list: mocks.list }
}))
vi.mock('@/api/channelMonitorV2', () => ({ getMatrix: mocks.matrix }))
vi.mock('@/utils/featureFlags', () => ({
  getChannelMonitorMode: () => mocks.mode,
  getChannelMonitorRefreshIntervalSeconds: () => 60
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/composables/useChannelMonitorFormat', () => ({
  useChannelMonitorFormat: () => ({ providerLabel: (value: string) => value })
}))
import ChannelStatus from '../UserDashboardChannelStatus.vue'

function monitor(): UserMonitorView {
  return {
    id: 1,
    name: 'Claude',
    provider: 'anthropic',
    group_name: '',
    primary_model: 'claude',
    primary_status: 'operational',
    primary_latency_ms: 500,
    primary_ping_latency_ms: null,
    availability_7d: 99.5,
    extra_models: [],
    timeline: [
      {
        status: 'operational',
        checked_at: '2026-11-11T10:02:00Z',
        latency_ms: 500,
        ping_latency_ms: null
      },
      {
        status: 'failed',
        checked_at: '2026-11-11T10:01:00Z',
        latency_ms: null,
        ping_latency_ms: null
      },
      {
        status: 'operational',
        checked_at: '2026-11-11T10:00:00Z',
        latency_ms: 500,
        ping_latency_ms: null
      }
    ]
  }
}
const wrappers: VueWrapper[] = []
function render() {
  const wrapper = mount(ChannelStatus, {
    global: {
      stubs: {
        Icon: true,
        RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' }
      }
    }
  })
  wrappers.push(wrapper)
  return wrapper
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  mocks.mode = 'v1'
  mocks.list.mockResolvedValue({ items: [] })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.useRealTimers()
  vi.restoreAllMocks()
})
describe('仪表盘渠道状态', () => {
  it('V1 使用真实可用率，历史从旧到新排列，缺失区间留灰', async () => {
    mocks.list.mockResolvedValue({ items: [monitor()] })
    const w = render()
    await flushPromises()
    expect(w.text()).toContain('99.50%')
    expect(w.get('a').attributes('href')).toBe('/monitor')
    const bars = w.findAll('.channel-summary__bar')
    expect(bars).toHaveLength(32)
    expect(
      bars
        .slice(0, 29)
        .every((bar) => bar.classes().includes('channel-state--unknown'))
    ).toBe(true)
    expect(bars.slice(-3).map((bar) => bar.classes().at(-1))).toEqual([
      'channel-state--healthy',
      'channel-state--critical',
      'channel-state--healthy'
    ])
    expect(mocks.matrix).not.toHaveBeenCalled()
  })

  it('V2 使用用户端平台矩阵，无请求的正常状态仍显示为无数据', async () => {
    mocks.mode = 'v2'
    mocks.matrix.mockResolvedValue({
      items: [
        {
          platform: 'openai',
          metrics: { request_count: 0, success_requests: 0 },
          health: { overall: 'healthy' },
          buckets: [
            {
              bucket_start: '2026-11-11T10:00:00Z',
              metrics: { request_count: 0 },
              health: { overall: 'healthy' }
            }
          ]
        }
      ]
    })
    const w = render()
    await flushPromises()
    expect(mocks.matrix).toHaveBeenCalledWith(
      { range: '24h', platforms: [], groupIds: [], models: [] },
      'platform',
      false,
      expect.any(AbortSignal)
    )
    expect(mocks.list).not.toHaveBeenCalled()
    expect(w.get('.channel-summary__rate').text()).toBe('—')
    expect(w.get('.channel-summary__overall').text()).not.toContain(
      'allHealthy'
    )
    expect(
      w
        .findAll('.channel-summary__bar')
        .every((bar) => bar.classes().includes('channel-state--unknown'))
    ).toBe(true)
  })

  it('V2 成功率按实际请求计数计算，历史区间按时间排列且允许空历史', async () => {
    mocks.mode = 'v2'
    mocks.matrix.mockResolvedValue({
      items: [
        {
          platform: 'openai',
          metrics: { request_count: 100, success_requests: 98 },
          health: { overall: 'warning' },
          buckets: [
            {
              bucket_start: '2026-11-11T10:01:00Z',
              metrics: { request_count: 20 },
              health: { overall: 'healthy' }
            },
            {
              bucket_start: '2026-11-11T10:00:00Z',
              metrics: { request_count: 80 },
              health: { overall: 'warning' }
            }
          ]
        },
        {
          platform: 'anthropic',
          metrics: { request_count: 0, success_requests: 0 },
          health: { overall: 'unknown' },
          buckets: null
        }
      ]
    })
    const w = render()
    await flushPromises()
    expect(
      w.findAll('.channel-summary__rate').map((rate) => rate.text())
    ).toEqual(['98.00%', '—'])
    expect(
      w
        .findAll('.channel-summary__row')[0]
        .findAll('.channel-summary__bar')
        .slice(-2)
        .map((bar) => bar.classes().at(-1))
    ).toEqual(['channel-state--warning', 'channel-state--healthy'])
    expect(w.get('.channel-summary__overall').classes()).toContain(
      'channel-state--warning'
    )
  })

  it('空监控不宣称全部正常，加载失败可重试', async () => {
    mocks.list.mockRejectedValueOnce(new Error('offline'))
    const w = render()
    await flushPromises()
    expect(w.text()).toContain('channelStatus.loadError')
    expect(w.get('.channel-summary__overall').text()).not.toContain(
      'allHealthy'
    )
    await w.get('button').trigger('click')
    await flushPromises()
    expect(mocks.list).toHaveBeenCalledTimes(2)
    expect(w.text()).toContain('ui52.dashboard.channelStatus.empty')
  })

  it('刷新失败保留历史并标记过期，卸载取消定时器与请求', async () => {
    mocks.list
      .mockResolvedValueOnce({ items: [monitor()] })
      .mockRejectedValueOnce(new Error('offline'))
    const w = render()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(60_000)
    await flushPromises()
    expect(w.text()).toContain('99.50%')
    expect(w.text()).toContain('ui52.dashboard.channelStatus.stale')
    const signal = mocks.list.mock.calls.at(-1)?.[0].signal as AbortSignal
    w.unmount()
    expect(signal.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
})
