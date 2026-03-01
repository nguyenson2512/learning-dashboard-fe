import { NavLink, useNavigate } from 'react-router-dom'
import { Timer, Dices, FileText, Calendar, LogOut, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import styles from './Sidebar.module.css'

const nav = [
  { to: '/pomodoro', label: 'Pomodoro', icon: Timer },
  { to: '/dice', label: 'Roll dice', icon: Dices },
  { to: '/notes', label: 'Notes & Flash cards', icon: FileText },
  { to: '/calendar', label: 'Study calendar', icon: Calendar },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandIcon}>📚</span>
        <span>Learning Dashboard</span>
      </div>
      <nav className={styles.nav}>
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className={styles.footer}>
        <div className={styles.user}>
          <User size={16} />
          <span>{user?.email}</span>
          {user?.role === 'admin' && <span className={styles.badge}>Admin</span>}
        </div>
        <button type="button" className={styles.logout} onClick={handleLogout}>
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </aside>
  )
}
