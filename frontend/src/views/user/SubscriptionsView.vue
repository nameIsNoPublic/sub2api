<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <span class="spinner h-7 w-7 text-primary-600 dark:text-primary-400"></span>
      </div>

      <!-- Empty State -->
      <div v-else-if="subscriptions.length === 0" class="card empty-state py-16">
        <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-dark-700 dark:bg-dark-800">
          <Icon name="creditCard" size="lg" class="text-gray-400 dark:text-dark-400" />
        </div>
        <h3 class="empty-state-title">
          {{ t('userSubscriptions.noActiveSubscriptions') }}
        </h3>
        <p class="empty-state-description">
          {{ t('userSubscriptions.noActiveSubscriptionsDesc') }}
        </p>
        <button
          v-if="purchaseAvailable"
          type="button"
          class="btn btn-primary mt-6"
          @click="router.push({ path: '/purchase', query: { tab: 'subscription' } })"
        >
          {{ t('ui52.userB.subscriptions.browsePlans') }}
          <Icon name="arrowRight" size="sm" />
        </button>
      </div>

      <!-- Subscriptions Grid -->
      <div v-else class="grid gap-5 lg:grid-cols-2">
        <div
          v-for="subscription in subscriptions"
          :key="subscription.id"
          class="card flex flex-col overflow-hidden"
        >
          <!-- Header -->
          <div class="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-dark-800">
            <div class="flex min-w-0 items-start gap-3">
              <span
                class="mt-2 h-2 w-2 shrink-0 rounded-full"
                :style="{ backgroundColor: platformAccentColor(subscription.group?.platform || '') }"
                aria-hidden="true"
              />
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="truncate font-semibold tracking-tight text-gray-950 dark:text-white">
                    {{ subscription.group?.name || `Group #${subscription.group_id}` }}
                  </h3>
                  <span :class="['rounded-md border px-1.5 py-0.5 text-[11px] font-medium', platformBadgeClass(subscription.group?.platform || '')]">
                    {{ platformLabel(subscription.group?.platform || '') }}
                  </span>
                </div>
                <p v-if="subscription.group?.description" class="mt-1 text-xs leading-relaxed text-gray-500 dark:text-dark-400">
                  {{ subscription.group.description }}
                </p>
                <div class="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-gray-500 dark:text-dark-400">
                  <span>{{ t('payment.planCard.rate') }}: ×{{ subscription.group?.rate_multiplier ?? 1 }}</span>
                  <span v-if="subscriptionHasPeakRate(subscription)" class="text-amber-700 dark:text-amber-300">
                    {{ t('payment.planCard.peakRate') }}: {{ subscriptionPeakRateLabel(subscription) }}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <span
                :class="[
                  'badge',
                  subscription.status === 'active'
                    ? 'badge-success'
                    : subscription.status === 'expired'
                      ? 'badge-gray'
                      : 'badge-danger'
                ]"
              >
                {{ t(`userSubscriptions.status.${subscription.status}`) }}
              </span>
              <button
                v-if="subscription.status === 'active' && purchaseAvailable"
                type="button"
                class="btn btn-primary btn-sm"
                @click="router.push({ path: '/purchase', query: { tab: 'subscription', group: String(subscription.group_id) } })"
              >
                {{ t('payment.renewNow') }}
              </button>
            </div>
          </div>

          <!-- Usage Progress -->
          <div class="flex-1 space-y-5 px-5 py-4">
            <!-- Expiration Info -->
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-3 text-sm">
                <span class="kicker">{{ t('ui52.userB.subscriptions.validity') }}</span>
                <span
                  v-if="subscription.expires_at"
                  class="text-right font-mono text-xs"
                  :class="getExpirationClass(subscription.expires_at)"
                >
                  {{ formatExpirationDate(subscription.expires_at) }}
                </span>
                <span v-else class="text-right font-mono text-xs text-gray-700 dark:text-gray-300">{{
                  t('userSubscriptions.noExpiration')
                }}</span>
              </div>
              <div v-if="subscription.expires_at && validityRemainingPercent(subscription) !== null" class="progress h-1.5">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  :class="getExpirationBarClass(subscription.expires_at)"
                  :style="{ width: `${validityRemainingPercent(subscription)}%` }"
                ></div>
              </div>
            </div>

            <!-- Daily Usage -->
            <div v-if="subscription.group?.daily_limit_usd" class="space-y-2">
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {{ t('userSubscriptions.daily') }}
                </span>
                <span class="num text-xs text-gray-500 dark:text-dark-400">
                  <span class="text-gray-950 dark:text-white">${{ (subscription.daily_usage_usd || 0).toFixed(2) }}</span> / ${{
                    subscription.group.daily_limit_usd.toFixed(2)
                  }}
                </span>
              </div>
              <div class="progress h-1.5">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  :class="
                    getProgressBarClass(
                      subscription.daily_usage_usd,
                      subscription.group.daily_limit_usd
                    )
                  "
                  :style="{
                    width: getProgressWidth(
                      subscription.daily_usage_usd,
                      subscription.group.daily_limit_usd
                    )
                  }"
                ></div>
              </div>
              <p
                v-if="subscription.daily_window_start"
                class="font-mono text-[11px] text-gray-500 dark:text-dark-400"
              >
                {{ formatDailyUsageWindow(subscription) }}
              </p>
            </div>

            <!-- Weekly Usage -->
            <div v-if="subscription.group?.weekly_limit_usd" class="space-y-2">
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {{ t('userSubscriptions.weekly') }}
                </span>
                <span class="num text-xs text-gray-500 dark:text-dark-400">
                  <span class="text-gray-950 dark:text-white">${{ (subscription.weekly_usage_usd || 0).toFixed(2) }}</span> / ${{
                    subscription.group.weekly_limit_usd.toFixed(2)
                  }}
                </span>
              </div>
              <div class="progress h-1.5">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  :class="
                    getProgressBarClass(
                      subscription.weekly_usage_usd,
                      subscription.group.weekly_limit_usd
                    )
                  "
                  :style="{
                    width: getProgressWidth(
                      subscription.weekly_usage_usd,
                      subscription.group.weekly_limit_usd
                    )
                  }"
                ></div>
              </div>
              <p
                v-if="subscription.weekly_window_start"
                class="font-mono text-[11px] text-gray-500 dark:text-dark-400"
              >
                {{
                  t('userSubscriptions.resetIn', {
                    time: formatResetTime(subscription.weekly_window_start, 168)
                  })
                }}
              </p>
            </div>

            <!-- Monthly Usage -->
            <div v-if="subscription.group?.monthly_limit_usd" class="space-y-2">
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {{ t('userSubscriptions.monthly') }}
                </span>
                <span class="num text-xs text-gray-500 dark:text-dark-400">
                  <span class="text-gray-950 dark:text-white">${{ (subscription.monthly_usage_usd || 0).toFixed(2) }}</span> / ${{
                    subscription.group.monthly_limit_usd.toFixed(2)
                  }}
                </span>
              </div>
              <div class="progress h-1.5">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  :class="
                    getProgressBarClass(
                      subscription.monthly_usage_usd,
                      subscription.group.monthly_limit_usd
                    )
                  "
                  :style="{
                    width: getProgressWidth(
                      subscription.monthly_usage_usd,
                      subscription.group.monthly_limit_usd
                    )
                  }"
                ></div>
              </div>
              <p
                v-if="subscription.monthly_window_start"
                class="font-mono text-[11px] text-gray-500 dark:text-dark-400"
              >
                {{
                  t('userSubscriptions.resetIn', {
                    time: formatResetTime(subscription.monthly_window_start, 720)
                  })
                }}
              </p>
            </div>

            <!-- No limits configured - Unlimited badge -->
            <div
              v-if="
                !subscription.group?.daily_limit_usd &&
                !subscription.group?.weekly_limit_usd &&
                !subscription.group?.monthly_limit_usd
              "
              class="flex items-center gap-4 rounded-lg border border-dashed border-gray-200 bg-gray-50/60 px-4 py-4 dark:border-dark-700 dark:bg-dark-950/40"
            >
              <span class="num flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-2xl text-primary-600 ring-1 ring-inset ring-primary-100 dark:bg-primary-500/10 dark:text-primary-300 dark:ring-primary-400/20">∞</span>
              <div>
                <p class="text-sm font-semibold text-gray-950 dark:text-white">
                  {{ t('userSubscriptions.unlimited') }}
                </p>
                <p class="mt-0.5 text-xs text-gray-500 dark:text-dark-400">
                  {{ t('userSubscriptions.unlimitedDesc') }}
                </p>
              </div>
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
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import subscriptionsAPI from '@/api/subscriptions'
import type { UserSubscription } from '@/types'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import { formatDateTimeToMinute } from '@/utils/format'
import { hasPeakRate, formatPeakRateWindow, serverTimezoneLabel } from '@/utils/peak-rate'
import { platformAccentColor, platformBadgeClass, platformLabel } from '@/utils/platformColors'
import {
  getExpirationDateRelation,
  getRemainingDurationParts,
  isOneTimeDailyQuota,
  type RemainingDurationParts
} from '@/utils/subscriptionQuota'

