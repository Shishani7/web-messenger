<script setup lang="ts">
import { onMounted, ref } from 'vue'

const login = ref('')
const password = ref('')
const msg = ref('')
const isLoggedIn = ref(false)
const currentUser = ref<string | null>(null)
const messages = ref<Array<{ id: number; content: string; user: { login: string }; createdAt: string }>>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

const API_BASE = 'https://localhost:3001'

onMounted(() => {
  const token = localStorage.getItem('token')
  if (token) {
    checkAuth()
  }
})

async function checkAuth() {
  try {
    const data = await request('/api/auth/me', 'GET')
    isLoggedIn.value = true
    currentUser.value = data.login
    await loadMessages()
  } catch {
    localStorage.removeItem('token')
    isLoggedIn.value = false
    currentUser.value = null
  }
}

async function request(path: string, method: string, body?: object) {
  const headers: Record<string, string> = {}
  if (body) headers['Content-Type'] = 'application/json'

  const token = localStorage.getItem('token')
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message = data?.message || `Ошибка ${res.status}`
    throw new Error(message)
  }

  return data
}

async function handleRegister() {
  if (!login.value.trim() || !password.value) {
    error.value = 'Введите логин и пароль'
    return
  }
  
  try {
    isLoading.value = true
    error.value = null
    const data = await request('/api/auth/register', 'POST', {
      login: login.value.trim(),
      password: password.value,
    })
    if (data.token) {
      localStorage.setItem('token', data.token)
      isLoggedIn.value = true
      currentUser.value = data.login
      login.value = ''
      password.value = ''
      await loadMessages()
    }
  } catch (err: any) {
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

async function handleLogin() {
  if (!login.value.trim() || !password.value) {
    error.value = 'Введите логин и пароль'
    return
  }
  
  try {
    isLoading.value = true
    error.value = null
    const data = await request('/api/auth/login', 'POST', {
      login: login.value.trim(),
      password: password.value,
    })
    if (data.token) {
      localStorage.setItem('token', data.token)
      isLoggedIn.value = true
      currentUser.value = data.login
      login.value = ''
      password.value = ''
      await loadMessages()
    }
  } catch (err: any) {
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

function handleLogout() {
  localStorage.removeItem('token')
  isLoggedIn.value = false
  currentUser.value = null
  messages.value = []
}

async function loadMessages() {
  try {
    const data = await request('/api/messages', 'GET')
    messages.value = data
  } catch (err: any) {
    error.value = err.message
  }
}

async function handleSend() {
  if (!msg.value.trim()) return
  
  try {
    isLoading.value = true
    await request('/api/messages', 'POST', { content: msg.value })
    msg.value = ''
    await loadMessages()
  } catch (err: any) {
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="app-container">
    <!-- Авторизация -->
    <div v-if="!isLoggedIn" class="auth-card">
      <div class="auth-header">
        <div class="logo">💬</div>
        <h1>Мессенджер</h1>
        <p class="subtitle">Войдите или создайте аккаунт</p>
      </div>

      <div class="auth-form">
        <div class="input-group">
          <label for="login">Логин</label>
          <input
            id="login"
            v-model="login"
            autocomplete="username"
            placeholder="Введите логин"
            @keyup.enter="handleLogin"
          />
        </div>
        
        <div class="input-group">
          <label for="password">Пароль</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="Введите пароль"
            @keyup.enter="handleLogin"
          />
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <div class="auth-buttons">
          <button class="btn btn-primary" @click="handleLogin" :disabled="isLoading">
            {{ isLoading ? 'Загрузка...' : 'Войти' }}
          </button>
          <button class="btn btn-secondary" @click="handleRegister" :disabled="isLoading">
            Регистрация
          </button>
        </div>
      </div>
    </div>

    <!-- Чат -->
    <div v-else class="chat-container">
      <header class="chat-header">
        <div class="header-left">
          <div class="logo-small">💬</div>
          <span class="app-title">Мессенджер</span>
        </div>
        <div class="header-right">
          <span class="username">{{ currentUser }}</span>
          <button class="btn btn-logout" @click="handleLogout">Выйти</button>
        </div>
      </header>

      <div class="messages-area">
        <div v-if="messages.length === 0" class="empty-state">
          <span class="empty-icon">📭</span>
          <p>Сообщений пока нет</p>
          <p class="empty-hint">Будьте первым!</p>
        </div>
        
        <div v-else class="messages-list">
          <div 
            v-for="message in messages" 
            :key="message.id" 
            class="message"
            :class="{ 'message-own': message.user.login === currentUser }"
          >
            <div class="message-header">
              <span class="message-author">{{ message.user.login }}</span>
              <span class="message-time">{{ formatTime(message.createdAt) }}</span>
            </div>
            <div class="message-content">{{ message.content }}</div>
          </div>
        </div>
      </div>

      <div class="message-input-area">
        <input 
          v-model="msg" 
          placeholder="Напишите сообщение..." 
          @keyup.enter="handleSend"
          :disabled="isLoading"
        />
        <button class="btn btn-send" @click="handleSend" :disabled="isLoading || !msg.trim()">
          ➤
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
* {
  box-sizing: border-box;
}

.app-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}

// Auth styles
.auth-card {
  background: white;
  border-radius: 20px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  font-size: 48px;
  margin-bottom: 16px;
}

.auth-header h1 {
  margin: 0;
  font-size: 28px;
  color: #333;
}

.subtitle {
  color: #666;
  margin: 8px 0 0;
  font-size: 14px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-group label {
  font-size: 14px;
  font-weight: 500;
  color: #444;
}

.input-group input {
  padding: 14px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 16px;
  transition: border-color 0.2s, box-shadow 0.2s;
  
  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
  
  &::placeholder {
    color: #aaa;
  }
}

.error-message {
  background: #fee;
  color: #c00;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.auth-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.btn {
  padding: 14px 24px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  }
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
  
  &:hover:not(:disabled) {
    background: #eee;
  }
}

// Chat styles
.chat-container {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 700px;
  height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-small {
  font-size: 24px;
}

.app-title {
  font-size: 18px;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.username {
  font-weight: 500;
}

.btn-logout {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 16px;
  font-size: 14px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
}

.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f8f9fa;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #888;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state p {
  margin: 4px 0;
}

.empty-hint {
  font-size: 14px;
  opacity: 0.7;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  max-width: 75%;
  padding: 12px 16px;
  background: white;
  border-radius: 16px;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.message-own {
  margin-left: auto;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 4px;
  
  .message-author {
    color: rgba(255, 255, 255, 0.8);
  }
  
  .message-time {
    color: rgba(255, 255, 255, 0.6);
  }
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  gap: 12px;
}

.message-author {
  font-size: 12px;
  font-weight: 600;
  color: #667eea;
}

.message-time {
  font-size: 11px;
  color: #999;
}

.message-content {
  word-wrap: break-word;
  line-height: 1.4;
}

.message-input-area {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: white;
  border-top: 1px solid #eee;
  
  input {
    flex: 1;
    padding: 14px 18px;
    border: 2px solid #e0e0e0;
    border-radius: 24px;
    font-size: 15px;
    
    &:focus {
      outline: none;
      border-color: #667eea;
    }
    
    &::placeholder {
      color: #aaa;
    }
  }
}

.btn-send {
  width: 50px;
  height: 50px;
  padding: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  font-size: 18px;
  
  &:hover:not(:disabled) {
    transform: scale(1.05);
  }
  
  &:disabled {
    background: #ccc;
  }
}
</style>