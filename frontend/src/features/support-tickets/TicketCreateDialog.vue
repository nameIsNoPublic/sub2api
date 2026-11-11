<template>
  <BaseDialog
    :show="true"
    :title="t('supportTickets.create')"
    :show-close-button="!saving"
    :close-on-escape="!saving"
    @close="emit('close')"
  >
    <form id="support-ticket-create" class="space-y-4" @submit.prevent="submit" @paste="imagePicker?.paste($event)">
      <div>
        <label for="ticket-subject" class="input-label">{{ t('supportTickets.subject') }}</label>
        <input id="ticket-subject" v-model="subject" class="input" maxlength="160" required :disabled="saving" />
      </div>
      <div>
        <label for="ticket-category" class="input-label">{{ t('supportTickets.categoryLabel') }}</label>
        <Select
          id="ticket-category"
          v-model="category"
          :options="categoryOptions"
          :aria-label="t('supportTickets.categoryLabel')"
          :disabled="saving"
        />
      </div>
      <div>
        <label for="ticket-description" class="input-label">{{ t('supportTickets.problem') }}</label>
        <textarea id="ticket-description" v-model="body" rows="4" class="input" maxlength="8000" required :disabled="saving" />
        <p class="mt-1.5 text-xs text-gray-500 dark:text-dark-300">{{ t('supportTickets.privacyHint') }}</p>
      </div>
      <TicketImagePicker ref="imagePicker" v-model="images" input-id="ticket-create-images" :disabled="saving" />
      <p v-if="error" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    </form>
    <template #footer>
      <button class="btn btn-secondary" :disabled="saving" @click="emit('close')">{{ t('common.cancel') }}</button>
      <button form="support-ticket-create" type="submit" class="btn btn-primary" :disabled="saving || !subject.trim() || !body.trim()">
        {{ saving ? t('common.loading') : t('supportTickets.create') }}
      </button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseDialog from '@/components/common/BaseDialog.vue'
import Select from '@/components/common/Select.vue'
import { createSupportTicket, ticketImageErrorKey, ticketCategories, type TicketCategory } from '@/api/supportTickets'
import TicketImagePicker from './TicketImagePicker.vue'

const emit = defineEmits<{ close: []; created: [id: number] }>()
const { t } = useI18n()
const subject = ref('')
const category = ref<TicketCategory>('api')
const categoryOptions = computed(() => ticketCategories.map(item => ({ value: item, label: t(`supportTickets.category.${item}`) })))
const body = ref('')
const images = ref<File[]>([])
const imagePicker = ref<InstanceType<typeof TicketImagePicker>>()
const error = ref('')
const saving = ref(false)
let lastPayload = ''
let lastImages: File[] | undefined
let requestKey = ''

// Reuse the key when retrying the same submission after a connection failure.
async function submit() {
  if (saving.value || !subject.value.trim() || !body.value.trim()) return
  const input = { subject: subject.value.trim(), category: category.value, body: body.value.trim() }
  const payload = JSON.stringify(input)
  if (payload !== lastPayload || images.value !== lastImages) {
    const random = globalThis.crypto.getRandomValues(new Uint8Array(16))
    requestKey = Array.from(random, byte => byte.toString(16).padStart(2, '0')).join('')
    lastPayload = payload
    lastImages = images.value
  }

  saving.value = true
  error.value = ''
  try {
    const { id } = await createSupportTicket(input, requestKey, images.value)
    emit('created', id)
  } catch (err) {
    error.value = t(ticketImageErrorKey(err, images.value) ?? 'supportTickets.createFailed')
  } finally {
    saving.value = false
  }
}
</script>
