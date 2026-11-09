<template>
  <div class="card overflow-hidden">
    <div :class="CHART_CARD_HEADER">
      <h3 :class="CHART_CARD_TITLE">
        {{ t('payment.admin.paymentDistribution') }}
      </h3>
    </div>
    <div
      v-if="!methods?.length"
      class="flex h-32 items-center justify-center text-sm text-gray-500 dark:text-dark-400"
    >
      {{ t('payment.admin.noData') }}
    </div>
    <div v-else class="space-y-4 p-4">
      <div v-for="method in methods" :key="method.type" class="space-y-1">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span :class="['inline-block h-3 w-3 rounded-full', colorMap[method.type] || 'bg-gray-400']"></span>
            <span class="text-sm text-gray-700 dark:text-gray-300">
              {{ t('payment.methods.' + method.type, method.type) }}
            </span>
          </div>
          <div class="space-y-1 text-right">
            <span v-for="[currency, amount] in sortedAmounts(method.amount)" :key="currency" class="num block text-sm font-medium text-gray-900 dark:text-white">
              {{ formatMoney(currency, amount) }}
            </span>
            <span class="num ml-2 text-xs text-gray-500 dark:text-dark-400">
              ({{ method.count }})
            </span>
          </div>
        </div>
        <div v-for="[currency, amount] in sortedAmounts(method.amount)" :key="currency" class="flex items-center gap-2">
          <span class="w-10 font-mono text-[11px] text-gray-500 dark:text-dark-400">{{ currency }}</span>
          <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-800">
            <div
              :class="['h-full rounded-full transition-all', barColorMap[method.type] || 'bg-gray-400']"
              :style="{ width: barWidth(currency, amount) + '%' }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CHART_CARD_HEADER, CHART_CARD_TITLE } from '@/components/charts/chartStyles'
import type { CurrencyAmounts, PaymentMethodStats } from '@/types/payment'

const { t } = useI18n()

const props = defineProps<{
  methods: PaymentMethodStats[]
}>()

const colorMap: Record<string, string> = {
  alipay: 'bg-blue-500',
  wxpay: 'bg-green-500',
  alipay_direct: 'bg-blue-400',
  wxpay_direct: 'bg-green-400',
  stripe: 'bg-purple-500',
}

const barColorMap: Record<string, string> = {
  alipay: 'bg-blue-500',
  wxpay: 'bg-green-500',
  alipay_direct: 'bg-blue-400',
  wxpay_direct: 'bg-green-400',
  stripe: 'bg-purple-500',
}

const maxAmounts = computed<CurrencyAmounts>(() => {
  return props.methods.reduce<CurrencyAmounts>((maximums, method) => {
    for (const [currency, amount] of Object.entries(method.amount)) {
      maximums[currency] = Math.max(maximums[currency] || 0, amount)
    }
    return maximums
  }, {})
})

function sortedAmounts(amounts: CurrencyAmounts): [string, number][] {
  return Object.entries(amounts).sort(([left], [right]) => left.localeCompare(right))
}

function barWidth(currency: string, amount: number): number {
  return Math.min((amount / (maxAmounts.value[currency] || 1)) * 100, 100)
}

function formatMoney(currency: string, amount: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
}
</script>
