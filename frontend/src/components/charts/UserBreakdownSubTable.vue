<template>
  <div class="border-l-2 border-primary-200 bg-gray-50/70 dark:border-primary-500/30 dark:bg-dark-950/40">
    <div v-if="loading" class="flex items-center justify-center py-3">
      <LoadingSpinner />
    </div>
    <div v-else-if="items.length === 0" class="py-2 text-center text-xs text-gray-400 dark:text-dark-500">
      {{ t('admin.dashboard.noDataAvailable') }}
    </div>
    <table v-else class="w-full whitespace-nowrap text-xs">
      <tbody class="font-mono tabular-nums">
        <tr
          v-for="user in items"
          :key="user.user_id"
          class="border-t border-gray-100/70 first:border-t-0 dark:border-dark-800/70"
        >
          <td class="py-1 pl-5 font-sans text-gray-600 dark:text-gray-300" :title="user.email">
            <div class="max-w-[11rem] truncate">{{ user.email || `User #${user.user_id}` }}</div>
          </td>
          <td class="py-1 text-right text-gray-500 dark:text-dark-400">
            {{ user.requests.toLocaleString() }}
          </td>
          <td class="py-1 text-right text-gray-500 dark:text-dark-400">
            {{ formatTokens(user.total_tokens) }}
          </td>
          <td class="py-1 text-right text-gray-800 dark:text-gray-200">
            ${{ formatCost(user.actual_cost) }}
          </td>
          <td v-if="showAccountCost" class="py-1 text-right text-ember-600 dark:text-ember-400">
            ${{ formatCost(user.account_cost) }}
          </td>
          <td class="py-1 pr-1 text-right text-gray-400 dark:text-dark-500">
            ${{ formatCost(user.cost) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import type { UserBreakdownItem } from '@/types'

const { t } = useI18n()

const props = withDefaults(defineProps<{
  items: UserBreakdownItem[]
  loading?: boolean
  showAccountCost?: boolean
}>(), {
  loading: false,
  showAccountCost: true,
})

const showAccountCost = computed(() => props.showAccountCost)

const formatTokens = (value: number): string => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`
  return value.toLocaleString()
}

const formatCost = (value: number | undefined | null): string => {
  if (value == null) return '0.0000'
  if (value >= 1000) return (value / 1000).toFixed(2) + 'K'
  if (value >= 1) return value.toFixed(2)
  if (value >= 0.01) return value.toFixed(3)
  return value.toFixed(4)
}
</script>
