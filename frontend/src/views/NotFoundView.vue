<template>
  <div class="relative flex min-h-screen flex-col overflow-hidden bg-gray-50 dark:bg-dark-950">
    <!-- 信号等高线背景 -->
    <SignalField variant="ambient" :seed="404" class="absolute inset-0" />

    <!-- 顶部品牌 -->
    <header class="relative z-10 mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
      <router-link to="/" class="flex min-w-0 items-center rounded-md" :aria-label="t('ui52.publicPages.nav.home')">
        <BrandMark size="sm" show-domain />
      </router-link>
    </header>

    <main class="relative z-10 flex flex-1 items-center justify-center px-4 pb-20 pt-6">
      <div class="w-full max-w-xl text-center">
        <p class="kicker justify-center">
          <span class="signal-dot"></span>
          {{ t('ui52.publicPages.notFound.kicker') }}
        </p>

        <!-- 大号等宽 404 + ember 终端光标 -->
        <div
          class="mt-5 flex items-end justify-center font-mono text-[6.5rem] font-semibold leading-none tracking-tighter text-gray-950 dark:text-white sm:text-[9rem]"
          aria-hidden="true"
        >
          <span>404</span>
          <span
            class="mb-[0.12em] ml-[0.08em] inline-block h-[0.72em] w-[0.4em] rounded-[0.06em] bg-ember-500 animate-caret-blink motion-reduce:animate-none"
          ></span>
        </div>

        <h1 class="mt-6 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">
          {{ t('errors.pageNotFound') }}
        </h1>
        <p class="mx-auto mt-2 max-w-sm text-sm text-gray-500 dark:text-dark-400">
          {{ t('ui52.publicPages.notFound.description') }}
        </p>

        <!-- 终端回显:真实请求路径,俏皮但不造假 -->
        <div
          class="mx-auto mt-8 max-w-lg overflow-hidden rounded-xl bg-[#0c0d10] text-left shadow-pop ring-1 ring-white/5"
        >
          <div class="flex items-center gap-1.5 border-b border-white/5 px-4 py-2.5">
            <span class="h-2.5 w-2.5 rounded-full bg-white/15"></span>
            <span class="h-2.5 w-2.5 rounded-full bg-white/15"></span>
            <span class="h-2.5 w-2.5 rounded-full bg-white/15"></span>
            <span class="ml-2 font-mono text-[11px] text-white/35">~ / {{ siteName }}</span>
          </div>
          <pre
            class="whitespace-pre-wrap break-all px-4 py-4 font-mono text-[12.5px] leading-relaxed text-gray-300"
          ><span class="select-none text-white/35">$ </span><span class="text-white">curl -I </span><span class="text-gray-400">{{ requestHost }}</span><span class="text-ember-400">{{ requestPath }}</span>
<span class="text-red-400">HTTP/2 404 Not Found</span>
<span class="text-white/45">x-hint: </span><span class="text-gray-300">{{ t('ui52.publicPages.notFound.hint') }}</span></pre>
        </div>

        <!-- 操作 -->
        <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" class="btn btn-secondary" @click="goBack">
            <Icon name="arrowLeft" size="sm" />
            {{ t('ui52.publicPages.notFound.goBack') }}
          </button>
          <router-link to="/" class="btn btn-secondary">
            <Icon name="home" size="sm" />
            {{ t('ui52.publicPages.nav.home') }}
          </router-link>
          <router-link to="/dashboard" class="btn btn-ink">
            {{ t('ui52.publicPages.notFound.goDashboard') }}
            <Icon name="arrowRight" size="sm" />
          </router-link>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Icon from '@/components/icons/Icon.vue'
import BrandMark from '@/components/brand/BrandMark.vue'
import SignalField from '@/components/brand/SignalField.vue'
import { useBrand } from '@/composables/useBrand'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { siteName } = useBrand()

// 终端回显使用当前真实访问地址,不虚构域名;只取 path,避免把回调/重置链接里的 code、token 等查询参数明文展示
const requestHost = computed(() => (typeof window !== 'undefined' ? window.location.host : ''))
const requestPath = computed(() => route.path || '/')

function goBack(): void {
  router.back()
}
</script>
