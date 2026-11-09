<template>
  <div class="card p-6 md:px-7">
    <div class="grid gap-5 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8">
      <header class="space-y-1.5">
        <p class="kicker">{{ t('ui52.userA.profile.securityKicker') }}</p>
        <h2 class="section-title">
          {{ t('profile.passkey.title') }}
        </h2>
        <p class="text-sm leading-6 text-gray-500 dark:text-dark-400">
          {{ t('profile.passkey.description') }}
        </p>
        <button
          v-if="enabled && supported && !showAddForm"
          type="button"
          class="btn btn-primary btn-sm !mt-4"
          :disabled="busy"
          @click="showAddForm = true"
        >
          <Icon name="plus" size="sm" />
          {{ t('profile.passkey.add') }}
        </button>
      </header>

      <div class="min-w-0">
        <div
          v-if="!enabled"
          class="mb-4 rounded-lg border border-gray-200/80 bg-gray-50/60 px-4 py-3 text-sm text-gray-500 dark:border-dark-800 dark:bg-dark-950/30 dark:text-dark-400"
        >
          {{ t('profile.passkey.featureDisabled') }}
        </div>
        <div
          v-if="enabled && !supported"
          class="mb-4 rounded-r-md border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500 dark:bg-amber-500/10 dark:text-amber-200"
        >
          {{ t('profile.passkey.unsupported') }}
        </div>
        <div>
          <form
            v-if="enabled && supported && showAddForm"
            class="mb-4 flex flex-col gap-3 rounded-xl border border-gray-200/80 bg-gray-50/60 p-4 dark:border-dark-800 dark:bg-dark-950/30"
            @submit.prevent="addPasskey"
          >
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label for="passkey-name" class="input-label">{{ t('profile.passkey.name') }}</label>
                <input
                  id="passkey-name"
                  v-model="newName"
                  class="input"
                  maxlength="100"
                  :placeholder="t('profile.passkey.namePlaceholder')"
                  autofocus
                />
              </div>
              <div>
                <label for="passkey-add-password" class="input-label">{{
                  t('profile.currentPassword')
                }}</label>
                <input
                  id="passkey-add-password"
                  v-model="newPassword"
                  type="password"
                  autocomplete="current-password"
                  class="input"
                  :placeholder="t('profile.passkey.passwordPlaceholder')"
                />
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <button type="button" class="btn btn-secondary btn-sm" :disabled="busy" @click="cancelAdd">
                {{ t('common.cancel') }}
              </button>
              <button type="submit" class="btn btn-primary btn-sm" :disabled="busy || newPassword.length === 0">
                {{ busy ? t('common.processing') : t('profile.passkey.continue') }}
              </button>
            </div>
          </form>

          <div v-if="loading" class="flex justify-center py-6">
            <div class="h-7 w-7 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
          </div>

          <div
            v-else-if="credentials.length === 0"
            class="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-dark-700 dark:text-dark-400"
          >
            {{ t('profile.passkey.empty') }}
          </div>

          <div v-else class="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200/80 dark:divide-dark-800 dark:border-dark-800">
            <div
              v-for="credential in credentials"
              :key="credential.id"
              class="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
            >
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <Icon name="key" size="sm" class="shrink-0 text-primary-600 dark:text-primary-400" />
                  <p class="truncate text-sm font-medium text-gray-950 dark:text-white">
                    {{ credential.name }}
                  </p>
                  <span
                    v-if="credential.backup"
                    class="badge badge-success"
                  >
                    {{ t('profile.passkey.synced') }}
                  </span>
                </div>
                <p class="mt-1 font-mono text-[11px] text-gray-500 dark:text-dark-400">
                  {{ t('profile.passkey.createdAt', { date: formatDate(credential.created_at) }) }}
                  <template v-if="credential.last_used_at">
                    · {{ t('profile.passkey.lastUsed', { date: formatDate(credential.last_used_at) }) }}
                  </template>
                </p>
              </div>
              <div class="flex shrink-0 gap-2">
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  :disabled="busy"
                  @click="renamePasskey(credential)"
                >
                  {{ t('common.edit') }}
                </button>
                <button
                  type="button"
                  class="btn btn-ghost btn-sm text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                  :disabled="busy"
                  @click="deletePasskey(credential)"
                >
                  {{ t('common.delete') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除确认：吊销凭据需验证当前密码，防止被窃会话静默移除 Passkey -->
    <div v-if="deleteTarget" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex min-h-full items-center justify-center p-4">
        <div class="fixed inset-0 bg-gray-950/40 backdrop-blur-[2px] transition-opacity dark:bg-black/60" @click="closeDeleteDialog"></div>
        <div
          class="relative w-full max-w-md transform rounded-2xl border border-gray-200/80 bg-white p-6 shadow-pop transition-all dark:border-dark-700 dark:bg-dark-900"
        >
          <h3 class="text-base font-semibold tracking-tight text-gray-950 dark:text-white">
            {{ t('profile.passkey.deleteTitle') }}
          </h3>
          <p class="mt-2 text-sm text-gray-500 dark:text-dark-400">
            {{ t('profile.passkey.deleteConfirm', { name: deleteTarget.name }) }}
          </p>
          <form class="mt-4 space-y-4" @submit.prevent="confirmDelete">
            <div>
              <label for="passkey-delete-password" class="input-label">{{
                t('profile.currentPassword')
              }}</label>
              <input
                id="passkey-delete-password"
                v-model="deletePassword"
                type="password"
                autocomplete="current-password"
                class="input"
                :placeholder="t('profile.passkey.passwordPlaceholder')"
                autofocus
              />
            </div>
            <div class="flex justify-end gap-3">
              <button type="button" class="btn btn-secondary" :disabled="busy" @click="closeDeleteDialog">
                {{ t('common.cancel') }}
              </button>
              <button
                type="submit"
                class="btn btn-danger"
                :disabled="busy || deletePassword.length === 0"
              >
                {{ busy ? t('common.processing') : t('common.delete') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { passkeyAPI, type PasskeyCredentialSummary } from '@/api'
import { Icon } from '@/components/icons'
import { useAppStore } from '@/stores/app'

const props = defineProps<{ enabled: boolean }>()

const { t } = useI18n()
const appStore = useAppStore()
const supported = passkeyAPI.isSupported()
const loading = ref(false)
const busy = ref(false)
const showAddForm = ref(false)
const newName = ref('')
const newPassword = ref('')
const deleteTarget = ref<PasskeyCredentialSummary | null>(null)
const deletePassword = ref('')
const credentials = ref<PasskeyCredentialSummary[]>([])

// apiClient 拦截器把错误规范化为 { code, reason, message }；
// 透出后端消息（如密码错误），否则回退到通用文案。
function extractErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { message?: string }).message
  return typeof message === 'string' && message.length > 0 ? message : fallback
}

async function loadCredentials(): Promise<void> {
  if (!props.enabled) {
    credentials.value = []
    return
  }
  loading.value = true
  try {
    credentials.value = await passkeyAPI.list()
  } catch (error) {
    // 字符串错误码在 reason 字段（code 是数字状态码）；
    // 设置变更竞态下后端仍可能返回 PASSKEY_DISABLED，静默处理
    const reason = (error as { reason?: string }).reason
    if (reason !== 'PASSKEY_DISABLED') {
      appStore.showError(t('profile.passkey.loadFailed'))
    }
  } finally {
    loading.value = false
  }
}

async function addPasskey(): Promise<void> {
  if (newPassword.value.length === 0) return
  busy.value = true
  try {
    await passkeyAPI.register(newName.value.trim(), newPassword.value)
    appStore.showSuccess(t('profile.passkey.added'))
    cancelAdd()
    await loadCredentials()
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'NotAllowedError')) {
      appStore.showError(extractErrorMessage(error, t('profile.passkey.addFailed')))
    }
  } finally {
    busy.value = false
  }
}

