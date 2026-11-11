<template>
  <AppLayout>
    <div class="mx-auto max-w-7xl space-y-5">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">
            {{ t(admin ? 'supportTickets.adminTitle' : 'supportTickets.title') }}
          </h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-dark-300">
            {{ t(admin ? 'supportTickets.adminDescription' : 'supportTickets.description') }}
          </p>
        </div>
        <button v-if="!admin" class="btn btn-primary" @click="showCreate = true">
          <Icon name="plus" size="sm" class="mr-1.5" />{{ t('supportTickets.create') }}
        </button>
      </header>

      <div class="grid items-start gap-4 lg:grid-cols-[minmax(290px,1fr)_minmax(0,2fr)]">
        <section class="card overflow-hidden" :class="{ 'hidden lg:block': selectedId }" :aria-label="t('supportTickets.list')">
          <div class="flex items-center gap-3 border-b border-gray-200 p-3 dark:border-dark-700">
            <Select v-model="status" :options="statusOptions" :aria-label="t('supportTickets.filter')" class="min-w-0 flex-1">
              <template #selected="{ option }">
                <span class="flex min-w-0 items-center gap-2.5">
                  <span class="h-2 w-2 shrink-0 rounded-full" :class="statusDots[String(option?.value ?? '')]" aria-hidden="true"></span>
                  <span class="truncate">{{ option?.label }}</span>
                </span>
              </template>
              <template #option="{ option, selected }">
                <span class="h-2 w-2 shrink-0 rounded-full" :class="statusDots[String(option.value)]" aria-hidden="true"></span>
                <span class="select-option-label">{{ option.label }}</span>
                <Icon v-if="selected" name="check" size="sm" class="shrink-0 text-primary-600 dark:text-primary-400" :stroke-width="2.25" />
              </template>
            </Select>
            <button class="btn btn-secondary" :disabled="loading" @click="reload++">{{ t('common.refresh') }}</button>
          </div>
          <p v-if="loading" class="p-5 text-sm text-gray-500 dark:text-dark-300" role="status">{{ t('common.loading') }}</p>
          <p v-else-if="listError" class="p-5 text-sm text-red-600 dark:text-red-400" role="alert">{{ t('supportTickets.loadFailed') }}</p>
          <p v-else-if="!items.length" class="p-5 text-sm text-gray-500 dark:text-dark-300">{{ t('supportTickets.empty') }}</p>
          <ul v-else class="divide-y divide-gray-100 dark:divide-dark-700">
            <li v-for="ticket in items" :key="ticket.id">
              <RouterLink
                :to="{ path: route.path, query: { ticket: ticket.id } }"
                :aria-current="selectedId === ticket.id ? 'true' : undefined"
                class="block border-l-2 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-dark-800"
                :class="selectedId === ticket.id ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-900/20' : 'border-transparent'"
              >
                <div class="flex flex-wrap items-center justify-between gap-1.5">
                  <span class="font-mono text-xs text-gray-500 dark:text-dark-300">#{{ ticket.id }}</span>
                  <TicketStatusBadge :status="ticket.status" />
                </div>
                <p class="mt-1.5 flex items-center gap-2 text-sm text-gray-950 dark:text-white" :class="ticket.unread ? 'font-semibold' : 'font-medium'">
                  <span v-if="ticket.unread" class="signal-dot" aria-hidden="true"></span>
                  <span class="truncate">{{ ticket.subject }}</span>
                  <span v-if="ticket.unread" class="sr-only">{{ t('supportTickets.unread') }}</span>
                </p>
                <p class="mt-1 flex flex-wrap gap-x-2 text-xs text-gray-500 dark:text-dark-300">
                  <span>{{ t(`supportTickets.category.${ticket.category}`) }}</span>
                  <time :datetime="ticket.updated_at">{{ formatDateTime(ticket.updated_at) }}</time>
                </p>
              </RouterLink>
            </li>
          </ul>
          <nav v-if="!loading && !listError && total > pageSize" class="flex items-center justify-between gap-2 border-t border-gray-200 p-3 dark:border-dark-700" :aria-label="t('supportTickets.list')">
            <button class="btn btn-secondary btn-sm" :disabled="page === 1" @click="page--">{{ t('pagination.previous') }}</button>
            <span class="text-xs text-gray-500 dark:text-dark-300">{{ t('pagination.pageOf', { page, total: pages }) }}</span>
            <button class="btn btn-secondary btn-sm" :disabled="page >= pages" @click="page++">{{ t('pagination.next') }}</button>
          </nav>
        </section>

        <div v-if="selectedId" class="min-w-0">
          <TicketConversation
            :key="`${admin}:${selectedId}`"
            :admin="admin"
            :id="selectedId"
            :latest-version="items.find(item => item.id === selectedId)?.version"
            @changed="onChanged"
            @seen="onSeen"
            @collapse="router.push({ path: route.path })"
          />
        </div>
        <div v-else class="card hidden min-h-52 items-center justify-center p-6 text-sm text-gray-500 dark:text-dark-300 lg:flex">
          {{ t('supportTickets.selectTicket') }}
        </div>
      </div>
    </div>

    <TicketCreateDialog v-if="showCreate && !admin" @close="showCreate = false" @created="onCreated" />
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import Select from '@/components/common/Select.vue'
import { formatDateTime } from '@/utils/format'
import { useSupportTicketStore } from '@/stores'
import { supportTicketsAPI, ticketStatuses, type SupportTicket, type TicketStatus } from '@/api/supportTickets'
import TicketConversation from './TicketConversation.vue'
import TicketCreateDialog from './TicketCreateDialog.vue'
import TicketStatusBadge from './TicketStatusBadge.vue'

