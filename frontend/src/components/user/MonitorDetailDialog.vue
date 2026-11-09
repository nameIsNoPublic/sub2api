<template>
  <BaseDialog
    :show="show"
    :title="title"
    width="wide"
    @close="$emit('close')"
  >
    <div v-if="loading" class="space-y-2 py-2" aria-busy="true">
      <div v-for="i in 4" :key="i" class="skeleton h-9 w-full"></div>
      <span class="sr-only">{{ t('common.loading') }}</span>
    </div>
    <div v-else-if="!detail" class="py-8 text-center text-sm text-gray-500 dark:text-dark-400">
      {{ t('channelStatus.detailLoadError') }}
    </div>
    <div v-else class="overflow-x-auto rounded-lg border border-gray-200/80 dark:border-dark-800">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-gray-200/80 bg-gray-50/80 dark:border-dark-800 dark:bg-dark-950/50">
          <tr class="whitespace-nowrap font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-gray-500 dark:text-dark-400">
            <th class="px-3 py-2.5">{{ t('channelStatus.detailColumns.model') }}</th>
            <th class="px-3 py-2.5">{{ t('channelStatus.detailColumns.latestStatus') }}</th>
            <th class="px-3 py-2.5">{{ t('channelStatus.detailColumns.latestLatency') }}</th>
            <th class="px-3 py-2.5">{{ t('channelStatus.detailColumns.availability7d') }}</th>
            <th class="px-3 py-2.5">{{ t('channelStatus.detailColumns.availability15d') }}</th>
            <th class="px-3 py-2.5">{{ t('channelStatus.detailColumns.availability30d') }}</th>
            <th class="px-3 py-2.5">{{ t('channelStatus.detailColumns.avgLatency7d') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="m in detail.models"
            :key="m.model"
            class="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/70 dark:border-dark-800/70 dark:hover:bg-dark-800/40"
          >
            <td class="whitespace-nowrap px-3 py-2.5 font-mono text-[13px] font-medium text-gray-950 dark:text-white">{{ formatMonitorModel(m.model) }}</td>
            <td class="px-3 py-2.5">
              <span
                class="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium"
                :class="statusBadgeClass(m.latest_status)"
              >
                {{ statusLabel(m.latest_status) }}
              </span>
            </td>
            <td class="num px-3 py-2.5 text-[13px] text-gray-700 dark:text-gray-300">{{ formatLatency(m.latest_latency_ms) }}</td>
            <td class="num px-3 py-2.5 text-[13px] text-gray-700 dark:text-gray-300">{{ formatPercent(m.availability_7d) }}</td>
            <td class="num px-3 py-2.5 text-[13px] text-gray-700 dark:text-gray-300">{{ formatPercent(m.availability_15d) }}</td>
            <td class="num px-3 py-2.5 text-[13px] text-gray-700 dark:text-gray-300">{{ formatPercent(m.availability_30d) }}</td>
            <td class="num px-3 py-2.5 text-[13px] text-gray-700 dark:text-gray-300">{{ formatLatency(m.avg_latency_7d_ms) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <button @click="$emit('close')" class="btn btn-secondary">
          {{ t('channelStatus.closeDetail') }}
        </button>
      </div>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { extractApiErrorMessage } from '@/utils/apiError'
import {
  status as fetchChannelMonitorDetail,
  type UserMonitorDetail,
} from '@/api/channelMonitor'
import BaseDialog from '@/components/common/BaseDialog.vue'
import { useChannelMonitorFormat } from '@/composables/useChannelMonitorFormat'

const props = defineProps<{
  show: boolean
  monitorId: number | null
  title: string
}>()

defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()
const appStore = useAppStore()
const { statusLabel, statusBadgeClass, formatLatency, formatPercent, formatMonitorModel } = useChannelMonitorFormat()

const detail = ref<UserMonitorDetail | null>(null)
const loading = ref(false)
let requestVersion = 0

async function load(id: number) {
  const version = ++requestVersion
  detail.value = null
  loading.value = true
  try {
    const result = await fetchChannelMonitorDetail(id)
    if (version === requestVersion) detail.value = result
  } catch (err: unknown) {
    if (version !== requestVersion) return
    appStore.showError(extractApiErrorMessage(err, t('channelStatus.detailLoadError')))
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

watch(
  () => [props.show, props.monitorId] as const,
  ([show, id], _, onCleanup) => {
    onCleanup(() => { requestVersion++ })
    if (!show) {
      detail.value = null
      return
    }
    if (id != null) void load(id)
  },
  { immediate: true },
)
</script>
