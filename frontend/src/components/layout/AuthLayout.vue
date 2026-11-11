<template>
  <!-- DOM 中表单在前（键盘 / 读屏优先到达表单），桌面端用 flex-row-reverse 把视觉面板放到左侧 -->
  <div class="relative flex min-h-screen bg-gray-50 text-gray-900 dark:bg-dark-950 dark:text-gray-100 lg:flex-row-reverse">
    <!-- 表单栏（桌面端位于右侧）：页头 + 表单卡片 + 页脚 -->
    <div class="relative flex min-h-screen w-full min-w-0 flex-col overflow-hidden lg:w-[46%] xl:w-[42%]">
      <!-- 纸面装饰：以表单为中心渐隐的细网格 + 同心圆环 + 靛蓝 / ember 双柔光 -->
      <div class="auth-paper pointer-events-none absolute inset-0" aria-hidden="true">
        <div class="auth-paper__grid absolute inset-0"></div>
        <div class="auth-paper__rings absolute"></div>
        <div class="auth-paper__dots absolute"></div>
        <div class="absolute -right-24 top-16 h-72 w-72 rounded-full bg-primary-500/[0.07] blur-3xl dark:bg-primary-500/10"></div>
        <div class="absolute -left-20 bottom-10 h-64 w-64 rounded-full bg-ember-500/[0.06] blur-3xl dark:bg-ember-500/[0.07]"></div>
      </div>

      <header class="relative z-10 flex h-16 items-center justify-between gap-3 px-5 sm:px-10 lg:justify-end">
        <!-- 桌面端品牌标识在左侧视觉面板中，这里只在移动端显示 -->
        <router-link
          :to="backendModeEnabled ? '/login' : '/home'"
          class="flex min-w-0 rounded-lg transition-[opacity,visibility] duration-200 lg:hidden"
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

      <main class="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-10 sm:py-12">
        <!-- 表单卡片：纸面纹理之上的白色实体，深色模式为 dark-900 -->
        <div
          class="auth-form-enter w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-[0_1px_0_rgba(23,24,28,0.04),0_24px_48px_-24px_rgba(23,24,28,0.18)] ring-1 ring-gray-200/80 dark:bg-dark-900 dark:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.6)] dark:ring-dark-800 sm:p-9"
        >
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

    <!-- 视觉面板（仅桌面端，位于左侧）。class="dark" 让面板内部始终使用深色令牌 -->
    <aside
      class="dark hidden min-h-screen min-w-0 flex-1 p-3 lg:block"
      :aria-label="t('ui52.auth.visual.label', { name: siteName })"
    >
      <div
        class="auth-visual-enter sticky top-3 flex h-[calc(100vh-1.5rem)] min-h-[560px] flex-col overflow-hidden rounded-2xl bg-[#0c0d10] text-gray-100 ring-1 ring-white/[0.06]"
      >
        <!-- 漂移柔光：靛蓝 / 紫 / ember 三团光晕缓慢游动（放在等高线下层） -->
        <div class="pointer-events-none absolute inset-0" aria-hidden="true">
          <div class="auth-aurora auth-aurora--indigo absolute -right-28 -top-28 h-96 w-96 rounded-full bg-primary-500/25 blur-3xl"></div>
          <div class="auth-aurora auth-aurora--violet absolute left-1/3 top-1/3 h-80 w-80 rounded-full bg-violet-500/[0.12] blur-3xl"></div>
          <div class="auth-aurora auth-aurora--ember absolute -bottom-32 left-6 h-80 w-80 rounded-full bg-ember-500/[0.14] blur-3xl"></div>
        </div>
        <SignalField variant="hero" :intensity="0.85" :seed="52" class="absolute inset-0" />

        <div class="relative flex min-h-0 flex-1 flex-col justify-between gap-8 p-9 xl:p-14">
          <!-- 品牌标识：桌面端放在面板左上角 -->
          <router-link
            :to="backendModeEnabled ? '/login' : '/home'"
            class="flex w-fit min-w-0 max-w-full rounded-lg transition-[opacity,visibility] duration-200"
            :class="settingsLoaded ? 'visible opacity-100' : 'invisible opacity-0'"
            :aria-label="t('ui52.auth.homeLabel', { name: siteName })"
          >
            <BrandMark size="md" :show-domain="isDefaultBrand" />
          </router-link>

          <div class="max-w-xl">
            <p class="kicker mb-6">
              <span class="signal-dot"></span>
              {{ siteSubtitle }}
            </p>
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
              <!-- 逐字打出命令；读屏直接读取完整文本（aria-label），打字过程对读屏隐藏 -->
              <pre
                class="min-h-[124px] overflow-x-auto px-4 py-4 font-mono text-[12.5px] leading-6 text-dark-200"
                :aria-label="terminalPlainText"
              ><span aria-hidden="true"><template v-for="(line, lineIndex) in typedTerminalLines" :key="lineIndex"><template v-if="lineIndex > 0">{{ '\n' }}</template><span v-for="(seg, segIndex) in line" :key="segIndex" :class="seg.cls">{{ seg.text }}</span><span v-if="lineIndex === typedTerminalLines.length - 1" class="auth-caret ml-0.5 inline-block h-3.5 w-2 translate-y-0.5 bg-ember-400"></span></template></span></pre>
            </div>
          </div>

          <ul class="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-white/[0.06] ring-1 ring-white/[0.06]">
            <li
              v-for="(point, index) in visualPoints"
              :key="point"
              class="relative overflow-hidden bg-[#0c0d10]/90 p-4"
            >
              <!-- 信号光束：依次扫过 01 → 02 → 03，模拟一个请求流经各环节 -->
              <span
                class="auth-beam pointer-events-none absolute inset-x-0 top-0 h-px"
                :style="{ animationDelay: `${index * 1.4}s` }"
                aria-hidden="true"
              ></span>
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
 * 桌面端左右分栏：左侧墨色视觉面板（含品牌标识），右侧纸面表单卡片；移动端仅保留表单单栏。
 * 对外接口：default slot（表单内容）+ footer slot（底部链接），保持不变。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
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

