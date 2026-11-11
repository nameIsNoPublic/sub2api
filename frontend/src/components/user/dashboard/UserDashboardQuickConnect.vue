<template>
  <section class="dashboard-panel quick-connect">
    <header class="dashboard-panel__header">
      <div>
        <div class="quick-connect__title">
          <h2 class="dashboard-panel__title">
            {{ t('ui52.dashboard.quickConnect.title') }}
          </h2>
          <span>{{ t('ui52.dashboard.quickConnect.steps') }}</span>
        </div>
        <p class="dashboard-panel__hint">
          {{ t('ui52.dashboard.quickConnect.hint') }}
        </p>
      </div>
      <div
        class="quick-connect__categories"
        role="tablist"
        :aria-label="t('ui52.dashboard.quickConnect.categoryLabel')"
      >
        <button
          v-for="item in categories"
          :id="`connect-category-${item}`"
          :key="item"
          type="button"
          role="tab"
          :aria-selected="category === item"
          aria-controls="connect-category-panel"
          :class="{ 'is-active': category === item }"
          @click="selectCategory(item)"
        >
          {{ t(`ui52.dashboard.quickConnect.categories.${item}`) }}
        </button>
      </div>
    </header>

    <div
      id="connect-category-panel"
      class="quick-connect__body"
      role="tabpanel"
      :aria-labelledby="`connect-category-${category}`"
    >
      <div class="quick-connect__settings">
        <div>
          <label class="quick-connect__label">{{
            t('ui52.dashboard.quickConnect.baseUrl')
          }}</label>
          <div class="quick-connect__field">
            <code :title="activeBaseUrl">{{ activeBaseUrl }}</code>
            <button
              type="button"
              class="dashboard-link"
              :aria-label="t('ui52.dashboard.quickConnect.copyBaseUrl')"
              @click="copyAs('baseUrl', activeBaseUrl)"
            >
              {{
                isCopied('baseUrl')
                  ? t('ui52.dashboard.quickConnect.copied')
                  : t('common.copy')
              }}
            </button>
          </div>
          <p class="quick-connect__note">{{ activeTabMeta.urlHint }}</p>
        </div>
        <div>
          <div class="quick-connect__key-label">
            <label for="connect-key" class="quick-connect__label">{{
              t('ui52.dashboard.quickConnect.apiKey')
            }}</label
            ><button type="button" class="dashboard-link" @click="go('/keys')">
              + {{ t('ui52.dashboard.quickConnect.newKey') }}
            </button>
          </div>
          <template v-if="keys.length">
            <select
              id="connect-key"
              v-model="selectedKeyId"
              class="quick-connect__field quick-connect__select"
            >
              <option v-for="key in keys" :key="key.id" :value="key.id">
                {{ key.name
                }}{{ key.group?.name ? ` · ${key.group.name}` : '' }}
              </option>
            </select>
            <div class="quick-connect__key-preview">
              <code>{{ maskedKey }}</code
              ><button
                type="button"
                class="dashboard-link"
                @click="copyAs('key', selectedKey?.key || '')"
              >
                {{
                  isCopied('key')
                    ? t('ui52.dashboard.quickConnect.copied')
                    : t('ui52.dashboard.quickConnect.copyKey')
                }}
              </button>
            </div>
          </template>
          <div v-else class="quick-connect__no-keys">
            <p>
              {{
                t(
                  keysLoadFailed
                    ? 'ui52.dashboard.quickConnect.keysLoadFailed'
                    : 'ui52.dashboard.quickConnect.noKeys'
                )
              }}
            </p>
            <button type="button" class="dashboard-link" @click="go('/keys')">
              {{ t('dashboard.createApiKey') }}
            </button>
          </div>
        </div>
        <div class="quick-connect__faq">
          <h3>{{ t('ui52.dashboard.quickConnect.faqTitle') }}</h3>
          <p>{{ t('ui52.dashboard.quickConnect.faq') }}</p>
        </div>
        <p class="quick-connect__note">
          {{ t('ui52.dashboard.quickConnect.secretNote') }}
        </p>
        <button
          v-if="canUseBatchImage"
          type="button"
          class="dashboard-link"
          @click="go('/batch-image')"
        >
          {{ t('dashboard.batchImageAgent') }} →
        </button>
      </div>

      <div class="quick-connect__config">
        <div
          class="quick-connect__clients"
          role="tablist"
          :aria-label="t('ui52.dashboard.quickConnect.clientLabel')"
        >
          <button
            v-for="tab in clientTabs"
            :id="`connect-client-${tab.id}`"
            :key="tab.id"
            type="button"
            role="tab"
            :aria-selected="activeClient === tab.id"
            aria-controls="connect-snippet"
            :class="{ 'is-active': activeClient === tab.id }"
            @click="activeClient = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>
        <div
          id="connect-snippet"
          class="quick-connect__terminal"
          role="tabpanel"
          :aria-labelledby="`connect-client-${activeClient}`"
        >
          <div class="quick-connect__terminal-header">
            <span>terminal</span
            ><button
              type="button"
              :disabled="!selectedKey"
              @click="copyAs('snippet', realSnippet)"
            >
              <Icon
                :name="isCopied('snippet') ? 'check' : 'copy'"
                size="xs"
              />{{
                t(
                  isCopied('snippet')
                    ? 'ui52.dashboard.quickConnect.copied'
                    : 'ui52.dashboard.quickConnect.copyConfig'
                )
              }}
            </button>
          </div>
          <pre><code><template v-for="(line, index) in highlightedLines" :key="index"><span v-for="(segment, part) in line" :key="part" :class="segment.cls">{{ segment.text }}</span>{{ '\n' }}</template></code></pre>
        </div>
        <p v-if="activeClient === 'codex'" class="quick-connect__note">
          {{ t('ui52.dashboard.quickConnect.codexNote') }}
          <button type="button" class="dashboard-link" @click="go('/keys')">
            {{ t('ui52.dashboard.quickConnect.openWizard') }} →
          </button>
        </p>
        <p
          v-if="category === 'sdk' || category === 'image'"
          class="quick-connect__note"
        >
          {{ t('ui52.dashboard.quickConnect.modelHint') }}
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/** 仪表盘接入配置：按类别选择客户端，展示掩码密钥、复制完整配置。 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import { keysAPI } from '@/api/keys'
import { useBrand } from '@/composables/useBrand'
import { useClipboard } from '@/composables/useClipboard'
import { useBatchImageAccess } from '@/composables/useBatchImageAccess'
import type { ApiKey } from '@/types'

const router = useRouter()
const { t } = useI18n()
const { apiBaseUrl } = useBrand()
const { copied, copyToClipboard } = useClipboard()
const { canUseBatchImage, refreshBatchImageAccess } = useBatchImageAccess()

const go = (path: string) => {
  router?.push(path)
}

/** 客户端根地址：去掉版本后缀，再按客户端要求拼接。 */
const endpointRoot = computed(() =>
  apiBaseUrl.value
    .replace(/\/+$/, '')
    .replace(/\/v1(beta)?$/, '')
    .replace(/\/+$/, '')
)

