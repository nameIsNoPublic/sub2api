<template>
  <div class="flex justify-between gap-2">
    <span class="text-gray-500 dark:text-dark-400">{{ label }}</span>
    <span class="num text-gray-900 dark:text-gray-100">{{ display }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatScaled } from '@/utils/pricing'

const props = withDefaults(
  defineProps<{
    label: string
    value: number | null
    unit: string
    scale: number
  }>(),
  { value: null }
)

const display = computed(() =>
  props.value == null ? '-' : `${formatScaled(props.value, props.scale)} ${props.unit}`
)
</script>
