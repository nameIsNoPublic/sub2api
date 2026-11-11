<template>
  <section class="card min-w-0 overflow-hidden" :aria-label="t('supportTickets.conversation')">
    <header class="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 p-4 dark:border-dark-700 sm:p-5">
      <div v-if="ticket" class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-mono text-xs text-gray-500 dark:text-dark-300">#{{ ticket.id }}</span>
          <TicketStatusBadge :status="ticket.status" />
        </div>
        <h2 class="mt-2 break-words text-lg font-semibold text-gray-950 dark:text-white">{{ ticket.subject }}</h2>
        <p class="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500 dark:text-dark-300">
          <span>{{ t(`supportTickets.category.${ticket.category}`) }}</span>
          <span v-if="admin">{{ t('supportTickets.requester', { id: ticket.user_id }) }}</span>
        </p>
      </div>
      <div class="ml-auto flex shrink-0 items-center gap-2">
        <button class="btn btn-secondary btn-sm" :disabled="loading || loadingEarlier || saving || savingKnowledge" @click="refresh++">
          {{ t('common.refresh') }}
        </button>
        <button
          type="button"
          class="btn btn-danger btn-sm px-2"
          :aria-label="t('supportTickets.collapse')"
          :title="t('supportTickets.collapse')"
          @click="emit('collapse')"
        >
          <Icon name="x" size="sm" aria-hidden="true" />
        </button>
      </div>
    </header>

    <p v-if="loading && !ticket" role="status" class="p-5 text-sm text-gray-500 dark:text-dark-300">{{ t('common.loading') }}</p>
    <p v-if="loadError" role="alert" class="p-5 text-sm text-red-600 dark:text-red-400">{{ t('supportTickets.detailFailed') }}</p>
    <template v-if="ticket">
      <div class="space-y-4 p-4 sm:p-5">
        <button v-if="ticket.next_before" class="btn btn-secondary btn-sm" :disabled="loadingEarlier || loading || saving" @click="loadEarlier">
          {{ loadingEarlier ? t('common.loading') : t('supportTickets.earlier') }}
        </button>
        <p v-if="historyError" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ t('supportTickets.detailFailed') }}</p>
        <ol class="space-y-3">
          <li v-for="event in ticket.events" :key="event.version" class="rounded-lg border border-gray-200 p-3.5 dark:border-dark-700"
            :class="event.actor_role === 'admin' ? 'bg-primary-50/50 dark:bg-primary-900/10' : 'bg-gray-50 dark:bg-dark-800/50'">
            <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div class="flex flex-wrap items-center gap-x-2">
                <span class="font-semibold text-gray-900 dark:text-white">{{ t(`supportTickets.role.${event.actor_role}`) }}</span>
                <span class="text-gray-500 dark:text-dark-300">{{ t(`supportTickets.event.${event.action}`) }}</span>
              </div>
              <time :datetime="event.created_at" class="text-gray-500 dark:text-dark-300">{{ formatDateTime(event.created_at) }}</time>
            </div>
            <p v-if="event.body" class="mt-2 whitespace-pre-wrap text-sm text-gray-800 [overflow-wrap:anywhere] dark:text-dark-100">{{ event.body }}</p>
            <div v-if="event.image_count" class="mt-3 flex flex-wrap gap-2">
              <button
                v-for="position in event.image_count"
                :key="position"
                type="button"
                class="btn btn-secondary btn-sm"
                @click="preview = { version: event.version, position }"
              >
                {{ t('supportTickets.images.view', { position }) }}
              </button>
            </div>
          </li>
        </ol>
      </div>

      <div v-if="actions.length" @paste="imagePicker?.paste($event)" class="space-y-3 border-t border-gray-200 p-4 dark:border-dark-700 sm:p-5">
        <p v-if="composerHint" class="text-sm text-gray-600 dark:text-dark-200">{{ t(composerHint) }}</p>
        <label for="ticket-reply" class="input-label">{{ t(composerLabel) }}</label>
        <!-- Drafts stay editable during background refreshes so typing keeps focus; the send buttons wait for the load. -->
        <textarea id="ticket-reply" v-model="body" rows="4" maxlength="8000" class="input" :disabled="saving || loadError" />
        <p class="text-xs text-gray-500 dark:text-dark-300">{{ t('supportTickets.privacyHint') }}</p>
        <TicketImagePicker ref="imagePicker" v-model="images" input-id="ticket-reply-images" :disabled="saving || loadError" />
        <p v-if="actionError" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ actionError }}</p>
        <div class="flex flex-wrap gap-2">
          <!-- Closing sits apart from the message actions unless it is the only one. -->
          <button
            v-for="(action, index) in actions"
            :key="action"
            class="btn"
            :class="[index === 0 ? 'btn-primary' : 'btn-secondary', { 'sm:ml-auto': action === 'close' && index > 0 }]"
            :disabled="saving || loading || loadError || actionBlocked(action)"
            @click="submitAction(action)"
          >
            {{ t(`supportTickets.action.${action}`) }}
          </button>
        </div>
      </div>
      <TicketKnowledgeEditor
        v-if="admin && ticket.status === 'closed'"
        :key="ticket.knowledge?.revision ?? 0"
        :ticket-id="id"
        :knowledge="ticket.knowledge"
        :disabled="loading || loadError"
        @refresh="refresh++"
        @saving="savingKnowledge = $event"
        @updated="ticket.knowledge = $event"
      />
    </template>
    <BaseDialog v-if="preview" :show="true" :title="t('supportTickets.images.preview')" width="wide" @close="preview = null">
      <p v-if="previewError" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ t('supportTickets.images.loadFailed') }}</p>
      <img v-else-if="previewUrl" :src="previewUrl" :alt="t('supportTickets.images.view', { position: preview.position })" class="mx-auto max-h-[70vh] max-w-full object-contain" @error="previewError = true" />
      <p v-else role="status" class="text-sm text-gray-500 dark:text-dark-300">{{ t('common.loading') }}</p>
    </BaseDialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDateTime } from '@/utils/format'
