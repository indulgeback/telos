<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Search, Pencil, Trash2, Plus } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { agentsApi } from '../lib/api'

interface Agent {
  id: string
  name: string
  description: string
  type: string
  modelKey: string
  status: string
  isDefault: boolean
  ownerId: string | null
  instructionStatus: string
  createdAt: string
}

const agents = ref<Agent[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const search = ref('')
const loading = ref(true)

// 编辑弹窗
const editing = ref<Agent | null>(null)
const editInstructions = ref('')
const saving = ref(false)

async function loadAgents() {
  loading.value = true
  try {
    const data = await agentsApi.list({ page: page.value, pageSize: pageSize.value, search: search.value })
    agents.value = data.items
    total.value = data.total
  } catch (e) {
    toast.error((e as Error).message)
  } finally {
    loading.value = false
  }
}

function openEdit(agent: Agent) {
  editing.value = agent
  editInstructions.value = ''
  // 加载完整 instructions
  agentsApi.get(agent.id).then(data => {
    editInstructions.value = data.instructions || ''
  })
}

async function saveEdit() {
  if (!editing.value) return
  saving.value = true
  try {
    await agentsApi.update(editing.value.id, { instructions: editInstructions.value })
    toast.success('更新成功')
    editing.value = null
  } catch (e) {
    toast.error((e as Error).message)
  } finally {
    saving.value = false
  }
}

async function deleteAgent(agent: Agent) {
  if (!confirm(`确定删除 agent "${agent.name}"?`)) return
  try {
    await agentsApi.delete(agent.id)
    toast.success('删除成功')
    await loadAgents()
  } catch (e) {
    toast.error((e as Error).message)
  }
}

onMounted(loadAgents)
</script>

<template>
  <div class="space-y-4">
    <!-- 搜索栏 -->
    <div class="flex items-center gap-3">
      <div class="relative flex-1 max-w-sm">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          v-model="search"
          @keyup.enter="page = 1; loadAgents()"
          placeholder="搜索 Agent..."
          class="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <button @click="page = 1; loadAgents()" class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
        搜索
      </button>
    </div>

    <!-- 列表 -->
    <div v-if="loading" class="text-muted-foreground">加载中...</div>
    <div v-else-if="agents.length === 0" class="py-12 text-center text-muted-foreground">暂无 Agent</div>
    <div v-else class="rounded-lg border border-border bg-card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="border-b border-border bg-muted/50 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">名称</th>
            <th class="px-4 py-3 font-medium">类型</th>
            <th class="px-4 py-3 font-medium">模型</th>
            <th class="px-4 py-3 font-medium">状态</th>
            <th class="px-4 py-3 font-medium">创建时间</th>
            <th class="px-4 py-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="agent in agents" :key="agent.id" class="border-b border-border last:border-0 hover:bg-muted/30">
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <span class="font-medium">{{ agent.name }}</span>
                <span v-if="agent.isDefault" class="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">默认</span>
              </div>
              <div class="text-xs text-muted-foreground line-clamp-1">{{ agent.description }}</div>
            </td>
            <td class="px-4 py-3">
              <span class="rounded bg-muted px-2 py-0.5 text-xs">{{ agent.type }}</span>
            </td>
            <td class="px-4 py-3 text-xs text-muted-foreground">{{ agent.modelKey }}</td>
            <td class="px-4 py-3">
              <span :class="agent.status === 'active' ? 'text-green-600' : 'text-muted-foreground'" class="text-xs">
                {{ agent.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-xs text-muted-foreground">{{ agent.createdAt?.slice(0, 10) }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-2">
                <button @click="openEdit(agent)" class="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                  <Pencil class="h-4 w-4" />
                </button>
                <button
                  v-if="agent.type !== 'system' && !agent.isDefault"
                  @click="deleteAgent(agent)"
                  class="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="editing" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="editing = null">
      <div class="w-full max-w-2xl rounded-lg bg-card p-6 shadow-xl">
        <h3 class="mb-4 text-lg font-semibold">编辑 {{ editing.name }}</h3>
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium">System Prompt (instructions)</label>
            <textarea
              v-model="editInstructions"
              rows="15"
              class="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="加载中..."
            />
          </div>
        </div>
        <div class="mt-4 flex justify-end gap-3">
          <button @click="editing = null" class="rounded-md border border-border px-4 py-2 text-sm">取消</button>
          <button @click="saveEdit" :disabled="saving" class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
