import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  copy: vi.fn(),
  push: vi.fn()
}))
vi.mock('@/api/keys', () => ({ keysAPI: { list: mocks.list } }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/composables/useBrand', async () => {
  const { ref } = await import('vue')
  return {
    useBrand: () => ({ apiBaseUrl: ref('https://api.example.test/v1/') })
  }
})
vi.mock('@/composables/useClipboard', async () => {
  const { ref } = await import('vue')
  return {
    useClipboard: () => ({ copied: ref(false), copyToClipboard: mocks.copy })
  }
})
vi.mock('@/composables/useBatchImageAccess', () => ({
  useBatchImageAccess: () => ({
    canUseBatchImage: false,
    refreshBatchImageAccess: vi.fn()
  })
}))
import QuickConnect from '../UserDashboardQuickConnect.vue'

const secret = 'sk-test-secret-12345678901234567890'
beforeEach(() => {
  vi.clearAllMocks()
  mocks.copy.mockResolvedValue(true)
  mocks.list.mockResolvedValue({
    items: [
      { id: 1, name: 'key-one', key: secret, group: { name: 'Claude' } },
      { id: 2, name: 'key-two', key: `${secret}-second` }
    ]
  })
})
const render = () => mount(QuickConnect, { global: { stubs: { Icon: true } } })

describe('仪表盘快速接入', () => {
  it('页面密钥打码，复制配置使用完整密钥，切换密钥后同步更新', async () => {
    const w = render()
    await flushPromises()
    expect(w.get('pre').text()).not.toContain(secret)
    expect(w.get('pre').text()).toContain('sk-test-••••••••7890')
    await w.get('.quick-connect__terminal-header button').trigger('click')
    expect(mocks.copy).toHaveBeenLastCalledWith(
      expect.stringContaining(`ANTHROPIC_AUTH_TOKEN="${secret}"`)
    )
    await w.get('select').setValue(2)
    await w.get('.quick-connect__terminal-header button').trigger('click')
    expect(mocks.copy).toHaveBeenLastCalledWith(
      expect.stringContaining(`${secret}-second`)
    )
    w.unmount()
  })

  it('四种分类切换对应的实际配置，地址只拼接一次 /v1', async () => {
    const w = render()
    await flushPromises()
    expect(w.get('.quick-connect__field code').text()).toBe(
      'https://api.example.test'
    )
    await w.get('#connect-category-sdk').trigger('click')
    expect(w.get('pre').text()).toContain(
      'https://api.example.test/v1/chat/completions'
    )
    await w.get('#connect-client-python').trigger('click')
    expect(w.get('pre').text()).toContain('from openai import OpenAI')
    await w.get('#connect-category-client').trigger('click')
    expect(w.get('pre').text()).toContain(
      'Base URL: https://api.example.test/v1'
    )
    await w.get('#connect-category-image').trigger('click')
    expect(w.get('pre').text()).toContain('/v1/images/generations')
    expect(w.get('pre').text()).toContain('YOUR_IMAGE_MODEL')
    expect(w.get('pre').text()).not.toContain('/v1/v1')
    await w.get('#connect-category-editor').trigger('click')
    expect(w.get('#connect-client-claude').attributes('aria-selected')).toBe(
      'true'
    )
    w.unmount()
  })

  it('复制地址遵循所选客户端，Codex 显示完整配置向导入口', async () => {
    const w = render()
    await flushPromises()
    await w.get('#connect-client-codex').trigger('click')
    await w
      .get('button[aria-label="ui52.dashboard.quickConnect.copyBaseUrl"]')
      .trigger('click')
    expect(mocks.copy).toHaveBeenLastCalledWith('https://api.example.test/v1')
    expect(w.text()).toContain('ui52.dashboard.quickConnect.codexNote')
    expect(w.get('pre').text()).toContain('wire_api = "responses"')
    w.unmount()
  })

  it('没有密钥时禁用复制配置，保留创建密钥入口', async () => {
    mocks.list.mockResolvedValue({ items: [] })
    const w = render()
    await flushPromises()
    expect(
      w.get('.quick-connect__terminal-header button').attributes('disabled')
    ).toBeDefined()
    expect(w.text()).toContain('ui52.dashboard.quickConnect.noKeys')
    await w.get('.quick-connect__no-keys button').trigger('click')
    expect(mocks.push).toHaveBeenCalledWith('/keys')
    w.unmount()
  })
})
