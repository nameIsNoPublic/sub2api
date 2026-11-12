<template>
  <div class="card overflow-hidden">
    <div :class="CHART_CARD_HEADER">
      <h3 :class="CHART_CARD_TITLE">
        {{ t('payment.admin.topUsers') }}
      </h3>
    </div>
    <div
      v-if="!hasUsers(props.users)"
      class="flex h-32 items-center justify-center text-sm text-gray-500 dark:text-dark-400"
    >
      {{ t('payment.admin.noData') }}
    </div>
    <div v-else class="space-y-3 p-3">
      <div v-for="[currency, currencyUsers] in sortedUsers(props.users)" :key="currency" class="space-y-2">
        <p class="kicker px-3">{{ currency }}</p>
        <div
          v-for="(user, idx) in currencyUsers"
          :key="user.user_id"
          class="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-dark-800/60"
        >
          <div class="flex items-center gap-3">
            <span
              :class="[
                'flex h-6 w-6 items-center justify-center rounded-md font-mono text-[11px] font-semibold',
                rankClass(idx),
              ]"
            >
              {{ idx + 1 }}
            </span>
            <span class="text-sm text-gray-700 dark:text-gray-300">{{ user.email }}</span>
          </div>
          <span class="num text-sm font-medium text-gray-900 dark:text-white">
            {{ formatMoney(currency, user.amount) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { CHART_CARD_HEADER, CHART_CARD_TITLE } from '@/components/charts/chartStyles'
import type { TopUserPaymentStats } from '@/types/payment'

const { t } = useI18n()

const props = defineProps<{
  users: Record<string, TopUserPaymentStats[]>
}>()

function rankClass(idx: number): string {
  // 由强到弱：ember 浅底加描边 → primary 浅底加描边 → primary 仅描边 → 纯文字
  if (idx === 0) return 'bg-ember-100 text-ember-700 ring-1 ring-inset ring-ember-300 dark:bg-ember-500/20 dark:text-ember-300 dark:ring-ember-400/50'
  if (idx === 1) return 'bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200 dark:bg-primary-500/15 dark:text-primary-300 dark:ring-primary-400/40'
  if (idx === 2) return 'text-primary-600 ring-1 ring-inset ring-primary-200 dark:text-primary-300 dark:ring-primary-400/30'
  return 'text-gray-500 dark:text-dark-400'
}

function hasUsers(usersByCurrency: Record<string, TopUserPaymentStats[]>): boolean {
  return Object.values(usersByCurrency).some(users => users.length > 0)
}

function sortedUsers(usersByCurrency: Record<string, TopUserPaymentStats[]>): [string, TopUserPaymentStats[]][] {
  return Object.entries(usersByCurrency).sort(([left], [right]) => left.localeCompare(right))
}

function formatMoney(currency: string, amount: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
}
</script>
