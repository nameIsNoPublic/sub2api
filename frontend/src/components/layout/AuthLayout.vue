<template>
  <div class="relative flex min-h-screen bg-gray-50 text-gray-900 dark:bg-dark-950 dark:text-gray-100">
    <!-- 左栏：品牌页头 + 表单 + 页脚 -->
    <div class="relative flex min-h-screen w-full min-w-0 flex-col lg:w-[52%] xl:w-1/2">
      <!-- 纸面背景：极淡点阵，向下渐隐 -->
      <div
        class="pointer-events-none absolute inset-x-0 top-0 h-72 bg-dot-grid bg-dot-md opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)] dark:bg-dot-grid-dark"
        aria-hidden="true"
      ></div>

      <header class="relative z-10 flex h-16 items-center justify-between gap-3 px-5 sm:px-10">
        <router-link
          :to="backendModeEnabled ? '/login' : '/home'"
          class="flex min-w-0 rounded-lg transition-[opacity,visibility] duration-200"
          :class="settingsLoaded ? 'visible opacity-100' : 'invisible opacity-0'"
          :aria-label="t('ui52.auth.homeLabel', { name: siteName })"
        >
          <BrandMark size="md" />
        </router-link>

        <div class="flex shrink-0 items-center gap-1">
          <router-link
            v-if="!backendModeEnabled"
            to="/home"
            class="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200/60 hover:text-gray-950 dark:text-dark-300 dark:hover:bg-dark-800 dark:hover:text-white sm:inline-flex"
          >
            <Icon name="arrowLeft" size="sm" />
            {{ t('ui52.auth.backHome') }}
          </router-link>
          <LocaleSwitcher />
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-200/60 hover:text-gray-950 dark:text-dark-400 dark:hover:bg-dark-800 dark:hover:text-white"
            :aria-label="isDark ? t('ui52.auth.switchToLight') : t('ui52.auth.switchToDark')"
            :title="isDark ? t('ui52.auth.switchToLight') : t('ui52.auth.switchToDark')"
            @click="toggleTheme"
          >
            <Icon v-if="isDark" name="sun" size="sm" />
            <Icon v-else name="moon" size="sm" />
          </button>
        </div>
      </header>

      <main class="relative z-10 flex flex-1 items-center justify-center px-5 py-10 sm:px-10 sm:py-14">
        <div class="auth-form-enter w-full max-w-[400px]">
          <slot />

          <div v-if="$slots.footer" class="mt-8 border-t border-gray-200/80 pt-6 text-center text-sm dark:border-dark-800">
            <slot name="footer" />
          </div>
        </div>
      </main>

      <footer
        class="relative z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 pb-6 font-mono text-[11px] text-gray-400 dark:text-dark-500 sm:px-10"
      >
        <span class="min-w-0 [overflow-wrap:anywhere]">&copy; {{ currentYear }} {{ siteName }} · {{ t('ui52.auth.rights') }}</span>
        <span v-if="settingsLoaded && isDefaultBrand" class="hidden sm:inline">{{ BRAND_DEFAULTS.domain }}</span>
      </footer>
    </div>

    <!-- 右栏：墨色视觉面板（仅桌面端）。class="dark" 让面板内部始终使用深色令牌 -->
    <aside
      class="dark hidden min-h-screen flex-1 p-3 lg:block"
      :aria-label="t('ui52.auth.visual.label', { name: siteName })"
    >
      <div
        class="auth-visual-enter sticky top-3 flex h-[calc(100vh-1.5rem)] min-h-[560px] flex-col overflow-hidden rounded-2xl bg-[#0c0d10] text-gray-100 ring-1 ring-white/[0.06]"
      >
        <SignalField variant="hero" :intensity="0.45" :seed="52" class="absolute inset-0" />
        <!-- 角落柔光：靛蓝 + ember 双信号 -->
        <div
          class="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary-500/20 blur-3xl"
          aria-hidden="true"
        ></div>
        <div
          class="pointer-events-none absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-ember-500/10 blur-3xl"
          aria-hidden="true"
        ></div>

        <div class="relative flex min-h-0 flex-1 flex-col justify-between gap-8 p-9 xl:p-14">
          <p class="kicker">
            <span class="signal-dot"></span>
            {{ siteSubtitle }}
          </p>

          <div class="max-w-xl">
            <h2 class="text-[34px] font-semibold leading-[1.08] tracking-tightest text-white xl:text-[44px] 2xl:text-[52px]">
              {{ t('ui52.auth.visual.titleLine1') }}<br />
              <span class="text-dark-300">{{ t('ui52.auth.visual.titleLine2') }}</span>
            </h2>
            <p class="mt-5 max-w-md text-[15px] leading-relaxed text-dark-300">
              {{ t('ui52.auth.visual.description') }}
            </p>

            <!-- 终端片段：展示真实接入地址 -->
            <div class="mt-8 overflow-hidden rounded-xl bg-white/[0.03] ring-1 ring-white/[0.08] backdrop-blur-sm">
              <div class="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
                <span class="h-2.5 w-2.5 rounded-full bg-white/10"></span>
                <span class="h-2.5 w-2.5 rounded-full bg-white/10"></span>
                <span class="h-2.5 w-2.5 rounded-full bg-white/10"></span>
                <span class="ml-2 font-mono text-[11px] text-dark-400">{{ t('ui52.auth.visual.terminalTitle') }}</span>
              </div>
              <pre
                class="overflow-x-auto px-4 py-4 font-mono text-[12.5px] leading-6 text-dark-200"
              ><span class="text-dark-500">{{ t('ui52.auth.visual.terminalComment') }}</span>
