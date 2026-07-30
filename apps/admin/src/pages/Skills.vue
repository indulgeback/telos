<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Search, Trash2, Eye, EyeOff } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { skillsApi } from '../lib/api'

interface Skill {
  id: string
  name: string
  description: string
  enabled: boolean
  metadata: { category?: string; hidden?: boolean } & Record<string, unknown>
  ownerId: string | null
  createdAt: string
}

const skills = ref<Skill[]>([])
const loading = ref(true)
const search = ref('')
const systemOnly = ref(true)

async function load() {
  loading.value = true
  try {
    const data = await skillsApi.list({ search: search.value, system: systemOnly.value, pageSize: 100 })
    skills.value = data.items
  } catch (e) {
    toast.error((e as Error).message)
  } finally {
    loading.value = false
  }
}

async function toggleHidden(skill: Skill) {
  const newMeta = { ...skill.metadata, hidden: !skill.metadata.hidden }
  try {
    await skillsApi.update(skill.id, { metadata: newMeta })
    skill.metadata = newMeta
    toast.success(skill.metadata.hidden ? '已隐藏 (不进商店)' : '已显示 (进商店)')
  } catch (e) {
    toast.error((e as Error).message)
  }
}

async function toggleEnabled(skill: Skill) {
  try {
    await skillsApi.update(skill.id, { enabled: !skill.enabled })
    skill.enabled = !skill.enabled
    toast.success(skill.enabled ? '已启用' : '已禁用')
  } catch (e) {
    toast.error((e as Error).message)
  }
}

async function remove(skill: Skill) {
  if (!confirm(`确定删除 skill "${skill.name}"?`)) return
  try {
    await skillsApi.delete(skill.id)
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
    <div class="flex items-center gap-3">
      <div class="relative flex-1 max-w-sm">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input v-model="search" @keyup.enter="load()" placeholder="搜索 Skill..." class="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" v-model="systemOnly" @change="load()" class="rounded" />
        仅系统级
      </label>
      <button @click="load()" class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">搜索</button>
    </div>

    <div v-if="loading" class="text-muted-foreground">加载中...</div>
    <div v-else-if="skills.length === 0" class="py-12 text-center text-muted-foreground">暂无 Skill</div>
    <div v-else class="rounded-lg border border-border bg-card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="border-b border-border bg-muted/50 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">名称</th>
            <th class="px-4 py-3 font-medium">分类</th>
            <th class="px-4 py-3 font-medium">状态</th>
            <th class="px-4 py-3 font-medium">类型</th>
            <th class="px-4 py-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="skill in skills" :key="skill.id" class="border-b border-border last:border-0 hover:bg-muted/30">
            <td class="px-4 py-3">
              <div class="font-medium">{{ skill.name }}</div>
              <div class="text-xs text-muted-foreground line-clamp-1">{{ skill.description }}</div>
            </td>
            <td class="px-4 py-3"><span class="rounded bg-muted px-2 py-0.5 text-xs">{{ skill.metadata.category || '-' }}</span></td>
            <td class="px-4 py-3">
              <button @click="toggleEnabled(skill)" :class="skill.enabled ? 'text-green-600' : 'text-muted-foreground'" class="text-xs font-medium">
                {{ skill.enabled ? '启用' : '禁用' }}
              </button>
            </td>
            <td class="px-4 py-3 text-xs text-muted-foreground">{{ skill.ownerId === null ? '系统级' : '用户' }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-2">
                <button @click="toggleHidden(skill)" class="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" :title="skill.metadata.hidden ? '显示到商店' : '从商店隐藏'">
                  <EyeOff v-if="!skill.metadata.hidden" class="h-4 w-4" />
                  <Eye v-else class="h-4 w-4" />
                </button>
                <button @click="remove(skill)" class="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
