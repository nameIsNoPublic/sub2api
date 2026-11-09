<template>
  <div class="flex items-center gap-2">
    <span
      :class="[
        'inline-block h-1.5 w-1.5 shrink-0 rounded-full ring-[3px]',
        variantClass
      ]"
    ></span>
    <span class="text-sm text-gray-700 dark:text-gray-300">
      {{ label }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: string
  label: string
}>()

const variantClass = computed(() => {
  switch (props.status) {
    case 'active':
    case 'success':
      return 'bg-emerald-500 ring-emerald-500/15'
    case 'disabled':
    case 'inactive':
    case 'warning':
      return 'bg-amber-500 ring-amber-500/15'
    case 'error':
    case 'danger':
      return 'bg-red-500 ring-red-500/15'
    default:
      return 'bg-gray-400 ring-gray-400/15 dark:bg-dark-500 dark:ring-dark-500/20'
  }
})
</script>
