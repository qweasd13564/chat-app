import { useState } from 'react'
import '../styles/Auth.css'

interface RegisterProps {
  onRegister: (username: string, token: string) => void
  onSwitchToLogin: () => void
}

export function Register({ onRegister, onSwitchToLogin }: RegisterProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
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
        onRegister(username, data.token)
      } else {
        setError(data.message || '注册失败')
      }
    } catch (err) {
      setError('注册失败，请稍后重试')
    }
  }

  return (
    <div className="auth-container">
      <h2>注册</h2>
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
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="确认密码"
          required
        />
        <button type="submit">注册</button>
      </form>
      <p className="auth-switch">
        已有账号？
        <button onClick={onSwitchToLogin}>立即登录</button>
      </p>
    </div>
  )
} 