/* ---------- 终端打字效果 ---------- */

interface TerminalSegment {
  text: string
  cls?: string
}

/** 终端内容：按行、按着色片段描述，接入地址取真实值 */
const terminalLines = computed<TerminalSegment[][]>(() => [
  [{ text: t('ui52.auth.visual.terminalComment'), cls: 'text-dark-500' }],
  [
    { text: 'export', cls: 'text-primary-300' },
    { text: ' ANTHROPIC_BASE_URL=' },
    { text: `"${apiBaseUrl.value}"`, cls: 'text-ember-300' }
  ],
  [
    { text: 'export', cls: 'text-primary-300' },
    { text: ' ANTHROPIC_AUTH_TOKEN=' },
    { text: `"${t('ui52.auth.visual.tokenPlaceholder')}"`, cls: 'text-ember-300' }
  ],
  [{ text: '$', cls: 'text-dark-400' }, { text: ' claude' }]
])

/** 完整纯文本，供读屏使用 */
const terminalPlainText = computed(() =>
  terminalLines.value.map((line) => line.map((seg) => seg.text).join('')).join('\n')
)

/** 每行结束位置的累计字符数（行尾换行按 1 个字符计，在此处停顿） */
const lineEndOffsets = computed(() => {
  let acc = 0
  return terminalLines.value.map((line) => (acc += line.reduce((n, seg) => n + seg.text.length, 0) + 1))
})

const totalTerminalChars = computed(() => lineEndOffsets.value[lineEndOffsets.value.length - 1] ?? 0)

const typedChars = ref(0)
const typingDone = ref(false)

/** 按已打出的字符数截取各行；打完后（或语言 / 地址变化后）直接显示全文 */
const typedTerminalLines = computed<TerminalSegment[][]>(() => {
  if (typingDone.value) return terminalLines.value
  let remaining = typedChars.value
  const out: TerminalSegment[][] = []
  for (const line of terminalLines.value) {
    if (remaining <= 0) break
    const visible: TerminalSegment[] = []
    for (const seg of line) {
      if (remaining <= 0) break
      const take = Math.min(seg.text.length, remaining)
      visible.push({ text: seg.text.slice(0, take), cls: seg.cls })
      remaining -= take
    }
    out.push(visible)
    remaining -= 1 // 行尾换行
  }
  return out.length ? out : [[{ text: '' }]]
})

let typingTimer: ReturnType<typeof setTimeout> | null = null

function stopTyping() {
  if (typingTimer) {
    clearTimeout(typingTimer)
    typingTimer = null
  }
}

/** 逐字推进：普通字符约 24ms，换行处停顿 320ms，模拟手动输入 */
function typeNext() {
  if (typedChars.value >= totalTerminalChars.value) {
    typingDone.value = true
    typingTimer = null
    return
  }
  typedChars.value += 1
  const atLineBreak = lineEndOffsets.value.includes(typedChars.value)
  typingTimer = setTimeout(typeNext, atLineBreak ? 320 : 24)
}

