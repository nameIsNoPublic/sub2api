<template>
  <BaseDialog :show="show" :title="t('usage.errors.detail.title')" width="wide" @close="emit('update:show', false)">
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-10">
      <svg class="h-6 w-6 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>

    <!-- Error state -->
    <div v-else-if="loadError" class="py-8 text-center text-sm text-red-600 dark:text-red-400">
      {{ t('usage.errors.detail.loadFailed') }}
    </div>

    <!-- Detail content -->
    <div v-else-if="detail" class="space-y-4 text-sm">
      <div class="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-gray-200/80 bg-gray-200/80 sm:grid-cols-2 sm:[&>*:last-child:nth-child(odd)]:col-span-2 dark:border-dark-800 dark:bg-dark-800">
        <!-- Time -->
        <div class="bg-white px-4 py-3 dark:bg-dark-900">
          <span class="kicker">{{ t('usage.errors.time') }}</span>
          <p class="mt-1 font-mono text-[13px] tabular-nums text-gray-950 dark:text-dark-100">{{ formatDateTime(detail.created_at) }}</p>
        </div>
        <!-- Model -->
        <div class="bg-white px-4 py-3 dark:bg-dark-900">
          <span class="kicker">{{ t('usage.errors.model') }}</span>
          <p class="mt-1 font-mono text-[13px] text-gray-950 dark:text-dark-100">{{ detail.model || '-' }}</p>
        </div>
        <!-- Endpoint -->
        <div class="bg-white px-4 py-3 dark:bg-dark-900">
          <span class="kicker">{{ t('usage.errors.endpoint') }}</span>
          <p class="mt-1 break-all font-mono text-[13px] text-gray-950 dark:text-dark-100">{{ detail.inbound_endpoint || '-' }}</p>
        </div>
        <!-- Status Code -->
        <div class="bg-white px-4 py-3 dark:bg-dark-900">
          <span class="kicker">{{ t('usage.errors.status') }}</span>
          <p class="mt-0.5">
            <span class="badge" :class="statusClass(detail.status_code)">{{ detail.status_code || '-' }}</span>
          </p>
        </div>
        <!-- Category -->
        <div class="bg-white px-4 py-3 dark:bg-dark-900">
          <span class="kicker">{{ t('usage.errors.category') }}</span>
          <p class="mt-1 text-gray-950 dark:text-dark-100">{{ t('usage.errors.categories.' + detail.category) }}</p>
        </div>
        <!-- Platform -->
        <div class="bg-white px-4 py-3 dark:bg-dark-900">
          <span class="kicker">{{ t('usage.errors.platform') }}</span>
          <p class="mt-1 text-gray-950 dark:text-dark-100">{{ detail.platform || '-' }}</p>
        </div>
        <!-- Upstream status code -->
        <div v-if="detail.upstream_status_code != null" class="bg-white px-4 py-3 dark:bg-dark-900">
          <span class="kicker">{{ t('usage.errors.detail.upstreamStatus') }}</span>
          <p class="mt-1 text-gray-950 dark:text-dark-100">{{ detail.upstream_status_code }}</p>
        </div>
      </div>

      <!-- Message -->
      <div v-if="detail.message">
        <span class="kicker">{{ t('usage.errors.message') }}</span>
        <p class="mt-1.5 break-all rounded-lg bg-red-50/60 px-3 py-2 text-red-800 ring-1 ring-inset ring-red-200/60 dark:bg-red-500/5 dark:text-red-200 dark:ring-red-400/20">{{ detail.message }}</p>
      </div>

      <!-- Error Body -->
      <div v-if="detail.error_body">
        <span class="kicker">{{ t('usage.errors.detail.responseBody') }}</span>
        <pre class="code-block mt-1.5 max-h-[40vh] overflow-auto whitespace-pre-wrap break-all text-xs">{{ detail.error_body }}</pre>
      </div>
    </div>
  </BaseDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseDialog from '@/components/common/BaseDialog.vue'
import { getMyErrorDetail } from '@/api/usage'
import { formatDateTime } from '@/utils/format'
import type { UserErrorRequestDetail } from '@/types'

const props = defineProps<{
  show: boolean
  errorId: number | null
}>()

const emit = defineEmits<{
  (e: 'update:show', v: boolean): void
}>()

const { t } = useI18n()

const loading = ref(false)
const loadError = ref(false)
const detail = ref<UserErrorRequestDetail | null>(null)
let requestVersion = 0

watch(
  () => [props.show, props.errorId] as const,
  ([show, id], _, onCleanup) => {
    onCleanup(() => { requestVersion++ })
    if (show && id != null) {
      fetchDetail(id)
    } else if (!show) {
      detail.value = null
      loadError.value = false
    }
  }
)

async function fetchDetail(id: number) {
  const version = ++requestVersion
  loading.value = true
  loadError.value = false
  detail.value = null
  try {
    const result = await getMyErrorDetail(id)
    if (version === requestVersion) detail.value = result
  } catch (e) {
    if (version !== requestVersion) return
    console.error('[UserErrorDetailModal] Failed to load error detail:', e)
    loadError.value = true
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

function statusClass(code: number) {
  if (code >= 500) return 'badge-danger'
  if (code === 429) return 'badge-warning'
  return 'badge-gray'
}
</script>