type CategoryId = 'editor' | 'sdk' | 'client' | 'image'
type ClientId =
  | 'claude'
  | 'codex'
  | 'gemini'
  | 'cursor'
  | 'curl'
  | 'python'
  | 'client'
  | 'images'
const categories: CategoryId[] = ['editor', 'sdk', 'client', 'image']
const clients: Record<CategoryId, Array<{ id: ClientId; label: string }>> = {
  editor: [
    { id: 'claude', label: 'Claude Code' },
    { id: 'codex', label: 'Codex CLI' },
    { id: 'cursor', label: 'Cursor' },
    { id: 'gemini', label: 'Gemini CLI' }
  ],
  sdk: [
    { id: 'curl', label: 'cURL' },
    { id: 'python', label: 'Python' }
  ],
  client: [{ id: 'client', label: 'OpenAI Compatible' }],
  image: [{ id: 'images', label: 'Image API' }]
}
const category = ref<CategoryId>('editor')
const activeClient = ref<ClientId>('claude')
const clientTabs = computed(() => clients[category.value])
function selectCategory(value: CategoryId) {
  category.value = value
  activeClient.value = clients[value][0].id
}

const activeTabMeta = computed(() => {
  switch (activeClient.value) {
    case 'codex':
      return {
        baseUrl: `${endpointRoot.value}/v1`,
        urlHint: t('ui52.dashboard.quickConnect.codexHint')
      }
    case 'gemini':
      return {
        baseUrl: endpointRoot.value,
        urlHint: t('ui52.dashboard.quickConnect.geminiHint')
      }
    case 'claude':
      return {
        baseUrl: endpointRoot.value,
        urlHint: t('ui52.dashboard.quickConnect.claudeHint')
      }
    default:
      return {
        baseUrl: `${endpointRoot.value}/v1`,
        urlHint: t('ui52.dashboard.quickConnect.openaiHint')
      }
  }
})
const activeBaseUrl = computed(() => activeTabMeta.value.baseUrl)

// ---- 密钥选择 ----

const keys = ref<ApiKey[]>([])
const keysLoadFailed = ref(false)
const selectedKeyId = ref<number | null>(null)
const selectedKey = computed(
  () => keys.value.find((k) => k.id === selectedKeyId.value) ?? null
)

const KEY_PLACEHOLDER = 'sk-your-api-key'

