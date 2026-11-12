<template>
  <AppLayout>
    <div class="page-stagger space-y-6">
      <div v-if="loading" class="flex justify-center py-12">
        <span class="spinner h-7 w-7 text-primary-600 dark:text-primary-400"></span>
      </div>

      <template v-else-if="detail">
        <!-- Stats -->
        <div class="panel-grid sm:grid-cols-2 lg:grid-cols-4">
          <div class="p-5">
            <div class="flex items-center gap-2">
              <span class="stat-icon stat-icon-primary h-7 w-7" aria-hidden="true">
                <Icon name="trendingUp" size="xs" :stroke-width="2" />
              </span>
              <p class="kicker">{{ t('affiliate.stats.rebateRate') }}</p>
            </div>
            <p class="num mt-2.5 text-2xl font-semibold text-primary-600 dark:text-primary-400">
              {{ formattedRebateRate }}<span class="ml-0.5 text-base font-medium">%</span>
            </p>
            <p class="mt-1 text-xs text-gray-400 dark:text-dark-500">
              {{ t('affiliate.stats.rebateRateHint') }}
            </p>
          </div>
          <div class="p-5">
            <div class="flex items-center gap-2">
              <span class="stat-icon stat-icon-info h-7 w-7" aria-hidden="true">
                <Icon name="users" size="xs" :stroke-width="2" />
              </span>
              <p class="kicker">{{ t('affiliate.stats.invitedUsers') }}</p>
            </div>
            <p class="num mt-2.5 text-2xl font-semibold text-gray-950 dark:text-white">
              {{ formatCount(detail.aff_count) }}
            </p>
          </div>
          <div class="p-5">
            <div class="flex items-center gap-2">
              <span class="stat-icon stat-icon-success h-7 w-7" aria-hidden="true">
                <Icon name="dollar" size="xs" :stroke-width="2" />
              </span>
              <p class="kicker">{{ t('affiliate.stats.availableQuota') }}</p>
            </div>
            <p class="num mt-2.5 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              {{ formatCurrency(detail.aff_quota) }}
            </p>
          </div>
          <div class="p-5">
            <div class="flex items-center gap-2">
              <span class="stat-icon stat-icon-ember h-7 w-7" aria-hidden="true">
                <Icon name="creditCard" size="xs" :stroke-width="2" />
              </span>
              <p class="kicker">{{ t('affiliate.stats.totalQuota') }}</p>
            </div>
            <p class="num mt-2.5 text-2xl font-semibold text-gray-950 dark:text-white">
              {{ formatCurrency(detail.aff_history_quota) }}
            </p>
            <p v-if="detail.aff_frozen_quota > 0" class="mt-1 font-mono text-xs text-amber-600 dark:text-amber-400">
              {{ t('affiliate.stats.frozenQuota') }}: {{ formatCurrency(detail.aff_frozen_quota) }}
            </p>
          </div>
        </div>

        <div class="card-tinted p-5 sm:p-6">
          <p class="kicker mb-2"><span class="signal-dot"></span>{{ t('ui52.userB.affiliate.kicker') }}</p>
          <h3 class="section-title">{{ t('affiliate.title') }}</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-dark-400">{{ t('affiliate.description') }}</p>

          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ t('affiliate.yourCode') }}</p>
              <div class="flex flex-col items-stretch gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-[0_1px_0_rgba(23,24,28,0.03)] dark:border-dark-700 dark:bg-dark-950 sm:flex-row sm:items-center">
                <span class="hidden shrink-0 font-mono text-[10px] tracking-[0.12em] text-gray-400 dark:text-dark-500 sm:inline">{{ t('ui52.userB.affiliate.codePrefix') }}</span>
                <code class="min-w-0 break-all font-mono text-base font-semibold tracking-wide text-gray-950 dark:text-white sm:flex-1 sm:truncate">{{ detail.aff_code }}</code>
                <button class="btn btn-secondary btn-sm w-full sm:w-auto sm:shrink-0" @click="copyCode">
                  <Icon name="copy" size="sm" />
                  <span>{{ t('affiliate.copyCode') }}</span>
                </button>
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ t('affiliate.inviteLink') }}</p>
              <div class="flex flex-col items-stretch gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-[0_1px_0_rgba(23,24,28,0.03)] dark:border-dark-700 dark:bg-dark-950 sm:flex-row sm:items-center">
                <span class="hidden shrink-0 font-mono text-[10px] tracking-[0.12em] text-gray-400 dark:text-dark-500 sm:inline">{{ t('ui52.userB.affiliate.linkPrefix') }}</span>
                <code class="min-w-0 break-all font-mono text-sm text-gray-700 dark:text-gray-300 sm:flex-1 sm:truncate">{{ inviteLink }}</code>
                <button class="btn btn-secondary btn-sm w-full sm:w-auto sm:shrink-0" @click="copyInviteLink">
                  <Icon name="copy" size="sm" />
                  <span>{{ t('affiliate.copyLink') }}</span>
                </button>
              </div>
            </div>
          </div>

          <div class="mt-5 rounded-lg border border-gray-200/80 bg-gray-50/70 p-4 dark:border-dark-800 dark:bg-dark-950/40">
            <p class="text-sm font-semibold text-gray-950 dark:text-white">{{ t('affiliate.tips.title') }}</p>
            <ol class="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li class="flex gap-3"><span class="num shrink-0 text-xs leading-5 text-primary-600 dark:text-primary-400">01</span><span>{{ t('affiliate.tips.line1') }}</span></li>
              <li class="flex gap-3"><span class="num shrink-0 text-xs leading-5 text-primary-600 dark:text-primary-400">02</span><span>{{ t('affiliate.tips.line2', { rate: `${formattedRebateRate}%` }) }}</span></li>
              <li class="flex gap-3"><span class="num shrink-0 text-xs leading-5 text-primary-600 dark:text-primary-400">03</span><span>{{ t('affiliate.tips.line3') }}</span></li>
              <li v-if="detail.aff_frozen_quota > 0" class="flex gap-3"><span class="num shrink-0 text-xs leading-5 text-primary-600 dark:text-primary-400">04</span><span>{{ t('affiliate.tips.line4') }}</span></li>
            </ol>
          </div>
        </div>

        <div class="card p-5 sm:p-6">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="section-title">{{ t('affiliate.transfer.title') }}</h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-dark-400">{{ t('affiliate.transfer.description') }}</p>
            </div>
            <button
              class="btn btn-primary"
              :disabled="transferring || detail.aff_quota <= 0"
              @click="transferQuota"
            >
              <Icon v-if="transferring" name="refresh" size="sm" class="animate-spin" />
              <Icon v-else name="dollar" size="sm" />
              <span>{{ transferring ? t('affiliate.transfer.transferring') : t('affiliate.transfer.button') }}</span>
            </button>
          </div>
          <p v-if="detail.aff_quota <= 0" class="mt-3 flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400">
            <Icon name="infoCircle" size="sm" />
            {{ t('affiliate.transfer.empty') }}
          </p>
        </div>

        <div class="card overflow-hidden">
          <div class="px-5 pt-5 sm:px-6">
            <h3 class="section-title">{{ t('affiliate.invitees.title') }}</h3>
          </div>
          <div v-if="detail.invitees.length === 0" class="m-5 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-dark-700 dark:text-dark-400 sm:m-6">
            {{ t('affiliate.invitees.empty') }}
          </div>
          <div v-else class="mt-4 overflow-x-auto border-t border-gray-100 dark:border-dark-800">
            <table class="table min-w-[560px] text-left">
              <thead>
                <tr>
                  <th>{{ t('affiliate.invitees.columns.email') }}</th>
                  <th>{{ t('affiliate.invitees.columns.username') }}</th>
                  <th class="!text-right">{{ t('affiliate.invitees.columns.rebate') }}</th>
                  <th>{{ t('affiliate.invitees.columns.joinedAt') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in detail.invitees"
                  :key="item.user_id"
                >
                  <td class="text-gray-950 dark:text-white">{{ item.email || '-' }}</td>
                  <td>{{ item.username || '-' }}</td>
                  <td class="num text-right font-medium text-emerald-600 dark:text-emerald-400">{{ formatCurrency(item.total_rebate) }}</td>
                  <td class="whitespace-nowrap font-mono text-xs text-gray-500 dark:text-dark-400">{{ formatDateTime(item.created_at) || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import userAPI from '@/api/user'
import type { UserAffiliateDetail } from '@/types'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useClipboard } from '@/composables/useClipboard'
import { formatCurrency, formatDateTime } from '@/utils/format'
import { extractApiErrorMessage } from '@/utils/apiError'

const { t } = useI18n()
const appStore = useAppStore()
const authStore = useAuthStore()
const { copyToClipboard } = useClipboard()

const loading = ref(true)
const transferring = ref(false)
const detail = ref<UserAffiliateDetail | null>(null)

const inviteLink = computed(() => {
  if (!detail.value) return ''
  if (typeof window === 'undefined') return `/register?aff=${encodeURIComponent(detail.value.aff_code)}`
  return `${window.location.origin}/register?aff=${encodeURIComponent(detail.value.aff_code)}`
})

// Rebate rate is a percentage in the range [0, 100]; backend already clamps it.
// We trim trailing zeros (e.g. 20.00 → "20", 12.50 → "12.5") for a cleaner UI.
const formattedRebateRate = computed(() => {
  const v = detail.value?.effective_rebate_rate_percent ?? 0
  const rounded = Math.round(v * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toString()
})

function formatCount(value: number): string {
  return value.toLocaleString()
}

async function loadAffiliateDetail(silent = false): Promise<void> {
  if (!silent) {
    loading.value = true
  }
  try {
    detail.value = await userAPI.getAffiliateDetail()
  } catch (error) {
    appStore.showError(extractApiErrorMessage(error, t('affiliate.loadFailed')))
  } finally {
    if (!silent) {
      loading.value = false
    }
  }
}

async function copyCode(): Promise<void> {
  if (!detail.value?.aff_code) return
  await copyToClipboard(detail.value.aff_code, t('affiliate.codeCopied'))
}

async function copyInviteLink(): Promise<void> {
  if (!inviteLink.value) return
  await copyToClipboard(inviteLink.value, t('affiliate.linkCopied'))
}

async function transferQuota(): Promise<void> {
  if (!detail.value || detail.value.aff_quota <= 0 || transferring.value) return
  transferring.value = true
  try {
    const resp = await userAPI.transferAffiliateQuota()
    appStore.showSuccess(t('affiliate.transfer.success', { amount: formatCurrency(resp.transferred_quota) }))
    await Promise.all([
      loadAffiliateDetail(true),
      authStore.refreshUser().catch(() => undefined),
    ])
  } catch (error) {
    appStore.showError(extractApiErrorMessage(error, t('affiliate.transferFailed')))
  } finally {
    transferring.value = false
  }
}

onMounted(() => {
  void loadAffiliateDetail()
})
</script>
