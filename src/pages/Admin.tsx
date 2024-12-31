import { useState, useEffect } from 'react'
import { AdminStats, UserManagement, GroupManagement } from '../types/admin'
import '../styles/Admin.css'

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<UserManagement[]>([])
  const [groups, setGroups] = useState<GroupManagement[]>([])
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'groups'>('stats')
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('chat-user') || '{}')
    setCurrentUser(user)
    fetchData()
  }, [])

  const fetchData = async () => {
    const token = localStorage.getItem('chat-token')
    if (!token) return

    try {
      const statsResponse = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const statsData = await statsResponse.json()
      if (statsData.success) {
        setStats(statsData.data)
      }

      const usersResponse = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const usersData = await usersResponse.json()
      if (usersData.success) {
        setUsers(usersData.data)
      }

      const groupsResponse = await fetch('/api/admin/groups', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const groupsData = await groupsResponse.json()
      if (groupsData.success) {
        setGroups(groupsData.data)
      }
    } catch (error) {
      console.error('Error fetching admin data:', error)
    }
  }

  const handleAction = async (action: string, userId: string, data?: any) => {
    const token = localStorage.getItem('chat-token')
    if (!token) return

    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, userId, data })
      })

      const result = await response.json()
      if (result.success) {
        fetchData() // 刷新数据
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('Error performing admin action:', error)
    }
  }

  if (!currentUser || !['admin', 'super_admin'].includes(currentUser.role)) {
    return <div>无权访问</div>
  }

  return (
    <div className="admin-dashboard">
      <nav className="admin-nav">
        <button onClick={() => setActiveTab('stats')}>统计数据</button>
        <button onClick={() => setActiveTab('users')}>用户管理</button>
        <button onClick={() => setActiveTab('groups')}>群组管理</button>
      </nav>

      {activeTab === 'stats' && stats && (
        <div className="stats-panel">
          <h2>系统统计</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>总用户数</h3>
              <p>{stats.totalUsers}</p>
            </div>
            <div className="stat-card">
              <h3>总群组数</h3>
              <p>{stats.totalGroups}</p>
            </div>
            <div className="stat-card">
              <h3>消息总数</h3>
              <p>{stats.totalMessages}</p>
            </div>
            <div className="stat-card">
              <h3>活跃用户</h3>
              <p>{stats.activeUsers}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="users-panel">
          <h2>用户管理</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户名</th>
                <th>角色</th>
                <th>注册时间</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>{user.role}</td>
                  <td>{new Date(user.createdAt).toLocaleString()}</td>
                  <td>{user.isBanned ? '已封禁' : '正常'}</td>
                  <td className="action-buttons">
                    {currentUser.role === 'super_admin' && (
                      <>
                        <button onClick={() => handleAction('change_username', user.id, { newUsername: prompt('输入新用户名') })}>
                          改名
                        </button>
                        <button onClick={() => handleAction('set_role', user.id, { role: user.role === 'admin' ? 'user' : 'admin' })}>
                          {user.role === 'admin' ? '降级' : '升级'}
                        </button>
                      </>
                    )}
                    <button onClick={() => handleAction(user.isBanned ? 'unban_user' : 'ban_user', user.id)}>
                      {user.isBanned ? '解封' : '封禁'}
                    </button>
                    <button onClick={() => handleAction('change_password', user.id, { newPassword: prompt('输入新密码') })}>
                      改密
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="groups-panel">
          <h2>群组管理</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>群名称</th>
                <th>成员数</th>
                <th>创建时间</th>
                <th>群主</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(group => (
                <tr key={group.id}>
                  <td>{group.id}</td>
                  <td>{group.name}</td>
                  <td>{group.memberCount}</td>
                  <td>{new Date(group.createdAt).toLocaleString()}</td>
                  <td>{group.ownerId}</td>
                  <td>
                    <button onClick={() => handleAction('dissolve_group', group.id)}>
                      解散群组
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}