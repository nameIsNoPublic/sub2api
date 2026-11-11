<template>
  <div class="space-y-2.5">
    <div class="flex items-center justify-between gap-3">
      <label :for="inputId" class="text-sm font-medium text-gray-800 dark:text-dark-100">{{ t('supportTickets.images.label') }}</label>
      <span class="text-xs tabular-nums text-gray-400 dark:text-dark-400">{{ modelValue.length }} / {{ ticketImageLimit }}</span>
    </div>
    <input
      :id="inputId"
      ref="fileInput"
      type="file"
      :accept="ticketImageTypes.join(',')"
      :disabled="unavailable"
      multiple
      tabindex="-1"
      class="sr-only"
      @change="selectImages"
    />
    <div
      class="rounded-xl border border-dashed transition-colors duration-150"
      :class="dragDepth && !unavailable ? 'border-primary-400 bg-primary-50 dark:bg-primary-950/30' : 'border-gray-300 bg-gray-50/60 dark:border-dark-600 dark:bg-dark-800/40'"
      @dragenter.prevent="dragDepth++"
      @dragleave.prevent="dragDepth = Math.max(0, dragDepth - 1)"
      @dragover.prevent
      @drop.prevent="dropImages"
    >
      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-xl px-4 py-4 text-left outline-none transition-colors hover:bg-primary-50/60 focus-visible:ring-2 focus-visible:ring-primary-500/50 disabled:cursor-default disabled:opacity-50 dark:hover:bg-primary-900/10"
        :disabled="unavailable"
        :aria-controls="inputId"
        :aria-label="t('supportTickets.images.choose')"
        @click="openPicker"
      >
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-primary-500 dark:border-dark-600 dark:bg-dark-900">
          <Icon name="upload" size="md" aria-hidden="true" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-medium text-gray-800 dark:text-dark-100">{{ t('supportTickets.images.choose') }}</span>
          <span class="mt-0.5 block text-xs text-gray-500 dark:text-dark-300">{{ t('supportTickets.images.dropHint') }}</span>
        </span>
        <Icon name="plus" size="sm" aria-hidden="true" class="shrink-0 text-gray-400" />
      </button>
    </div>
    <ul v-if="previews.length" class="grid grid-cols-3 gap-2.5">
      <li v-for="(preview, index) in previews" :key="preview.url" class="group relative min-w-0">
        <div class="aspect-[4/3] overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-dark-600 dark:bg-dark-800">
          <img :src="preview.url" :alt="preview.file.name" class="h-full w-full object-contain" />
        </div>
        <button
          type="button"
          class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gray-950/70 text-white transition-colors hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:opacity-50"
          :disabled="disabled"
          :aria-label="t('supportTickets.images.removeNamed', { name: preview.file.name })"
          @click="remove(index)"
        >
          <Icon name="x" size="xs" aria-hidden="true" />
        </button>
        <p class="mt-1 truncate text-xs text-gray-500 dark:text-dark-300" :title="preview.file.name">{{ preview.file.name }}</p>
      </li>
    </ul>
    <p class="text-xs leading-relaxed text-gray-500 dark:text-dark-300">{{ t('supportTickets.images.hint') }}</p>
    <p v-if="error" role="alert" class="text-xs text-red-600 dark:text-red-400">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import { ticketImageLimit, ticketImageMaxBytes, ticketImageTypes } from '@/api/supportTickets'

const props = defineProps<{ inputId: string; modelValue: File[]; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [images: File[]] }>()
const { t } = useI18n()
const fileInput = ref<HTMLInputElement>()
const error = ref('')
const dragDepth = ref(0)
const unavailable = computed(() => props.disabled || props.modelValue.length >= ticketImageLimit)
const previews = ref<{ file: File; url: string }[]>([])

// Release preview URLs on removal and when the composer unmounts.
watch(() => props.modelValue, (files, _, onCleanup) => {
  const next = files.map(file => ({ file, url: URL.createObjectURL(file) }))
  previews.value = next
  onCleanup(() => next.forEach(preview => URL.revokeObjectURL(preview.url)))
}, { immediate: true })

function openPicker() {
  if (!unavailable.value) fileInput.value?.click()
}

function addImages(added: File[]) {
  if (props.disabled || !added.length) return
  error.value = ''
  const next = [...props.modelValue, ...added]
  if (next.length > ticketImageLimit || added.some(file =>
    !file.size || file.size > ticketImageMaxBytes || (file.type && !ticketImageTypes.includes(file.type))
  )) {
    error.value = t('supportTickets.images.invalid')
    return
  }
  emit('update:modelValue', next)
}

function selectImages(event: Event) {
  const input = event.target as HTMLInputElement
  addImages(Array.from(input.files ?? []))
  input.value = ''
}

function dropImages(event: DragEvent) {
  dragDepth.value = 0
  addImages(Array.from(event.dataTransfer?.files ?? []))
}

// The parent composer forwards paste events from its description or reply field.
function paste(event: ClipboardEvent) {
  const files = Array.from(event.clipboardData?.files ?? []).filter(file => file.type.startsWith('image/'))
  if (!props.disabled && files.length) {
    event.preventDefault()
    addImages(files)
  }
}

function remove(index: number) {
  error.value = ''
  emit('update:modelValue', props.modelValue.filter((_, position) => position !== index))
}

defineExpose({ paste })
</script>
