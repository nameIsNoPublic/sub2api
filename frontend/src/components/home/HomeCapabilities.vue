<template>
  <section
    id="capabilities"
    tabindex="-1"
    aria-labelledby="home-capabilities-title"
    class="scroll-mt-20 focus:outline-none"
  >
    <div class="mx-auto max-w-[1180px] px-5 pb-20 sm:px-8 sm:pb-28">
      <div class="grid gap-6 lg:grid-cols-[1fr_minmax(0,420px)] lg:items-end">
        <div>
          <p class="kicker"><span class="signal-dot" aria-hidden="true"></span>{{ t('ui52.home.capabilities.kicker') }}</p>
          <h2
            id="home-capabilities-title"
            class="mt-4 max-w-2xl text-3xl font-semibold tracking-tightest text-gray-950 sm:text-[44px] sm:leading-[1.1] dark:text-white"
          >
            {{ t('ui52.home.capabilities.title') }}
          </h2>
        </div>
        <p class="text-sm leading-relaxed text-gray-500 lg:pb-1.5 dark:text-dark-400">
          {{ t('ui52.home.capabilities.description') }}
        </p>
      </div>

      <div class="panel-grid mt-12 sm:grid-cols-2 lg:grid-cols-3">
        <!-- 1 多账号池调度 -->
        <article class="cap-cell">
          <h3 class="cap-title">{{ t('ui52.home.capabilities.pool.title') }}</h3>
          <p class="cap-desc">{{ t('ui52.home.capabilities.pool.desc') }}</p>
          <div class="cap-viz" aria-hidden="true">
            <div class="flex h-14 items-end gap-1.5">
              <span
                v-for="(height, index) in POOL_LOAD"
                :key="index"
                class="w-full rounded-[3px] transition-colors"
                :class="index === 3 ? 'bg-ember-500' : 'bg-primary-200 dark:bg-primary-400/35'"
                :style="{ height: `${height}%` }"
              ></span>
            </div>
            <p class="mt-2 font-mono text-[10.5px] text-gray-500 dark:text-dark-400">
              {{ t('ui52.home.capabilities.pool.caption') }}
            </p>
          </div>
        </article>

        <!-- 2 限流自动换号 -->
        <article class="cap-cell">
          <h3 class="cap-title">{{ t('ui52.home.capabilities.failover.title') }}</h3>
          <p class="cap-desc">{{ t('ui52.home.capabilities.failover.desc') }}</p>
          <div class="cap-viz space-y-1 font-mono text-[11px]" aria-hidden="true">
            <p><span class="text-amber-600 dark:text-amber-400">429</span><span class="ml-3 text-gray-500 dark:text-dark-400">#3 rate_limited</span></p>
            <p class="pl-3"><span class="text-gray-500 dark:text-dark-400">↳ </span><span class="text-emerald-600 dark:text-emerald-400">200</span><span class="ml-3 text-gray-500 dark:text-dark-400">#5 +38ms</span></p>
            <p class="text-gray-500 dark:text-dark-400">{{ t('ui52.home.capabilities.failover.cooling') }}</p>
          </div>
        </article>

        <!-- 3 密钥额度与限速 -->
        <article class="cap-cell">
          <h3 class="cap-title">{{ t('ui52.home.capabilities.limits.title') }}</h3>
          <p class="cap-desc">{{ t('ui52.home.capabilities.limits.desc') }}</p>
          <div class="cap-viz space-y-2 font-mono text-[10.5px]" aria-hidden="true">
            <div v-for="limit in LIMITS" :key="limit.window" class="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3">
              <span class="text-gray-500 dark:text-dark-400">{{ limit.window }}</span>
              <span class="h-1.5 overflow-hidden rounded-full bg-gray-200/80 dark:bg-dark-800">
                <span class="block h-full rounded-full bg-primary-600 dark:bg-primary-400" :style="{ width: `${(limit.used / limit.cap) * 100}%` }"></span>
              </span>
              <span class="text-gray-600 dark:text-dark-300">${{ limit.used.toFixed(2) }} / ${{ limit.cap }}</span>
            </div>
          </div>
        </article>

        <!-- 4 原生协议透传 -->
        <article class="cap-cell">
          <h3 class="cap-title">{{ t('ui52.home.capabilities.protocols.title') }}</h3>
          <p class="cap-desc">{{ t('ui52.home.capabilities.protocols.desc') }}</p>
          <div class="cap-viz flex flex-wrap gap-1.5">
            <span v-for="endpoint in ENDPOINTS" :key="endpoint" class="chip">
              <span class="text-gray-500 dark:text-dark-400">POST</span>{{ endpoint }}
            </span>
          </div>
        </article>

        <!-- 5 缓存单独计价 -->
        <article class="cap-cell">
          <h3 class="cap-title">{{ t('ui52.home.capabilities.cache.title') }}</h3>
          <p class="cap-desc">{{ t('ui52.home.capabilities.cache.desc') }}</p>
          <div class="cap-viz" aria-hidden="true">
            <div class="flex h-2 overflow-hidden rounded-full">
              <span v-for="part in CACHE_PARTS" :key="part.key" :class="part.bar" :style="{ width: `${part.share}%` }"></span>
            </div>
            <div class="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10.5px] text-gray-500 dark:text-dark-400">
              <span v-for="part in CACHE_PARTS" :key="part.key" class="inline-flex items-center gap-1.5">
                <i class="block h-1.5 w-1.5 rounded-full" :class="part.bar"></i>
                {{ t(`ui52.home.capabilities.cache.${part.key}`) }}
              </span>
            </div>
          </div>
        </article>

        <!-- 6 每笔可对账 -->
        <article class="cap-cell">
          <h3 class="cap-title">{{ t('ui52.home.capabilities.ledger.title') }}</h3>
          <p class="cap-desc">{{ t('ui52.home.capabilities.ledger.desc') }}</p>
          <div class="cap-viz divide-y divide-gray-100 font-mono text-[10.5px] dark:divide-dark-800" aria-hidden="true">
            <div
              v-for="entry in LEDGER"
              :key="entry.model"
              class="grid grid-cols-[1fr_auto_auto_auto] gap-3 py-1.5 first:pt-0 last:pb-0"
            >
              <span class="truncate text-gray-950 dark:text-white">{{ entry.model }}</span>
              <span class="text-gray-500 dark:text-dark-400">{{ entry.tokens }}</span>
              <span class="text-gray-500 dark:text-dark-400">{{ entry.latency }}</span>
              <span class="text-gray-700 dark:text-dark-200">{{ entry.cost }}</span>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * 调度能力：3×2 拼贴网格，每格一个微型示意可视化。
 * 文案只描述 sub2api 已具备的能力；可视化数字均为装饰性示意（aria-hidden）。
 */
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

