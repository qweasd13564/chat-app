import { useState } from 'react'
import '../styles/Auth.css'

interface LoginProps {
  onLogin: (username: string, token: string) => void
  onSwitchToRegister: () => void
}

export function Login({ onLogin, onSwitchToRegister }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()
      if (data.success) {
        localStorage.setItem('chat-token', data.token)
        localStorage.setItem('chat-username', username)
        onLogin(username, data.token)
      } else {
        setError(data.message || '登录失败')
      }
    } catch (err) {
      setError('登录失败，请稍后重试')
    }
  }

  return (
    <div className="auth-container">
      <h2>��录</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <div className="error-message">{error}</div>}
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="用户名"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
          required
        />
        <button type="submit">登录</button>
      </form>
      <p className="auth-switch">
        还没有账号？ 
        <button onClick={onSwitchToRegister}>立即注册</button>
      </p>
    </div>
  )
} 