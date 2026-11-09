<template>
  <div class="mt-3 flex items-end justify-between">
    <div class="font-mono text-[10.5px] uppercase tracking-[0.1em] text-gray-400 dark:text-dark-500">
      {{ windowLabel }}
    </div>
    <div class="flex items-baseline gap-0.5">
      <span
        class="num text-3xl font-semibold leading-none"
        :style="colorStyle"
      >
        {{ displayValue }}
      </span>
      <span
        class="text-base font-semibold leading-none"
        :style="colorStyle"
      >%</span>
    </div>
  </div>
  <div
    v-if="samplesLabel"
    class="mt-1 text-right text-[11px] text-gray-400 dark:text-dark-500"
  >
    {{ samplesLabel }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { hslForPct } from '@/composables/useChannelMonitorFormat'

const props = defineProps<{
  windowLabel: string
  value: number | null
  samplesLabel?: string
}>()

const { t } = useI18n()

const displayValue = computed(() => {
  if (props.value === null || Number.isNaN(props.value)) return t('monitorCommon.latencyEmpty')
  return props.value.toFixed(2)
})

const colorStyle = computed(() => {
  const colour = hslForPct(props.value)
  return colour ? { color: colour } : { color: 'rgb(156 163 175)' }
})
</script>
