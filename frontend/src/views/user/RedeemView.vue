<template>
  <AppLayout>
    <div class="page-stagger mx-auto max-w-3xl space-y-5">
      <!-- Current Balance + Redeem Form -->
      <div class="card-tinted overflow-hidden">
        <div class="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto]">
          <!-- Balance -->
          <div class="relative isolate overflow-hidden px-6 py-6">
            <div
              class="pointer-events-none absolute inset-0 -z-10 bg-dot-grid bg-dot-md opacity-70 [mask-image:linear-gradient(110deg,transparent_35%,#000)] dark:bg-dot-grid-dark"
              aria-hidden="true"
            ></div>
            <p class="kicker"><span class="signal-dot"></span>{{ t('redeem.currentBalance') }}</p>
            <p class="num mt-3 text-4xl font-semibold text-gray-950 dark:text-white">
              <span class="mr-0.5 text-2xl text-gray-400 dark:text-dark-500">$</span>{{ user?.balance?.toFixed(2) || '0.00' }}
            </p>
          </div>
          <!-- Concurrency -->
          <div class="flex items-center gap-3 border-t border-gray-100 px-6 py-4 sm:flex-col sm:items-start sm:justify-center sm:border-l sm:border-t-0 dark:border-dark-800">
            <div class="stat-icon stat-icon-primary h-9 w-9">
              <Icon name="bolt" size="sm" />
            </div>
            <div>
              <p class="text-xs text-gray-500 dark:text-dark-400">{{ t('redeem.concurrency') }}</p>
              <p class="mt-0.5 text-sm font-medium text-gray-950 dark:text-white">
                <span class="num">{{ user?.concurrency || 0 }}</span> {{ t('redeem.requests') }}
              </p>
            </div>
          </div>
        </div>

        <!-- Redeem Form -->
        <div class="border-t border-gray-100 bg-gray-50/60 px-6 py-6 dark:border-dark-800 dark:bg-dark-950/30">
          <form @submit.prevent="handleRedeem" class="space-y-4">
            <div>
              <label for="code" class="input-label">
                {{ t('redeem.redeemCodeLabel') }}
              </label>
              <div class="relative mt-1 flex flex-col gap-3 sm:flex-row">
                <div class="relative flex-1">
                  <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Icon name="gift" size="md" class="text-gray-400 dark:text-dark-500" />
                  </div>
                  <input
                    id="code"
                    v-model="redeemCode"
                    type="text"
                    required
                    autocomplete="off"
                    spellcheck="false"
                    :placeholder="t('redeem.redeemCodePlaceholder')"
                    :disabled="submitting"
                    class="input h-12 pl-12 font-mono text-base tracking-wide"
                  />
                </div>
                <button
                  type="submit"
                  :disabled="!redeemCode || submitting"
                  class="btn btn-primary h-12 px-6 sm:w-auto"
                >
                  <svg
                    v-if="submitting"
                    class="-ml-1 h-5 w-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <Icon v-else name="checkCircle" size="md" />
                  {{ submitting ? t('redeem.redeeming') : t('redeem.redeemButton') }}
                </button>
              </div>
              <p class="input-hint">
                {{ t('redeem.redeemCodeHint') }}
              </p>
            </div>
          </form>
        </div>
      </div>

      <!-- Success Message -->
      <transition name="fade">
        <div
          v-if="redeemResult"
          class="card border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/[0.07]"
        >
          <div class="p-5">
            <div class="flex items-start gap-4">
              <div
                class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-400/25"
              >
                <Icon name="checkCircle" size="md" class="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div class="flex-1">
                <h3 class="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  {{ t('redeem.redeemSuccess') }}
                </h3>
                <div class="mt-1.5 text-sm text-emerald-800 dark:text-emerald-300/90">
                  <p>{{ redeemResult.message }}</p>
                  <div class="mt-3 space-y-1">
                    <p v-if="redeemResult.type === 'balance'" class="font-medium">
                      {{ t('redeem.added') }}: <span class="num">${{ redeemResult.value.toFixed(2) }}</span>
                    </p>
                    <p v-else-if="redeemResult.type === 'concurrency'" class="font-medium">
                      {{ t('redeem.added') }}: <span class="num">{{ redeemResult.value }}</span>
                      {{ t('redeem.concurrentRequests') }}
                    </p>
                    <p v-else-if="redeemResult.type === 'subscription'" class="font-medium">
                      {{ t('redeem.subscriptionAssigned') }}
                      <span v-if="redeemResult.group_name"> - {{ redeemResult.group_name }}</span>
                      <span v-if="redeemResult.validity_days">
                        ({{
                          t('redeem.subscriptionDays', { days: redeemResult.validity_days })
                        }})</span
                      >
                    </p>
                    <p v-if="redeemResult.new_balance !== undefined">
                      {{ t('redeem.newBalance') }}:
                      <span class="num font-semibold">${{ redeemResult.new_balance.toFixed(2) }}</span>
                    </p>
                    <p v-if="redeemResult.new_concurrency !== undefined">
                      {{ t('redeem.newConcurrency') }}:
                      <span class="font-semibold"
                        ><span class="num">{{ redeemResult.new_concurrency }}</span> {{ t('redeem.requests') }}</span
                      >
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- Error Message -->
      <transition name="fade">
        <div
          v-if="errorMessage"
          class="card border-red-200/80 bg-red-50/70 dark:border-red-500/20 dark:bg-red-500/[0.07]"
        >
          <div class="p-5">
            <div class="flex items-start gap-4">
              <div
                class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-red-200 dark:bg-red-500/10 dark:ring-red-400/25"
              >
                <Icon
                  name="exclamationCircle"
                  size="md"
                  class="text-red-600 dark:text-red-400"
                />
              </div>
              <div class="flex-1">
                <h3 class="text-sm font-semibold text-red-900 dark:text-red-200">
                  {{ t('redeem.redeemFailed') }}
                </h3>
                <p class="mt-1.5 text-sm text-red-800 dark:text-red-300/90">
                  {{ errorMessage }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- Information Card -->
      <div class="card">
        <div class="p-5">
          <div class="flex items-start gap-4">
            <div class="stat-icon stat-icon-primary h-9 w-9">
              <Icon name="infoCircle" size="sm" />
            </div>
            <div class="flex-1">
              <h3 class="section-title text-sm">
                {{ t('redeem.aboutCodes') }}
              </h3>
              <ol class="mt-3 space-y-2 text-sm text-gray-600 dark:text-dark-300">
                <li class="flex gap-3">
                  <span class="num mt-px text-xs text-ember-600 dark:text-ember-400">01</span>
                  <span>{{ t('redeem.codeRule1') }}</span>
                </li>
                <li class="flex gap-3">
                  <span class="num mt-px text-xs text-ember-600 dark:text-ember-400">02</span>
                  <span>{{ t('redeem.codeRule2') }}</span>
                </li>
                <li class="flex gap-3">
                  <span class="num mt-px text-xs text-ember-600 dark:text-ember-400">03</span>
                  <span>
                    {{ t('redeem.codeRule3') }}
                    <span
                      v-if="contactInfo"
                      class="chip ml-1.5 py-0.5"
                    >
                      {{ contactInfo }}
                    </span>
                  </span>
                </li>
                <li class="flex gap-3">
                  <span class="num mt-px text-xs text-ember-600 dark:text-ember-400">04</span>
                  <span>{{ t('redeem.codeRule4') }}</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="card overflow-hidden">
        <div class="card-header flex items-center justify-between">
          <h2 class="section-title">
            {{ t('redeem.recentActivity') }}
          </h2>
          <span class="num text-xs text-gray-400 dark:text-dark-500">{{ historyTotal }}</span>
        </div>
        <div>
          <!-- Loading State -->
          <div v-if="loadingHistory" class="flex items-center justify-center py-10">
            <svg class="h-6 w-6 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>

          <!-- History List -->
          <div v-else-if="history.length > 0" class="divide-y divide-gray-100 dark:divide-dark-800">
            <div
              v-for="item in history"
              :key="item.id"
              class="flex items-center justify-between gap-4 px-6 py-3.5 transition-colors hover:bg-gray-50/70 dark:hover:bg-dark-800/40"
            >
              <div class="flex min-w-0 items-center gap-3.5">
                <div
                  :class="[
                    'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
                    isBalanceType(item.type)
                      ? item.value >= 0
                        ? 'bg-emerald-50 ring-emerald-200/70 dark:bg-emerald-500/10 dark:ring-emerald-400/25'
                        : 'bg-red-50 ring-red-200/70 dark:bg-red-500/10 dark:ring-red-400/25'
                      : isSubscriptionType(item.type)
                        ? 'bg-primary-50 ring-primary-200/70 dark:bg-primary-500/10 dark:ring-primary-400/25'
                        : item.value >= 0
                          ? 'bg-sky-50 ring-sky-200/70 dark:bg-sky-500/10 dark:ring-sky-400/25'
                          : 'bg-ember-50 ring-ember-200/70 dark:bg-ember-500/10 dark:ring-ember-400/25'
                  ]"
                >
                  <!-- 余额类型图标 -->
                  <Icon
                    v-if="isBalanceType(item.type)"
                    name="dollar"
                    size="sm"
                    :class="
                      item.value >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    "
                  />
                  <!-- 订阅类型图标 -->
                  <Icon
                    v-else-if="isSubscriptionType(item.type)"
                    name="badge"
                    size="sm"
                    class="text-primary-600 dark:text-primary-400"
                  />
                  <!-- 并发类型图标 -->
                  <Icon
                    v-else
                    name="bolt"
                    size="sm"
                    :class="
                      item.value >= 0
                        ? 'text-sky-600 dark:text-sky-400'
                        : 'text-ember-600 dark:text-ember-400'
                    "
                  />
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-gray-950 dark:text-white">
                    {{ getHistoryItemTitle(item) }}
                  </p>
                  <p class="font-mono text-xs tabular-nums text-gray-500 dark:text-dark-400">
                    {{ formatDateTime(item.used_at) }}
                  </p>
                </div>
              </div>
              <div class="flex-shrink-0 text-right">
                <p
                  :class="[
                    'num text-sm font-semibold',
                    isBalanceType(item.type)
                      ? item.value >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                      : isSubscriptionType(item.type)
                        ? 'text-primary-600 dark:text-primary-400'
                        : item.value >= 0
                          ? 'text-sky-600 dark:text-sky-400'
                          : 'text-ember-600 dark:text-ember-400'
                  ]"
                >
                  {{ formatHistoryValue(item) }}
                </p>
                <p
                  v-if="!isAdminAdjustment(item.type)"
                  class="font-mono text-xs text-gray-400 dark:text-dark-500"
                >
                  {{ item.code.slice(0, 8) }}...
                </p>
                <p v-else class="text-xs text-gray-400 dark:text-dark-500">
                  {{ t('redeem.adminAdjustment') }}
                </p>
                <!-- Display notes for admin adjustments -->
                <p
                  v-if="item.notes"
                  class="mt-1 max-w-[200px] truncate text-xs italic text-gray-500 dark:text-dark-400"
                  :title="item.notes"
                >
                  {{ item.notes }}
                </p>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="empty-state py-10">
            <div
              class="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 ring-1 ring-inset ring-gray-200/70 dark:bg-dark-800 dark:ring-dark-700"
            >
              <Icon name="clock" size="lg" class="text-gray-400 dark:text-dark-500" />
            </div>
            <p class="text-sm text-gray-500 dark:text-dark-400">
              {{ t('redeem.historyWillAppear') }}
            </p>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 py-3 text-sm text-gray-600 dark:border-dark-800 dark:text-dark-300">
            <span>{{ t('common.total') }}: <span class="num">{{ historyTotal }}</span> {{ t('pagination.results') }}</span>
            <div class="flex flex-wrap items-center gap-2">
              <label class="flex items-center gap-2">
                {{ t('pagination.perPage') }}
                <select
                  v-model="historyPageSize"
                  class="input w-20 py-1.5"
                  :disabled="loadingHistory || submitting"
                  @change="fetchHistory(1)"
                >
                  <option v-for="size in [20, 50, 100]" :key="size" :value="size">{{ size }}</option>
                </select>
              </label>
              <button
                class="btn btn-secondary btn-sm"
                :disabled="loadingHistory || submitting || historyPage <= 1"
                @click="fetchHistory(historyPage - 1)"
              >{{ t('pagination.previous') }}</button>
              <button
                class="btn btn-secondary btn-sm"
                :disabled="loadingHistory || submitting || historyPage * historyPageSize >= historyTotal"
                @click="fetchHistory(historyPage + 1)"
              >{{ t('pagination.next') }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { redeemAPI, authAPI, type RedeemHistoryItem } from '@/api'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import { formatDateTime } from '@/utils/format'

const { t } = useI18n()
const authStore = useAuthStore()
const appStore = useAppStore()
const subscriptionStore = useSubscriptionStore()

const user = computed(() => authStore.user)

const redeemCode = ref('')
const submitting = ref(false)
const redeemResult = ref<{
  message: string
  type: string
  value: number
  new_balance?: number
  new_concurrency?: number
  group_name?: string
  validity_days?: number
} | null>(null)
const errorMessage = ref('')

// History data
const history = ref<RedeemHistoryItem[]>([])
const loadingHistory = ref(false)
const historyPage = ref(1)
const historyPageSize = ref(20)
const historyTotal = ref(0)
let historyRequest = 0
let loadedHistoryPageSize = 20
const contactInfo = ref('')

// Helper functions for history display
const isBalanceType = (type: string) => {
  return type === 'balance' || type === 'admin_balance'
}

const isSubscriptionType = (type: string) => {
  return type === 'subscription'
}

const isAdminAdjustment = (type: string) => {
  return type === 'admin_balance' || type === 'admin_concurrency'
}

const getHistoryItemTitle = (item: RedeemHistoryItem) => {
  if (item.type === 'balance') {
    return t('redeem.balanceAddedRedeem')
  } else if (item.type === 'admin_balance') {
    return item.value >= 0 ? t('redeem.balanceAddedAdmin') : t('redeem.balanceDeductedAdmin')
  } else if (item.type === 'concurrency') {
    return t('redeem.concurrencyAddedRedeem')
  } else if (item.type === 'admin_concurrency') {
    return item.value >= 0 ? t('redeem.concurrencyAddedAdmin') : t('redeem.concurrencyReducedAdmin')
  } else if (item.type === 'subscription') {
    return t('redeem.subscriptionAssigned')
  }
  return t('common.unknown')
}

const formatHistoryValue = (item: RedeemHistoryItem) => {
  if (isBalanceType(item.type)) {
    const sign = item.value >= 0 ? '+' : ''
    return `${sign}$${item.value.toFixed(2)}`
  } else if (isSubscriptionType(item.type)) {
    // 订阅类型显示有效天数和分组名称
    const days = item.validity_days || Math.round(item.value)
    const groupName = item.group?.name || ''
    return groupName ? `${days}${t('redeem.days')} - ${groupName}` : `${days}${t('redeem.days')}`
  } else {
    const sign = item.value >= 0 ? '+' : ''
    return `${sign}${item.value} ${t('redeem.requests')}`
  }
}

const fetchHistory = async (page = 1) => {
  const request = ++historyRequest
  const pageSize = historyPageSize.value
  loadingHistory.value = true
  try {
    const result = await redeemAPI.getHistory(page, pageSize)
    if (request !== historyRequest) return
    history.value = result.items
    historyTotal.value = result.total
    historyPage.value = page
    historyPageSize.value = pageSize
    loadedHistoryPageSize = pageSize
  } catch (error) {
    if (request !== historyRequest) return
    historyPageSize.value = loadedHistoryPageSize
    appStore.showError(t('redeem.historyLoadFailed'))
    console.error('Failed to fetch history:', error)
  } finally {
    if (request === historyRequest) loadingHistory.value = false
  }
}

const handleRedeem = async () => {
  if (!redeemCode.value.trim()) {
    appStore.showError(t('redeem.pleaseEnterCode'))
    return
  }

  submitting.value = true
  errorMessage.value = ''
  redeemResult.value = null

  try {
    const result = await redeemAPI.redeem(redeemCode.value.trim())

    redeemResult.value = result

    // Refresh user data to get updated balance/concurrency
    try {
      await authStore.refreshUser()
    } catch (error) {
      console.error('Failed to refresh user after redeem:', error)
      appStore.showWarning(t('redeem.userRefreshFailed'))
    }

    // If subscription type, immediately refresh subscription status
    if (result.type === 'subscription') {
      try {
        await subscriptionStore.fetchActiveSubscriptions(true) // force refresh
      } catch (error) {
        console.error('Failed to refresh subscriptions after redeem:', error)
        appStore.showWarning(t('redeem.subscriptionRefreshFailed'))
      }
    }

    // Clear the input
    redeemCode.value = ''

    // Refresh history
    await fetchHistory()

    // Show success toast
    appStore.showSuccess(t('redeem.codeRedeemSuccess'))
  } catch (error: any) {
    errorMessage.value = error.response?.data?.detail || t('redeem.failedToRedeem')

    appStore.showError(t('redeem.redeemFailed'))
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  fetchHistory()
  try {
    const settings = await authAPI.getPublicSettings()
    contactInfo.value = settings.contact_info || ''
  } catch (error) {
    console.error('Failed to load contact info:', error)
  }
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
