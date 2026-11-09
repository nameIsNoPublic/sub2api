<template>
  <div class="table-page-layout" :class="{ 'mobile-mode': isMobile }">
    <!-- 固定区域：操作按钮 -->
    <div v-if="$slots.actions" class="layout-section-fixed">
      <slot name="actions" />
    </div>

    <!-- 固定区域：搜索和过滤器 -->
    <div v-if="$slots.filters" class="layout-section-fixed">
      <slot name="filters" />
    </div>

    <!-- 滚动区域：表格 -->
    <div class="layout-section-scrollable">
      <div class="card table-scroll-container">
        <slot name="table" />
      </div>
    </div>

    <!-- 固定区域：分页器 -->
    <div v-if="$slots.pagination" class="layout-section-fixed">
      <slot name="pagination" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 1024
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
/* 桌面端：Flexbox 布局（工具栏 → 筛选 → 表格 → 分页，统一 16px 节奏） */
.table-page-layout {
  @apply flex flex-col gap-4;
  height: calc(100vh - 64px - 4rem); /* 减去 header + lg:p-8 的上下padding */
}

.layout-section-fixed {
  @apply flex-shrink-0;
}

.layout-section-scrollable {
  @apply flex-1 min-h-0 flex flex-col;
}

/* 表格滚动容器 - 增强版表体滚动方案：纸面白卡 + 1px 描边，层级靠描边不靠阴影 */
.table-scroll-container {
  @apply flex flex-col overflow-hidden h-full rounded-xl border border-gray-200/80 bg-white shadow-card;
  @apply dark:border-dark-800 dark:bg-dark-900/80;
}

.table-scroll-container :deep(.table-wrapper) {
  @apply flex-1 overflow-x-auto overflow-y-auto;
  /* 确保横向滚动条显示在最底部 */
  scrollbar-gutter: stable;
}

.table-scroll-container :deep(table) {
  @apply w-full;
  min-width: max-content; /* 关键：确保表格宽度根据内容撑开，从而触发横向滚动 */
  display: table; /* 使用标准 table 布局以支持 sticky 列 */
}

.table-scroll-container :deep(thead) {
  @apply bg-gray-50/90 backdrop-blur-sm dark:bg-dark-900/95;
}

.table-scroll-container :deep(tbody) {
  /* 保持默认 table-row-group 显示，不使用 block */
}

/*
 * 表头 / 单元格：只统一字体、垂直节奏与分隔线。
 * 水平内边距与文字颜色交给表格自身（DataTable 按列数自适应 px-2~px-6、可排序表头 hover 变色），这里不覆盖。
 */
.table-scroll-container :deep(th) {
  @apply py-3 text-left font-mono text-[11px] font-medium uppercase tracking-[0.06em];
  @apply border-b border-gray-200/80 dark:border-dark-800;
}

.table-scroll-container :deep(td) {
  @apply py-3.5 text-sm;
  @apply border-b border-gray-100 dark:border-dark-800/70;
}

/*
 * 勾选列（首列 key: 'select' 且固定前两列时）：宽度锁定为 DataTable 的 --select-col-width，
 * 第二固定列 left: var(--select-col-width) 与之严格对齐，横向滚动时两列之间不留缝也不重叠。
 */
.table-scroll-container :deep(.sticky-col-left-first) {
  width: var(--select-col-width, 52px);
  min-width: var(--select-col-width, 52px);
  max-width: var(--select-col-width, 52px);
  padding-left: 0;
  padding-right: 0;
  text-align: center;
}

.table-scroll-container :deep(th.sticky-col-left-first > div) {
  justify-content: center;
}

.table-scroll-container :deep(tbody tr:last-child td) {
  @apply border-b-0;
}

/* 移动端：恢复正常滚动 */
.table-page-layout.mobile-mode .table-scroll-container {
  @apply h-auto overflow-visible border-none shadow-none bg-transparent;
}

.table-page-layout.mobile-mode .layout-section-scrollable {
  @apply flex-none min-h-fit;
}

.table-page-layout.mobile-mode .table-scroll-container :deep(table) {
  @apply flex-none;
  display: table;
  min-width: 100%;
}
</style>
