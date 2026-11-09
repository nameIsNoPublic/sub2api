<template>
  <span class="inline-flex min-w-0 max-w-full items-center" :class="gapClass">
    <span
      class="relative inline-flex shrink-0 items-center justify-center overflow-hidden"
      :class="[markSizeClass, hasCustomLogo ? 'rounded-lg' : 'rounded-[23%]']"
    >
      <img
        v-if="hasCustomLogo"
        :src="siteLogo"
        :alt="siteName"
        class="h-full w-full object-contain"
      />
      <svg
        v-else
        viewBox="0 0 48 48"
        class="h-full w-full"
        aria-hidden="true"
        focusable="false"
      >
        <!-- 与 public/logo.svg 同一字形：几何实心「52」，2 的底笔即 ember 下划线光标（52_） -->
        <rect width="48" height="48" rx="11" class="fill-gray-950 dark:fill-white" />
        <g transform="translate(6.5 6.5) scale(.73)">
          <g
            fill="none"
            stroke-width="5.4"
            stroke-linejoin="miter"
            stroke-miterlimit="8"
            class="stroke-gray-50 dark:stroke-gray-950"
          >
            <path d="M21.5 8.2H5.2V24.1H14.8L18.8 28.1V35.8L14.8 39.8H2.5" />
            <path d="M26.5 8.2H38.8L42.8 12.2V19.5L29.2 33.6V37.1" />
          </g>
          <rect x="26.5" y="37.1" width="19" height="5.4" class="fill-ember-500" :class="{ 'brand-caret': animated }" />
        </g>
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
