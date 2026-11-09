<template>
  <div
    class="flex items-center justify-between border-t border-gray-200/80 bg-white px-4 py-2.5 dark:border-dark-800 dark:bg-dark-900 sm:px-5"
  >
    <div class="flex flex-1 items-center justify-between sm:hidden">
      <!-- Mobile pagination -->
      <button
        @click="goToPage(page - 1)"
        :disabled="page === 1"
        class="pager-btn px-3.5"
      >
        {{ t('pagination.previous') }}
      </button>
      <span class="text-[13px] tabular-nums text-gray-500 dark:text-dark-300">
        {{ t('pagination.pageOf', { page, total: totalPages }) }}
      </span>
      <button
        @click="goToPage(page + 1)"
        :disabled="page === totalPages"
        class="pager-btn ml-3 px-3.5"
      >
        {{ t('pagination.next') }}
      </button>
    </div>

    <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
      <!-- Desktop pagination info -->
      <div class="flex items-center gap-5">
        <p class="text-[13px] text-gray-500 dark:text-dark-400">
          {{ t('pagination.showing') }}
          <span class="pager-num">{{ fromItem }}</span>
          {{ t('pagination.to') }}
          <span class="pager-num">{{ toItem }}</span>
          {{ t('pagination.of') }}
          <span class="pager-num">{{ total }}</span>
          {{ t('pagination.results') }}
        </p>

        <!-- Page size selector -->
        <div v-if="showPageSizeSelector" class="flex items-center gap-2">
          <span class="text-[13px] text-gray-500 dark:text-dark-400"
            >{{ t('pagination.perPage') }}:</span
          >
          <div class="page-size-select w-20">
            <Select
              :model-value="pageSize"
              :options="pageSizeSelectOptions"
              @update:model-value="handlePageSizeChange"
            />
          </div>
        </div>

        <div v-if="showJump" class="flex items-center gap-2">
          <span class="text-[13px] text-gray-500 dark:text-dark-400">{{ t('pagination.jumpTo') }}</span>
          <input
            v-model="jumpPage"
            type="number"
            min="1"
            :max="totalPages"
            class="input w-20 px-2.5 py-1.5 text-center font-mono text-[13px]"
            :placeholder="t('pagination.jumpPlaceholder')"
            @keyup.enter="submitJump"
          />
          <button type="button" class="btn btn-ghost btn-sm" @click="submitJump">
            {{ t('pagination.jumpAction') }}
          </button>
        </div>
      </div>

      <!-- Desktop pagination buttons -->
      <nav
        class="relative z-0 inline-flex items-center gap-1"
        aria-label="Pagination"
      >
        <!-- Previous button -->
        <button
          @click="goToPage(page - 1)"
          :disabled="page === 1"
          class="pager-btn w-8 justify-center px-0 text-gray-500 dark:text-dark-300"
          :aria-label="t('pagination.previous')"
        >
          <Icon name="chevronLeft" size="md" />
        </button>

        <!-- Page numbers -->
        <button
          v-for="(pageNum, index) in visiblePages"
          :key="`${pageNum}-${index}`"
          @click="typeof pageNum === 'number' && goToPage(pageNum)"
          :disabled="typeof pageNum !== 'number'"
          :class="[
            'relative inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 font-mono text-[13px] font-medium tabular-nums transition-colors duration-150',
            pageNum === page
              ? 'z-10 bg-gray-950 text-white shadow-[0_1px_2px_rgba(12,13,16,0.2)] dark:bg-white dark:text-gray-950'
              : typeof pageNum === 'number'
                ? 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950 dark:border-dark-700 dark:bg-dark-900 dark:text-dark-200 dark:hover:border-dark-600 dark:hover:bg-dark-800 dark:hover:text-white'
                : 'text-gray-400 dark:text-dark-500',
            typeof pageNum !== 'number' && 'cursor-default'
          ]"
          :aria-label="
            typeof pageNum === 'number' ? t('pagination.goToPage', { page: pageNum }) : undefined
          "
          :aria-current="pageNum === page ? 'page' : undefined"
        >
          {{ pageNum }}
        </button>

        <!-- Next button -->
        <button
          @click="goToPage(page + 1)"
          :disabled="page === totalPages"
          class="pager-btn w-8 justify-center px-0 text-gray-500 dark:text-dark-300"
          :aria-label="t('pagination.next')"
        >
          <Icon name="chevronRight" size="md" />
        </button>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import Select from './Select.vue'
