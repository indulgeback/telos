<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { modelsApi } from '../lib/api'

interface ChatModel {
  id: string
  modelKey: string
  displayName: string
  provider: string
  isReasoning: boolean
  isEnabled: boolean
  sortOrder: number
  supportVision: boolean
}

const models = ref<ChatModel[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const data = await modelsApi.list()
    models.value = data.items
  } catch (e) {
    toast.error((e as Error).message)
  } finally {
    loading.value = false
  }
}

async function toggleEnabled(model: ChatModel) {
  try {
    await modelsApi.update(model.id, { isEnabled: !model.isEnabled })
    model.isEnabled = !model.isEnabled
    toast.success(model.isEnabled ? '已启用' : '已禁用')
  } catch (e) {
    toast.error((e as Error).message)
  }
}

async function remove(model: ChatModel) {
  if (!confirm(`确定删除模型 "${model.displayName}"?`)) return
  try {
    await modelsApi.delete(model.id)
    toast.success('删除成功')
    await load()
  } catch (e) {
    toast.error((e as Error).message)
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div v-if="loading" class="text-muted-foreground">加载中...</div>
    <div v-else-if="models.length === 0" class="py-12 text-center text-muted-foreground">暂无模型</div>
    <div v-else class="rounded-lg border border-border bg-card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="border-b border-border bg-muted/50 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">显示名</th>
            <th class="px-4 py-3 font-medium">modelKey</th>
            <th class="px-4 py-3 font-medium">Provider</th>
            <th class="px-4 py-3 font-medium">特性</th>
            <th class="px-4 py-3 font-medium">状态</th>
            <th class="px-4 py-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="model in models" :key="model.id" class="border-b border-border last:border-0 hover:bg-muted/30">
            <td class="px-4 py-3 font-medium">{{ model.displayName }}</td>
            <td class="px-4 py-3 text-xs font-mono text-muted-foreground">{{ model.modelKey }}</td>
            <td class="px-4 py-3"><span class="rounded bg-muted px-2 py-0.5 text-xs">{{ model.provider }}</span></td>
            <td class="px-4 py-3">
              <div class="flex gap-1 text-xs">
                <span v-if="model.isReasoning" class="rounded bg-primary/10 px-1.5 py-0.5 text-primary">推理</span>
                <span v-if="model.supportVision" class="rounded bg-primary/10 px-1.5 py-0.5 text-primary">视觉</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <button @click="toggleEnabled(model)" :class="model.isEnabled ? 'text-green-600' : 'text-muted-foreground'" class="text-xs font-medium">
                {{ model.isEnabled ? '启用' : '禁用' }}
              </button>
            </td>
            <td class="px-4 py-3 text-right">
              <button @click="remove(model)" class="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
