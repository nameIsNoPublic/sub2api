<template>
  <div class="space-y-5">
    <!-- Quick Amount Buttons -->
    <div>
      <label class="mb-1 block text-sm font-semibold text-gray-950 dark:text-white">
        {{ t('payment.quickAmounts') }}
      </label>
      <div class="grid grid-cols-3 gap-x-3 gap-y-4 pt-3">
        <button
          v-for="amt in filteredAmounts"
          :key="amt"
          type="button"
          :aria-pressed="modelValue === amt"
          :class="[
            'relative rounded-xl border px-3 py-3 text-center transition-[border-color,background-color,box-shadow] duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
            modelValue === amt
              ? 'border-primary-500 bg-primary-50/70 text-primary-700 ring-1 ring-primary-500 dark:border-primary-400 dark:bg-primary-500/10 dark:text-primary-200 dark:ring-primary-400'
              : quoteFor(amt).percent > 0
                ? 'border-ember-200 bg-white text-gray-800 hover:border-ember-300 hover:bg-ember-50/40 dark:border-ember-500/30 dark:bg-dark-900 dark:text-gray-100 dark:hover:border-ember-400/50'
                : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50 dark:border-dark-700 dark:bg-dark-900 dark:text-gray-100 dark:hover:border-dark-600 dark:hover:bg-dark-800',
          ]"
          :data-testid="`quick-amount-${amt}`"
          @click="selectAmount(amt)"
        >
          <!-- 选中勾 -->
          <span
            v-if="modelValue === amt"
            class="pointer-events-none absolute left-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-white dark:bg-primary-500"
            aria-hidden="true"
          >
            <svg class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </span>
          <!-- 促销价签：仅命中档位的金额显示 -->
          <span
            v-if="quoteFor(amt).percent > 0"
            class="pointer-events-none absolute -right-1.5 -top-2.5 z-10"
            data-testid="quick-amount-bonus-badge"
          >
            <span
              class="flex items-center whitespace-nowrap rounded-md bg-ember-500 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold leading-tight text-white shadow-[0_2px_6px_-2px_rgba(217,90,14,0.6)] ring-2 ring-white dark:ring-dark-900"
            >{{ badgeText(amt) }}</span>
          </span>
          <span class="num block text-lg font-semibold">{{ amt }}</span>
          <!-- 配置了优惠阶梯时，所有按钮都显示第二行，保持高度一致：赠金显示到账 USD，折扣显示折后实付 -->
          <span
            v-if="showSecondLine"
            :class="[
              'mt-0.5 block font-mono text-[11px] font-normal leading-tight',
              quoteFor(amt).percent > 0 ? 'text-ember-600 dark:text-ember-300' : 'text-gray-400 dark:text-dark-400',
            ]"
            data-testid="quick-amount-credited"
          >{{ secondLine(amt) }}</span>
        </button>
      </div>
    </div>

    <!-- Custom Amount Input -->
    <div>
      <label class="mb-2 block text-sm font-semibold text-gray-950 dark:text-white">
        {{ t('payment.customAmount') }}
      </label>
      <div class="relative">
        <span class="num pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-400 dark:text-dark-400">
          {{ inputSymbol }}
        </span>
        <input
          type="text"
          inputmode="decimal"
          :value="customText"
          :placeholder="placeholderText"
          class="input num h-14 w-full pr-4 text-xl font-semibold placeholder:text-base placeholder:font-normal"
          :style="{ paddingLeft: inputPaddingLeft }"
          @input="handleInput"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RechargeBonusTier } from '@/types/payment'
import { formatRechargeBonusNumber, quoteRechargeBonus, type RechargeBonusMode } from '@/utils/rechargeBonus'
import { currencySymbol, formatPaymentAmount } from './currency'

const props = withDefaults(defineProps<{
  amounts?: number[]
  modelValue: number | null
  min?: number
  max?: number
  /** 充值优惠阶梯（按 min_amount 升序）；为空时不显示价签与第二行 */
  bonusTiers?: RechargeBonusTier[]
  /** 阶梯模式：bonus 赠金 / discount 折扣 */
  bonusMode?: RechargeBonusMode
  /** 充值倍率（1 支付币种 = multiplier USD），用于计算到账金额 */
  multiplier?: number
  /** 支付币种（折扣模式第二行实付金额的币种与精度） */
  currency?: string
}>(), {
  amounts: () => [10, 20, 50, 100, 200, 500, 1000, 2000, 5000],
  min: 0,
  max: 0,
  bonusTiers: () => [],
  bonusMode: 'bonus',
  multiplier: 1,
  currency: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const { t } = useI18n()

const customText = ref('')

// 0 = no limit
const filteredAmounts = computed(() =>
  props.amounts.filter((a) => (props.min <= 0 || a >= props.min) && (props.max <= 0 || a <= props.max))
)

const showSecondLine = computed(() => props.bonusTiers.length > 0)

function currencyDigits(): number {
  if (!props.currency) return 2
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: props.currency }).resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    return 2
  }
}

function quoteFor(amt: number) {
  return quoteRechargeBonus(props.bonusTiers, amt, {
    multiplier: props.multiplier,
    mode: props.bonusMode,
    currencyDigits: currencyDigits(),
  })
}

// 价签文案：赠金「+20%」，折扣「20% OFF」
function badgeText(amt: number): string {
  const percent = formatRechargeBonusNumber(quoteFor(amt).percent)
  return props.bonusMode === 'discount' ? `${percent}% OFF` : `+${percent}%`
}

function secondLine(amt: number): string {
  const quote = quoteFor(amt)
  if (props.bonusMode === 'discount') {
    return t('payment.rechargeBonus.payShort', { amount: formatPaymentAmount(quote.payBase, props.currency) })
  }
  return t('payment.rechargeBonus.creditedShort', { amount: '$' + quote.credited.toFixed(2) })
}

// 自定义金额前缀：跟随支付币种；未传币种时沿用美元符号
const inputSymbol = computed(() => (props.currency ? currencySymbol(props.currency) : '$'))
const inputPaddingLeft = computed(() => `${1.5 + inputSymbol.value.length * 0.7}rem`)

const placeholderText = computed(() => {
  if (props.min > 0 && props.max > 0) return `${props.min} - ${props.max}`
  if (props.min > 0) return `≥ ${props.min}`
  if (props.max > 0) return `≤ ${props.max}`
  return t('payment.enterAmount')
})

const AMOUNT_PATTERN = /^\d*(\.\d{0,2})?$/

function selectAmount(amt: number) {
  customText.value = String(amt)
  emit('update:modelValue', amt)
}

function handleInput(e: Event) {
  const input = e.target as HTMLInputElement
  const val = input.value
  if (!AMOUNT_PATTERN.test(val)) {
    input.value = customText.value
    return
  }
  customText.value = val
  if (val === '') {
    emit('update:modelValue', null)
    return
  }
  const num = parseFloat(val)
  if (!isNaN(num) && num > 0) {
    emit('update:modelValue', num)
  } else {
    emit('update:modelValue', null)
  }
}

watch(() => props.modelValue, (v) => {
  if (v !== null && String(v) !== customText.value) {
    customText.value = String(v)
  }
}, { immediate: true })
</script>
