<template>
  <div :class="props.embedded ? 'space-y-4' : 'card p-6 md:px-7'">
    <div :class="props.embedded ? '' : 'grid gap-5 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8'">
      <header
        v-if="!props.embedded"
        class="space-y-1.5"
      >
        <p class="kicker">{{ t('ui52.userA.profile.securityKicker') }}</p>
        <h2 class="section-title">
          {{ t('profile.changePassword') }}
        </h2>
        <p class="text-sm leading-6 text-gray-500 dark:text-dark-400">
          {{ t('ui52.userA.profile.passwordDescription') }}
        </p>
      </header>
      <div class="min-w-0">
        <form @submit.prevent="handleChangePassword" class="space-y-4">
          <div v-if="props.embedded">
            <p class="text-sm font-semibold text-gray-950 dark:text-white">
              {{ t('profile.changePassword') }}
            </p>
          </div>
          <div>
            <label for="old_password" class="input-label">
              {{ t('profile.currentPassword') }}
            </label>
            <input
              id="old_password"
              v-model="form.old_password"
              type="password"
              required
              autocomplete="current-password"
              class="input"
            />
          </div>

          <div>
            <label for="new_password" class="input-label">
              {{ t('profile.newPassword') }}
            </label>
            <input
              id="new_password"
              v-model="form.new_password"
              type="password"
              required
              autocomplete="new-password"
              class="input"
            />
            <p class="input-hint">
              {{ t('profile.passwordHint') }}
            </p>
          </div>

          <div>
            <label for="confirm_password" class="input-label">
              {{ t('profile.confirmNewPassword') }}
            </label>
            <input
              id="confirm_password"
              v-model="form.confirm_password"
              type="password"
              required
              autocomplete="new-password"
              class="input"
            />
          </div>

          <div class="flex justify-end pt-2">
            <button type="submit" :disabled="loading" class="btn btn-primary">
              {{ loading ? t('profile.changingPassword') : t('profile.changePasswordButton') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { userAPI } from '@/api'
import { extractApiErrorMessage } from '@/utils/apiError'

const { t } = useI18n()
const appStore = useAppStore()
const props = withDefaults(defineProps<{
  embedded?: boolean
}>(), {
  embedded: false,
})

const loading = ref(false)
const form = ref({
  old_password: '',
  new_password: '',
  confirm_password: ''
})

const handleChangePassword = async () => {
  if (form.value.new_password !== form.value.confirm_password) {
    appStore.showError(t('profile.passwordsNotMatch'))
    return
  }

  if (form.value.new_password.length < 8) {
    appStore.showError(t('profile.passwordTooShort'))
    return
  }

  loading.value = true
  try {
    await userAPI.changePassword(form.value.old_password, form.value.new_password)
    form.value = { old_password: '', new_password: '', confirm_password: '' }
    appStore.showSuccess(t('profile.passwordChangeSuccess'))
  } catch (error: unknown) {
    appStore.showError(extractApiErrorMessage(error, t('profile.passwordChangeFailed')))
  } finally {
    loading.value = false
  }
}
</script>