function maskKey(key: string): string {
  if (key.length <= 12) return key
  return `${key.slice(0, 8)}••••••••${key.slice(-4)}`
}
const maskedKey = computed(() =>
  selectedKey.value ? maskKey(selectedKey.value.key) : ''
)

async function loadKeys() {
  try {
    // 只取前 100 个启用密钥填充下拉；超过的属于极端场景，去密钥页管理
    const res = await keysAPI.list(1, 100, { status: 'active' })
    keys.value = res.items ?? []
    keysLoadFailed.value = false
    if (
      keys.value.length > 0 &&
      !keys.value.some((k) => k.id === selectedKeyId.value)
    ) {
      selectedKeyId.value = keys.value[0].id
    }
  } catch (error) {
    console.warn('Failed to load api keys for quick connect:', error)
    keysLoadFailed.value = true
  }
}

// ---- 配置片段（与 UseKeyModal 的环境变量口径一致；完整多文件配置走密钥页使用向导） ----

/** 生成各客户端的最小接入示例；SDK 和生图的模型由用户按分组替换。 */
function buildSnippet(key: string): string {
  const root = endpointRoot.value
  switch (activeClient.value) {
    case 'cursor':
    case 'client':
      return [
        `Base URL: ${root}/v1`,
        `API Key: ${key}`,
        '',
        `# ${t('ui52.dashboard.quickConnect.clientFields')}`
      ].join('\n')
    case 'python':
      return [
        'from openai import OpenAI',
        '',
        `client = OpenAI(base_url="${root}/v1", api_key="${key}")`,
        'response = client.chat.completions.create(',
        '    model="YOUR_MODEL",',
        '    messages=[{"role": "user", "content": "Hello"}]',
        ')',
        'print(response.choices[0].message.content)'
      ].join('\n')
    case 'curl':
    case 'images': {
      const image = activeClient.value === 'images'
      const body = image
        ? {
            model: 'YOUR_IMAGE_MODEL',
            prompt: 'A quiet mountain lake',
            size: '1024x1024'
          }
        : {
            model: 'YOUR_MODEL',
            messages: [{ role: 'user', content: 'Hello' }]
          }
      return [
        `curl "${root}/v1/${image ? 'images/generations' : 'chat/completions'}" \\`,
        `  -H "Authorization: Bearer ${key}" \\`,
        '  -H "Content-Type: application/json" \\',
        `  -d '${JSON.stringify(body)}'`
      ].join('\n')
    }
    case 'codex':
      return [
        `export SUB2API_API_KEY="${key}"`,
        '',
        `# ${t('ui52.dashboard.quickConnect.codexSnippetNote')}`,
        '# [model_providers.sub2api]',
        `# base_url = "${root}/v1"`,
        '# env_key = "SUB2API_API_KEY"',
        '# wire_api = "responses"'
      ].join('\n')
    case 'gemini':
      return [
        `# ${t('ui52.dashboard.quickConnect.runAfter', { client: 'Gemini CLI' })}`,
        `export GOOGLE_GEMINI_BASE_URL="${root}"`,
        `export GEMINI_API_KEY="${key}"`,
        '',
        'gemini'
      ].join('\n')
    default:
      return [
        `# ${t('ui52.dashboard.quickConnect.runAfter', { client: 'Claude Code' })}`,
        `export ANTHROPIC_BASE_URL="${root}"`,
        `export ANTHROPIC_AUTH_TOKEN="${key}"`,
        'export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1',
        '',
        'claude'
      ].join('\n')
  }
}

/** 展示用：密钥打码；复制用：完整密钥 */
const displaySnippet = computed(() =>
  buildSnippet(
    selectedKey.value ? maskKey(selectedKey.value.key) : KEY_PLACEHOLDER
  )
)
const realSnippet = computed(() =>
  buildSnippet(selectedKey.value?.key || KEY_PLACEHOLDER)
)

// ---- 终端语法高亮：纯文本切分成带色段，不用 v-html，避免注入风险 ----

interface SnippetSeg {
  text: string
  cls: string
}

