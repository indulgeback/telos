<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { authApi, setToken } from '../lib/api'

const router = useRouter()
const route = useRoute()

const username = ref('')
const password = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!username.value || !password.value) {
    toast.error('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    const { token } = await authApi.login(username.value, password.value)
    setToken(token)
    toast.success('登录成功')
    const redirect = (route.query.redirect as string) || '/dashboard'
    router.push(redirect)
  } catch (e) {
    toast.error((e as Error).message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen">
    <!-- 左侧品牌区 -->
    <div class="hidden w-1/2 flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
      <div class="flex items-center gap-2">
        <img
          src="/brand/telos-ip.png"
          alt="Telos"
          class="size-10 rounded-xl object-cover"
        />
        <span class="text-2xl font-bold tracking-tight">Telos</span>
        <span class="rounded bg-sidebar-accent px-2 py-0.5 text-sm">Admin</span>
      </div>
      <div>
        <h2 class="text-3xl font-bold leading-tight">运营管理后台</h2>
        <p class="mt-3 text-sidebar-foreground/60">
          管理 Agent、Skill、模型配置与用户数据
        </p>
      </div>
      <div class="text-sm text-sidebar-foreground/40">© 2026 Telos</div>
    </div>

    <!-- 右侧登录表单 -->
    <div class="flex w-full items-center justify-center lg:w-1/2">
      <div class="w-full max-w-sm space-y-6 px-8">
        <div class="lg:hidden">
          <div class="flex items-center gap-2">
            <img
              src="/brand/telos-ip.png"
              alt="Telos"
              class="size-10 rounded-xl object-cover"
            />
            <span class="text-2xl font-bold">Telos Admin</span>
          </div>
        </div>
        <div>
          <h1 class="text-2xl font-semibold">欢迎回来</h1>
          <p class="mt-1 text-sm text-muted-foreground">请登录管理后台</p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">用户名</label>
            <input
              v-model="username"
              type="text"
              autocomplete="username"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="admin"
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">密码</label>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            :disabled="loading"
            class="flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {{ loading ? '登录中...' : '登 录' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