<span class="text-primary-300">export</span> ANTHROPIC_BASE_URL=<span class="text-ember-300">"{{ apiBaseUrl }}"</span>
<span class="text-primary-300">export</span> ANTHROPIC_AUTH_TOKEN=<span class="text-ember-300">"{{ t('ui52.auth.visual.tokenPlaceholder') }}"</span>
<span class="text-dark-400">$</span> claude<span class="auth-caret ml-0.5 inline-block h-3.5 w-2 translate-y-0.5 bg-ember-400"></span></pre>
            </div>
          </div>

          <ul class="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-white/[0.06] ring-1 ring-white/[0.06]">
            <li
              v-for="(point, index) in visualPoints"
              :key="point"
              class="bg-[#0c0d10]/90 p-4"
            >
              <p class="font-mono text-[11px] text-ember-400">0{{ index + 1 }}</p>
              <p class="mt-2 text-sm font-medium text-white">
                {{ t(`ui52.auth.visual.points.${point}.title`) }}
              </p>
              <p class="mt-1 hidden text-xs leading-relaxed text-dark-400 xl:block">
                {{ t(`ui52.auth.visual.points.${point}.desc`) }}
              </p>
            </li>
          </ul>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
/**
 * 认证页外壳（登录 / 注册 / 找回密码 / OAuth 回调等共用）。
 * 桌面端左右分栏：左侧纸面表单，右侧墨色视觉面板；移动端仅保留表单单栏。
 * 对外接口：default slot（表单内容）+ footer slot（底部链接），保持不变。
 */
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores'
import { BRAND_DEFAULTS, useBrand } from '@/composables/useBrand'
import BrandMark from '@/components/brand/BrandMark.vue'
import SignalField from '@/components/brand/SignalField.vue'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import Icon from '@/components/icons/Icon.vue'

const { t } = useI18n()
const appStore = useAppStore()
const { siteName, siteSubtitle, apiBaseUrl } = useBrand()

const settingsLoaded = computed(() => appStore.publicSettingsLoaded)
const backendModeEnabled = computed(() => appStore.backendModeEnabled)
/** 仅在使用 52code 默认品牌时展示域名，自定义站点名的部署不出现 52code.ai */
const isDefaultBrand = computed(() => siteName.value === BRAND_DEFAULTS.name)
const currentYear = new Date().getFullYear()

/** 视觉面板能力要点（对应 ui52.auth.visual.points.* 文案） */
const visualPoints = ['protocol', 'routing', 'billing'] as const

// 主题切换：与首页一致，写入 localStorage('theme')
const isDark = ref(document.documentElement.classList.contains('dark'))

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

onMounted(() => {
  appStore.fetchPublicSettings()
})
</script>

<style scoped>
.auth-form-enter {
  animation: auth-form-enter 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.auth-visual-enter {
  animation: auth-visual-enter 560ms cubic-bezier(0.16, 1, 0.3, 1) 60ms both;
}

.auth-caret {
  animation: auth-caret-blink 1.1s steps(1, end) infinite;
}

@keyframes auth-form-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes auth-visual-enter {
  from {
    opacity: 0;
    transform: translateX(14px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes auth-caret-blink {
  0%,
  55% {
    opacity: 1;
  }
  56%,
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-form-enter,
  .auth-visual-enter,
  .auth-caret {
    animation: none;
  }
}
</style>