const highlightedLines = computed<SnippetSeg[][]>(() =>
  displaySnippet.value.split('\n').map((line) => {
    // 注释行整行灰
    if (line.trimStart().startsWith('#'))
      return [{ text: line, cls: 'text-gray-500' }]
    // export/set 赋值行沿用靛蓝关键字、珊瑚橙字符串。
    const m = line.match(/^(export|set)(\s+)([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (m) {
      return [
        { text: m[1], cls: 'text-[#a9b2ff]' },
        { text: m[2], cls: '' },
        { text: m[3], cls: 'text-[#dce5f4]' },
        { text: '=', cls: 'text-gray-500' },
        { text: m[4], cls: 'text-[#ffae8c]' }
      ]
    }
    return [{ text: line, cls: 'text-gray-100' }]
  })
)

// ---- 复制状态 ----

const lastCopiedKey = ref('')

function copyAs(slot: string, text: string) {
  if (!text) return
  lastCopiedKey.value = slot
  void copyToClipboard(text)
}

function isCopied(slot: string): boolean {
  return copied.value && lastCopiedKey.value === slot
}

onMounted(() => {
  void loadKeys()
  void refreshBatchImageAccess()
})
</script>

<style scoped>
.quick-connect__title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.quick-connect__title > span {
  border-radius: 20px;
  background: var(--dashboard-primary-soft);
  padding: 3px 8px;
  color: var(--dashboard-primary);
  font-size: 10px;
  font-weight: 500;
}
.quick-connect__categories {
  display: flex;
  flex-wrap: wrap;
  padding: 4px;
  border-radius: 24px;
  background: var(--dashboard-paper);
}
.quick-connect__categories button {
  padding: 6px 12px;
  border-radius: 20px;
  color: var(--dashboard-muted);
  font-size: 12px;
  transition:
    background 150ms,
    color 150ms;
}
.quick-connect__categories .is-active {
  background: var(--dashboard-surface);
  color: var(--dashboard-primary);
  box-shadow: 0 1px 4px #17203d0a;
}
.quick-connect__body {
  display: grid;
  gap: 24px;
}
.quick-connect__settings {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.quick-connect__label {
  font-size: 12px;
  font-weight: 500;
  color: var(--dashboard-muted);
}
.quick-connect__field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--dashboard-line);
  border-radius: 12px;
  margin-top: 8px;
  padding: 10px 14px;
  background: var(--dashboard-paper);
  font-size: 12px;
}
.quick-connect__field code {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.quick-connect__field button {
  flex-shrink: 0;
}
.quick-connect__select {
  color: var(--dashboard-ink);
}
.quick-connect__note {
  margin-top: 8px;
  color: var(--dashboard-muted);
  font-size: 11px;
  line-height: 1.7;
}
.quick-connect__key-label,
.quick-connect__key-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.quick-connect__key-preview {
  margin-top: 10px;
  color: var(--dashboard-muted);
  font-size: 11px;
}
.quick-connect__key-preview code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.quick-connect__key-preview button {
  flex-shrink: 0;
}
.quick-connect__no-keys {
  margin-top: 8px;
  padding: 12px;
  border: 1px dashed var(--dashboard-line);
  border-radius: 12px;
  font-size: 11px;
  color: var(--dashboard-muted);
}
.quick-connect__no-keys button {
  margin-top: 8px;
}
.quick-connect__faq {
  padding: 14px;
  border: 1px dashed var(--dashboard-line);
  border-radius: 12px;
  font-size: 11px;
  color: var(--dashboard-muted);
  line-height: 1.8;
}
.quick-connect__faq h3 {
  margin-bottom: 4px;
  color: var(--dashboard-ink);
  font-size: 12px;
  font-weight: 500;
}
.quick-connect__config {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.quick-connect__clients {
  display: flex;
  overflow-x: auto;
  min-height: 44px;
  flex-shrink: 0;
  border: 1px solid var(--dashboard-line);
  border-bottom: 0;
  border-radius: 16px 16px 0 0;
  padding: 0 16px;
}
.quick-connect__clients button {
  position: relative;
  flex-shrink: 0;
  margin-right: 20px;
  padding: 12px 0;
  color: var(--dashboard-muted);
  font-size: 12px;
  white-space: nowrap;
  transition: color 150ms;
}
.quick-connect__clients .is-active {
  color: var(--dashboard-primary);
  font-weight: 500;
}
.quick-connect__clients .is-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--dashboard-primary);
}
.quick-connect__terminal {
  flex: 1;
  overflow: hidden;
  min-height: 260px;
  border-radius: 0 0 14px 14px;
  background: #101a29;
  color: #dce5f4;
}
.quick-connect__terminal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 18px 0;
  color: #8490a4;
  font-family: var(--font-mono, monospace);
  font-size: 10px;
}
.quick-connect__terminal-header button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 6px;
  padding: 5px 8px;
  background: #ffffff09;
  color: #c2ccdc;
  transition: background 150ms;
}
.quick-connect__terminal-header button:hover {
  background: #ffffff16;
}
.quick-connect__terminal-header button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
.quick-connect__terminal pre {
  overflow-x: auto;
  padding: 20px 18px;
  font-size: 11px;
  line-height: 1.9;
  tab-size: 2;
}
@media (min-width: 768px) {
  .quick-connect__body {
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  }
}
@media (min-width: 1280px) and (max-width: 1439px) {
  .quick-connect__body {
    gap: 16px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .quick-connect * {
    transition: none !important;
  }
}
</style>
