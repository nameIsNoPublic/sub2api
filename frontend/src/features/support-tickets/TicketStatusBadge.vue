<template>
  <span class="badge whitespace-nowrap" :class="styles[status]">{{ t(`supportTickets.status.${status}`) }}</span>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { TicketStatus } from '@/api/supportTickets'

defineProps<{ status: TicketStatus }>()
const { t } = useI18n()
const styles: Record<TicketStatus, string> = {
  waiting_support: 'badge-warning',
  waiting_user: 'badge-primary',
  resolved: 'badge-success',
  closed: 'badge-gray'
}
</script>
