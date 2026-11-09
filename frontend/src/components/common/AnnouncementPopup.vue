<template>
  <Teleport to="body">
    <Transition name="popup-fade">
      <div
        v-if="displayedAnnouncement"
        class="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-gray-950/45 p-4 pt-[8vh] backdrop-blur-[2px] dark:bg-black/65"
      >
        <div
          class="relative w-full max-w-[660px] overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-pop dark:border-dark-700 dark:bg-dark-900"
          @click.stop
        >
          <!-- 顶部信号条：靛蓝 → ember -->
          <div class="h-[3px] w-full bg-gradient-to-r from-primary-600 via-primary-500 to-ember-500" aria-hidden="true"></div>

          <!-- Header -->
          <div class="border-b border-gray-100 px-6 pb-5 pt-5 dark:border-dark-800 sm:px-8">
            <div class="mb-3 flex items-center gap-2">
              <span class="kicker">
                <span class="signal-dot"></span>
                {{ t('announcements.title') }}
              </span>
              <span class="badge badge-ember">
                {{ t('announcements.unread') }}
              </span>
            </div>

            <!-- Title -->
            <h2 class="text-xl font-semibold leading-snug tracking-tight text-gray-950 dark:text-white sm:text-2xl">
              {{ displayedAnnouncement.title }}
            </h2>

            <!-- Time -->
            <div class="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-dark-400">
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <time class="font-mono">{{ formatRelativeWithDateTime(displayedAnnouncement.created_at) }}</time>
            </div>
          </div>

          <!-- Body -->
          <div class="max-h-[50vh] overflow-y-auto px-6 py-6 sm:px-8">
            <div
              class="markdown-body prose prose-sm max-w-none dark:prose-invert"
              v-html="renderedContent"
            ></div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end border-t border-gray-100 bg-gray-50/60 px-6 py-4 dark:border-dark-800 dark:bg-dark-950/40 sm:px-8">
            <button
              type="button"
              @click="handleDismiss"
              data-testid="announcement-popup-dismiss"
              class="btn btn-primary"
            >
              <svg v-if="preview" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {{ preview ? t('common.close') : t('announcements.markRead') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useAnnouncementStore } from '@/stores/announcements'
import { formatRelativeWithDateTime } from '@/utils/format'
import type { Announcement, UserAnnouncement } from '@/types'
import '@/styles/announcement-markdown.css'

type PreviewAnnouncement = Pick<Announcement | UserAnnouncement, 'title' | 'content' | 'created_at'>

const props = withDefaults(defineProps<{
  announcement?: PreviewAnnouncement | null
  preview?: boolean
}>(), {
  announcement: null,
  preview: false,
})

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const announcementStore = useAnnouncementStore()
const displayedAnnouncement = computed(() => (
  props.preview ? props.announcement : announcementStore.currentPopup
))

marked.setOptions({
  breaks: true,
  gfm: true,
})

const renderedContent = computed(() => {
  const content = displayedAnnouncement.value?.content
  if (!content) return ''
  const html = marked.parse(content) as string
  return DOMPurify.sanitize(html)
})

function handleDismiss() {
  if (props.preview) {
    emit('close')
    return
  }
  announcementStore.dismissPopup()
}

// Manage body overflow — only set, never unset (bell component handles restore)
watch(
  displayedAnnouncement,
  (popup) => {
    if (popup) {
      document.body.style.overflow = 'hidden'
    } else if (props.preview) {
      document.body.style.overflow = ''
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (props.preview) {
    document.body.style.overflow = ''
  }
})
</script>

<style scoped>
.popup-fade-enter-active {
  transition: opacity 0.22s ease-out;
}

.popup-fade-leave-active {
  transition: opacity 0.16s ease-in;
}

.popup-fade-enter-from,
.popup-fade-leave-to {
  opacity: 0;
}

.popup-fade-enter-active > div,
.popup-fade-leave-active > div {
  transition:
    transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 0.22s ease-out;
}

.popup-fade-enter-from > div,
.popup-fade-leave-to > div {
  transform: translateY(6px) scale(0.98);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .popup-fade-enter-active,
  .popup-fade-leave-active,
  .popup-fade-enter-active > div,
  .popup-fade-leave-active > div {
    transition-duration: 1ms;
  }

  .popup-fade-enter-from > div,
  .popup-fade-leave-to > div {
    transform: none;
  }
}
</style>
