<template>
  <a
    class="inline-flex max-w-full shrink-0 items-center gap-1 truncate text-xs font-normal text-primary-600 transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2 dark:text-primary-400 dark:focus-visible:ring-offset-dark-900"
    href="https://sub2api.io/proxyip"
    target="_blank"
    rel="noopener noreferrer"
  >
    <span class="truncate">{{ t('admin.proxies.ad.inline') }}</span>
    <Icon name="externalLink" size="xs" />
  </a>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'

const { t } = useI18n()
</script>
