<template>
  <div class="relative" ref="dropdownRef">
    <button
      type="button"
      @click="toggleDropdown"
      :disabled="switching"
      class="shell-action gap-1.5 px-2"
      :class="{ 'bg-gray-200/50 text-gray-950 dark:bg-dark-800 dark:text-white': isOpen }"
      :title="currentLocale?.name"
      :aria-expanded="isOpen ? 'true' : 'false'"
    >
      <span class="text-[15px] leading-none">{{ currentLocale?.flag }}</span>
      <span class="hidden font-mono text-xs font-medium sm:inline">{{ currentLocale?.code.toUpperCase() }}</span>
      <Icon
        name="chevronDown"
        size="xs"
        class="text-gray-400 transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <transition name="dropdown">
      <div
        v-if="isOpen"
        class="absolute right-0 z-50 mt-2 w-40 origin-top-right rounded-xl border border-gray-200/80 bg-white p-1 shadow-pop dark:border-dark-700 dark:bg-dark-900"
      >
        <button
          v-for="locale in availableLocales"
          :key="locale.code"
          type="button"
          :disabled="switching"
          @click="selectLocale(locale.code)"
          class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-950 dark:text-gray-300 dark:hover:bg-dark-800 dark:hover:text-white"
          :class="{
            'bg-primary-50 text-primary-700 hover:bg-primary-50 hover:text-primary-700 dark:bg-primary-500/10 dark:text-primary-300 dark:hover:bg-primary-500/10 dark:hover:text-primary-300':
              locale.code === currentLocaleCode
          }"
        >
          <span class="text-base leading-none">{{ locale.flag }}</span>
          <span>{{ locale.name }}</span>
          <Icon v-if="locale.code === currentLocaleCode" name="check" size="sm" class="ml-auto text-primary-600 dark:text-primary-400" />
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import { setLocale, availableLocales } from '@/i18n'

const { locale } = useI18n()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const switching = ref(false)

const currentLocaleCode = computed(() => locale.value)
const currentLocale = computed(() => availableLocales.find((l) => l.code === locale.value))

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

async function selectLocale(code: string) {
  if (switching.value || code === currentLocaleCode.value) {
    isOpen.value = false
    return
  }
  switching.value = true
  try {
    await setLocale(code)
    isOpen.value = false
    // 分组名称等内容由后端按请求语言返回，整页刷新让已加载的数据换成新语言
    window.location.reload()
  } finally {
    switching.value = false
  }
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scale(0.97) translateY(-4px);
}
</style>
