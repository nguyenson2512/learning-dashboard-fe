import { useState, useEffect, useCallback } from 'react'
import { Play, Pause, RotateCcw, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import styles from './Pomodoro.module.css'

const STORAGE_SETTINGS = 'pomodoro_settings'
const STORAGE_TODOS = 'pomodoro_todos'

export type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak'

export interface PomodoroSettings {
  pomodoroMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
  longBreakInterval: number
}

export interface TodoItem {
  id: string
  text: string
  done: boolean
  createdAt: number
}

const defaultSettings: PomodoroSettings = {
  pomodoroMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  autoStartBreaks: true,
  autoStartPomodoros: false,
  longBreakInterval: 4,
}

function loadSettings(): PomodoroSettings {
  try {
    const s = localStorage.getItem(STORAGE_SETTINGS)
    if (s) return { ...defaultSettings, ...JSON.parse(s) }
  } catch {}
  return defaultSettings
}

function loadTodos(): TodoItem[] {
  try {
    const s = localStorage.getItem(STORAGE_TODOS)
    if (s) return JSON.parse(s)
  } catch {}
  return []
}

function saveTodos(todos: TodoItem[]) {
  localStorage.setItem(STORAGE_TODOS, JSON.stringify(todos))
}

export default function Pomodoro() {
  const [settings, setSettings] = useState<PomodoroSettings>(loadSettings)
  const [todos, setTodos] = useState<TodoItem[]>(loadTodos)
  const [mode, setMode] = useState<TimerMode>('pomodoro')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [running, setRunning] = useState(false)
  const [pomodoroCount, setPomodoroCount] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [newTodo, setNewTodo] = useState('')

  const getMinutes = useCallback(() => {
    if (mode === 'pomodoro') return settings.pomodoroMinutes
    if (mode === 'shortBreak') return settings.shortBreakMinutes
    return settings.longBreakMinutes
  }, [mode, settings])

  const initTimer = useCallback(() => {
    setSecondsLeft(getMinutes() * 60)
  }, [getMinutes])

  useEffect(() => {
    initTimer()
  }, [mode, settings.pomodoroMinutes, settings.shortBreakMinutes, settings.longBreakMinutes, initTimer])

  useEffect(() => {
    if (!running || secondsLeft <= 0) return
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [running, secondsLeft])

  useEffect(() => {
    // Only run "timer ended" when we actually reached 0 while running (not on initial mount when secondsLeft is 0)
    if (!running || secondsLeft !== 0) return
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU')
      audio.volume = 0.5
      audio.play().catch(() => {})
    } catch {}
    toast.success(mode === 'pomodoro' ? 'Pomodoro ended!' : 'Break ended!')
    setRunning(false)
    if (mode === 'pomodoro') {
      const next = pomodoroCount + 1
      setPomodoroCount(next)
      if (next % settings.longBreakInterval === 0 && settings.autoStartBreaks) {
        setMode('longBreak')
        initTimer()
        setRunning(true)
      } else if (settings.autoStartBreaks) {
        setMode('shortBreak')
        initTimer()
        setRunning(true)
      }
    } else if (settings.autoStartPomodoros) {
      setMode('pomodoro')
      initTimer()
      setRunning(true)
    }
  }, [secondsLeft, mode, settings, pomodoroCount, initTimer])

  const saveSettings = (s: PomodoroSettings) => {
    setSettings(s)
    localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(s))
    setShowSettings(false)
    initTimer()
  }

  const addTodo = () => {
    const t = newTodo.trim()
    if (!t) return
    const item: TodoItem = {
      id: crypto.randomUUID(),
      text: t,
      done: false,
      createdAt: Date.now(),
    }
    const next = [...todos, item]
    setTodos(next)
    saveTodos(next)
    setNewTodo('')
  }

  const toggleTodo = (id: string) => {
    const next = todos.map((x) => (x.id === id ? { ...x, done: !x.done } : x))
    setTodos(next)
    saveTodos(next)
  }

  const deleteTodo = (id: string) => {
    const next = todos.filter((x) => x.id !== id)
    setTodos(next)
    saveTodos(next)
  }

  const m = Math.floor(secondsLeft / 60)
  const s = secondsLeft % 60
  const display = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Pomodoro</h1>
        <button
          type="button"
          className={styles.settingsBtn}
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
        >
          <Settings size={22} />
        </button>
      </div>

      <div className={styles.timerCard}>
        <div className={styles.modes}>
          {(['pomodoro', 'shortBreak', 'longBreak'] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={mode === m ? styles.modeActive : styles.mode}
              onClick={() => {
                setMode(m)
                setRunning(false)
                setSecondsLeft((m === 'pomodoro' ? settings.pomodoroMinutes : m === 'shortBreak' ? settings.shortBreakMinutes : settings.longBreakMinutes) * 60)
              }}
            >
              {m === 'pomodoro' ? 'Pomodoro' : m === 'shortBreak' ? 'Short Break' : 'Long Break'}
            </button>
          ))}
        </div>
        <div className={styles.display}>{display}</div>
        <div className={styles.controls}>
          <button type="button" className={styles.ctrl} onClick={() => setRunning(!running)}>
            {running ? <Pause size={28} /> : <Play size={28} />}
          </button>
          <button type="button" className={styles.ctrl} onClick={initTimer}>
            <RotateCcw size={24} />
          </button>
        </div>
        {mode === 'pomodoro' && <p className={styles.count}>Completed: {pomodoroCount} pomodoros</p>}
      </div>

      <div className={styles.todoSection}>
        <h2>Todo list</h2>
        <div className={styles.todoInput}>
          <input
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            placeholder="Add a task..."
          />
          <          button type="button" onClick={addTodo}>
            Add
          </button>
        </div>
        <ul className={styles.todoList}>
          {todos.map((item) => (
            <li key={item.id} className={item.done ? styles.todoDone : ''}>
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleTodo(item.id)}
              />
              <span>{item.text}</span>
              <button type="button" className={styles.todoDel} onClick={() => deleteTodo(item.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>

      {showSettings && (
        <PomodoroSettingsModal
          settings={settings}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

function PomodoroSettingsModal({
  settings,
  onSave,
  onClose,
}: {
  settings: PomodoroSettings
  onSave: (s: PomodoroSettings) => void
  onClose: () => void
}) {
  const [s, setS] = useState(settings)
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>Pomodoro settings</h3>
        <div className={styles.form}>
          <label>
            Pomodoro (min)
            <input
              type="number"
              min={1}
              max={60}
              value={s.pomodoroMinutes}
              onChange={(e) => setS({ ...s, pomodoroMinutes: Number(e.target.value) })}
            />
          </label>
          <label>
            Short Break (min)
            <input
              type="number"
              min={1}
              max={30}
              value={s.shortBreakMinutes}
              onChange={(e) => setS({ ...s, shortBreakMinutes: Number(e.target.value) })}
            />
          </label>
          <label>
            Long Break (min)
            <input
              type="number"
              min={1}
              max={60}
              value={s.longBreakMinutes}
              onChange={(e) => setS({ ...s, longBreakMinutes: Number(e.target.value) })}
            />
          </label>
          <label>
            Long break after every N pomodoros
            <input
              type="number"
              min={2}
              max={10}
              value={s.longBreakInterval}
              onChange={(e) => setS({ ...s, longBreakInterval: Number(e.target.value) })}
            />
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={s.autoStartBreaks}
              onChange={(e) => setS({ ...s, autoStartBreaks: e.target.checked })}
            />
            Auto start Short/Long Break
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={s.autoStartPomodoros}
              onChange={(e) => setS({ ...s, autoStartPomodoros: e.target.checked })}
            />
            Auto start next Pomodoro
          </label>
        </div>
        <div className={styles.modalActions}>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.primary} onClick={() => onSave(s)}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
