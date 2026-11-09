<template>
  <span>{{ parts.head }}<span class="whitespace-nowrap">{{ parts.tail }}<span
        class="caret-block"
        :class="{ 'caret-block--cjk': parts.cjk, 'caret-block--tight': parts.fullWidthEnd }"
        aria-hidden="true"
      ></span></span></span>
</template>

<script setup lang="ts">
/**
 * 文本 + 末尾 ember 光标块（呼应 52▮ Logo）。
 * 光标紧贴最后一个字形：全角标点结尾时回收标点右侧留白，中文时下沉到汉字字面底部。
 */
import { computed } from 'vue'
import { splitCaretTail } from './homeContent'

const props = defineProps<{
  text: string
}>()

const parts = computed(() => splitCaretTail(props.text))
</script>

<style scoped>
.caret-block {
  display: inline-block;
  width: 0.42em;
  height: 0.78em;
  margin-left: 0.06em;
  border-radius: 0.06em;
  background: rgb(242 113 28);
  /* 空的 inline-block 以底边对齐基线 */
  vertical-align: 0;
  animation: caret-block-blink 1.1s steps(1, end) infinite;
}

.dark .caret-block {
  background: rgb(251 139 60);
}

/* 汉字字面底部略低于字母基线 */
.caret-block--cjk {
  vertical-align: -0.08em;
}

/* 「。」等全角标点只占左半个字宽，回收右侧 0.5em 留白后再留 0.06em 间距 */
.caret-block--tight {
  margin-left: -0.44em;
}

@keyframes caret-block-blink {
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
  .caret-block {
    animation: none;
  }
}
</style>