function cancelAdd(): void {
  showAddForm.value = false
  newName.value = ''
  newPassword.value = ''
}

async function renamePasskey(credential: PasskeyCredentialSummary): Promise<void> {
  const name = window.prompt(t('profile.passkey.renamePrompt'), credential.name)?.trim()
  if (!name || name === credential.name) return
  busy.value = true
  try {
    await passkeyAPI.rename(credential.id, name)
    credential.name = name
    appStore.showSuccess(t('profile.passkey.renamed'))
  } catch {
    appStore.showError(t('profile.passkey.renameFailed'))
  } finally {
    busy.value = false
  }
}

function deletePasskey(credential: PasskeyCredentialSummary): void {
  deleteTarget.value = credential
  deletePassword.value = ''
}

function closeDeleteDialog(): void {
  deleteTarget.value = null
  deletePassword.value = ''
}

async function confirmDelete(): Promise<void> {
  const credential = deleteTarget.value
  if (!credential || deletePassword.value.length === 0) return
  busy.value = true
  try {
    await passkeyAPI.remove(credential.id, deletePassword.value)
    credentials.value = credentials.value.filter((item) => item.id !== credential.id)
    appStore.showSuccess(t('profile.passkey.deleted'))
    closeDeleteDialog()
  } catch (error) {
    // 密码错误等失败保持对话框打开，允许重试
    appStore.showError(extractErrorMessage(error, t('profile.passkey.deleteFailed')))
  } finally {
    busy.value = false
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(value))
}

watch(
  () => props.enabled,
  () => {
    void loadCredentials()
  },
  { immediate: true }
)
</script>
