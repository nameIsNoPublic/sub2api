<template>
  <div class="space-y-5">
    <section
      data-testid="profile-overview-hero"
      class="card relative isolate overflow-hidden"
    >
      <div
        class="pointer-events-none absolute inset-y-0 right-0 -z-10 w-2/3 bg-dot-grid bg-dot-md opacity-80 [mask-image:linear-gradient(100deg,transparent,#000_70%)] dark:bg-dot-grid-dark"
        aria-hidden="true"
      ></div>
      <div class="px-6 pb-5 pt-6 md:px-7">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div class="relative shrink-0">
            <div
              class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gray-950 font-mono text-2xl font-semibold text-white ring-1 ring-black/5 dark:bg-white dark:text-gray-950"
            >
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                :alt="displayName"
                class="h-full w-full object-cover"
              >
              <span v-else>{{ avatarInitial }}</span>
            </div>
            <span
              v-if="user?.status === 'active'"
              class="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-dark-900"
              aria-hidden="true"
            ></span>
          </div>

          <div class="min-w-0 flex-1 space-y-2">
            <p class="kicker"><span class="signal-dot"></span>{{ t('ui52.userA.profile.overviewKicker') }}</p>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="truncate text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">
                {{ displayName }}
              </h2>
              <span :class="['badge', user?.role === 'admin' ? 'badge-primary' : 'badge-gray']">
                {{ user?.role === 'admin' ? t('profile.administrator') : t('profile.user') }}
              </span>
              <span
                :class="['badge', user?.status === 'active' ? 'badge-success' : 'badge-danger']"
              >
                {{
                  user?.status === 'active'
                    ? t('common.active')
                    : t('common.disabled')
                }}
              </span>
            </div>

            <div class="space-y-2">
              <p class="truncate font-mono text-[13px] text-gray-600 dark:text-dark-300">
                {{ primaryEmailDisplay }}
              </p>
              <div
                v-if="sourceHints.length"
                class="flex flex-wrap gap-1.5"
              >
                <span
                  v-for="hint in sourceHints"
                  :key="hint.key"
                  class="chip"
                >
                  <Icon name="link" size="xs" />
                  {{ hint.text }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 border-t border-gray-100 sm:grid-cols-3 dark:border-dark-800">
        <div
          data-testid="profile-overview-metric-balance"
          class="px-6 py-4 md:px-7"
        >
          <p class="kicker">
            {{ t('profile.accountBalance') }}
          </p>
          <p class="num mt-1.5 text-xl font-semibold text-gray-950 dark:text-white">
            {{ formatCurrency(user?.balance || 0) }}
          </p>
        </div>
        <div
          data-testid="profile-overview-metric-concurrency"
          class="border-t border-gray-100 px-6 py-4 sm:border-l sm:border-t-0 md:px-7 dark:border-dark-800"
        >
          <p class="kicker">
            {{ t('profile.concurrencyLimit') }}
          </p>
          <p class="num mt-1.5 text-xl font-semibold text-gray-950 dark:text-white">
            {{ user?.concurrency || 0 }}
          </p>
        </div>
        <div
          data-testid="profile-overview-metric-member-since"
          class="border-t border-gray-100 px-6 py-4 sm:border-l sm:border-t-0 md:px-7 dark:border-dark-800"
        >
          <p class="kicker">
            {{ t('profile.memberSince') }}
          </p>
          <p class="num mt-1.5 text-xl font-semibold text-gray-950 dark:text-white">
            {{ memberSinceLabel }}
          </p>
        </div>
      </div>
    </section>

    <div class="space-y-5">
      <div data-testid="profile-main-column" class="space-y-5">
        <section
          data-testid="profile-basics-panel"
          class="card p-6 md:px-7"
        >
          <div class="grid gap-5 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8">
            <header class="space-y-1.5">
              <p class="kicker">{{ t('ui52.userA.profile.basicsKicker') }}</p>
              <h3 class="section-title">
                {{ t('profile.basicsTitle') }}
              </h3>
              <p class="text-sm leading-6 text-gray-500 dark:text-dark-400">
                {{ t('profile.basicsDescription') }}
              </p>
            </header>

            <div class="grid gap-4 lg:grid-cols-2">
              <div class="rounded-xl border border-gray-200/80 bg-gray-50/60 p-5 dark:border-dark-800 dark:bg-dark-950/30">
                <ProfileAvatarCard
                  :user="user"
                  embedded
                />
              </div>

              <div class="rounded-xl border border-gray-200/80 bg-gray-50/60 p-5 dark:border-dark-800 dark:bg-dark-950/30">
                <ProfileEditForm
                  :initial-username="user?.username || ''"
                  embedded
                />
              </div>
            </div>
          </div>
        </section>

        <section
          data-testid="profile-auth-bindings-panel"
          class="card p-6 md:px-7"
        >
          <ProfileIdentityBindingsSection
            :user="user"
            :linuxdo-enabled="linuxdoEnabled"
            :dingtalk-enabled="dingtalkEnabled"
            :oidc-enabled="oidcEnabled"
            :oidc-provider-name="oidcProviderName"
            :wechat-enabled="wechatEnabled"
            :wechat-open-enabled="wechatOpenEnabled"
            :wechat-mp-enabled="wechatMpEnabled"
            embedded
            compact
          />
        </section>
      </div>

      <div data-testid="profile-side-column" class="space-y-5">
        <section
          v-if="sourceHints.length"
          class="card p-6 md:px-7"
        >
          <div class="grid gap-5 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8">
            <header class="space-y-1.5">
              <p class="kicker">{{ t('ui52.userA.profile.sourcesKicker') }}</p>
              <h3 class="section-title">
                {{ t('profile.linkedProfileSources') }}
              </h3>
              <p class="text-sm leading-6 text-gray-500 dark:text-dark-400">
                {{ t('profile.linkedProfileSourcesDescription') }}
              </p>
            </header>

            <div class="grid content-start gap-2">
              <div
                v-for="hint in sourceHints"
                :key="hint.key"
                class="flex items-start gap-3 rounded-lg border border-gray-200/80 bg-gray-50/60 px-4 py-3 text-sm text-gray-700 dark:border-dark-800 dark:bg-dark-950/30 dark:text-dark-200"
              >
                <Icon name="link" size="sm" class="mt-0.5 text-gray-400 dark:text-dark-500" />
                <span>{{ hint.text }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import ProfileAvatarCard from '@/components/user/profile/ProfileAvatarCard.vue'
import ProfileEditForm from '@/components/user/profile/ProfileEditForm.vue'
import ProfileIdentityBindingsSection from '@/components/user/profile/ProfileIdentityBindingsSection.vue'
import type { User, UserAuthBindingStatus, UserAuthProvider, UserProfileSourceContext } from '@/types'

const props = withDefaults(defineProps<{
  user: User | null
  linuxdoEnabled?: boolean
  dingtalkEnabled?: boolean
  oidcEnabled?: boolean
  oidcProviderName?: string
  wechatEnabled?: boolean
  wechatOpenEnabled?: boolean
  wechatMpEnabled?: boolean
}>(), {
  linuxdoEnabled: false,
  dingtalkEnabled: false,
  oidcEnabled: false,
  oidcProviderName: 'OIDC',
  wechatEnabled: false,
  wechatOpenEnabled: undefined,
  wechatMpEnabled: undefined,
})

const { t } = useI18n()

function normalizeBindingStatus(binding: boolean | UserAuthBindingStatus | undefined): boolean | null {
  if (typeof binding === 'boolean') {
    return binding
  }
  if (!binding) {
    return null
  }
  if (typeof binding.bound === 'boolean') {
    return binding.bound
  }
  return Boolean(binding.provider_subject || binding.issuer || binding.provider_key)
}

function isEmailBound(user: User | null | undefined): boolean {
  if (typeof user?.email_bound === 'boolean') {
    return user.email_bound
  }

  const nested = user?.auth_bindings?.email ?? user?.identity_bindings?.email
  const normalized = normalizeBindingStatus(nested)
  return normalized ?? false
}

const avatarUrl = computed(() => props.user?.avatar_url?.trim() || '')
const displayName = computed(() => props.user?.username?.trim() || props.user?.email?.trim() || t('profile.user'))
const primaryEmailDisplay = computed(() => {
  const email = props.user?.email?.trim() || ''
  if (!email) {
    return ''
  }
  if (email.endsWith('.invalid') && !isEmailBound(props.user)) {
    return ''
  }
  return email
})
const avatarInitial = computed(() => displayName.value.charAt(0).toUpperCase() || 'U')
const memberSinceLabel = computed(() => {
  const raw = props.user?.created_at?.trim()
  if (!raw) {
    return '-'
  }

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
  }).format(date)
})

