<template>
  <section class="card" :aria-label="t('supportTickets.settings.title')">
    <header class="border-b border-gray-100 px-6 py-4 dark:border-dark-800">
      <h2 class="text-base font-semibold tracking-tight text-gray-950 dark:text-white">{{ t('supportTickets.settings.title') }}</h2>
      <p class="mt-1 text-sm text-gray-500 dark:text-dark-300">{{ t('supportTickets.settings.description') }}</p>
    </header>
    <div class="space-y-5 p-6">
      <p v-if="loading" role="status" class="text-sm text-gray-500 dark:text-dark-300">{{ t('common.loading') }}</p>
      <template v-else-if="loaded">
        <div class="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <div v-for="field in fields" :key="field.key">
            <label :for="`ticket-limit-${field.key}`" class="input-label">{{ t(`supportTickets.settings.fields.${field.key}`) }}</label>
            <input
              :id="`ticket-limit-${field.key}`"
              v-model.number="form[field.key]"
              type="number"
              min="1"
              :max="field.max"
              step="1"
              required
              class="input tabular-nums"
              :disabled="saving"
            />
          </div>
        </div>
        <p class="text-xs leading-relaxed text-gray-500 dark:text-dark-300">{{ t('supportTickets.settings.hint') }}</p>
        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-dark-800">
          <p class="text-xs text-gray-500 dark:text-dark-300">{{ t('supportTickets.settings.effectiveHint') }}</p>
          <button type="button" class="btn btn-primary" :disabled="saving || !valid" @click="save">
            {{ saving ? t('common.saving') : t('supportTickets.settings.save') }}
          </button>
        </div>
      </template>
      <p v-if="error" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      <button v-if="!loading && !loaded" type="button" class="btn btn-secondary" @click="load">{{ t('common.refresh') }}</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores'
import { getTicketImageSettings, saveTicketImageSettings, type TicketImageSettings } from '@/api/supportTickets'

const { t } = useI18n()
const app = useAppStore()
const loading = ref(true)
const loaded = ref(false)
const saving = ref(false)
const error = ref('')
const form = reactive<TicketImageSettings>({ user_rpm: 0, site_rpm: 0, ticket_max_images: 0, account_max_images: 0, account_max_mib: 0, site_max_images: 0, site_max_mib: 0 })
const fields: { key: keyof TicketImageSettings; max: number }[] = [
  { key: 'user_rpm', max: 1000 },
  { key: 'site_rpm', max: 10000 },
  { key: 'ticket_max_images', max: 1000 },
  { key: 'account_max_images', max: 10000 },
  { key: 'account_max_mib', max: 102400 },
  { key: 'site_max_images', max: 1000000 },
  { key: 'site_max_mib', max: 1048576 }
]
const valid = computed(() => fields.every(field => Number.isInteger(form[field.key]) && form[field.key] >= 1 && form[field.key] <= field.max))

async function load() {
  loading.value = true
  error.value = ''
  try {
    Object.assign(form, await getTicketImageSettings())
    loaded.value = true
  } catch {
    error.value = t('supportTickets.settings.loadFailed')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!valid.value || saving.value) return
  saving.value = true
  error.value = ''
  try {
    Object.assign(form, await saveTicketImageSettings({ ...form }))
    app.showSuccess(t('supportTickets.settings.saved'))
  } catch {
    error.value = t('supportTickets.settings.saveFailed')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
