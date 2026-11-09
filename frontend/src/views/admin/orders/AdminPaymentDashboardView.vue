<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Header with Day Switcher -->
      <div class="flex items-center justify-end">
        <div class="flex items-center gap-2">
          <div :class="SEGMENT_GROUP">
            <button
              v-for="d in DAYS_OPTIONS"
              :key="d"
              type="button"
              :class="segmentButtonClass(days === d)"
              :aria-pressed="days === d"
              @click="days = d"
            >
              <span class="num">{{ d }}</span>{{ t('payment.admin.daySuffix') }}
            </button>
          </div>
          <button @click="loadDashboard" :disabled="loading" class="btn btn-secondary" :title="t('common.refresh')">
            <Icon name="refresh" size="md" :class="loading ? 'animate-spin' : ''" />
          </button>
        </div>
      </div>

      <!-- Dashboard Content -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
      <template v-else-if="stats">
        <OrderStatsCards :stats="stats" />
        <DailyRevenueChart :data="stats.daily_series || []" :loading="loading" />
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div class="card overflow-hidden">
            <div :class="CHART_CARD_HEADER">
              <h3 :class="CHART_CARD_TITLE">{{ t('payment.admin.paymentDistribution') }}</h3>
            </div>
            <div v-if="!stats.payment_methods?.length" class="flex h-32 items-center justify-center text-sm text-gray-500 dark:text-dark-400">{{ t('payment.admin.noData') }}</div>
            <div v-else class="space-y-3 p-4">
              <div v-for="method in stats.payment_methods" :key="method.type" class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span :class="['inline-block h-3 w-3 rounded-full', methodColor(method.type)]"></span>
                  <span class="text-sm text-gray-700 dark:text-gray-300">{{ t('payment.methods.' + method.type, method.type) }}</span>
                </div>
                <div class="space-y-1 text-right">
                  <span v-for="[currency, amount] in sortedAmounts(method.amount)" :key="currency" class="num block text-sm font-medium text-gray-900 dark:text-white">{{ formatMoney(currency, amount) }}</span>
                  <span class="num ml-2 text-xs text-gray-500 dark:text-dark-400">({{ method.count }})</span>
                </div>
              </div>
            </div>
          </div>
          <div class="card overflow-hidden">
            <div :class="CHART_CARD_HEADER">
              <h3 :class="CHART_CARD_TITLE">{{ t('payment.admin.topUsers') }}</h3>
            </div>
            <div v-if="!hasTopUsers(stats.top_users)" class="flex h-32 items-center justify-center text-sm text-gray-500 dark:text-dark-400">{{ t('payment.admin.noData') }}</div>
            <div v-else class="space-y-3 p-3">
              <div v-for="[currency, users] in sortedTopUsers(stats.top_users)" :key="currency" class="space-y-2">
                <p class="kicker px-3">{{ currency }}</p>
                <div v-for="(user, idx) in users" :key="user.user_id" class="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-dark-800/60">
                  <div class="flex items-center gap-3">
                    <span :class="['flex h-6 w-6 items-center justify-center rounded-md font-mono text-[11px] font-semibold', rankClass(idx)]">{{ idx + 1 }}</span>
                    <span class="text-sm text-gray-700 dark:text-gray-300">{{ user.email }}</span>
                  </div>
                  <span class="num text-sm font-medium text-gray-900 dark:text-white">{{ formatMoney(currency, user.amount) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { adminPaymentAPI } from '@/api/admin/payment'
import { extractI18nErrorMessage } from '@/utils/apiError'
import type { CurrencyAmounts, DashboardStats, TopUserPaymentStats } from '@/types/payment'
import AppLayout from '@/components/layout/AppLayout.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import Icon from '@/components/icons/Icon.vue'
import OrderStatsCards from '@/components/admin/payment/OrderStatsCards.vue'
import DailyRevenueChart from '@/components/admin/payment/DailyRevenueChart.vue'
import {
  CHART_CARD_HEADER,
  CHART_CARD_TITLE,
  SEGMENT_GROUP,
  segmentButtonClass
} from '@/components/charts/chartStyles'

const { t } = useI18n()
const appStore = useAppStore()

const DAYS_OPTIONS = [7, 30, 90] as const
const days = ref<number>(30)
const loading = ref(false)
const stats = ref<DashboardStats | null>(null)

function methodColor(type: string): string {
  const c: Record<string, string> = {
    alipay: 'bg-blue-500', wxpay: 'bg-green-500',
    alipay_direct: 'bg-blue-400', wxpay_direct: 'bg-green-400',
    stripe: 'bg-purple-500',
  }
  return c[type] || 'bg-gray-400'
}

function rankClass(idx: number): string {
  // 由强到弱：ember 浅底加描边 → 中性浅灰底 → 仅描边 → 纯文字
  if (idx === 0) return 'bg-ember-100 text-ember-700 ring-1 ring-inset ring-ember-300 dark:bg-ember-500/20 dark:text-ember-300 dark:ring-ember-400/50'
  if (idx === 1) return 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200 dark:bg-dark-800 dark:text-dark-200 dark:ring-dark-700'
  if (idx === 2) return 'text-gray-600 ring-1 ring-inset ring-gray-200 dark:text-dark-300 dark:ring-dark-700'
  return 'text-gray-500 dark:text-dark-400'
}

function sortedAmounts(amounts: CurrencyAmounts): [string, number][] {
  return Object.entries(amounts).sort(([left], [right]) => left.localeCompare(right))
}

function sortedTopUsers(usersByCurrency: Record<string, TopUserPaymentStats[]>): [string, TopUserPaymentStats[]][] {
  return Object.entries(usersByCurrency).sort(([left], [right]) => left.localeCompare(right))
}

function hasTopUsers(usersByCurrency: Record<string, TopUserPaymentStats[]>): boolean {
  return Object.values(usersByCurrency).some(users => users.length > 0)
}

function formatMoney(currency: string, amount: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
}

async function loadDashboard() {
  loading.value = true
  try {
    const res = await adminPaymentAPI.getDashboard(days.value)
    stats.value = res.data
  } catch (err: unknown) {
    appStore.showError(extractI18nErrorMessage(err, t, 'payment.errors', t('common.error')))
  } finally {
    loading.value = false
  }
}

watch(days, () => loadDashboard())
onMounted(() => loadDashboard())
</script>
