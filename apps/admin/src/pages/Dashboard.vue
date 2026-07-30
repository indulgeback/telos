<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Users, Bot, Sparkles, Cpu, MessageSquare, Activity } from 'lucide-vue-next'
import { dashboardApi } from '../lib/api'

const data = ref<{
  counts: Record<string, number>
  runsTrend: { date: string; count: number }[]
} | null>(null)
const loading = ref(true)

const cards = [
  { key: 'users', label: '用户', icon: Users },
  { key: 'agents', label: 'Agent', icon: Bot },
  { key: 'skills', label: 'Skill', icon: Sparkles },
  { key: 'models', label: '模型', icon: Cpu },
  { key: 'threads', label: '会话', icon: MessageSquare },
  { key: 'runs', label: '运行', icon: Activity },
]

// 趋势图最大值 (用于条形高度计算)
const maxRun = ref(1)

onMounted(async () => {
  try {
    data.value = await dashboardApi.get()
    maxRun.value = Math.max(1, ...data.value.runsTrend.map(d => d.count))
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading" class="text-muted-foreground">加载中...</div>
  <div v-else-if="data" class="space-y-8">
    <!-- 统计卡片 -->
    <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <div
        v-for="card in cards"
        :key="card.key"
        class="rounded-lg border border-border bg-card p-4"
      >
        <div class="flex items-center justify-between">
          <component :is="card.icon" class="h-5 w-5 text-muted-foreground" />
        </div>
        <div class="mt-2 text-2xl font-bold">{{ data.counts[card.key] ?? 0 }}</div>
        <div class="text-sm text-muted-foreground">{{ card.label }}</div>
      </div>
    </div>

    <!-- 近 14 天运行趋势 -->
    <div class="rounded-lg border border-border bg-card p-6">
      <h3 class="mb-4 text-sm font-semibold text-muted-foreground">近 14 天会话运行趋势</h3>
      <div v-if="data.runsTrend.length === 0" class="py-8 text-center text-sm text-muted-foreground">
        暂无数据
      </div>
      <div v-else class="flex items-end gap-1" style="height: 160px">
        <div
          v-for="item in data.runsTrend"
          :key="item.date"
          class="group relative flex flex-1 flex-col items-center justify-end"
          :style="{ height: '100%' }"
        >
          <div
            class="w-full rounded-t bg-primary transition-all group-hover:opacity-80"
            :style="{ height: `${(item.count / maxRun) * 100}%`, minHeight: '2px' }"
          />
          <span class="absolute -top-6 hidden whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-xs text-background group-hover:block">
            {{ item.count }}
          </span>
        </div>
      </div>
      <div class="mt-2 flex gap-1">
        <div
          v-for="item in data.runsTrend"
          :key="item.date"
          class="flex-1 text-center text-[10px] text-muted-foreground"
        >
          {{ item.date.slice(5) }}
        </div>
      </div>
    </div>
  </div>
</template>
