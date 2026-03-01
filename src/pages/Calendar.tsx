import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, isToday } from 'date-fns'
import { enUS } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import styles from './Calendar.module.css'
import { useState } from 'react'

export interface CalendarDay {
  date: string // YYYY-MM-DD
  visited: boolean
}

export interface CalendarStats {
  days: CalendarDay[]
  streak: number
  peak: number
}

function useCalendar(month: Date) {
  const monthKey = format(month, 'yyyy-MM')
  return useQuery({
    queryKey: ['calendar', monthKey],
    queryFn: async () => {
      const { data } = await api.get<CalendarStats>(`/api/calendar?month=${monthKey}`)
      return data
    },
  })
}

function useRecordVisit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (date: string) => {
      await api.post('/api/calendar/visit', { date })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      toast.success('Study day marked!')
    },
    onError: () => toast.error('Could not record'),
  })
}

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const { data, isLoading } = useCalendar(currentMonth)
  const recordVisit = useRecordVisit()

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const visitSet = new Set((data?.days || []).filter((d) => d.visited).map((d) => d.date))

  const handleMarkToday = () => {
    if (visitSet.has(todayStr)) {
      toast('Today is already marked!')
      return
    }
    recordVisit.mutate(todayStr)
  }

  if (isLoading) return <div className={styles.loading}>Loading...</div>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Study calendar</h1>
        <p className={styles.sub}>
          Keep your streak: mark each day you visit the dashboard.
        </p>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{data?.streak ?? 0}</span>
          <span className={styles.statLabel}>Streak (consecutive days)</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{data?.peak ?? 0}</span>
          <span className={styles.statLabel}>Peak (best streak)</span>
        </div>
        <button
          type="button"
          className={styles.markBtn}
          onClick={handleMarkToday}
          disabled={recordVisit.isPending || visitSet.has(todayStr)}
        >
          {visitSet.has(todayStr) ? '✓ Today marked' : 'Mark today'}
        </button>
      </div>

      <div className={styles.calendarCard}>
        <div className={styles.calendarHeader}>
          <button type="button" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
            ←
          </button>
          <h2>{format(currentMonth, 'MMMM yyyy', { locale: enUS })}</h2>
          <button type="button" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
            →
          </button>
        </div>
        <div className={styles.weekdays}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <span key={d} className={styles.weekday}>
              {d}
            </span>
          ))}
        </div>
        <div className={styles.grid}>
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`pad-${i}`} className={styles.cell} />
          ))}
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const visited = visitSet.has(dateStr)
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const today = isToday(day)
            return (
              <div
                key={dateStr}
                className={`${styles.cell} ${!isCurrentMonth ? styles.otherMonth : ''} ${visited ? styles.visited : ''} ${today ? styles.today : ''}`}
                title={dateStr}
              >
                {format(day, 'd')}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
