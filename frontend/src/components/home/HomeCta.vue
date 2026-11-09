<template>
  <section
    aria-labelledby="home-cta-title"
    class="relative isolate overflow-hidden border-y border-gray-200/80 bg-white/70 dark:border-dark-800 dark:bg-dark-900/50"
  >
    <SignalField variant="ambient" :seed="25" class="absolute inset-0 -z-10" />
    <div
      class="mx-auto flex max-w-[1180px] flex-col gap-8 px-5 py-16 sm:px-8 sm:py-20 md:flex-row md:items-center md:justify-between"
    >
      <div class="max-w-xl">
        <h2
          id="home-cta-title"
          class="text-3xl font-semibold tracking-tightest text-gray-950 sm:text-4xl dark:text-white"
        >
          <HomeCaretText :text="t('ui52.home.cta.title')" />
        </h2>
        <p class="mt-3 text-sm leading-relaxed text-gray-500 sm:text-base dark:text-dark-400">
          {{ registrationOpen ? t('ui52.home.cta.description') : t('ui52.home.cta.descriptionClosed') }}
        </p>
      </div>
      <div class="flex flex-wrap gap-3">
        <router-link :to="primaryTo" class="btn btn-primary btn-lg">
          {{ isAuthenticated ? t('ui52.home.cta.console') : t('ui52.home.cta.primary') }}
          <Icon name="arrowRight" size="sm" :stroke-width="2" />
        </router-link>
        <router-link v-if="showModelPlazaEntry" to="/model-plaza" class="btn btn-secondary btn-lg">
          {{ t('ui52.home.cta.secondary') }}
        </router-link>
        <a
          v-else-if="docUrl"
          :href="docUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-secondary btn-lg"
        >
          {{ t('ui52.home.cta.docs') }}
        </a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/** 页尾行动区：主 CTA（登录/控制台）+ 模型广场或文档。 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SignalField from '@/components/brand/SignalField.vue'
import Icon from '@/components/icons/Icon.vue'
import HomeCaretText from './HomeCaretText.vue'

const props = defineProps<{
  isAuthenticated: boolean
  dashboardPath: string
  showModelPlazaEntry: boolean
  docUrl: string
  /** 是否开放自助注册：关闭时文案改为「登录」 */
  registrationOpen: boolean
}>()

const { t } = useI18n()

const primaryTo = computed(() => (props.isAuthenticated ? props.dashboardPath : '/login'))
</script>
