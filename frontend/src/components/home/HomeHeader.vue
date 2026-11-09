<template>
  <header
    ref="headerRef"
    class="sticky top-0 z-40 border-b border-gray-200/80 bg-gray-50/80 backdrop-blur-md supports-[backdrop-filter]:bg-gray-50/70 dark:border-dark-800 dark:bg-dark-950/80 dark:supports-[backdrop-filter]:bg-dark-950/70"
  >
    <nav
      class="mx-auto flex h-16 max-w-[1180px] items-center gap-3 px-4 sm:gap-6 sm:px-8"
      :aria-label="t('ui52.home.nav.label')"
    >
      <router-link to="/" class="min-w-0 rounded-md" :aria-label="t('ui52.home.nav.home')">
        <BrandMark size="sm" show-domain />
      </router-link>

      <!-- 桌面端导航（lg 以下收进折叠菜单，避免中等宽度横向溢出） -->
      <div class="hidden min-w-0 items-center gap-1 text-sm lg:flex">
        <a
          v-for="item in anchors"
          :key="item.id"
          :href="`#${item.id}`"
          class="home-nav-link"
          @click.prevent="scrollToSection(item.id)"
        >
          {{ item.label }}
        </a>
        <router-link v-if="showModelPlazaEntry" to="/model-plaza" class="home-nav-link">
          {{ t('nav.modelPlaza') }}
        </router-link>
        <a
          v-if="docUrl"
          :href="docUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="home-nav-link inline-flex items-center gap-1"
        >
          {{ t('home.docs') }}
          <Icon name="externalLink" size="xs" class="text-gray-400 dark:text-dark-500" />
        </a>
      </div>

      <div class="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
        <LocaleSwitcher />

        <button
          type="button"
          class="home-icon-btn"
          :title="isDark ? t('home.switchToLight') : t('home.switchToDark')"
          :aria-label="isDark ? t('home.switchToLight') : t('home.switchToDark')"
          @click="emit('toggle-theme')"
        >
          <Icon v-if="isDark" name="sun" size="sm" />
          <Icon v-else name="moon" size="sm" />
        </button>

        <router-link
          v-if="isAuthenticated"
          :to="dashboardPath"
          :class="['btn btn-ink btn-sm ml-1 gap-2', userInitial ? 'pl-1.5' : '']"
        >
          <span
            v-if="userInitial"
            class="flex h-5 w-5 items-center justify-center rounded bg-white/15 font-mono text-[10px] font-semibold dark:bg-gray-950/10"
            aria-hidden="true"
          >
            {{ userInitial }}
          </span>
          <span :class="userInitial ? 'max-[399px]:sr-only' : ''">{{ t('home.dashboard') }}</span>
        </router-link>
        <router-link v-else to="/login" class="btn btn-ink btn-sm ml-1">
          {{ t('home.login') }}
        </router-link>

        <button
          ref="menuButtonRef"
          type="button"
          class="home-icon-btn lg:hidden"
          :aria-expanded="menuOpen"
          aria-controls="home-mobile-menu"
          :aria-label="menuOpen ? t('ui52.home.nav.closeMenu') : t('ui52.home.nav.openMenu')"
          @click="toggleMenu"
        >
          <Icon v-if="menuOpen" name="x" size="sm" />
          <Icon v-else name="menu" size="sm" />
        </button>
      </div>
    </nav>

    <!--
      折叠菜单：浮层定位在顶栏下方（不占文档流，开合不会让页面内容上下跳动）；
      v-show 保证 aria-controls 指向的元素始终存在。不加 backdrop-blur，避免与顶栏的嵌套模糊冲突。
    -->
    <transition name="home-menu">
      <div
        v-show="menuOpen"
        id="home-mobile-menu"
        ref="menuRef"
        class="absolute inset-x-0 top-full border-y border-gray-200/80 bg-gray-50 px-5 pb-4 pt-2 shadow-pop lg:hidden dark:border-dark-800 dark:bg-dark-950"
      >
        <a
          v-for="item in anchors"
          :key="item.id"
          :href="`#${item.id}`"
          class="home-mobile-link"
          @click.prevent="scrollToSection(item.id)"
        >
          {{ item.label }}
          <Icon name="chevronRight" size="xs" class="text-gray-400" />
        </a>
        <router-link v-if="showModelPlazaEntry" to="/model-plaza" class="home-mobile-link" @click="closeMenu()">
          {{ t('nav.modelPlaza') }}
          <Icon name="chevronRight" size="xs" class="text-gray-400" />
        </router-link>
        <a
          v-if="docUrl"
          :href="docUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="home-mobile-link"
          @click="closeMenu()"
        >
          {{ t('home.docs') }}
          <Icon name="externalLink" size="xs" class="text-gray-400" />
        </a>
      </div>
    </transition>
  </header>