import { getConfiguredTablePageSizeOptions, normalizeTablePageSize } from '@/utils/tablePreferences'
import { setPersistedPageSize } from '@/composables/usePersistedPageSize'

const { t } = useI18n()

interface Props {
  total: number
  page: number
  pageSize: number
  pageSizeOptions?: number[]
  showPageSizeSelector?: boolean
  showJump?: boolean
}

interface Emits {
  (e: 'update:page', page: number): void
  (e: 'update:pageSize', pageSize: number): void
}

const props = withDefaults(defineProps<Props>(), {
  pageSizeOptions: () => getConfiguredTablePageSizeOptions(),
  showPageSizeSelector: true,
  showJump: false
})

const emit = defineEmits<Emits>()

const totalPages = computed(() => Math.ceil(props.total / props.pageSize))

const fromItem = computed(() => {
  if (props.total === 0) return 0
  return (props.page - 1) * props.pageSize + 1
})

const toItem = computed(() => {
  const to = props.page * props.pageSize
  return to > props.total ? props.total : to
})

const pageSizeSelectOptions = computed(() => {
  const options = Array.from(
    new Set([
      ...getConfiguredTablePageSizeOptions(),
      normalizeTablePageSize(props.pageSize)
    ])
  ).sort((a, b) => a - b)

  return options.map((size) => ({
    value: size,
    label: String(size)
  }))
})

const jumpPage = ref('')

const visiblePages = computed(() => {
  const pages: (number | string)[] = []
  const maxVisible = 7
  const total = totalPages.value

  if (total <= maxVisible) {
    // Show all pages if total is small
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // Always show first page
    pages.push(1)

    const start = Math.max(2, props.page - 2)
    const end = Math.min(total - 1, props.page + 2)

    // Add ellipsis before if needed
    if (start > 2) {
      pages.push('...')
    }

    // Add middle pages
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    // Add ellipsis after if needed
    if (end < total - 1) {
      pages.push('...')
    }

    // Always show last page
    pages.push(total)
  }

  return pages
})

const goToPage = (newPage: number) => {
  if (newPage >= 1 && newPage <= totalPages.value && newPage !== props.page) {
    emit('update:page', newPage)
  }
}

const handlePageSizeChange = (value: string | number | boolean | null) => {
  if (value === null || typeof value === 'boolean') return
  const newPageSize = normalizeTablePageSize(typeof value === 'string' ? parseInt(value, 10) : value)
  setPersistedPageSize(newPageSize)
  emit('update:pageSize', newPageSize)
}

const submitJump = () => {
  const value = String(jumpPage.value).trim()
  if (!value) return
  const pageNum = Number.parseInt(value, 10)
  if (Number.isNaN(pageNum)) return
  const nextPage = Math.min(Math.max(pageNum, 1), totalPages.value)
  jumpPage.value = ''
  goToPage(nextPage)
}
</script>

<style scoped>
.page-size-select :deep(.select-trigger) {
  @apply px-2.5 py-1.5 font-mono text-[13px];
}

/* 描边小按钮：上一页 / 下一页 */
.pager-btn {
  @apply relative inline-flex h-8 items-center rounded-md border border-gray-200 bg-white text-[13px] font-medium text-gray-700;
  @apply transition-colors duration-150 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950;
  @apply disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-white;
  @apply dark:border-dark-700 dark:bg-dark-900 dark:text-dark-200 dark:hover:border-dark-600 dark:hover:bg-dark-800 dark:hover:text-white;
  @apply dark:disabled:hover:border-dark-700 dark:disabled:hover:bg-dark-900;
}

.pager-num {
  @apply font-mono font-medium tabular-nums text-gray-900 dark:text-gray-100;
}
</style>
