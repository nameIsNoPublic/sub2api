<template>
  <div>
    <div
      role="tablist"
      :aria-label="t('ui52.home.access.protocolLabel')"
      class="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg bg-gray-200/50 p-0.5 ring-1 ring-inset ring-gray-200/80 scrollbar-hide dark:bg-dark-900 dark:ring-dark-800"
      @keydown="onTabKeydown"
    >
      <button
        v-for="(protocol, index) in HOME_PROTOCOLS"
        :id="`home-protocol-${protocol}`"
        :key="protocol"
        :ref="(el) => setTabRef(el, index)"
        type="button"
        role="tab"
        :aria-selected="active === protocol"
        :tabindex="active === protocol ? 0 : -1"
        aria-controls="home-access-url"
        class="whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150"
        :class="
          active === protocol
            ? 'bg-white text-gray-950 shadow-[0_1px_2px_rgba(23,24,28,0.08)] ring-1 ring-gray-200/80 dark:bg-dark-700 dark:text-white dark:ring-dark-600'
            : 'text-gray-500 hover:text-gray-900 dark:text-dark-400 dark:hover:text-white'
        "
        @click="active = protocol"
      >
        {{ t(`ui52.home.access.protocols.${protocol}`) }}
      </button>
    </div>

    <div
      id="home-access-url"
      role="tabpanel"
      :aria-labelledby="`home-protocol-${active}`"
      class="mt-2.5 flex items-center gap-3 rounded-xl border border-gray-200/90 bg-white/90 py-2.5 pl-4 pr-2.5 shadow-[0_1px_0_rgba(23,24,28,0.03),0_12px_32px_-18px_rgba(23,24,28,0.18)] backdrop-blur sm:gap-4 sm:py-3 sm:pl-5 dark:border-dark-700 dark:bg-dark-900/85 dark:shadow-none"
    >
      <span
        class="hidden shrink-0 font-mono text-[10px] font-medium uppercase tracking-kicker text-gray-500 sm:inline dark:text-dark-400"
      >
        {{ t('ui52.home.access.baseUrl') }}
      </span>
      <code
        class="min-w-0 flex-1 truncate font-mono text-[15px] tracking-tight text-gray-950 sm:text-xl lg:text-[22px] dark:text-white"
        :title="fullUrl"
      >{{ apiRoot }}<span class="text-ember-600 dark:text-ember-400">{{ PROTOCOL_PATHS[active] }}</span></code>
      <button
        type="button"
        class="btn btn-secondary btn-sm shrink-0"
        :aria-label="t('ui52.home.access.copyLabel')"
        @click="copyUrl"
      >
        <Icon :name="copied ? 'check' : 'copy'" size="xs" :class="copied ? 'text-emerald-600 dark:text-emerald-400' : ''" />
        <span>{{ copied ? t('ui52.home.access.copied') : t('ui52.home.access.copy') }}</span>
      </button>
    </div>

    <p class="mt-2.5 text-xs text-gray-500 dark:text-dark-400" aria-live="polite">
      {{ t(`ui52.home.access.hints.${active}`) }}
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * 接入条：协议分段切换 + 等宽 BASE_URL + 复制。
 * 地址根部来自 useBrand().apiBaseUrl，路径部分以 ember 高亮。
 */
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import { useClipboard } from '@/composables/useClipboard'
import { HOME_PROTOCOLS, PROTOCOL_PATHS, type HomeProtocol } from './homeContent'

const props = defineProps<{
  /** 站点根地址（不含 /v1） */
  apiRoot: string
}>()

const { t } = useI18n()
const { copied, copyToClipboard } = useClipboard()

const active = ref<HomeProtocol>('openai')
/** 按协议下标保存标签按钮，保证方向键焦点与 HOME_PROTOCOLS 顺序一致 */
const tabEls: Array<HTMLButtonElement | null> = []

function setTabRef(el: unknown, index: number) {
  tabEls[index] = el instanceof HTMLButtonElement ? el : null
}

const fullUrl = computed(() => `${props.apiRoot}${PROTOCOL_PATHS[active.value]}`)

function copyUrl() {
  void copyToClipboard(fullUrl.value, t('ui52.home.access.copySuccess'))
}

/** 方向键在协议标签间切换（WAI-ARIA tabs 模式）。 */
function onTabKeydown(event: KeyboardEvent) {
  const index = HOME_PROTOCOLS.indexOf(active.value)
  let next = index
  if (event.key === 'ArrowRight') next = (index + 1) % HOME_PROTOCOLS.length
  else if (event.key === 'ArrowLeft') next = (index - 1 + HOME_PROTOCOLS.length) % HOME_PROTOCOLS.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = HOME_PROTOCOLS.length - 1
  else return

  event.preventDefault()
  active.value = HOME_PROTOCOLS[next]
  void nextTick(() => tabEls[next]?.focus())
}
</script>
