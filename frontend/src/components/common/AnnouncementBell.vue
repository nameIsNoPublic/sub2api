<template>
  <div>
    <!-- 铃铛按钮 -->
    <button
      type="button"
      @click="openModal"
      class="shell-action shell-action-icon"
      :class="{ 'text-gray-950 dark:text-white': unreadCount > 0 }"
      :aria-label="t('announcements.title')"
    >
      <Icon name="bell" size="md" />
      <!-- 未读信号点 -->
      <span
        v-if="unreadCount > 0"
        class="signal-dot absolute right-2 top-2 ring-2 ring-gray-50 dark:ring-dark-950"
      ></span>
    </button>

    <!-- 公告列表 Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="isModalOpen"
          class="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-gray-950/40 p-4 pt-[8vh] backdrop-blur-[2px] dark:bg-black/60"
          @click="closeModal"
        >
          <div
            class="w-full max-w-[600px] overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-pop dark:border-dark-700 dark:bg-dark-900"
            @click.stop
          >
            <!-- Header -->
            <div class="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4 dark:border-dark-800">
              <div class="min-w-0">
                <p class="kicker">
                  <span class="signal-dot" :class="{ 'opacity-0': unreadCount === 0 }"></span>
                  {{ t('ui52.shell.announcementsKicker') }}
                </p>
                <h2 class="mt-1.5 text-lg font-semibold tracking-tight text-gray-950 dark:text-white">
                  {{ t('announcements.title') }}
                </h2>
                <p v-if="unreadCount > 0" class="mt-1 text-sm text-gray-500 dark:text-dark-400">
                  <span class="num font-semibold text-ember-600 dark:text-ember-400">{{ unreadCount }}</span>
                  {{ t('announcements.unread') }}
                </p>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <button
                  v-if="unreadCount > 0"
                  type="button"
                  @click="markAllAsRead"
                  :disabled="loading"
                  class="btn btn-secondary btn-sm"
                >
                  {{ t('announcements.markAllRead') }}
                </button>
                <button
                  type="button"
                  @click="closeModal"
                  class="shell-action shell-action-icon h-8 w-8"
                  :aria-label="t('common.close')"
                >
                  <Icon name="x" size="sm" />
                </button>
              </div>
            </div>

            <!-- Body -->
            <div class="max-h-[65vh] overflow-y-auto">
              <!-- Loading -->
              <div v-if="loading" class="flex items-center justify-center py-16">
                <div class="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary-600 dark:border-dark-700 dark:border-t-primary-400"></div>
              </div>

              <!-- Announcements List -->
              <div v-else-if="announcements.length > 0" class="divide-y divide-gray-100 dark:divide-dark-800">
                <div
                  v-for="item in announcements"
                  :key="item.id"
                  class="group relative flex cursor-pointer items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-dark-800/50"
                  :class="{ 'bg-ember-50/40 dark:bg-ember-500/[0.04]': !item.read_at }"
                  style="min-height: 72px"
                  @click="openDetail(item)"
                >
                  <!-- Status Indicator -->
                  <div
                    class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ring-1 ring-inset"
                    :class="
                      item.read_at
                        ? 'bg-gray-50 text-gray-400 ring-gray-200 dark:bg-dark-800 dark:text-dark-500 dark:ring-dark-700'
                        : 'bg-white text-gray-950 ring-gray-200 dark:bg-dark-900 dark:text-white dark:ring-dark-700'
                    "
                  >
                    <svg v-if="!item.read_at" class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <svg v-else class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>

                  <!-- Content -->
                  <div class="flex min-w-0 flex-1 items-center justify-between gap-4">
                    <div class="min-w-0 flex-1">
                      <h3
                        class="truncate text-sm text-gray-950 dark:text-white"
                        :class="item.read_at ? 'font-normal text-gray-700 dark:text-gray-300' : 'font-semibold'"
                      >
                        {{ item.title }}
                      </h3>
                      <div class="mt-1 flex items-center gap-2">
                        <time class="font-mono text-[11px] text-gray-500 dark:text-dark-400">
                          {{ formatRelativeTime(item.created_at) }}
                        </time>
                        <span v-if="!item.read_at" class="badge badge-ember px-1.5 py-0 text-[11px]">
                          {{ t('announcements.unread') }}
                        </span>
                      </div>
                    </div>

                    <!-- Arrow -->
                    <svg
                      class="h-4 w-4 flex-shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500 dark:text-dark-600 dark:group-hover:text-dark-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                      aria-hidden="true"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  <!-- Unread indicator bar -->
                  <div
                    v-if="!item.read_at"
                    class="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-ember-500"
                  ></div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-else class="empty-state py-16">
                <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gray-50 ring-1 ring-inset ring-gray-200 dark:bg-dark-800 dark:ring-dark-700">
                  <Icon name="inbox" size="lg" class="text-gray-400 dark:text-dark-500" />
                </div>
                <p class="empty-state-title text-sm">{{ t('announcements.empty') }}</p>
                <p class="empty-state-description text-xs">{{ t('announcements.emptyDescription') }}</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 公告详情 Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="detailModalOpen && selectedAnnouncement"
          class="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-gray-950/40 p-4 pt-[6vh] backdrop-blur-[2px] dark:bg-black/60"
          @click="closeDetail"
        >
          <div
            class="w-full max-w-[760px] overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-pop dark:border-dark-700 dark:bg-dark-900"
            @click.stop
          >
            <!-- Header -->
            <div class="border-b border-gray-100 px-6 py-5 dark:border-dark-800 sm:px-8">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <div class="mb-3 flex flex-wrap items-center gap-2">
                    <span class="kicker">
                      <span v-if="!selectedAnnouncement.read_at" class="signal-dot"></span>
                      {{ t('announcements.title') }}
                    </span>
                    <span v-if="!selectedAnnouncement.read_at" class="badge badge-ember">
                      {{ t('announcements.unread') }}
                    </span>
                  </div>

                  <!-- Title -->
                  <h2 class="text-xl font-semibold leading-snug tracking-tight text-gray-950 dark:text-white sm:text-2xl">
                    {{ selectedAnnouncement.title }}
                  </h2>

                  <!-- Meta Info -->
                  <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-dark-400">
                    <div class="flex items-center gap-1.5">
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <time class="font-mono">{{ formatRelativeWithDateTime(selectedAnnouncement.created_at) }}</time>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>{{ selectedAnnouncement.read_at ? t('announcements.read') : t('announcements.unread') }}</span>
                    </div>
                  </div>
                </div>

                <!-- Close button -->
                <button
                  type="button"
                  @click="closeDetail"
                  class="shell-action shell-action-icon"
                  :aria-label="t('common.close')"
                >
                  <Icon name="x" size="md" />
                </button>
              </div>
            </div>

            <!-- Body -->
            <div class="max-h-[60vh] overflow-y-auto px-6 py-6 sm:px-8">
              <div
                class="markdown-body prose prose-sm max-w-none dark:prose-invert"
                v-html="renderMarkdown(selectedAnnouncement.content)"
              ></div>
            </div>

            <!-- Footer with Actions -->
            <div class="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/60 px-6 py-4 dark:border-dark-800 dark:bg-dark-950/40 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-400">
                <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{{ selectedAnnouncement.read_at ? t('announcements.readStatus') : t('announcements.markReadHint') }}</span>
              </div>
              <div class="flex items-center justify-end gap-2">
                <button
                  type="button"
                  @click="closeDetail"
                  class="btn btn-secondary"
                >
                  {{ t('common.close') }}
                </button>
                <button
                  v-if="!selectedAnnouncement.read_at"
                  type="button"
                  @click="markAsReadAndClose(selectedAnnouncement.id)"
                  class="btn btn-primary"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {{ t('announcements.markRead') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useAppStore } from '@/stores/app'
import { useAnnouncementStore } from '@/stores/announcements'
import { formatRelativeTime, formatRelativeWithDateTime } from '@/utils/format'
import type { UserAnnouncement } from '@/types'
import Icon from '@/components/icons/Icon.vue'
import '@/styles/announcement-markdown.css'

const { t } = useI18n()
const appStore = useAppStore()
const announcementStore = useAnnouncementStore()

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
})

