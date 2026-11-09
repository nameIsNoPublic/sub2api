<template>
  <div v-if="usage" class="text-[13px] leading-5">
    <div class="flex items-center gap-1.5">
      <span class="text-gray-500 dark:text-dark-400">{{ t('admin.users.today') }}</span>
      <span class="font-mono font-medium tabular-nums text-gray-950 dark:text-white">${{ usage.today_actual_cost.toFixed(4) }}</span>
    </div>
    <div class="flex items-center gap-1.5">
      <span class="text-gray-500 dark:text-dark-400">{{ t('admin.users.total') }}</span>
      <span class="font-mono tabular-nums text-gray-600 dark:text-gray-300">${{ usage.total_actual_cost.toFixed(4) }}</span>
    </div>
  </div>
  <span v-else class="font-mono text-sm text-gray-300 dark:text-dark-600">—</span>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PlatformUsage } from '@/api/admin/dashboard'

defineProps<{
  usage?: PlatformUsage
}>()

const { t } = useI18n()
</script>
