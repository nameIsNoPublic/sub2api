<template>
  <div>
    <label class="mb-3 block text-sm font-semibold text-gray-950 dark:text-white">
      {{ t('payment.paymentMethod') }}
    </label>
    <div
      data-testid="payment-method-grid"
      class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
    >
      <button
        v-for="method in sortedMethods"
        :key="method.type"
        type="button"
        :title="methodLabel(method)"
        :disabled="!method.available"
        :aria-pressed="selected === method.type"
        :class="[
          'relative flex h-16 min-w-0 flex-col items-center justify-center rounded-xl border px-3 transition-[border-color,background-color,box-shadow] duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
          !method.available
            ? 'cursor-not-allowed border-dashed border-gray-200 bg-gray-50 opacity-50 dark:border-dark-700 dark:bg-dark-900/50'
            : selected === method.type
              ? methodSelectedClass(method.type)
              : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50 dark:border-dark-700 dark:bg-dark-900 dark:text-gray-100 dark:hover:border-dark-600 dark:hover:bg-dark-800',
        ]"
        @click="method.available && emit('select', method.type)"
      >
        <!-- 选中勾：颜色跟随支付渠道品牌色 -->
        <span
          v-if="method.available && selected === method.type"
          :class="['pointer-events-none absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-white', methodCheckClass(method.type)]"
          aria-hidden="true"
        >
          <svg class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </span>
        <span class="flex w-full min-w-0 items-center justify-center gap-2.5">
          <img :src="methodIcon(method.type)" :alt="methodLabel(method)" class="h-7 w-7 shrink-0 object-contain" />
          <span class="flex min-w-0 flex-col items-start gap-1 leading-none">
            <span data-testid="payment-method-label" class="block w-full truncate text-sm font-semibold">
              {{ methodLabel(method) }}
            </span>
            <span
              v-if="method.fee_rate > 0"
              class="font-mono text-[10px] text-gray-500 dark:text-dark-400"
            >
              {{ t('payment.fee') }} {{ method.fee_rate }}%
            </span>
          </span>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { METHOD_ORDER, isBuiltInAlipayMethod, isBuiltInWxpayMethod } from './providerConfig'
import alipayIcon from '@/assets/icons/alipay.svg'
import wxpayIcon from '@/assets/icons/wxpay.svg'
import stripeIcon from '@/assets/icons/stripe.svg'
import airwallexIcon from '@/assets/icons/airwallex.svg'
import paymentIcon from '@/assets/icons/payment.svg'

export interface PaymentMethodOption {
  type: string
  display_name?: string
  fee_rate: number
  available: boolean
}

const props = defineProps<{
  methods: PaymentMethodOption[]
  selected: string
}>()

const emit = defineEmits<{
  select: [type: string]
}>()

const { t } = useI18n()

const METHOD_ICONS: Record<string, string> = {
  alipay: alipayIcon,
  wxpay: wxpayIcon,
  stripe: stripeIcon,
  airwallex: airwallexIcon,
  credit_card: paymentIcon,
}

const sortedMethods = computed(() => {
  const order: readonly string[] = METHOD_ORDER
  return [...props.methods].sort((a, b) => {
    const ai = order.indexOf(a.type)
    const bi = order.indexOf(b.type)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })
})

function methodIcon(type: string): string {
  if (isBuiltInAlipayMethod(type)) return METHOD_ICONS.alipay
  if (isBuiltInWxpayMethod(type)) return METHOD_ICONS.wxpay
  if (type === 'airwallex') return METHOD_ICONS.airwallex
  return METHOD_ICONS[type] || paymentIcon
}

function methodLabel(method: PaymentMethodOption): string {
  return method.display_name || t(`payment.methods.${method.type}`, method.type)
}

function methodSelectedClass(type: string): string {
  if (isBuiltInAlipayMethod(type)) return 'border-[#02A9F1] bg-sky-50/70 text-gray-950 ring-1 ring-[#02A9F1] dark:bg-sky-500/10 dark:text-white'
  if (isBuiltInWxpayMethod(type)) return 'border-[#09BB07] bg-green-50/70 text-gray-950 ring-1 ring-[#09BB07] dark:bg-green-500/10 dark:text-white'
  if (type === 'stripe') return 'border-[#676BE5] bg-indigo-50/70 text-gray-950 ring-1 ring-[#676BE5] dark:bg-indigo-500/10 dark:text-white'
  if (type === 'airwallex') return 'border-[#FF6B3D] bg-orange-50/70 text-gray-950 ring-1 ring-[#FF6B3D] dark:border-[#FF8E3C] dark:bg-orange-500/10 dark:text-white dark:ring-[#FF8E3C]'
  return 'border-primary-500 bg-primary-50/70 text-gray-950 ring-1 ring-primary-500 dark:border-primary-400 dark:bg-primary-500/10 dark:text-white dark:ring-primary-400'
}

function methodCheckClass(type: string): string {
  if (isBuiltInAlipayMethod(type)) return 'bg-[#02A9F1]'
  if (isBuiltInWxpayMethod(type)) return 'bg-[#09BB07]'
  if (type === 'stripe') return 'bg-[#676BE5]'
  if (type === 'airwallex') return 'bg-[#FF6B3D]'
  return 'bg-primary-600 dark:bg-primary-500'
}
</script>
