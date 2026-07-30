<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard,
  Bot,
  Sparkles,
  Cpu,
  LogOut,
  Moon,
  Sun,
} from 'lucide-vue-next'
import { getToken, clearToken } from './lib/api'

const route = useRoute()
const router = useRouter()

// 暗色模式
const isDark = ref(document.documentElement.classList.contains('dark'))
function toggleDark() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}

// 导航项
const navItems = [
  { name: 'dashboard', label: '工作台', icon: LayoutDashboard },
  { name: 'agents', label: 'Agent 管理', icon: Bot },
  { name: 'skills', label: 'Skill 商店', icon: Sparkles },
  { name: 'models', label: '模型管理', icon: Cpu },
]

const currentTitle = computed(() => (route.meta.title as string) || 'Telos Admin')
const isLoggedIn = computed(() => !!getToken())

function logout() {
  clearToken()
  router.push('/login')
}
</script>

<template>
  <!-- 登录页: 不渲染 shell -->
  <router-view v-if="route.name === 'login'" />

  <!-- 主 shell -->
  <div v-else-if="isLoggedIn" class="flex h-screen overflow-hidden">
    <!-- 侧边栏 -->
    <aside class="flex w-60 flex-col bg-sidebar text-sidebar-foreground">
      <div class="flex h-16 items-center gap-2 px-6">
        <span class="text-xl font-bold tracking-tight">Telos</span>
        <span class="rounded bg-sidebar-accent px-1.5 py-0.5 text-xs text-sidebar-accent-foreground">Admin</span>
      </div>
      <nav class="flex-1 space-y-1 px-3 py-4">
        <router-link
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          :class="route.name === item.name
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'"
        >
          <component :is="item.icon" class="h-4 w-4" />
          {{ item.label }}
        </router-link>
      </nav>
    </aside>

    <!-- 主区域 -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Topbar -->
      <header class="flex h-16 items-center justify-between border-b border-border bg-card px-6">
        <h1 class="text-lg font-semibold">{{ currentTitle }}</h1>
        <div class="flex items-center gap-3">
          <button @click="toggleDark" class="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
            <Moon v-if="!isDark" class="h-4 w-4" />
            <Sun v-else class="h-4 w-4" />
          </button>
          <button @click="logout" class="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
            <LogOut class="h-4 w-4" />
            退出
          </button>
        </div>
      </header>

      <!-- 内容 -->
      <main class="flex-1 overflow-auto bg-background p-6">
        <router-view />
      </main>
    </div>
  </div>

  <!-- 未登录: 等路由守卫跳转 -->
  <div v-else class="flex h-screen items-center justify-center">
    <div class="text-muted-foreground">重定向中...</div>
  </div>
</template>
