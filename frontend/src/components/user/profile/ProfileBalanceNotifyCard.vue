<template>
  <div class="card p-6 md:px-7">
    <div class="grid gap-5 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8">
      <header class="space-y-1.5">
        <p class="kicker">{{ t('ui52.userA.profile.notifyKicker') }}</p>
        <h2 class="section-title">
          {{ t('profile.balanceNotify.title') }}
        </h2>
        <p class="text-sm leading-6 text-gray-500 dark:text-dark-400">
          {{ t('profile.balanceNotify.description') }}
        </p>
      </header>
      <div class="min-w-0 space-y-6">
        <!-- Enable toggle -->
        <div class="flex items-center justify-between rounded-xl border border-gray-200/80 bg-gray-50/60 px-4 py-3 dark:border-dark-800 dark:bg-dark-950/30">
          <label class="input-label mb-0">{{ t('profile.balanceNotify.enabled') }}</label>
          <label class="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" v-model="notifyEnabled" @change="handleToggle" class="sr-only peer" />
            <div class="peer h-6 w-11 rounded-full bg-gray-300 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-focus-visible:ring-4 peer-focus-visible:ring-primary-500/20 dark:bg-dark-600 dark:peer-checked:bg-primary-500"></div>
          </label>
        </div>

        <template v-if="notifyEnabled">
          <!-- Custom threshold with save button -->
          <div>
            <label class="input-label">
              {{ t('profile.balanceNotify.threshold') }}
              <span class="ml-2 text-xs font-normal text-gray-400 dark:text-dark-500">{{ t('profile.balanceNotify.thresholdHint') }}</span>
            </label>
            <div class="flex items-center gap-2">
              <span class="font-mono text-gray-500 dark:text-dark-400">$</span>
              <input
                v-model.number="customThreshold"
                type="number"
                min="0"
                step="0.01"
                class="input flex-1"
                :placeholder="systemDefaultThreshold > 0 ? `${t('profile.balanceNotify.systemDefault')} $${systemDefaultThreshold}` : t('profile.balanceNotify.thresholdPlaceholder')"
              />
              <button
                @click="handleThresholdUpdate"
                :disabled="savingThreshold"
                class="btn btn-primary btn-sm whitespace-nowrap"
              >
                {{ savingThreshold ? t('common.saving') : t('common.save') }}
              </button>
            </div>
          </div>

          <!-- Email list with toggles -->
          <div>
            <label class="input-label">{{ t('profile.balanceNotify.extraEmails') }}</label>
            <p class="mb-2 text-xs text-amber-700 dark:text-amber-400">{{ t('profile.balanceNotify.extraEmailsHint') }}</p>

            <!-- Saved email entries -->
            <div v-if="emailEntries.length > 0" class="space-y-2 mb-3">
              <div v-for="(entry, idx) in emailEntries" :key="idx"
                class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200/80 bg-white px-3 py-2 dark:border-dark-800 dark:bg-dark-900">
                <div class="flex items-center gap-2 min-w-0 flex-1">
                  <label class="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" :checked="!entry.disabled" @change="handleEmailToggle(entry)" class="sr-only peer" />
                    <div class="peer h-5 w-9 rounded-full bg-gray-300 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-focus-visible:ring-4 peer-focus-visible:ring-primary-500/20 dark:bg-dark-600 dark:peer-checked:bg-primary-500"></div>
                  </label>
                  <span class="truncate font-mono text-[13px] text-gray-800 dark:text-dark-100">{{ entry.email }}</span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <template v-if="!entry.verified">
                    <!-- Inline verify flow for saved unverified emails -->
                    <template v-if="verifyingEmail === entry.email">
                      <input
                        v-model="verifyCode"
                        type="text"
                        maxlength="6"
                        class="w-20 rounded-md border border-gray-200 bg-white px-2 py-1 font-mono text-xs text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/15 dark:border-dark-700 dark:bg-dark-950 dark:text-white"
                        :placeholder="t('profile.balanceNotify.codePlaceholder')"
                      />
                      <button @click="verifySavedEmail(entry.email)" :disabled="!verifyCode || verifyCode.length !== 6 || verifyingSaved" class="text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 dark:text-primary-400 dark:hover:text-primary-300">
                        {{ t('profile.balanceNotify.verify') }}
                      </button>
                      <span v-if="verifyCountdown > 0" class="num text-xs text-gray-400 dark:text-dark-500">{{ verifyCountdown }}s</span>
                      <button v-else @click="sendCodeForSaved(entry.email)" :disabled="sendingSavedCode" class="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-50 dark:text-dark-400 dark:hover:text-white">
                        {{ t('profile.balanceNotify.resend') }}
                      </button>
                      <button @click="verifyingEmail = ''" class="text-xs text-gray-400 hover:text-gray-700 dark:text-dark-500 dark:hover:text-dark-200">
                        {{ t('common.cancel') }}
                      </button>
                    </template>
                    <template v-else>
                      <button @click="sendCodeForSaved(entry.email)" :disabled="sendingSavedCode" class="text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 dark:text-primary-400 dark:hover:text-primary-300">
                        {{ t('profile.balanceNotify.verify') }}
                      </button>
                      <span class="badge badge-warning">{{ t('profile.balanceNotify.unverified') }}</span>
                    </template>
                  </template>
                  <span v-else class="badge badge-success">{{ t('profile.balanceNotify.verified') }}</span>
                  <button @click="handleRemoveEmail(entry.email)" class="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                    {{ t('profile.balanceNotify.removeEmail') }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Pending (unverified) emails in verification flow -->
            <div v-if="pendingEmails.length > 0" class="space-y-2 mb-3">
              <div v-for="(pe, idx) in pendingEmails" :key="pe.email"
                data-testid="balance-notify-pending-row"
                class="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 dark:border-amber-500/25 dark:bg-amber-500/[0.07]">
                <span class="flex-1 truncate font-mono text-[13px] text-gray-800 dark:text-dark-100">{{ pe.email }}</span>
                <div v-if="!pe.codeSent" class="flex items-center gap-1">
                  <button @click="sendCodeFor(idx)" :disabled="pe.sending" class="text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 dark:text-primary-400 dark:hover:text-primary-300">
                    {{ t('profile.balanceNotify.sendCode') }}
                  </button>
                  <button @click="pendingEmails.splice(idx, 1)" class="ml-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                    {{ t('profile.balanceNotify.removeEmail') }}
                  </button>
                </div>
                <div v-else class="flex items-center gap-1">
                  <input
                    v-model="pe.code"
                    type="text"
                    maxlength="6"
                    class="w-20 rounded-md border border-gray-200 bg-white px-2 py-1 font-mono text-xs text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/15 dark:border-dark-700 dark:bg-dark-950 dark:text-white"
                    :placeholder="t('profile.balanceNotify.codePlaceholder')"
                  />
                  <button @click="verifyPending(idx)" :disabled="!pe.code || pe.code.length !== 6 || pe.verifying" class="text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 dark:text-primary-400 dark:hover:text-primary-300">
                    {{ t('profile.balanceNotify.verify') }}
                  </button>
                  <span v-if="pe.countdown > 0" class="num text-xs text-gray-400 dark:text-dark-500">{{ pe.countdown }}s</span>
                  <button v-else @click="sendCodeFor(idx)" :disabled="pe.sending" class="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-50 dark:text-dark-400 dark:hover:text-white">
                    {{ t('profile.balanceNotify.resend') }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Add new email input (hidden when at limit) -->
            <div v-if="canAddMore" class="flex gap-2">
              <input
                v-model="newEmail"
                type="email"
                class="input flex-1"
                :placeholder="t('profile.balanceNotify.emailPlaceholder')"
                @keyup.enter="addPendingEmail"
              />
              <button
                @click="addPendingEmail"
                :disabled="!newEmail"
                class="btn btn-secondary whitespace-nowrap"
              >
                {{ t('common.add') }}
              </button>
            </div>
            <p v-else class="text-xs text-gray-400 dark:text-dark-500">
              {{ t('profile.balanceNotify.maxEmailsReached') }}
            </p>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { userAPI } from '@/api'
import { extractApiErrorMessage } from '@/utils/apiError'
import type { NotifyEmailEntry } from '@/types'

const maxTotalEmails = 3

interface PendingEmail {
  email: string
  codeSent: boolean
  code: string
  sending: boolean
  verifying: boolean
  countdown: number
  timer: ReturnType<typeof setInterval> | null
}

const props = defineProps<{
  enabled: boolean
  threshold: number | null
  extraEmails: NotifyEmailEntry[]
  systemDefaultThreshold: number
  userEmail: string
}>()

const { t } = useI18n()
const authStore = useAuthStore()
const appStore = useAppStore()

const notifyEnabled = ref(props.enabled)
const customThreshold = ref<number | null>(props.threshold)
const emailEntries = ref<NotifyEmailEntry[]>([...props.extraEmails])
const pendingEmails = ref<PendingEmail[]>([])
const newEmail = ref('')
const savingThreshold = ref(false)

// State for verifying saved unverified emails
const verifyingEmail = ref('')
const verifyCode = ref('')
const verifyingSaved = ref(false)
const sendingSavedCode = ref(false)
const verifyCountdown = ref(0)
let verifyTimer: ReturnType<typeof setInterval> | null = null
let disposed = false

const canAddMore = computed(() => {
  return emailEntries.value.length + pendingEmails.value.length < maxTotalEmails
})

watch(() => props.enabled, (val) => { notifyEnabled.value = val })
watch(() => props.threshold, (val) => { customThreshold.value = val })
watch(() => props.extraEmails, (val) => { emailEntries.value = [...val] })

// When list is empty on mount, pre-fill the add input with user's email
onMounted(() => {
  if (emailEntries.value.length === 0 && props.userEmail) {
    newEmail.value = props.userEmail
  }
})

onUnmounted(() => {
  disposed = true
  for (const pe of pendingEmails.value) {
    if (pe.timer) clearInterval(pe.timer)
  }
  if (verifyTimer) clearInterval(verifyTimer)
})

const handleToggle = async () => {
  try {
    const updated = await userAPI.updateProfile({ balance_notify_enabled: notifyEnabled.value })
    authStore.user = updated
  } catch (err: unknown) {
    appStore.showError(extractApiErrorMessage(err, t('common.error')))
    notifyEnabled.value = !notifyEnabled.value
  }
}

const handleThresholdUpdate = async () => {
  savingThreshold.value = true
  try {
    const threshold = customThreshold.value && customThreshold.value > 0 ? customThreshold.value : 0
    const updated = await userAPI.updateProfile({ balance_notify_threshold: threshold })
    authStore.user = updated
    appStore.showSuccess(t('common.saved'))
  } catch (err: unknown) {
    appStore.showError(extractApiErrorMessage(err, t('common.error')))
  } finally {
    savingThreshold.value = false
  }
}

async function handleEmailToggle(entry: NotifyEmailEntry) {
  const newDisabled = !entry.disabled
  try {
    const updated = await userAPI.toggleNotifyEmail(entry.email, newDisabled)
    authStore.user = updated
    emailEntries.value = [...updated.balance_notify_extra_emails]
  } catch (err: unknown) {
    appStore.showError(extractApiErrorMessage(err, t('common.error')))
  }
}

function addPendingEmail() {
  const email = newEmail.value.trim()
  if (!email) return
  // Check duplicates
  const isDuplicate = emailEntries.value.some(e => e.email.toLowerCase() === email.toLowerCase())
    || pendingEmails.value.some(p => p.email.toLowerCase() === email.toLowerCase())
  if (isDuplicate) {
    appStore.showError(t('profile.balanceNotify.emailDuplicate'))
    return
  }
  pendingEmails.value.push({ email, codeSent: false, code: '', sending: false, verifying: false, countdown: 0, timer: null })
  newEmail.value = ''
}

async function sendCodeFor(idx: number) {
  const pe = pendingEmails.value[idx]
  if (!pe) return
  pe.sending = true
  try {
    await userAPI.sendNotifyEmailCode(pe.email)
    if (disposed || !pendingEmails.value.includes(pe)) return
    pe.codeSent = true
    pe.countdown = 60
    pe.timer = setInterval(() => {
      pe.countdown--
      if (pe.countdown <= 0 && pe.timer) {
        clearInterval(pe.timer)
        pe.timer = null
      }
    }, 1000)
    appStore.showSuccess(t('profile.balanceNotify.codeSent'))
  } catch (err: unknown) {
    appStore.showError(extractApiErrorMessage(err, t('common.error')))
  } finally {
    pe.sending = false
  }
}

async function verifyPending(idx: number) {
  const pe = pendingEmails.value[idx]
  if (!pe || !pe.code || pe.code.length !== 6) return
  pe.verifying = true
  try {
    await userAPI.verifyNotifyEmail(pe.email, pe.code)
    if (pe.timer) clearInterval(pe.timer)
    pendingEmails.value = pendingEmails.value.filter(entry => entry !== pe)
    appStore.showSuccess(t('profile.balanceNotify.verifySuccess'))
    const updated = await userAPI.getProfile()
    authStore.user = updated
    emailEntries.value = [...updated.balance_notify_extra_emails]
  } catch (err: unknown) {
    appStore.showError(extractApiErrorMessage(err, t('common.error')))
  } finally {
    pe.verifying = false
  }
}

const handleRemoveEmail = async (email: string) => {
  try {
    await userAPI.removeNotifyEmail(email)
    appStore.showSuccess(t('profile.balanceNotify.removeSuccess'))
    const updated = await userAPI.getProfile()
    authStore.user = updated
    emailEntries.value = [...updated.balance_notify_extra_emails]
  } catch (err: unknown) {
    appStore.showError(extractApiErrorMessage(err, t('common.error')))
  }
}

// Verify saved unverified emails
async function sendCodeForSaved(email: string) {
  sendingSavedCode.value = true
  try {
    await userAPI.sendNotifyEmailCode(email)
    if (disposed) return
    verifyingEmail.value = email
    verifyCode.value = ''
    verifyCountdown.value = 60
    if (verifyTimer) clearInterval(verifyTimer)
    verifyTimer = setInterval(() => {
      verifyCountdown.value--
      if (verifyCountdown.value <= 0 && verifyTimer) {
        clearInterval(verifyTimer)
        verifyTimer = null
      }
    }, 1000)
    appStore.showSuccess(t('profile.balanceNotify.codeSent'))
  } catch (err: unknown) {
    appStore.showError(extractApiErrorMessage(err, t('common.error')))
  } finally {
    sendingSavedCode.value = false
  }
}

async function verifySavedEmail(email: string) {
  if (!verifyCode.value || verifyCode.value.length !== 6) return
  verifyingSaved.value = true
  try {
    await userAPI.verifyNotifyEmail(email, verifyCode.value)
    verifyingEmail.value = ''
    verifyCode.value = ''
    if (verifyTimer) { clearInterval(verifyTimer); verifyTimer = null }
    appStore.showSuccess(t('profile.balanceNotify.verifySuccess'))
    const updated = await userAPI.getProfile()
    authStore.user = updated
    emailEntries.value = [...updated.balance_notify_extra_emails]
  } catch (err: unknown) {
    appStore.showError(extractApiErrorMessage(err, t('common.error')))
  } finally {
    verifyingSaved.value = false
  }
}
</script>
