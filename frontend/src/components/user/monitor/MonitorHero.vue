<template>
  <section class="mb-5">
    <div
      class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200/80 bg-white px-4 py-3 dark:border-dark-800 dark:bg-dark-900/80 sm:px-5"
    >
      <!-- 左:整体状态横幅 -->
      <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <span class="kicker hidden sm:inline-flex"><span class="signal-dot"></span>LIVE STATUS</span>
        <span class="hidden h-4 w-px shrink-0 bg-gray-200 dark:bg-dark-700 sm:block" aria-hidden="true"></span>
        <span class="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
          <span
            class="absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-signal-ping"
            :class="overallDotClass"
          ></span>
          <span class="relative inline-flex h-2.5 w-2.5 rounded-full" :class="overallDotClass"></span>
        </span>
        <span class="truncate text-sm font-semibold tracking-tight" :class="overallTextClass">
          {{ overallLabel }}
        </span>
      </div>

      <!-- 右:窗口切换 / 刷新 / 自动刷新 -->
      <div class="flex flex-wrap items-center gap-2">
        <div role="tablist" class="tabs">
          <button
            v-for="opt in windowOptions"
            :key="opt.value"
            type="button"
            role="tab"
            :aria-selected="window === opt.value"
            class="tab !px-3 !py-1 font-mono text-xs"
            :class="{ 'tab-active': window === opt.value }"
            @click="emit('update:window', opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>

        <button
          type="button"
          class="btn btn-ghost btn-icon !p-2 disabled:opacity-50"
          :disabled="loading"
          :title="t('common.refresh')"
          @click="emit('refresh')"
        >
          <Icon name="refresh" size="md" :class="loading ? 'animate-spin' : ''" />
        </button>

        <AutoRefreshButton
          v-if="autoRefresh"
          :enabled="autoRefresh.enabled.value"
          :interval-seconds="autoRefresh.intervalSeconds.value"
          :countdown="autoRefresh.countdown.value"
          :intervals="autoRefresh.intervals"
          @update:enabled="autoRefresh.setEnabled"
          @update:interval="autoRefresh.setInterval"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import AutoRefreshButton from '@/components/common/AutoRefreshButton.vue'
export type MonitorWindow = '7d' | '15d' | '30d'
export type OverallStatus = 'operational' | 'degraded'

const props = defineProps<{
  overallStatus: OverallStatus
  intervalSeconds: number
  window: MonitorWindow
  loading: boolean
  autoRefresh?: {
    enabled: { value: boolean }
    intervalSeconds: { value: number }
    countdown: { value: number }
    intervals: readonly number[]
    setEnabled: (v: boolean) => void
    setInterval: (v: number) => void
  }
}>()

const emit = defineEmits<{
  (e: 'update:window', value: MonitorWindow): void
  (e: 'refresh'): void
}>()

const { t } = useI18n()

const windowOptions = computed<{ value: MonitorWindow; label: string }[]>(() => [
  { value: '7d', label: t('channelStatus.windowTab.7d') },
  { value: '15d', label: t('channelStatus.windowTab.15d') },
  { value: '30d', label: t('channelStatus.windowTab.30d') },
])

const overallLabel = computed(() => t(`channelStatus.overall.${props.overallStatus}`))

const overallTextClass = computed(() => {
  switch (props.overallStatus) {
    case 'operational':
      return 'text-emerald-700 dark:text-emerald-400'
    case 'degraded':
    default:
      return 'text-amber-700 dark:text-amber-400'
  }
})

const overallDotClass = computed(() => {
  switch (props.overallStatus) {
    case 'operational':
      return 'bg-emerald-500'
    case 'degraded':
    default:
      return 'bg-amber-500'
  }
})

</script>
