<template>
  <form class="space-y-3 border-t border-gray-200 p-4 dark:border-dark-700 sm:p-5" @submit.prevent="save(true)">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="font-semibold text-gray-950 dark:text-white">{{ t('supportTickets.knowledge.title') }}</h3>
      <span class="badge" :class="knowledge?.published ? 'badge-success' : 'badge-gray'">
        {{ t(knowledge?.published ? 'supportTickets.knowledge.published' : 'supportTickets.knowledge.unpublished') }}
      </span>
    </div>
    <p class="text-sm text-gray-600 dark:text-dark-200">{{ t('supportTickets.knowledge.hint') }}</p>
    <div>
      <label for="ticket-knowledge-question" class="input-label">{{ t('supportTickets.knowledge.question') }}</label>
      <input id="ticket-knowledge-question" v-model="question" class="input" maxlength="300" :disabled="disabled || saving" required />
    </div>
    <div>
      <label for="ticket-knowledge-answer" class="input-label">{{ t('supportTickets.knowledge.answer') }}</label>
      <textarea id="ticket-knowledge-answer" v-model="answer" class="input" rows="5" maxlength="8000" :disabled="disabled || saving" required />
    </div>
    <label class="flex items-start gap-2 text-sm text-gray-700 dark:text-dark-200">
      <input v-model="reviewed" type="checkbox" class="mt-1" :disabled="disabled || saving" />
      {{ t('supportTickets.knowledge.reviewed') }}
    </label>
    <p v-if="error" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    <div class="flex flex-wrap gap-2">
      <button type="submit" class="btn btn-primary" :disabled="disabled || saving || conflict || !reviewed || !question.trim() || !answer.trim()">
        {{ t(knowledge?.published ? 'supportTickets.knowledge.update' : 'supportTickets.knowledge.publish') }}
      </button>
      <button v-if="knowledge?.published" type="button" class="btn btn-secondary" :disabled="disabled || saving || conflict" @click="save(false)">
        {{ t('supportTickets.knowledge.withdraw') }}
      </button>
      <button v-if="conflict" type="button" class="btn btn-secondary" :disabled="disabled" @click="emit('refresh')">
        {{ t('common.refresh') }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores'
import { updateTicketKnowledge, type TicketKnowledge } from '@/api/supportTickets'

const props = defineProps<{ ticketId: number; knowledge?: TicketKnowledge; disabled: boolean }>()
const emit = defineEmits<{ updated: [knowledge: TicketKnowledge]; refresh: []; saving: [busy: boolean] }>()
const { t } = useI18n()
const appStore = useAppStore()
const question = ref(props.knowledge?.question ?? '')
const answer = ref(props.knowledge?.answer ?? '')
const reviewed = ref(false)
const saving = ref(false)
const error = ref('')
const conflict = ref(false)

// The reviewed version is submitted with every edit or withdrawal.
async function save(published: boolean) {
  if (props.disabled || saving.value || conflict.value) return
  if (published && (!reviewed.value || !question.value.trim() || !answer.value.trim())) return
  saving.value = true
  emit('saving', true)
  error.value = ''
  try {
    const item = await updateTicketKnowledge(props.ticketId, {
      published,
      question: published ? question.value.trim() : '',
      answer: published ? answer.value.trim() : '',
      revision: props.knowledge?.revision ?? 0
    })
    emit('updated', item)
    appStore.showSuccess(t(published ? 'supportTickets.knowledge.saved' : 'supportTickets.knowledge.withdrawn'))
  } catch (err) {
    conflict.value = (err as { status?: number })?.status === 409
    error.value = t(conflict.value ? 'supportTickets.knowledge.conflict' : 'supportTickets.knowledge.failed')
  } finally {
    saving.value = false
    emit('saving', false)
  }
}
</script>
