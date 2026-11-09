<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed right-4 top-4 z-[9999] space-y-2.5"
      aria-live="polite"
      aria-atomic="true"
    >
      <TransitionGroup
        enter-active-class="transition ease-out duration-200 motion-reduce:transition-none"
        enter-from-class="opacity-0 translate-x-4 scale-[0.98]"
        enter-to-class="opacity-100 translate-x-0 scale-100"
        leave-active-class="transition ease-in duration-150 motion-reduce:transition-none"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 translate-x-4"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'pointer-events-auto relative min-w-[320px] max-w-md overflow-hidden rounded-xl',
            'border border-gray-200/80 bg-white shadow-pop',
            'dark:border-dark-700 dark:bg-dark-900 dark:shadow-black/40'
          ]"
        >
          <!-- 左侧 3px 语义色条 -->
          <span
            :class="['absolute inset-y-0 left-0 w-[3px]', getBarColor(toast.type)]"
            aria-hidden="true"
          ></span>

          <div class="py-3.5 pl-4 pr-3.5">
            <div class="flex items-start gap-3">
              <!-- Icon -->
              <div
                :class="[
                  'mt-px flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md ring-1 ring-inset',
                  getIconColor(toast.type)
                ]"
              >
                <Icon
                  :name="getToastIconName(toast.type)"
                  size="sm"
                  aria-hidden="true"
                />
              </div>

              <!-- Content -->
              <div class="min-w-0 flex-1 pt-0.5">
                <p v-if="toast.title" class="text-sm font-semibold text-gray-950 dark:text-white">
                  {{ toast.title }}
                </p>
                <p
                  :class="[
                    'break-words text-sm leading-relaxed',
                    toast.title
                      ? 'mt-0.5 text-gray-600 dark:text-dark-300'
                      : 'text-gray-900 dark:text-gray-100'
                  ]"
                >
                  {{ toast.message }}
                </p>
              </div>

              <!-- Close button -->
              <button
                @click="removeToast(toast.id)"
                class="-mr-1 flex-shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-dark-400 dark:hover:bg-dark-800 dark:hover:text-white"
                aria-label="Close notification"
              >
                <Icon name="x" size="sm" />
              </button>
            </div>
          </div>

          <!-- Progress bar -->
          <div v-if="toast.duration" class="h-0.5 bg-gray-100 dark:bg-dark-800">
            <div
              :class="['h-full toast-progress opacity-70', getBarColor(toast.type)]"
              :style="{ animationDuration: `${toast.duration}ms` }"
            ></div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Icon from '@/components/icons/Icon.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

const toasts = computed(() => appStore.toasts)

const getToastIconName = (type: string): 'checkCircle' | 'xCircle' | 'exclamationTriangle' | 'infoCircle' => {
  switch (type) {
    case 'success':
      return 'checkCircle'
    case 'error':
      return 'xCircle'
    case 'warning':
      return 'exclamationTriangle'
    case 'info':
    default:
      return 'infoCircle'
  }
}

const getIconColor = (type: string): string => {
  const colors: Record<string, string> = {
    success: 'bg-emerald-50 text-emerald-600 ring-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/25',
    error: 'bg-red-50 text-red-600 ring-red-200/70 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-400/25',
    warning: 'bg-amber-50 text-amber-600 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/25',
    info: 'bg-primary-50 text-primary-600 ring-primary-200/70 dark:bg-primary-500/10 dark:text-primary-300 dark:ring-primary-400/25'
  }
  return colors[type] || colors.info
}

// 左侧语义色条与底部倒计时条共用同一组颜色
const getBarColor = (type: string): string => {
  const colors: Record<string, string> = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-primary-500'
  }
  return colors[type] || colors.info
}

const removeToast = (id: string) => {
  appStore.hideToast(id)
}
</script>

<style scoped>
.toast-progress {
  width: 100%;
  animation-name: toast-progress-shrink;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}

@keyframes toast-progress-shrink {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
</style>
