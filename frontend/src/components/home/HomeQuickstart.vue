<template>
  <section
    id="access"
    tabindex="-1"
    aria-labelledby="home-access-title"
    class="scroll-mt-20 focus:outline-none"
  >
    <div class="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 sm:py-28">
      <div class="grid gap-6 lg:grid-cols-[1fr_minmax(0,420px)] lg:items-end">
        <div>
          <p class="kicker"><span class="signal-dot" aria-hidden="true"></span>{{ t('ui52.home.quickstart.kicker') }}</p>
          <h2
            id="home-access-title"
            class="mt-4 text-3xl font-semibold tracking-tightest text-gray-950 sm:text-[44px] sm:leading-[1.1] dark:text-white"
          >
            {{ t('ui52.home.quickstart.title') }}
          </h2>
        </div>
        <p class="text-sm leading-relaxed text-gray-500 lg:pb-1.5 dark:text-dark-400">
          {{ t('ui52.home.quickstart.description') }}
        </p>
      </div>

      <div class="mt-12 grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12">
        <!-- 步骤 -->
        <ol class="border-t border-gray-200/90 dark:border-dark-800">
          <li
            v-for="(step, index) in steps"
            :key="step.key"
            class="group grid grid-cols-[2.5rem_1fr] gap-x-3 border-b border-gray-200/90 py-6 dark:border-dark-800"
          >
            <span class="pt-0.5 font-mono text-xs font-medium text-primary-600 dark:text-primary-400">
              {{ String(index + 1).padStart(2, '0') }}
            </span>
            <div>
              <h3 class="text-[15px] font-semibold tracking-tight text-gray-950 dark:text-white">{{ step.title }}</h3>
              <p class="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-dark-400">{{ step.desc }}</p>
            </div>
          </li>
        </ol>

        <!-- 终端（两种主题下均保持深色） -->
        <div
          class="flex min-w-0 flex-col overflow-hidden rounded-2xl bg-[#0c0d10] shadow-[0_30px_70px_-30px_rgba(12,13,16,0.55)] ring-1 ring-gray-950/5 dark:ring-white/10"
        >
          <div class="flex items-center gap-2 border-b border-white/[0.07] px-3 py-2.5">
            <div
              role="tablist"
              :aria-label="t('ui52.home.quickstart.terminal.label')"
              class="flex min-w-0 flex-1 gap-0.5 overflow-x-auto scrollbar-hide"
              @keydown="onTabKeydown"
            >
              <button
                v-for="(id, index) in SNIPPET_IDS"
                :id="`home-snippet-tab-${id}`"
                :key="id"
                :ref="(el) => setTabRef(el, index)"
                type="button"
                role="tab"
                :aria-selected="active === id"
                :tabindex="active === id ? 0 : -1"
                aria-controls="home-snippet-panel"
                class="whitespace-nowrap rounded-md px-2.5 py-1 font-mono text-[11.5px] transition-colors"
                :class="active === id ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200'"
                @click="active = id"
              >
                {{ TAB_LABELS[id] }}
              </button>
            </div>
            <button
              type="button"
              class="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 font-mono text-[11px] text-gray-400 transition-colors hover:border-white/20 hover:text-white"
              :aria-label="t('ui52.home.quickstart.terminal.copyLabel')"
              @click="copySnippet"
            >
              <Icon :name="copied ? 'check' : 'copy'" size="xs" :class="copied ? 'text-emerald-400' : ''" />
              {{ copied ? t('ui52.home.quickstart.terminal.copied') : t('ui52.home.quickstart.terminal.copy') }}
            </button>
          </div>

          <div
            id="home-snippet-panel"
            role="tabpanel"
            :aria-labelledby="`home-snippet-tab-${active}`"
            class="relative min-h-[300px] flex-1"
          >
            <div class="flex items-center gap-2 px-5 pt-4 font-mono text-[10.5px] text-gray-400">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-400/80" aria-hidden="true"></span>
              {{ t(`ui52.home.quickstart.terminal.files.${active}`) }}
            </div>
            <pre
              class="overflow-x-auto px-5 pb-6 pt-3 font-mono text-[12.5px] leading-[1.75] text-gray-300"
            ><code><template v-for="(line, lineIndex) in activeLines" :key="`${active}-${lineIndex}`"><span
                  v-for="(token, tokenIndex) in line"
                  :key="tokenIndex"
                  :class="TOKEN_CLASSES[token.kind]"
                >{{ token.text }}</span>{{ '\n' }}</template></code></pre>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * 三步接入：左侧步骤，右侧深色终端展示 Claude Code / Codex / Python / curl 配置。
 * 地址取站点根地址，密钥一律为占位符，不读取任何真实密钥。
 */
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import { useClipboard } from '@/composables/useClipboard'
import {
  SNIPPET_IDS,
  buildSnippets,
  snippetToText,
  type HomeFundingMode,
  type SnippetId,
  type SnippetTokenKind
} from './homeContent'