/** 账号负载示意（百分比高度），第 4 根为被选中的最低负载账号。 */
const POOL_LOAD = [72, 58, 84, 28, 66, 90, 47, 61]

const LIMITS = [
  { window: '5h', used: 3.2, cap: 10 },
  { window: '1d', used: 11.6, cap: 20 },
  { window: '7d', used: 41, cap: 100 }
]

const ENDPOINTS = ['/v1/messages', '/v1/chat/completions', '/v1/responses', '/v1beta/models/*']

const CACHE_PARTS = [
  { key: 'input', share: 22, bar: 'bg-primary-600 dark:bg-primary-400' },
  { key: 'output', share: 14, bar: 'bg-ember-500 dark:bg-ember-400' },
  { key: 'cacheWrite', share: 16, bar: 'bg-amber-400 dark:bg-amber-300' },
  { key: 'cacheRead', share: 48, bar: 'bg-sky-400 dark:bg-sky-300' }
]

const LEDGER = [
  { model: 'claude-sonnet-5-5', tokens: '12.4K', latency: '1.2s', cost: '$0.0184' },
  { model: 'gpt-6.1-sol', tokens: '3.1K', latency: '0.8s', cost: '$0.0062' },
  { model: 'gemini-3-flash', tokens: '2.6K', latency: '0.5s', cost: '$0.0009' }
]
</script>

<style scoped>
.cap-cell {
  @apply flex min-h-[260px] flex-col p-6 sm:p-7;
}

.cap-title {
  @apply text-[15px] font-semibold tracking-tight text-gray-950 dark:text-white;
}

.cap-desc {
  @apply mt-2 text-[13px] leading-relaxed text-gray-500 dark:text-dark-400;
}

.cap-viz {
  @apply mt-auto pt-6;
}
</style>