import BaseDialog from '@/components/common/BaseDialog.vue'
import Icon from '@/components/icons/Icon.vue'
import { ticketImageErrorKey, supportTicketsAPI, type TicketAction, type TicketDetail } from '@/api/supportTickets'
import TicketStatusBadge from './TicketStatusBadge.vue'
import TicketKnowledgeEditor from './TicketKnowledgeEditor.vue'
import TicketImagePicker from './TicketImagePicker.vue'

// latestVersion comes from the refreshed list and reveals updates made by the other side.
const props = defineProps<{ id: number; admin: boolean; latestVersion?: number }>()
const emit = defineEmits<{ changed: []; seen: []; collapse: [] }>()
const { t } = useI18n()
const api = supportTicketsAPI(props.admin)
const ticket = ref<TicketDetail>()
const loading = ref(false)
const loadError = ref(false)
const refresh = ref(0)
const body = ref('')
const images = ref<File[]>([])
const imagePicker = ref<InstanceType<typeof TicketImagePicker>>()
const preview = ref<{ version: number; position: number } | null>(null)
const previewUrl = ref('')
const previewError = ref(false)
const saving = ref(false)
const savingKnowledge = ref(false)
const actionError = ref('')
const loadingEarlier = ref(false)
const historyError = ref(false)
let historyRequest: AbortController | undefined

// Mirrors nextTicketStatus on the server: either side may close an open ticket or reopen a closed one.
const actions = computed<TicketAction[]>(() => {
  switch (ticket.value?.status) {
    case 'waiting_support':
    case 'waiting_user':
      return props.admin ? ['reply', 'resolve', 'close'] : ['reply', 'close']
    case 'resolved':
      return props.admin ? ['close'] : ['confirm', 'reopen']
    case 'closed':
      return ['reopen']
    default:
      return []
  }
})

// In waiting states the reply text doubles as an optional closing note.
const composerLabel = computed(() => {
  switch (ticket.value?.status) {
    case 'closed':
      return 'supportTickets.reopenReason'
    case 'resolved':
      return props.admin ? 'supportTickets.closeNote' : 'supportTickets.reopenReason'
    default:
      return 'supportTickets.replyLabel'
  }
})

const composerHint = computed(() => {
  switch (ticket.value?.status) {
    case 'closed':
      return 'supportTickets.closedHint'
    case 'resolved':
      return props.admin ? 'supportTickets.resolvedAdminHint' : 'supportTickets.confirmHint'
    default:
      return ''
  }
})

// Confirming takes no attachments and closing takes an optional note; every other action needs text.
function actionBlocked(action: TicketAction) {
  if (action === 'confirm') return images.value.length > 0
  if (action === 'close') return false
  return !body.value.trim()
}

// Refresh always starts from the latest history page and discards in-flight older pages.
watch(refresh, async (_, __, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  historyRequest?.abort()
  loading.value = true
  loadError.value = false
  historyError.value = false
  try {
    const detail = await api.detail(props.id, controller.signal)
    if (controller.signal.aborted) return
    ticket.value = detail
    // The requester's latest-page read marks the ticket as seen on the server.
    if (!props.admin) emit('seen')
  } catch {
    if (!controller.signal.aborted) loadError.value = true
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}, { immediate: true })

// A submission in progress refreshes on completion; otherwise restart the load, which aborts any older read.
watch(() => props.latestVersion, (version) => {
  if (version && ticket.value && version > ticket.value.version && !saving.value) refresh.value++
})

// Fetch private images on demand and release the blob when the preview closes.
watch(preview, async (selected, _, onCleanup) => {
  previewUrl.value = ''
  previewError.value = false
  if (!selected) return
  const controller = new AbortController()
  let objectUrl = ''
  onCleanup(() => {
    controller.abort()
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  })
  try {
    const blob = await api.image(props.id, selected.version, selected.position, controller.signal)
    if (!controller.signal.aborted) {
      objectUrl = URL.createObjectURL(blob)
      previewUrl.value = objectUrl
    }
  } catch {
    if (!controller.signal.aborted) previewError.value = true
  }
})

onBeforeUnmount(() => historyRequest?.abort())

async function loadEarlier() {
  const current = ticket.value
  if (!current?.next_before || loadingEarlier.value) return
  const controller = new AbortController()
  historyRequest = controller
  loadingEarlier.value = true
  historyError.value = false
  try {
    const older = await api.detail(props.id, controller.signal, current.next_before)
    if (controller.signal.aborted || ticket.value !== current) return
    current.events = [...older.events, ...current.events]
    current.next_before = older.next_before
  } catch {
    if (!controller.signal.aborted) historyError.value = true
  } finally {
    loadingEarlier.value = false
  }
}

async function submitAction(action: TicketAction) {
  if (!ticket.value || !actions.value.includes(action) || saving.value || loading.value || loadError.value) return
  saving.value = true
  actionError.value = ''
  try {
    await api.act(props.id, action, action === 'confirm' ? '' : body.value.trim(), ticket.value.version, action === 'confirm' ? [] : images.value)
    body.value = ''
    images.value = []
    refresh.value++
    emit('changed')
  } catch (error) {
    if ((error as { status?: number })?.status === 409) {
      actionError.value = t('supportTickets.actionConflict')
      refresh.value++
      emit('changed')
    } else {
      actionError.value = t(ticketImageErrorKey(error, images.value) ?? 'supportTickets.actionFailed')
    }
  } finally {
    saving.value = false
  }
}
</script>