const props = defineProps<{
  /** 站点根地址（不含 /v1） */
  apiRoot: string
  siteName: string
  /** 是否开放自助注册：关闭时第 1 步不暗示自助注册 */
  registrationOpen: boolean
  /** 充值方式：决定第 1 步是否提到在线充值 / 订阅 */
  fundingMode: HomeFundingMode
}>()

const { t } = useI18n()
const { copied, copyToClipboard } = useClipboard()

const TAB_LABELS: Record<SnippetId, string> = {
  claude: 'Claude Code',
  codex: 'Codex',
  python: 'Python',
  curl: 'curl'
}

const TOKEN_CLASSES: Record<SnippetTokenKind, string> = {
  plain: 'text-gray-300',
  comment: 'text-gray-400',
  keyword: 'text-primary-300',
  string: 'text-ember-300',
  variable: 'text-sky-300',
  command: 'text-emerald-300',
  prompt: 'select-none text-gray-400'
}

const FUNDING_KEYS: Record<HomeFundingMode, string> = {
  topup: 'ui52.home.quickstart.steps.register.fundingTopup',
  subscription: 'ui52.home.quickstart.steps.register.fundingSubscription',
  redeem: 'ui52.home.quickstart.steps.register.fundingRedeem'
}

const active = ref<SnippetId>('claude')
/** 按下标保存标签按钮，保证方向键焦点与 SNIPPET_IDS 顺序一致 */
const tabEls: Array<HTMLButtonElement | null> = []

function setTabRef(el: unknown, index: number) {
  tabEls[index] = el instanceof HTMLButtonElement ? el : null
}

const steps = computed(() => [
  {
    key: 'register',
    title: props.registrationOpen
      ? t('ui52.home.quickstart.steps.register.titleOpen')
      : t('ui52.home.quickstart.steps.register.titleClosed'),
    desc: t('ui52.home.quickstart.steps.register.desc', {
      account: props.registrationOpen
        ? t('ui52.home.quickstart.steps.register.accountOpen')
        : t('ui52.home.quickstart.steps.register.accountClosed'),
      funding: t(FUNDING_KEYS[props.fundingMode])
    })
  },
  {
    key: 'key',
    title: t('ui52.home.quickstart.steps.key.title'),
    desc: t('ui52.home.quickstart.steps.key.desc')
  },
  {
    key: 'baseUrl',
    title: t('ui52.home.quickstart.steps.baseUrl.title'),
    desc: t('ui52.home.quickstart.steps.baseUrl.desc')
  }
])

const snippets = computed(() =>
  buildSnippets(props.apiRoot, props.siteName, {
    keyPlaceholder: t('ui52.home.quickstart.terminal.keyPlaceholder'),
    claudeComment: t('ui52.home.quickstart.terminal.claudeComment'),
    codexComment: t('ui52.home.quickstart.terminal.codexComment'),
    codexEnvComment: t('ui52.home.quickstart.terminal.codexEnvComment'),
    pythonPrompt: t('ui52.home.quickstart.terminal.pythonPrompt')
  })
)

const activeLines = computed(() => snippets.value[active.value])

function copySnippet() {
  // 复制时去掉行首提示符 "$ "，粘贴即可执行
  const text = snippetToText(activeLines.value.map((line) => line.filter((token) => token.kind !== 'prompt')))
  void copyToClipboard(text, t('ui52.home.quickstart.terminal.copySuccess'))
}

/** 方向键切换示例标签（WAI-ARIA tabs 模式）。 */
function onTabKeydown(event: KeyboardEvent) {
  const index = SNIPPET_IDS.indexOf(active.value)
  let next = index
  if (event.key === 'ArrowRight') next = (index + 1) % SNIPPET_IDS.length
  else if (event.key === 'ArrowLeft') next = (index - 1 + SNIPPET_IDS.length) % SNIPPET_IDS.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = SNIPPET_IDS.length - 1
  else return

  event.preventDefault()
  active.value = SNIPPET_IDS[next]
  void nextTick(() => tabEls[next]?.focus())
}
</script>