</template>

<script setup lang="ts">
/**
 * 落地页顶栏：品牌、锚点导航、模型广场/文档、语言、主题、登录/控制台。
 * 锚点使用 scrollIntoView，避免 hash 变化触发路由 scrollBehavior 回到顶部。
 * 折叠菜单支持 Esc / 点击外部关闭，打开时焦点移入首项，Esc 关闭后焦点回到菜单按钮。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BrandMark from '@/components/brand/BrandMark.vue'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import Icon from '@/components/icons/Icon.vue'

defineProps<{
  isAuthenticated: boolean
  dashboardPath: string
  userInitial: string
  docUrl: string
  showModelPlazaEntry: boolean
  isDark: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-theme'): void
}>()

const { t } = useI18n()

const menuOpen = ref(false)
const headerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const menuButtonRef = ref<HTMLButtonElement | null>(null)
/** ≥lg 时折叠菜单不可见，窗口拉宽时需要同步关闭 */
let desktopQuery: MediaQueryList | null = null

const anchors = computed(() => [
  { id: 'access', label: t('ui52.home.nav.access') },
  { id: 'routing', label: t('ui52.home.nav.routing') },
  { id: 'capabilities', label: t('ui52.home.nav.capabilities') }
])

function openMenu() {
  menuOpen.value = true
  void nextTick(() => menuRef.value?.querySelector<HTMLElement>('a[href]')?.focus())
}

/** 关闭菜单；restoreFocus 为 true 时把焦点还给菜单按钮（Esc / 按钮关闭）。 */
function closeMenu(restoreFocus = false) {
  if (!menuOpen.value) return
  menuOpen.value = false
  if (restoreFocus) menuButtonRef.value?.focus()
}

function toggleMenu() {
  if (menuOpen.value) closeMenu(true)
  else openMenu()
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && menuOpen.value) {
    event.preventDefault()
    closeMenu(true)
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  if (menuOpen.value && headerRef.value && !headerRef.value.contains(event.target as Node)) {
    closeMenu()
  }
}

function onDesktopQueryChange(event: MediaQueryListEvent) {
  if (event.matches) closeMenu()
}

onMounted(() => {
  document.addEventListener('keydown', onDocumentKeydown)
  document.addEventListener('pointerdown', onDocumentPointerDown)
  if (typeof window.matchMedia === 'function') {
    desktopQuery = window.matchMedia('(min-width: 1024px)')
    if (desktopQuery && typeof desktopQuery.addEventListener === 'function') {
      desktopQuery.addEventListener('change', onDesktopQueryChange)
    }
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onDocumentKeydown)
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  if (desktopQuery && typeof desktopQuery.removeEventListener === 'function') {
    desktopQuery.removeEventListener('change', onDesktopQueryChange)
  }
  desktopQuery = null
})

/** 平滑滚动到页面分区，并把焦点移到该分区以便键盘/读屏用户继续浏览。 */
function scrollToSection(id: string) {
  closeMenu()
  const target = document.getElementById(id)
  if (!target) return
  const reduceMotion =
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  target.focus({ preventScroll: true })
}
</script>

<style scoped>
.home-nav-link {
  @apply rounded-md px-3 py-1.5 text-gray-600 transition-colors hover:bg-gray-200/50 hover:text-gray-950;
  @apply dark:text-dark-300 dark:hover:bg-dark-800 dark:hover:text-white;
}

.home-icon-btn {
  @apply flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors;
  @apply hover:bg-gray-200/60 hover:text-gray-950 dark:text-dark-400 dark:hover:bg-dark-800 dark:hover:text-white;
}

.home-mobile-link {
  @apply flex items-center justify-between border-b border-gray-200/70 py-3 text-sm font-medium text-gray-700 last:border-b-0;
  @apply dark:border-dark-800 dark:text-dark-200;
}

.home-menu-enter-active,
.home-menu-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.home-menu-enter-from,
.home-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
