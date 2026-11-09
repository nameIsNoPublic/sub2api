<template>
  <div class="card p-6 md:px-7">
    <div class="grid gap-5 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8">
      <header class="space-y-1.5">
        <p class="kicker">{{ t('ui52.userA.profile.securityKicker') }}</p>
        <h2 class="section-title">
          {{ t('profile.totp.title') }}
        </h2>
        <p class="text-sm leading-6 text-gray-500 dark:text-dark-400">
          {{ t('profile.totp.description') }}
        </p>
      </header>
      <div class="min-w-0">
        <!-- Loading state -->
        <div v-if="loading" class="flex items-center justify-center py-8">
          <div class="h-7 w-7 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
        </div>

        <!-- Feature disabled globally -->
        <div
          v-else-if="status && !status.feature_enabled"
          class="flex items-center gap-4 rounded-xl border border-gray-200/80 bg-gray-50/60 p-4 dark:border-dark-800 dark:bg-dark-950/30"
        >
          <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 ring-1 ring-inset ring-gray-200/80 dark:bg-dark-800 dark:ring-dark-700">
            <svg class="h-5 w-5 text-gray-400 dark:text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-800 dark:text-dark-100">
              {{ t('profile.totp.featureDisabled') }}
            </p>
            <p class="mt-0.5 text-sm text-gray-500 dark:text-dark-400">
              {{ t('profile.totp.featureDisabledHint') }}
            </p>
          </div>
        </div>

        <!-- 2FA Enabled -->
        <div
          v-else-if="status?.enabled"
          class="flex flex-col gap-4 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-500/20 dark:bg-emerald-500/[0.06]"
        >
          <div class="flex items-center gap-4">
            <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-400/25">
              <svg class="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-950 dark:text-white">
                {{ t('profile.totp.enabled') }}
              </p>
              <p v-if="status.enabled_at" class="mt-0.5 text-xs text-gray-500 dark:text-dark-400">
                {{ t('profile.totp.enabledAt') }}: <span class="num">{{ formatDate(status.enabled_at) }}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            class="btn btn-sm border border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50 dark:border-red-500/30 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-500/10"
            @click="showDisableDialog = true"
          >
            {{ t('profile.totp.disable') }}
          </button>
        </div>

        <!-- 2FA Not Enabled -->
        <div
          v-else
          class="flex flex-col gap-4 rounded-xl border border-gray-200/80 bg-gray-50/60 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-dark-800 dark:bg-dark-950/30"
        >
          <div class="flex items-center gap-4">
            <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-inset ring-gray-200/80 dark:bg-dark-800 dark:ring-dark-700">
              <svg class="h-5 w-5 text-gray-400 dark:text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-800 dark:text-dark-100">
                {{ t('profile.totp.notEnabled') }}
              </p>
              <p class="mt-0.5 text-sm text-gray-500 dark:text-dark-400">
                {{ t('profile.totp.notEnabledHint') }}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="btn btn-primary btn-sm"
            @click="showSetupModal = true"
          >
            {{ t('profile.totp.enable') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Setup Modal -->
    <TotpSetupModal
      v-if="showSetupModal"
      @close="showSetupModal = false"
      @success="handleSetupSuccess"
    />

    <!-- Disable Dialog -->
    <TotpDisableDialog
      v-if="showDisableDialog"
      @close="showDisableDialog = false"
      @success="handleDisableSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { totpAPI } from '@/api'
import type { TotpStatus } from '@/types'
import TotpSetupModal from './TotpSetupModal.vue'
import TotpDisableDialog from './TotpDisableDialog.vue'

const { t } = useI18n()

const loading = ref(true)
const status = ref<TotpStatus | null>(null)
const showSetupModal = ref(false)
const showDisableDialog = ref(false)

const loadStatus = async () => {
  loading.value = true
  try {
    status.value = await totpAPI.getStatus()
  } catch (error) {
    console.error('Failed to load TOTP status:', error)
  } finally {
    loading.value = false
  }
}

const handleSetupSuccess = () => {
  showSetupModal.value = false
  loadStatus()
}

const handleDisableSuccess = () => {
  showDisableDialog.value = false
  loadStatus()
}

const formatDate = (timestamp: number) => {
  // Backend returns Unix timestamp in seconds, convert to milliseconds
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadStatus()
})
</script>