function startTyping() {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  // 视觉面板只在桌面端显示；减少动态效果或移动端直接显示全文
  const panelVisible = window.matchMedia?.('(min-width: 1024px)').matches ?? true
  if (reduceMotion || !panelVisible) {
    typingDone.value = true
    return
  }
  // 等面板入场动画结束后再开始打字
  typingTimer = setTimeout(typeNext, 650)
}

onMounted(() => {
  appStore.fetchPublicSettings()
  startTyping()
})

onBeforeUnmount(stopTyping)
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

/* ===== 视觉面板动效 ===== */

/* 漂移柔光：只动 transform（合成层），模糊滤镜本身不重算 */
.auth-aurora {
  will-change: transform;
}

.auth-aurora--indigo {
  animation: auth-aurora-a 22s ease-in-out infinite alternate;
}

.auth-aurora--violet {
  animation: auth-aurora-b 26s ease-in-out infinite alternate;
}

.auth-aurora--ember {
  animation: auth-aurora-c 18s ease-in-out infinite alternate;
}

@keyframes auth-aurora-a {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(-90px, 70px, 0) scale(1.12);
  }
  100% {
    transform: translate3d(-30px, 150px, 0) scale(0.94);
  }
}

@keyframes auth-aurora-b {
  0% {
    transform: translate3d(0, 0, 0) scale(0.9);
    opacity: 0.6;
  }
  50% {
    transform: translate3d(120px, -80px, 0) scale(1.15);
    opacity: 1;
  }
  100% {
    transform: translate3d(-80px, 60px, 0) scale(1);
    opacity: 0.7;
  }
}

@keyframes auth-aurora-c {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(140px, -60px, 0) scale(1.1);
  }
  100% {
    transform: translate3d(60px, -130px, 0) scale(0.92);
  }
}

/* 信号光束：一道 ember 细光从左到右扫过卡片顶边，三张卡片依次错开 1.4s */
.auth-beam {
  background: linear-gradient(90deg, transparent, rgba(251, 139, 60, 0.9) 50%, transparent);
  transform: translateX(-100%);
  opacity: 0;
  animation: auth-beam 4.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes auth-beam {
  0% {
    transform: translateX(-100%);
    opacity: 0;
  }
  8% {
    opacity: 1;
  }
  30% {
    transform: translateX(100%);
    opacity: 1;
  }
  31%,
  100% {
    transform: translateX(100%);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-aurora,
  .auth-beam {
    animation: none;
  }

  .auth-beam {
    opacity: 0;
  }
}

/* ===== 表单栏纸面装饰（参考 dev-uiux 首屏的环形 + 点阵 + 柔光，配色换成 52code） ===== */

/* 细网格：以表单为中心径向渐隐，边缘几乎不可见 */
.auth-paper__grid {
  background-image:
    linear-gradient(to right, rgba(23, 24, 28, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(23, 24, 28, 0.05) 1px, transparent 1px);
  background-size: 44px 44px;
  background-position: center center;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 0%, rgba(0, 0, 0, 0.35) 55%, transparent 85%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 0%, rgba(0, 0, 0, 0.35) 55%, transparent 85%);
}

/* 同心细环：右上角溢出栏外，1px 等距圆线（呼应左侧等高线），向外径向渐隐 */
.auth-paper__rings {
  top: -340px;
  right: -340px;
  width: 760px;
  height: 760px;
  border-radius: 9999px;
  background: repeating-radial-gradient(
    circle at center,
    transparent 0 33px,
    rgba(91, 71, 230, 0.16) 33px 34px
  );
  mask-image: radial-gradient(circle at center, #000 0%, #000 30%, transparent 70%);
  -webkit-mask-image: radial-gradient(circle at center, #000 0%, #000 30%, transparent 70%);
}

/* 点阵小块：左下角，向右上渐隐 */
.auth-paper__dots {
  left: 8%;
  bottom: 12%;
  width: 150px;
  height: 150px;
  background-image: radial-gradient(rgba(91, 71, 230, 0.32) 1.5px, transparent 1.5px);
  background-size: 13px 13px;
  mask-image: linear-gradient(45deg, #000, transparent 75%);
  -webkit-mask-image: linear-gradient(45deg, #000, transparent 75%);
  opacity: 0.55;
}

.dark .auth-paper__grid {
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
}

.dark .auth-paper__rings {
  background: repeating-radial-gradient(
    circle at center,
    transparent 0 33px,
    rgba(150, 136, 248, 0.14) 33px 34px
  );
}

.dark .auth-paper__dots {
  background-image: radial-gradient(rgba(150, 136, 248, 0.4) 1.5px, transparent 1.5px);
  opacity: 0.4;
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
    transform: translateX(-14px);
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