const { t } = useI18n()
const router = useRouter()
const appStore = useAppStore()

// /purchase 受 requiresPayment 守卫：支付关闭时隐藏跳转入口，避免按钮被重定向成死链
const purchaseAvailable = computed(() => appStore.cachedPublicSettings?.payment_enabled !== false)

const subscriptions = ref<UserSubscription[]>([])
const loading = ref(true)

function subscriptionHasPeakRate(subscription: UserSubscription): boolean {
  return hasPeakRate(subscription.group)
}

function subscriptionPeakRateLabel(subscription: UserSubscription): string {
  return formatPeakRateWindow(subscription.group, serverTimezoneLabel(appStore.cachedPublicSettings?.server_utc_offset))
}

async function loadSubscriptions() {
  try {
    loading.value = true
    subscriptions.value = await subscriptionsAPI.getMySubscriptions()
  } catch (error) {
    console.error('Failed to load subscriptions:', error)
    appStore.showError(t('userSubscriptions.failedToLoad'))
  } finally {
    loading.value = false
  }
}

function getProgressWidth(used: number | undefined, limit: number | null | undefined): string {
  if (!limit || limit === 0) return '0%'
  const percentage = Math.min(((used || 0) / limit) * 100, 100)
  return `${percentage}%`
}

function getProgressBarClass(used: number | undefined, limit: number | null | undefined): string {
  if (!limit || limit === 0) return 'bg-gray-400'
  const percentage = ((used || 0) / limit) * 100
  if (percentage >= 90) return 'bg-red-500'
  if (percentage >= 70) return 'bg-amber-500'
  return 'bg-primary-600 dark:bg-primary-500'
}

