<template>
  <div class="min-h-screen bg-gray-50 dark:bg-dark-950">
    <!-- Background：氛围光斑 + 纸面颗粒铺满全屏（侧栏不透明会盖住自己那块），等高线只铺内容区 -->
    <div class="paper-aura pointer-events-none fixed inset-0" aria-hidden="true"></div>
    <div
      class="app-layout-field pointer-events-none fixed inset-y-0 right-0 left-0 transition-[left] duration-300"
      :class="[sidebarCollapsed ? 'lg:left-[72px]' : 'lg:left-64']"
      aria-hidden="true"
    >
      <SignalField variant="ambient" :seed="52" :intensity="0.78" />
    </div>
    <div class="paper-grain pointer-events-none fixed inset-0" aria-hidden="true"></div>

    <!-- Sidebar -->
    <AppSidebar />

    <!-- Main Content Area -->
    <div
      class="relative min-h-screen transition-all duration-300"
      :class="[sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64']"
    >
      <!-- Header -->
      <AppHeader />

      <!-- Main Content -->
      <main class="p-4 md:p-6 lg:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import '@/styles/onboarding.css'
import { computed, onMounted } from 'vue'
import { useAppStore } from '@/stores'
import { useAuthStore } from '@/stores/auth'
import { useOnboardingTour } from '@/composables/useOnboardingTour'
import { useOnboardingStore } from '@/stores/onboarding'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import SignalField from '@/components/brand/SignalField.vue'

const appStore = useAppStore()
const authStore = useAuthStore()
const sidebarCollapsed = computed(() => appStore.sidebarCollapsed)
const isAdmin = computed(() => authStore.user?.role === 'admin')

const { replayTour } = useOnboardingTour({
  storageKey: isAdmin.value ? 'admin_guide' : 'user_guide',
  autoStart: true
})

const onboardingStore = useOnboardingStore()

onMounted(() => {
  onboardingStore.setReplayCallback(replayTour)
})

defineExpose({ replayTour })
</script>

<style scoped>
/* 等高线自上而下渐隐，数据区保持干净可读 */
.app-layout-field {
  -webkit-mask-image: linear-gradient(to bottom, #000 0%, rgba(0, 0, 0, 0.55) 55%, rgba(0, 0, 0, 0.25) 100%);
  mask-image: linear-gradient(to bottom, #000 0%, rgba(0, 0, 0, 0.55) 55%, rgba(0, 0, 0, 0.25) 100%);
}
</style>