// Use store state (storeToRefs for reactivity)
const { announcements, loading } = storeToRefs(announcementStore)
const unreadCount = computed(() => announcementStore.unreadCount)

// Local modal state
const isModalOpen = ref(false)
const detailModalOpen = ref(false)
const selectedAnnouncement = ref<UserAnnouncement | null>(null)

// Methods
function renderMarkdown(content: string): string {
  if (!content) return ''
  const html = marked.parse(content) as string
  return DOMPurify.sanitize(html)
}

function openModal() {
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
}

function openDetail(announcement: UserAnnouncement) {
  selectedAnnouncement.value = announcement
  detailModalOpen.value = true
  if (!announcement.read_at) {
    markAsRead(announcement.id)
  }
}

function closeDetail() {
  detailModalOpen.value = false
  selectedAnnouncement.value = null
}

async function markAsRead(id: number) {
  try {
    const marked = await announcementStore.markAsRead(id)
    if (!marked) appStore.showError(t('common.unknownError'))
    return marked
  } catch (err: any) {
    appStore.showError(err?.message || t('common.unknownError'))
    return false
  }
}

async function markAsReadAndClose(id: number) {
  if (!await markAsRead(id)) return
  appStore.showSuccess(t('announcements.markedAsRead'))
  closeDetail()
}

async function markAllAsRead() {
  try {
    await announcementStore.markAllAsRead()
    appStore.showSuccess(t('announcements.allMarkedAsRead'))
  } catch (err: any) {
    appStore.showError(err?.message || t('common.unknownError'))
  }
}

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (detailModalOpen.value) {
      closeDetail()
    } else if (isModalOpen.value) {
      closeModal()
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleEscape)
  document.body.style.overflow = ''
})

watch(
  [isModalOpen, detailModalOpen, () => announcementStore.currentPopup],
  ([modal, detail, popup]) => {
    document.body.style.overflow = (modal || detail || popup) ? 'hidden' : ''
  }
)
</script>

<style scoped>
/* Modal Animations */
.modal-fade-enter-active {
  transition: opacity 0.22s ease-out;
}

.modal-fade-leave-active {
  transition: opacity 0.16s ease-in;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active > div,
.modal-fade-leave-active > div {
  transition:
    transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 0.22s ease-out;
}

.modal-fade-enter-from > div,
.modal-fade-leave-to > div {
  transform: translateY(6px) scale(0.98);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .modal-fade-enter-active,
  .modal-fade-leave-active,
  .modal-fade-enter-active > div,
  .modal-fade-leave-active > div {
    transition-duration: 1ms;
  }

  .modal-fade-enter-from > div,
  .modal-fade-leave-to > div {
    transform: none;
  }
}
</style>