const providerLabels = computed<Record<UserAuthProvider, string>>(() => ({
  email: t('profile.authBindings.providers.email'),
  linuxdo: t('profile.authBindings.providers.linuxdo'),
  dingtalk: t('profile.authBindings.providers.dingtalk'),
  oidc: t('profile.authBindings.providers.oidc', { providerName: props.oidcProviderName }),
  wechat: t('profile.authBindings.providers.wechat'),
  github: 'GitHub',
  google: 'Google'
}))

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`
}

function normalizeProvider(value: string): UserAuthProvider | null {
  const normalized = value.trim().toLowerCase()
  if (
    normalized === 'email' ||
    normalized === 'linuxdo' ||
    normalized === 'dingtalk' ||
    normalized === 'wechat' ||
    normalized === 'github' ||
    normalized === 'google'
  ) {
    return normalized
  }
  if (normalized === 'oidc' || normalized.startsWith('oidc:') || normalized.startsWith('oidc/')) {
    return 'oidc'
  }
  return null
}

function readObjectString(source: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

function resolveThirdPartySource(
  rawSource: string | UserProfileSourceContext | null | undefined
): { provider: UserAuthProvider; label: string } | null {
  if (!rawSource) {
    return null
  }

  if (typeof rawSource === 'string') {
    const provider = normalizeProvider(rawSource)
    if (!provider || provider === 'email') {
      return null
    }
    return {
      provider,
      label: providerLabels.value[provider]
    }
  }

  const sourceRecord = rawSource as Record<string, unknown>
  const provider = normalizeProvider(
    readObjectString(sourceRecord, 'provider', 'source', 'provider_type', 'auth_provider')
  )
  if (!provider || provider === 'email') {
    return null
  }

  const explicitLabel = readObjectString(
    sourceRecord,
    'provider_label',
    'label',
    'provider_name',
    'providerName'
  )

  return {
    provider,
    label: explicitLabel || providerLabels.value[provider]
  }
}

const sourceHints = computed(() => {
  const currentUser = props.user
  if (!currentUser) {
    return []
  }

  const hints: Array<{ key: string; text: string }> = []
  const avatarSource = resolveThirdPartySource(
    currentUser.profile_sources?.avatar ?? currentUser.avatar_source
  )
  const usernameSource = resolveThirdPartySource(
    currentUser.profile_sources?.username ??
      currentUser.profile_sources?.display_name ??
      currentUser.profile_sources?.nickname ??
      currentUser.display_name_source ??
      currentUser.username_source ??
      currentUser.nickname_source
  )

  if (avatarSource) {
    hints.push({
      key: 'avatar',
      text: t('profile.authBindings.source.avatar', { providerName: avatarSource.label })
    })
  }

  if (usernameSource) {
    hints.push({
      key: 'username',
      text: t('profile.authBindings.source.username', { providerName: usernameSource.label })
    })
  }

  return hints
})
</script>
