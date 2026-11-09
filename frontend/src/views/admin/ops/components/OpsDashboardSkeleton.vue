<script setup lang="ts">
interface Props {
  fullscreen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  fullscreen: false
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header (matches OpsDashboardHeader + overview blocks) -->
    <div :class="['card', props.fullscreen ? 'p-8' : 'p-5']">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4 dark:border-dark-800">
        <div class="space-y-2">
          <div class="h-6 w-44 skeleton"></div>
          <div class="h-3 w-80 max-w-full skeleton opacity-60"></div>
        </div>
        <div v-if="!props.fullscreen" class="flex flex-wrap items-center gap-3">
          <div class="h-9 w-[140px] skeleton"></div>
          <div class="h-9 w-[160px] skeleton"></div>
          <div class="h-9 w-[150px] skeleton"></div>
          <div class="h-9 w-9 skeleton"></div>
          <div class="h-9 w-28 skeleton"></div>
          <div class="h-9 w-28 skeleton"></div>
          <div class="h-9 w-9 skeleton"></div>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div class="rounded-lg border border-gray-200/70 bg-gray-50/70 p-4 dark:border-dark-800 dark:bg-dark-950/40 lg:col-span-5">
          <div class="grid h-full grid-cols-1 gap-6 md:grid-cols-[200px_1fr] md:items-center">
            <div class="h-28 skeleton opacity-60"></div>
            <div class="space-y-4">
              <div class="h-4 w-32 skeleton"></div>
              <div class="grid grid-cols-2 gap-3">
                <div v-for="i in 4" :key="i" class="h-14 skeleton opacity-60"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-7">
          <div class="grid h-full grid-cols-1 content-center gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="i in 7" :key="i" class="h-20 animate-pulse rounded-lg border border-gray-200/70 bg-gray-50/70 dark:border-dark-800 dark:bg-dark-950/40"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Row: Concurrency + Throughput (matches OpsDashboard.vue) -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-4">
      <div :class="['min-h-[360px] card lg:col-span-1', props.fullscreen ? 'p-8' : 'p-5']">
        <div class="h-4 w-44 skeleton"></div>
        <div class="mt-6 h-72 skeleton opacity-60"></div>
      </div>
      <div :class="['min-h-[360px] card lg:col-span-1', props.fullscreen ? 'p-8' : 'p-5']">
        <div class="h-4 w-44 skeleton"></div>
        <div class="mt-6 h-72 skeleton opacity-60"></div>
      </div>
      <div :class="['min-h-[360px] card lg:col-span-2', props.fullscreen ? 'p-8' : 'p-5']">
        <div class="h-4 w-56 skeleton"></div>
        <div class="mt-6 h-72 skeleton opacity-60"></div>
      </div>
    </div>

    <!-- Row: Visual Analysis (baseline 3-up grid) -->
    <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div
        v-for="i in 3"
        :key="i"
        :class="['card', props.fullscreen ? 'p-8' : 'p-5']"
      >
        <div class="h-4 w-44 skeleton"></div>
        <div class="mt-6 h-56 skeleton opacity-60"></div>
      </div>
    </div>

    <!-- Alert Events -->
    <div :class="['card', props.fullscreen ? 'p-8' : 'p-5']">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="h-4 w-48 skeleton"></div>
        <div v-if="!props.fullscreen" class="flex flex-wrap items-center gap-2">
          <div class="h-9 w-[140px] skeleton"></div>
          <div class="h-9 w-[120px] skeleton"></div>
          <div class="h-9 w-[120px] skeleton"></div>
        </div>
      </div>

      <div class="mt-6 space-y-3">
        <div v-for="i in 6" :key="i" class="flex items-center justify-between gap-4 rounded-lg border border-gray-200/70 bg-gray-50/70 p-4 dark:border-dark-800 dark:bg-dark-950/40">
          <div class="flex-1 space-y-2">
            <div class="h-3 w-56 skeleton"></div>
            <div class="h-3 w-80 max-w-full skeleton opacity-60"></div>
          </div>
          <div class="h-7 w-20 skeleton"></div>
        </div>
      </div>
    </div>
  </div>
</template>
