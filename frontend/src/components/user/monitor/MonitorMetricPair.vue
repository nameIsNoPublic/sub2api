<template>
  <div class="mt-5 grid grid-cols-2 gap-2">
    <div
      class="rounded-lg border border-gray-200/70 bg-gray-50/70 p-3 dark:border-dark-800 dark:bg-dark-950/40"
    >
      <div
        class="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-gray-400 dark:text-dark-500"
      >
        <Icon :name="primaryIcon" size="xs" />
        <span>{{ primaryLabel }}</span>
      </div>
      <div class="num mt-1.5 text-lg font-semibold text-gray-950 dark:text-white">
        {{ primaryValue }}<span class="ml-0.5 text-xs font-normal text-gray-400 dark:text-dark-500">{{ primaryUnit }}</span>
      </div>
    </div>
    <div
      class="rounded-lg border border-gray-200/70 bg-gray-50/70 p-3 dark:border-dark-800 dark:bg-dark-950/40"
    >
      <div
        class="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-gray-400 dark:text-dark-500"
      >
        <Icon :name="secondaryIcon" size="xs" />
        <span>{{ secondaryLabel }}</span>
      </div>
      <div class="num mt-1.5 text-lg font-semibold text-gray-950 dark:text-white">
        {{ secondaryValue }}<span class="ml-0.5 text-xs font-normal text-gray-400 dark:text-dark-500">{{ secondaryUnit }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from '@/components/icons/Icon.vue'

defineProps<{
  primaryLabel: string
  primaryValue: string
  primaryUnit: string
  primaryIcon: 'bolt' | 'globe' | 'clock' | 'link'
  secondaryLabel: string
  secondaryValue: string
  secondaryUnit: string
  secondaryIcon: 'bolt' | 'globe' | 'clock' | 'link'
}>()
</script>
