<template>
  <span class="inline-flex min-w-0 max-w-full items-center" :class="gapClass">
    <span
      class="relative inline-flex shrink-0 items-center justify-center overflow-hidden"
      :class="[markSizeClass, hasCustomLogo ? 'rounded-lg' : 'rounded-[28%]']"
    >
      <img
        v-if="hasCustomLogo"
        :src="siteLogo"
        :alt="siteName"
        class="h-full w-full object-contain"
      />
      <svg
        v-else
        viewBox="0 0 64 64"
        class="h-full w-full"
        aria-hidden="true"
        focusable="false"
      >
        <rect width="64" height="64" rx="15" class="fill-gray-950 dark:fill-white" />
        <g
          transform="translate(0 1.5)"
          fill="none"
          stroke-width="5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="stroke-white dark:stroke-gray-950"
        >
          <path d="M23 18H12.6L11.6 29.4C13.1 28.6 15 28.2 17 28.2C21.1 28.2 24.1 31.2 24.1 35.4C24.1 39.8 21 42.9 16.8 42.9C14 42.9 12 41.8 10.8 39.8" />
          <path d="M28.6 23C29.4 19.8 31.9 18 35.1 18C38.9 18 41.6 20.6 41.6 24.2C41.6 26.8 40.4 28.6 38.3 30.8L28.6 42.9H42.1" />
        </g>
        <rect x="46.5" y="31.4" width="7.5" height="15" rx="1.4" class="fill-ember-500" :class="{ 'brand-caret': animated }" />
      </svg>
    </span>
    <span
      v-if="showName"
      class="min-w-0 truncate font-semibold tracking-tightest text-gray-950 dark:text-white"
      :title="isDefaultBrand ? undefined : siteName"
      :class="nameSizeClass"
    >
      <template v-if="isDefaultBrand">52<span class="text-gray-950/90 dark:text-white/90">code</span><span
          v-if="showDomain"
          class="font-mono text-[0.72em] font-medium tracking-normal text-gray-400 dark:text-dark-400"
        >.ai</span></template>
      <template v-else>{{ siteName }}</template>
    </span>
  </span>
</template>

<script setup lang="ts">
/**
 * 52code 品牌标识：内置「52▮」墨色方块 + 文字标。
 * 管理员配置了自定义 Logo / 站点名时自动切换为自定义内容。
 */
import { computed } from 'vue'
import { BRAND_DEFAULTS, useBrand } from '@/composables/useBrand'

type BrandSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    /** 尺寸：sm=24px 标、md=32px、lg=44px */
    size?: BrandSize
    /** 是否显示文字标 */
    showName?: boolean
    /** 默认品牌时是否追加 .ai 域名后缀 */
    showDomain?: boolean
    /** 光标块是否闪烁（落地页使用） */
    animated?: boolean
  }>(),
  { size: 'md', showName: true, showDomain: false, animated: false }
)

const { siteName, siteLogo, hasCustomLogo } = useBrand()

const isDefaultBrand = computed(() => siteName.value === BRAND_DEFAULTS.name)

const markSizeClass = computed(
  () => ({ sm: 'h-6 w-6', md: 'h-8 w-8', lg: 'h-11 w-11' })[props.size]
)
const nameSizeClass = computed(
  () => ({ sm: 'text-[15px]', md: 'text-lg', lg: 'text-2xl' })[props.size]
)
const gapClass = computed(() => ({ sm: 'gap-2', md: 'gap-2.5', lg: 'gap-3' })[props.size])
</script>

<style scoped>
.brand-caret {
  animation: brand-caret-blink 1.1s steps(1, end) infinite;
}

@keyframes brand-caret-blink {
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
  .brand-caret {
    animation: none;
  }
}
</style>