const props = defineProps<{ admin: boolean }>()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const status = ref<TicketStatus | ''>(props.admin ? 'waiting_support' : '')
const items = ref<SupportTicket[]>([])
const loading = ref(false)
const listError = ref(false)
const pageSize = 20
const page = ref(1)
const total = ref(0)
const pages = ref(1)
const reload = ref(0)
const showCreate = ref(false)
const summaries = useSupportTicketStore()

const statusOptions = computed(() => [
  { value: '', label: t('supportTickets.all') },
  ...ticketStatuses.map(item => ({ value: item, label: t(`supportTickets.status.${item}`) }))
])
// Same hues as TicketStatusBadge; "all statuses" gets a hollow dot so the labels stay aligned.
const statusDots: Record<string, string> = {
  '': 'border border-gray-300 dark:border-dark-500',
  waiting_support: 'bg-amber-500',
  waiting_user: 'bg-primary-500',
  resolved: 'bg-emerald-500',
  closed: 'bg-gray-400 dark:bg-dark-500'
}

const selectedId = computed(() => {
  const raw = route.query.ticket
  if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw)) return 0
  const id = Number(raw)
  return Number.isSafeInteger(id) ? id : 0
})

watch(status, () => { page.value = 1 })
watch(() => props.admin, (admin) => {
  status.value = admin ? 'waiting_support' : ''
  page.value = 1
})

// Cancel obsolete list reads when switching role, filters or page.
watch([() => props.admin, status, page, reload], async ([admin, filter, currentPage], _, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  loading.value = true
  listError.value = false
  try {
    const data = await supportTicketsAPI(admin).list(filter, currentPage, pageSize, controller.signal)
    if (controller.signal.aborted) return
    if (currentPage > data.pages) {
      page.value = data.pages
      return
    }
    items.value = data.items
    total.value = data.total
    pages.value = data.pages
  } catch {
    if (!controller.signal.aborted) listError.value = true
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}, { immediate: true })

// Reload when the polled summary reports a change in this scope, such as a reply from the other side.
watch(() => (props.admin ? summaries.queue : summaries.mine)?.activity, (activity, previous) => {
  if (previous !== undefined && activity !== previous) reload.value++
})

function onChanged() {
  reload.value++
  void summaries.refresh()
}

// Opening the latest page marks the ticket as read on the server; mirror it in the list and badge.
function onSeen() {
  const item = items.value.find(ticket => ticket.id === selectedId.value)
  if (item) item.unread = false
  void summaries.refresh()
}

function onCreated(id: number) {
  showCreate.value = false
  status.value = ''
  page.value = 1
  reload.value++
  void router.push({ path: '/support-tickets', query: { ticket: id } })
}
</script>
