<template>
  <section aria-labelledby="home-hero-title">
    <!-- 等高线画布只覆盖首屏文案区，不铺到路由图下方，控制画布面积 -->
    <div class="relative isolate overflow-hidden">
      <SignalField variant="hero" class="absolute inset-0 -z-20" />
      <!-- 底部渐隐到纸面，让等高线自然收束 -->
      <div
        class="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-gray-50 dark:to-dark-950"
        aria-hidden="true"
      ></div>

      <div class="mx-auto max-w-[1180px] px-5 pb-14 pt-16 sm:px-8 sm:pb-16 sm:pt-24 lg:pt-28">
        <p class="kicker">
          <span class="signal-dot" aria-hidden="true"></span>
          <span>{{ kicker }}</span>
        </p>

        <h1
          id="home-hero-title"
          class="mt-6 text-[34px] font-semibold leading-[1.06] tracking-tightest text-gray-950 min-[400px]:text-[40px] sm:text-6xl sm:leading-[1.04] lg:text-[84px] dark:text-white"
        >
          <span class="block">{{ t('ui52.home.hero.titleLine1') }}</span>
          <span class="block text-primary-600 dark:text-primary-400">
            <HomeCaretText :text="t('ui52.home.hero.titleLine2')" />
          </span>
        </h1>

        <p class="mt-6 max-w-2xl text-[15px] leading-relaxed text-gray-600 sm:text-[17px] dark:text-dark-300">
          {{ t('ui52.home.hero.description') }}
        </p>

        <HomeAccessBar class="mt-10 max-w-[700px]" :api-root="apiRoot" />

        <div class="mt-7 flex flex-wrap gap-3">
          <router-link :to="isAuthenticated ? dashboardPath : '/login'" class="btn btn-primary btn-lg">
            {{ isAuthenticated ? t('ui52.home.hero.ctaConsole') : t('ui52.home.hero.ctaStart') }}
            <Icon name="arrowRight" size="sm" :stroke-width="2" />
          </router-link>
          <router-link v-if="showModelPlazaEntry" to="/model-plaza" class="btn btn-secondary btn-lg">
            {{ t('ui52.home.hero.ctaPricing') }}
          </router-link>
          <a
            v-else-if="docUrl"
            :href="docUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-secondary btn-lg"
          >
            {{ t('ui52.home.hero.ctaDocs') }}
          </a>
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-[1180px] px-5 pb-16 sm:px-8">
      <div
        id="routing"
        tabindex="-1"
        class="scroll-mt-24 focus:outline-none"
      >
        <HomeRouteMap :hub-name="hubName" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * 首屏：信号等高线背景、kicker、超大标题（第二行靛蓝，末尾 ember 光标呼应 Logo）、
 * 接入条、主次 CTA，以及路由示意图。
 */
import { useI18n } from 'vue-i18n'
import SignalField from '@/components/brand/SignalField.vue'
import Icon from '@/components/icons/Icon.vue'
import HomeAccessBar from './HomeAccessBar.vue'
import HomeCaretText from './HomeCaretText.vue'
import HomeRouteMap from './HomeRouteMap.vue'

defineProps<{
  kicker: string
  apiRoot: string
  hubName: string
  isAuthenticated: boolean
  dashboardPath: string
  showModelPlazaEntry: boolean
  docUrl: string
}>()

const { t } = useI18n()
</script>