/**
 * 有效期剩余比例（0~100），按 starts_at → expires_at 计算；
 * 缺少起始时间或区间非法时返回 null，不渲染有效期进度条。
 */
function validityRemainingPercent(subscription: UserSubscription): number | null {
  if (!subscription.expires_at || !subscription.starts_at) return null
  const start = new Date(subscription.starts_at).getTime()
  const end = new Date(subscription.expires_at).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  const remaining = (end - Date.now()) / (end - start)
  return Math.round(Math.min(Math.max(remaining, 0), 1) * 100)
}

/** 有效期进度条颜色：与到期文字颜色阈值保持一致。 */
function getExpirationBarClass(expiresAt: string): string {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days <= 3) return 'bg-red-500'
  if (days <= 7) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function formatExpirationDate(expiresAt: string): string {
  const now = new Date()
  const expires = new Date(expiresAt)
  const diff = expires.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  const relation = getExpirationDateRelation(expires, now)

  if (relation === null) return ''

  if (relation === 'expired') {
    return t('userSubscriptions.status.expired')
  }

  const dateStr = formatDateTimeToMinute(expires)

  if (relation === 'today') {
    return `${dateStr} (${t('common.today')})`
  }
  if (relation === 'tomorrow') {
    return `${dateStr} (${t('common.tomorrow')})`
  }

  return t('userSubscriptions.daysRemaining', { days }) + ` (${dateStr})`
}

function getExpirationClass(expiresAt: string): string {
  const now = new Date()
  const expires = new Date(expiresAt)
  const diff = expires.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (diff <= 0) return 'text-red-600 dark:text-red-400 font-medium'
  if (days <= 3) return 'text-red-600 dark:text-red-400'
  if (days <= 7) return 'text-amber-600 dark:text-amber-400'
  return 'text-gray-700 dark:text-gray-300'
}

function formatDurationParts(parts: RemainingDurationParts): string {
  if (parts.days > 0) {
    return `${parts.days}d ${parts.hours}h`
  }

  if (parts.hours > 0) {
    return `${parts.hours}h ${parts.minutes}m`
  }

  return `${parts.minutes}m`
}

function formatDailyUsageWindow(subscription: UserSubscription): string {
  if (isOneTimeDailyQuota(subscription) && subscription.expires_at) {
    const parts = getRemainingDurationParts(subscription.expires_at)
    if (!parts) return t('userSubscriptions.windowNotActive')
    return t('userSubscriptions.quotaEndsIn', { time: formatDurationParts(parts) })
  }

  return t('userSubscriptions.resetIn', {
    time: formatResetTime(subscription.daily_window_start, 24)
  })
}

function formatResetTime(windowStart: string | null, windowHours: number): string {
  if (!windowStart) return t('userSubscriptions.windowNotActive')

  const start = new Date(windowStart)
  const end = new Date(start.getTime() + windowHours * 60 * 60 * 1000)
  const parts = getRemainingDurationParts(end)

  return parts ? formatDurationParts(parts) : t('userSubscriptions.windowNotActive')
}

onMounted(() => {
  loadSubscriptions()
})
</script>
