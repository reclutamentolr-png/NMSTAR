'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { awardMemolifePoint } from '@/app/actions/memolife'
import { useTranslations } from 'next-intl'
import {
  Home, Calendar, CheckSquare, Receipt, Users, FileText, CalendarDays,
  Bell, AlertTriangle, Banknote, Target, Trash2, Phone, Mail,
  Hand, Clock, Save, X, Plus, AlertCircle, Pencil, Sparkles
} from 'lucide-react'

type MemoLifeDashboardProps = {
  userId: string
  userName: string
  locale: string
}

export default function MemoLifeDashboard({ userId, userName, locale }: MemoLifeDashboardProps) {
  const t = useTranslations('memolife')
  const [activeSection, setActiveSection] = useState('home')
  const [stats, setStats] = useState({ appointments: 0, tasks: 0, bills: 0, notes: 0 })
  const [appointments, setAppointments] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [bills, setBills] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month')
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItem, setNewItem] = useState<any>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [financialStats, setFinancialStats] = useState({
    totalUnpaid: 0, totalPaid: 0, dueThisMonth: 0, overdue: 0
  })
  const [upcomingAlerts, setUpcomingAlerts] = useState<any[]>([])

  const supabase = createClient()

  // ✅ FIX 1: Conversione corretta per il database (UTC)
  const formatLocalDateForDB = (dateString: string) => {
    if (!dateString) return null
    // new Date("YYYY-MM-DDTHH:mm") crea un oggetto Date nell'orario locale del browser.
    // toISOString() lo converte correttamente in UTC per il database, senza sfasamenti manuali.
    return new Date(dateString).toISOString()
  }

  // ✅ FIX 2: Ottiene l'orario locale attuale nel formato esatto richiesto dall'input
  const getMinDateTime = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const getMinDate = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  useEffect(() => { loadData() }, [userId, activeSection])
  useEffect(() => { 
    setShowAddForm(false)
    setNewItem({})
    setEditingId(null)
  }, [activeSection])
  useEffect(() => { if (activeSection === 'calendar') setWeekOffset(0) }, [activeSection])

  const loadData = async () => {
    const { count: apptCount } = await supabase.from('appointments').select('', { count: 'exact', head: true }).eq('user_id', userId).gte('date_time', new Date().toISOString())
    const { count: taskCount } = await supabase.from('tasks').select('', { count: 'exact', head: true }).eq('user_id', userId).eq('completed', false)
    const { count: billCount } = await supabase.from('bills').select('', { count: 'exact', head: true }).eq('user_id', userId).eq('paid', false)
    const { count: noteCount } = await supabase.from('notes').select('', { count: 'exact', head: true }).eq('user_id', userId)
    setStats({ appointments: apptCount || 0, tasks: taskCount || 0, bills: billCount || 0, notes: noteCount || 0 })

    const { data: allBills } = await supabase.from('bills').select('*').eq('user_id', userId).order('due_date', { ascending: true })
    const billsData = allBills || []
    setBills(billsData)

    const { data: allAppts } = await supabase.from('appointments').select('*').eq('user_id', userId).order('date_time', { ascending: true })
    setAppointments(allAppts || [])

    if (activeSection === 'tasks' || activeSection === 'home') {
      const { data } = await supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      setTasks(data || [])
    }
    if (activeSection === 'contacts') {
      const { data } = await supabase.from('contacts').select('*').eq('user_id', userId).order('name', { ascending: true })
      setContacts(data || [])
    }
    if (activeSection === 'notes') {
      const { data } = await supabase.from('notes').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      setNotes(data || [])
    }

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
    const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]

    const totalUnpaid = billsData.filter(b => !b.paid).reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0)
    const totalPaid = billsData.filter(b => b.paid).reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0)
    const dueThisMonth = billsData.filter(b => !b.paid && b.due_date >= firstOfMonth && b.due_date <= lastOfMonth).reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0)
    const overdue = billsData.filter(b => !b.paid && b.due_date < todayStr).reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0)
    setFinancialStats({ totalUnpaid, totalPaid, dueThisMonth, overdue })

    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0]

    const upcomingBills = billsData.filter(b => !b.paid && b.due_date >= todayStr && b.due_date <= threeDaysStr)
    const overdueBills = billsData.filter(b => !b.paid && b.due_date < todayStr)
    const upcomingTasks = (tasks || []).filter(t => !t.completed && t.due_date && t.due_date >= todayStr && t.due_date <= threeDaysStr)

    setUpcomingAlerts([
      ...overdueBills.map(b => ({ type: 'overdue_bill', item: b, message: t('billExpiredAlert', { title: b.title, amount: b.amount }) })),
      ...upcomingBills.map(b => ({ type: 'upcoming_bill', item: b, message: t('billDueAlert', { title: b.title, amount: b.amount, date: new Date(b.due_date + 'T00:00:00').toLocaleDateString(locale) }) })),
      ...upcomingTasks.map(task => ({ type: 'upcoming_task', item: task, message: t('taskDueAlert', { title: task.title, date: new Date(task.due_date + 'T00:00:00').toLocaleDateString(locale) }) }))
    ])
  }

  const validateAppointmentData = () => {
    if (!newItem.title || newItem.title.trim() === '') {
      return t('apptTitleRequired')
    }
    if (!newItem.date_time) {
      return t('dateRequired')
    }
    
    const selectedDate = new Date(newItem.date_time)
    const now = new Date()
    
    if (selectedDate < now) {
      return t('pastDateError')
    }
    
    return null
  }

  const handleSaveItem = async () => {
    if (activeSection === 'appointments') {
      const validationError = validateAppointmentData()
      if (validationError) {
        alert(validationError)
        return
      }
    }
    
    if (activeSection === 'tasks' || activeSection === 'bills') {
      if (!newItem.title || newItem.title.trim() === '') {
        alert(t('titleRequired'))
        return
      }
      if (!newItem.due_date) {
        alert(t('dateRequired'))
        return
      }
      
      const selectedDate = new Date(newItem.due_date + 'T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (selectedDate < today) {
        alert(t('pastDateErrorShort'))
        return
      }
    }
    
    try {
      let result: any = null
      const table = activeSection === 'appointments' ? 'appointments' :
                    activeSection === 'tasks' ? 'tasks' :
                    activeSection === 'bills' ? 'bills' :
                    activeSection === 'contacts' ? 'contacts' : 'notes'

      let dataToSave = { ...newItem }
      if (table === 'appointments' && dataToSave.date_time) {
        dataToSave.date_time = formatLocalDateForDB(dataToSave.date_time)
      }

      if (editingId) {
        result = await supabase.from(table).update(dataToSave).eq('id', editingId)
      } else {
        dataToSave.user_id = userId
        result = await supabase.from(table).insert(dataToSave)
      }
      if (result?.error) {
        console.error('DB error:', result.error)
        throw result.error
      }

      if (!editingId) {
        await awardMemolifePoint()
      }


      setShowAddForm(false)
      setNewItem({})
      setEditingId(null)
      setSuccessMessage(editingId ? t('itemSuccess') : t('elementCreated'))
      setTimeout(() => setSuccessMessage(''), 3000)
      await loadData()
    } catch (error: any) {
      console.error(error)
      if (error.message?.includes('null value in column')) {
        alert(t('dbErrorRequired'))
      } else if (error.message?.includes('violates not-null constraint')) {
        alert(t('dbErrorGeneric'))
      } else {
        alert(t('saveError', { error: error.message || t('retry') }))
      }
    }
  }

  // ✅ FIX 4: Conversione corretta da UTC (DB) a formato input locale
  const handleEditClick = (item: any, section: string) => {
    setActiveSection(section)
    let editData = { ...item }
    
    if (section === 'appointments' && item.date_time) {
      const d = new Date(item.date_time)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')
      editData.date_time = `${year}-${month}-${day}T${hours}:${minutes}`
    } else if ((section === 'tasks' || section === 'bills') && item.due_date) {
      // Aggiungiamo 'T00:00:00' per forzare il parsing come orario locale e non UTC
      const d = new Date(item.due_date + 'T00:00:00')
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      editData.due_date = `${year}-${month}-${day}`
    }
    
    setNewItem(editData)
    setEditingId(item.id)
    setShowAddForm(true)
  }

  const toggleTask = async (id: string, completed: boolean) => {
    await supabase.from('tasks').update({ completed: !completed }).eq('id', id)
    loadData()
  }

  const toggleBillPaid = async (id: string, paid: boolean) => {
    await supabase.from('bills').update({ paid: !paid }).eq('id', id)
    loadData()
  }

  const deleteItem = async (table: string, id: string) => {
    if (confirm(t('confirmDelete'))) {
      await supabase.from(table).delete().eq('id', id)
      loadData()
    }
  }

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay()
  
  const formatDate = (dateString: string, dateOnly = false) => {
    const date = new Date(dateString)
    if (dateOnly) {
      return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
    }
    return date.toLocaleString(locale, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatMonthYear = (monthIdx: number, year: number) => {
    return new Date(year, monthIdx, 1).toLocaleDateString(locale, { year: 'numeric', month: 'long' })
  }

  const getDayNames = () => {
    const names: string[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(2024, 0, i + 1)
      names.push(date.toLocaleDateString(locale, { weekday: 'short' }))
    }
    return names
  }
  const dayNames = getDayNames()

  const getEventsForDay = (day: number) => {
    const dateStr = new Date(currentYear, currentMonth, day).toISOString().split('T')[0]
    const dayAppts = appointments.filter(a => a.date_time && a.date_time.startsWith(dateStr))
    const dayBills = bills.filter(b => b.due_date === dateStr)
    const dayTasks = tasks.filter(t => t.due_date === dateStr && !t.completed)
    return { appts: dayAppts, bills: dayBills, tasks: dayTasks }
  }

  const getWeekDays = () => {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7))
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }
    return days
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const dayAppts = appointments.filter(a => a.date_time && a.date_time.startsWith(dateStr))
    const dayBills = bills.filter(b => b.due_date === dateStr)
    const dayTasks = tasks.filter(t => t.due_date === dateStr && !t.completed)
    return { appts: dayAppts, bills: dayBills, tasks: dayTasks }
  }

  const handleEventClick = (event: any, type: 'appointment' | 'bill' | 'task') => {
    setSelectedEvent({ item: event, type })
  }

  const closeEventModal = () => setSelectedEvent(null)

  const renderEventModal = () => {
    if (!selectedEvent) return null
    const { type, item } = selectedEvent
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeEventModal}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                {type === 'appointment' ? <Calendar className="w-6 h-6 text-indigo-600" /> :
                  type === 'bill' ? <Receipt className="w-6 h-6 text-red-600" /> :
                    <CheckSquare className="w-6 h-6 text-orange-600" />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                <span className={`text-xs px-2 py-1 rounded ${
                  type === 'appointment' ? 'bg-indigo-100 text-indigo-700' :
                    type === 'bill' ? (item.paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') :
                      'bg-orange-100 text-orange-700'
                  }`}>
                  {type === 'appointment' ? t('appointment') : type === 'bill' ? t('bill') : t('task')}
                </span>
              </div>
            </div>
            <button onClick={closeEventModal} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="space-y-3 mb-6">
            {type === 'appointment' && (
              <>
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-4 h-4" />
                  {/* ✅ FIX 5: Visualizzazione adattiva alla lingua del browser */}
                  <span className="font-medium">{formatDate(item.date_time)}</span>
                </div>
                {item.description && (
                  <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">{item.description}</div>
                )}
              </>
            )}
            {type === 'bill' && (
              <>
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">{t('dueDateLabel')} {formatDate(item.due_date + 'T00:00:00', true)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Banknote className="w-4 h-4" />
                  <span className="font-bold text-lg">{item.paid ? `${t('paidLabel')} ${String.fromCharCode(0x20AC)}${item.amount}` : `${t('toPayLabel')} ${String.fromCharCode(0x20AC)}${item.amount}`}</span>
                </div>
                {item.notes && (
                  <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">{item.notes}</div>
                )}
              </>
            )}
            {type === 'task' && (
              <>
                <div className="flex items-center gap-2 text-gray-700">
                  <Target className="w-4 h-4" />
                  <span className="font-medium">{t('dueDateLabel')} {item.due_date ? formatDate(item.due_date + 'T00:00:00', true) : t('notSet')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    item.priority === 'high' ? 'bg-red-100 text-red-600' :
                    item.priority === 'medium' ? 'bg-orange-100 text-orange-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {t('priorityLabel')} {item.priority === 'high' ? t('high') : item.priority === 'medium' ? t('medium') : t('low')}
                  </span>
                </div>
                {item.description && (
                  <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">{item.description}</div>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { handleEditClick(item, type === 'appointment' ? 'appointments' : type === 'bill' ? 'bills' : 'tasks'); closeEventModal(); }}
              className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-1"
            >
              <Pencil className="w-4 h-4" /> {t('edit')}
            </button>
            
            {type === 'bill' && (
              <button
                onClick={() => { toggleBillPaid(item.id, item.paid); closeEventModal() }}
                className={`flex-1 py-2 rounded-lg font-medium ${
                  item.paid ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
              >
                {item.paid ? t('markAsUnpaid') : t('markAsPaid')}
              </button>
            )}
            {type === 'task' && (
              <button
                onClick={() => { toggleTask(item.id, item.completed); closeEventModal() }}
                className={`flex-1 py-2 rounded-lg font-medium ${
                  item.completed ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
              >
                {item.completed ? t('markAsNotCompleted') : t('markAsCompleted')}
              </button>
            )}
            <button
              onClick={() => {
                const table = type === 'appointment' ? 'appointments' : type === 'bill' ? 'bills' : 'tasks'
                deleteItem(table, item.id)
                closeEventModal()
              }}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
            >
              {t('delete')}
            </button>
            <button onClick={closeEventModal} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium">
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderCalendar = () => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    const prevMonth = () => {
      if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1) }
      else setCurrentMonth(currentMonth - 1)
    }
    const nextMonth = () => {
      if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1) }
      else setCurrentMonth(currentMonth + 1)
    }
    const prevWeek = () => setWeekOffset(weekOffset - 1)
    const nextWeek = () => setWeekOffset(weekOffset + 1)

    if (calendarView === 'week') {
      const weekDays = getWeekDays()
      const firstDay = weekDays[0]
      const lastDay = weekDays[6]
      const weekTitle = `${firstDay.getDate()} ${formatMonthYear(firstDay.getMonth(), firstDay.getFullYear())} - ${lastDay.getDate()} ${formatMonthYear(lastDay.getMonth(), lastDay.getFullYear())} ${lastDay.getFullYear()}`
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <button onClick={prevWeek} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 font-bold text-sm">&lt; {t('previousWeek')}</button>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-gray-900">{weekTitle}</h3>
              <button onClick={() => setCalendarView('month')} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm">{t('monthView')}</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setWeekOffset(0)} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-sm font-medium">{t('today')}</button>
              <button onClick={nextWeek} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 font-bold text-sm">{t('nextWeek')} &gt;</button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, idx) => {
              const dateStr = day.toISOString().split('T')[0]
              const isToday = dateStr === todayStr
              const events = getEventsForDate(day)
              return (
                <div key={idx} className={`min-h-[200px] border border-gray-200 rounded-lg p-2 ${isToday ? 'bg-indigo-50 border-indigo-400' : 'bg-white'}`}>
                  <div className={`text-center font-semibold mb-2 ${isToday ? 'text-indigo-600' : 'text-gray-700'}`}>
                    <div className="text-xs">{dayNames[day.getDay()]}</div>
                    <div className="text-lg">{day.getDate()}</div>
                  </div>
                  <div className="space-y-1">
                    {events.appts.map(a => (
                      <div key={a.id} onClick={() => handleEventClick(a, 'appointment')} className="text-[10px] bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded cursor-pointer hover:bg-indigo-200 truncate flex items-center gap-1">
                        <Calendar className="w-3 h-3 flex-shrink-0" /> {a.title}
                      </div>
                    ))}
                    {events.bills.map(b => (
                      <div key={b.id} onClick={() => handleEventClick(b, 'bill')} className={`text-[10px] px-1 py-0.5 rounded cursor-pointer hover:opacity-80 truncate flex items-center gap-1 ${b.paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        <Receipt className="w-3 h-3 flex-shrink-0" /> {b.title}
                      </div>
                    ))}
                    {events.tasks.map(t => (
                      <div key={t.id} onClick={() => handleEventClick(t, 'task')} className="text-[10px] bg-orange-100 text-orange-700 px-1 py-0.5 rounded cursor-pointer hover:bg-orange-200 truncate flex items-center gap-1">
                        <CheckSquare className="w-3 h-3 flex-shrink-0" /> {t.title}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-indigo-100 rounded"></span> {t('appointments')}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 rounded"></span> {t('billsToPay')}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 rounded"></span> {t('billsPaid')}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-100 rounded"></span> {t('tasks')}</span>
          </div>
        </div>
      )
    }

    const daysInMonth = getDaysInMonth(currentMonth, currentYear)
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
    const days = []
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50"></div>)
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = new Date(currentYear, currentMonth, day).toISOString().split('T')[0]
      const isToday = dateStr === todayStr
      const events = getEventsForDay(day)
      const hasEvents = events.appts.length > 0 || events.bills.length > 0 || events.tasks.length > 0
      days.push(
        <div key={day} className={`h-24 border border-gray-200 p-1 overflow-hidden ${isToday ? 'bg-indigo-50 border-indigo-400' : 'bg-white'}`}>
          <div className={`text-xs font-semibold mb-1 ${isToday ? 'text-indigo-600' : 'text-gray-700'}`}>{day}</div>
          <div className="space-y-0.5">
            {events.appts.slice(0, 2).map(a => (
              <div key={a.id} onClick={() => handleEventClick(a, 'appointment')} className="text-[9px] bg-indigo-100 text-indigo-700 px-1 rounded truncate cursor-pointer hover:bg-indigo-200 flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5 flex-shrink-0" /> {a.title}
              </div>
            ))}
            {events.bills.slice(0, 2).map(b => (
              <div key={b.id} onClick={() => handleEventClick(b, 'bill')} className={`text-[9px] px-1 rounded truncate cursor-pointer hover:opacity-80 flex items-center gap-0.5 ${b.paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <Receipt className="w-2.5 h-2.5 flex-shrink-0" /> {b.title}
              </div>
            ))}
            {events.tasks.slice(0, 1).map(t => (
              <div key={t.id} onClick={() => handleEventClick(t, 'task')} className="text-[9px] bg-orange-100 text-orange-700 px-1 rounded truncate cursor-pointer hover:bg-orange-200 flex items-center gap-0.5">
                <CheckSquare className="w-2.5 h-2.5 flex-shrink-0" /> {t.title}
              </div>
            ))}
            {hasEvents && (events.appts.length + events.bills.length + events.tasks.length > 3) && (
              <div className="text-[9px] text-gray-500">+{events.appts.length + events.bills.length + events.tasks.length - 3} {t('others')}</div>
            )}
          </div>
        </div>
      )
    }
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <button onClick={prevMonth} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">&lt; {t('previousMonth')}</button>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900">{formatMonthYear(currentMonth, currentYear)}</h3>
            <button onClick={() => setCalendarView('week')} className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm">{t('weekView')}</button>
          </div>
          <button onClick={nextMonth} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">{t('nextMonth')} &gt;</button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(d => <div key={d} className="text-center text-xs font-semibold text-gray-600 py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">{days}</div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-indigo-100 rounded"></span> {t('appointments')}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 rounded"></span> {t('billsToPay')}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 rounded"></span> {t('billsPaid')}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-100 rounded"></span> {t('tasks')}</span>
        </div>
      </div>
    )
  }

  const renderHome = () => (
    <div className="space-y-6">
      {upcomingAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 p-4 rounded-lg">
          <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {t('alertsTitle', { count: upcomingAlerts.length })}
          </h3>
          <div className="space-y-1">
            {upcomingAlerts.map((alert, idx) => (
              <div key={idx} className={`text-sm flex items-start gap-2 ${alert.type === 'overdue_bill' ? 'text-red-700 font-semibold' : 'text-amber-800'}`}>
                {alert.type === 'overdue_bill' && <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 uppercase tracking-wide">{t('totalToPay')}</div>
          <div className="text-2xl font-bold text-red-600 mt-1 flex items-center gap-1">
            <Banknote className="w-5 h-5" />
            €{financialStats.totalUnpaid.toFixed(2)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 uppercase tracking-wide">{t('paidThisMonth')}</div>
          <div className="text-2xl font-bold text-green-600 mt-1 flex items-center gap-1">
            <Banknote className="w-5 h-5" />
            €{financialStats.totalPaid.toFixed(2)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 uppercase tracking-wide">{t('dueThisMonth')}</div>
          <div className="text-2xl font-bold text-orange-600 mt-1 flex items-center gap-1">
            <Clock className="w-5 h-5" />
            €{financialStats.dueThisMonth.toFixed(2)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 uppercase tracking-wide">{t('overdue')}</div>
          <div className="text-2xl font-bold text-red-700 mt-1 flex items-center gap-1">
            <AlertCircle className="w-5 h-5" />
            €{financialStats.overdue.toFixed(2)}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide"><Calendar className="w-4 h-4" /> {t('appointments')}</div>
          <div className="text-3xl font-bold text-indigo-600 mt-2">{stats.appointments}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide"><CheckSquare className="w-4 h-4" /> {t('tasks')}</div>
          <div className="text-3xl font-bold text-orange-600 mt-2">{stats.tasks}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide"><Receipt className="w-4 h-4" /> {t('bills')}</div>
          <div className="text-3xl font-bold text-red-600 mt-2">{stats.bills}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide"><FileText className="w-4 h-4" /> {t('notes')}</div>
          <div className="text-3xl font-bold text-green-600 mt-2">{stats.notes}</div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Calendar className="w-5 h-5" /> {t('upcomingAppointments')}</h3>
          <div className="space-y-2">
            {appointments.slice(0, 3).map(a => (
              <div key={a.id} onClick={() => handleEventClick(a, 'appointment')} className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-50">
                <div><div className="font-medium text-sm">{a.title}</div><div className="text-xs text-gray-500">{formatDate(a.date_time)}</div></div>
              </div>
            ))}
            {appointments.length === 0 && <div className="text-sm text-gray-400 text-center py-4">{t('noAppointmentsList')}</div>}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><CheckSquare className="w-5 h-5" /> {t('tasksAndBills')}</h3>
          <div className="space-y-2">
            {tasks.slice(0, 2).map(t => (
              <div key={t.id} className="bg-white p-3 rounded-lg border border-gray-200 flex items-center gap-3">
                <input type="checkbox" checked={t.completed} onChange={() => toggleTask(t.id, t.completed)} className="w-4 h-4 text-indigo-600 rounded" />
                <span className={`text-sm ${t.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{t.title}</span>
              </div>
            ))}
            {bills.filter(b => !b.paid).slice(0, 2).map(b => (
              <div key={b.id} onClick={() => handleEventClick(b, 'bill')} className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-50">
                <span className="text-sm text-gray-800">{b.title}</span>
                <span className="text-sm font-bold text-red-600 flex items-center gap-1"><Banknote className="w-4 h-4" />€{b.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const renderAppointments = () => (
    <div className="space-y-4">
      <button onClick={() => { setEditingId(null); setShowAddForm(!showAddForm) }} className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center justify-center gap-2">
        <Plus className="w-5 h-5" /> {editingId ? t('cancelEdit') : t('newAppointment')}
      </button>
      {showAddForm && (
        <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
          <input 
             placeholder={t('titleApptPlaceholder')} 
            value={newItem.title || ''} 
            onChange={e => setNewItem({ ...newItem, title: e.target.value })} 
            className="w-full p-2 border rounded" 
            required 
          />
          <input 
            type="datetime-local" 
            min={getMinDateTime()} 
            value={newItem.date_time || ''} 
            onChange={e => {
              const val = e.target.value
              if (val) {
                const selected = new Date(val)
                const now = new Date()
                if (selected < now) {
                  alert(t('pastDateError'))
                  setNewItem({ ...newItem, date_time: '' })
                  return
                }
              }
              setNewItem({ ...newItem, date_time: val })
            }} 
            className="w-full p-2 border rounded" 
            required 
          />
          <textarea 
             placeholder={t('notesOptional')} 
            value={newItem.description || ''} 
            onChange={e => setNewItem({ ...newItem, description: e.target.value })} 
            className="w-full p-2 border rounded h-20" 
          />
          <div className="flex gap-2">
            <button 
              onClick={handleSaveItem} 
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
            >
              <Save className="w-4 h-4" /> {editingId ? t('update') : t('save')}
            </button>
            <button 
              onClick={() => { setShowAddForm(false); setNewItem({}); setEditingId(null) }} 
              className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {appointments.map(a => (
          <div key={a.id} onClick={() => handleEventClick(a, 'appointment')} className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-50">
            <div><div className="font-semibold">{a.title}</div><div className="text-sm text-gray-500">{formatDate(a.date_time)}</div></div>
            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
              <button onClick={() => handleEditClick(a, 'appointments')} className="text-blue-500 hover:text-blue-700 p-1"><Pencil className="w-5 h-5" /></button>
              <button onClick={() => deleteItem('appointments', a.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-5 h-5" /></button>
            </div>
          </div>
        ))}
        {appointments.length === 0 && !showAddForm && <div className="text-center text-gray-400 py-8">{t('noAppointmentsList')}</div>}
      </div>
    </div>
  )

  const renderTasks = () => (
    <div className="space-y-4">
      <button onClick={() => { setEditingId(null); setShowAddForm(!showAddForm) }} className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium flex items-center justify-center gap-2">
        <Plus className="w-5 h-5" /> {editingId ? t('cancelEdit') : t('newTask')}
      </button>
      {showAddForm && (
        <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
          <input 
             placeholder={t('taskPlaceholder')} 
            value={newItem.title || ''} 
            onChange={e => setNewItem({ ...newItem, title: e.target.value })} 
            className="w-full p-2 border rounded" 
            required 
          />
          <input 
            type="date" 
            min={getMinDate()} 
            value={newItem.due_date || ''} 
            onChange={e => {
              const val = e.target.value
              if (val) {
                const selected = new Date(val + 'T00:00:00')
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                if (selected < today) {
                  alert(t('pastDateErrorShort'))
                  setNewItem({ ...newItem, due_date: '' })
                  return
                }
              }
              setNewItem({ ...newItem, due_date: val })
            }} 
            className="w-full p-2 border rounded" 
          />
          <select 
            value={newItem.priority || 'medium'} 
            onChange={e => setNewItem({ ...newItem, priority: e.target.value })} 
            className="w-full p-2 border rounded"
          >
            <option value="low">{t('low')}</option>
            <option value="medium">{t('medium')}</option>
            <option value="high">{t('high')}</option>
          </select>
          <div className="flex gap-2">
            <button 
              onClick={handleSaveItem} 
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
            >
              <Save className="w-4 h-4" /> {editingId ? t('update') : t('save')}
            </button>
            <button 
              onClick={() => { setShowAddForm(false); setNewItem({}); setEditingId(null) }} 
              className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {tasks.map(t => (
          <div key={t.id} className={`bg-white p-4 rounded-xl border flex items-center justify-between ${t.completed ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                checked={t.completed} 
                onChange={() => toggleTask(t.id, t.completed)} 
                className="w-5 h-5 text-indigo-600 rounded" 
              />
              <div 
                onClick={() => handleEventClick(t, 'task')} 
                className="cursor-pointer hover:bg-gray-50 p-2 rounded flex-1"
              >
                <div className={`font-medium ${t.completed ? 'line-through' : ''}`}>{t.title}</div>
                {t.due_date && <div className="text-xs text-gray-500">{t('dueDateLabel')} {formatDate(t.due_date + 'T00:00:00', true)}</div>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded ${t.priority === 'high' ? 'bg-red-100 text-red-600' : t.priority === 'medium' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                {t.priority === 'high' ? t('high') : t.priority === 'medium' ? t('medium') : t('low')}
              </span>
              <button 
                onClick={() => handleEditClick(t, 'tasks')} 
                className="text-blue-500 hover:text-blue-700 p-1"
              >
                <Pencil className="w-5 h-5" />
              </button>
              <button 
                onClick={() => deleteItem('tasks', t.id)} 
                className="text-red-500 hover:text-red-700 p-1"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
        {tasks.length === 0 && !showAddForm && <div className="text-center text-gray-400 py-8">{t('noTasksList')}</div>}
      </div>
    </div>
  )

  const renderBills = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 p-3 rounded-lg border border-red-200">
          <div className="text-xs text-red-600 flex items-center gap-1"><Receipt className="w-3 h-3" /> {t('toPay')}</div>
          <div className="text-xl font-bold text-red-700">€{financialStats.totalUnpaid.toFixed(2)}</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <div className="text-xs text-green-600 flex items-center gap-1"><Banknote className="w-3 h-3" /> {t('paid')}</div>
          <div className="text-xl font-bold text-green-700">€{financialStats.totalPaid.toFixed(2)}</div>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
          <div className="text-xs text-orange-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {t('overdue')}</div>
          <div className="text-xl font-bold text-orange-700">€{financialStats.overdue.toFixed(2)}</div>
        </div>
      </div>
      <button onClick={() => { setEditingId(null); setShowAddForm(!showAddForm) }} className="w-full py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium flex items-center justify-center gap-2">
        <Plus className="w-5 h-5" /> {editingId ? t('cancelEdit') : t('newBill')}
      </button>
      {showAddForm && (
        <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
          <input 
             placeholder={t('titleBillPlaceholder')} 
            value={newItem.title || ''} 
            onChange={e => setNewItem({ ...newItem, title: e.target.value })} 
            className="w-full p-2 border rounded" 
            required 
          />
          <input 
            type="number" 
            step="0.01" 
             placeholder={t('amountPlaceholder')} 
            value={newItem.amount || ''} 
            onChange={e => setNewItem({ ...newItem, amount: e.target.value })} 
            className="w-full p-2 border rounded" 
            required 
          />
          <input 
            type="date" 
            min={getMinDate()} 
            value={newItem.due_date || ''} 
            onChange={e => {
              const val = e.target.value
              if (val) {
                const selected = new Date(val + 'T00:00:00')
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                if (selected < today) {
                   alert(t('pastDateErrorShort'))
                   setNewItem({ ...newItem, due_date: '' })
                   return
                 }
               }
               setNewItem({ ...newItem, due_date: val })
             }} 
             className="w-full p-2 border rounded" 
             required 
           />
           <div className="flex gap-2">
             <button 
               onClick={handleSaveItem} 
               className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
             >
               <Save className="w-4 h-4" /> {editingId ? t('update') : t('save')}
             </button>
             <button 
               onClick={() => { setShowAddForm(false); setNewItem({}); setEditingId(null) }} 
               className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
             >
               {t('cancel')}
             </button>
           </div>
        </div>
      )}
      <div className="space-y-3">
        {bills.map(b => (
          <div 
            key={b.id} 
            onClick={() => handleEventClick(b, 'bill')} 
            className={`bg-white p-4 rounded-xl border flex justify-between items-center cursor-pointer hover:bg-gray-50 ${b.paid ? 'bg-green-50 border-green-200' : ''}`}
          >
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                checked={b.paid} 
                onChange={(e) => { e.stopPropagation(); toggleBillPaid(b.id, b.paid) }} 
                className="w-5 h-5 text-green-600 rounded" 
              />
              <div>
                <div className={`font-semibold ${b.paid ? 'line-through text-gray-500' : ''}`}>{b.title}</div>
                <div className="text-xs text-gray-500">{t('dueDateLabel')} {formatDate(b.due_date + 'T00:00:00', true)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-lg font-bold ${b.paid ? 'text-green-600' : 'text-red-600'}`}>€{b.amount}</span>
              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                <button 
                  onClick={() => handleEditClick(b, 'bills')} 
                  className="text-blue-500 hover:text-blue-700 p-1"
                >
                  <Pencil className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => deleteItem('bills', b.id)} 
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {bills.length === 0 && !showAddForm && <div className="text-center text-gray-400 py-8">{t('noBillsList')}</div>}
      </div>
    </div>
  )

  const renderContacts = () => (
    <div className="space-y-4">
      <button onClick={() => { setEditingId(null); setShowAddForm(!showAddForm) }} className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium flex items-center justify-center gap-2">
        <Plus className="w-5 h-5" /> {editingId ? t('cancelEdit') : t('newContact')}
      </button>
      {showAddForm && (
        <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
          <input 
            placeholder={t('name')} 
            value={newItem.name || ''} 
            onChange={e => setNewItem({ ...newItem, name: e.target.value })} 
            className="w-full p-2 border rounded" 
            required 
          />
          <input 
            placeholder={t('phone')} 
            value={newItem.phone || ''} 
            onChange={e => setNewItem({ ...newItem, phone: e.target.value })} 
            className="w-full p-2 border rounded" 
          />
          <input 
            placeholder={t('email')} 
            value={newItem.email || ''} 
            onChange={e => setNewItem({ ...newItem, email: e.target.value })} 
            className="w-full p-2 border rounded" 
          />
          <div className="flex gap-2">
            <button 
              onClick={handleSaveItem} 
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
            >
              <Save className="w-4 h-4" /> {editingId ? t('update') : t('save')}
            </button>
            <button 
              onClick={() => { setShowAddForm(false); setNewItem({}); setEditingId(null) }} 
              className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-3">
        {contacts.map(c => (
          <div key={c.id} className="bg-white p-4 rounded-xl border border-gray-200 relative group">
            <div className="font-semibold text-gray-900">{c.name}</div>
            {c.phone && <div className="text-sm text-gray-600 flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</div>}
            {c.email && <div className="text-sm text-gray-600 flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</div>}
            <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
              <button 
                onClick={() => handleEditClick(c, 'contacts')} 
                className="text-blue-500 hover:text-blue-700 text-xs flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" /> {t('edit')}
              </button>
              <button 
                onClick={() => deleteItem('contacts', c.id)} 
                className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> {t('delete')}
              </button>
            </div>
          </div>
        ))}
        {contacts.length === 0 && !showAddForm && <div className="text-center text-gray-400 py-8 col-span-2">{t('noContactsList')}</div>}
      </div>
    </div>
  )

  const renderNotes = () => (
    <div className="space-y-4">
      <button onClick={() => { setEditingId(null); setShowAddForm(!showAddForm) }} className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium flex items-center justify-center gap-2">
        <Plus className="w-5 h-5" /> {editingId ? t('cancelEdit') : t('newNote')}
      </button>
      {showAddForm && (
        <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
          <input 
            placeholder="Titolo" 
            value={newItem.title || ''} 
            onChange={e => setNewItem({ ...newItem, title: e.target.value })} 
            className="w-full p-2 border rounded" 
            required 
          />
          <textarea 
            placeholder={t('contentPlaceholder')} 
            value={newItem.content || ''} 
            onChange={e => setNewItem({ ...newItem, content: e.target.value })} 
            className="w-full p-2 border rounded h-24" 
            required 
          />
          <div className="flex gap-2">
            <button 
              onClick={handleSaveItem} 
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
            >
              <Save className="w-4 h-4" /> {editingId ? t('update') : t('save')}
            </button>
            <button 
              onClick={() => { setShowAddForm(false); setNewItem({}); setEditingId(null) }} 
              className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-3">
        {notes.map(n => (
          <div key={n.id} className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 relative">
            <div className="font-semibold text-gray-900 mb-1">{n.title}</div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{n.content}</div>
            <div className="flex gap-2 mt-3 pt-2 border-t border-yellow-200">
              <button 
                onClick={() => handleEditClick(n, 'notes')} 
                className="text-blue-500 hover:text-blue-700 text-xs flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" /> {t('edit')}
              </button>
              <button 
                onClick={() => deleteItem('notes', n.id)} 
                className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> {t('delete')}
              </button>
            </div>
          </div>
        ))}
        {notes.length === 0 && !showAddForm && <div className="text-center text-gray-400 py-8 col-span-2">{t('noNotesList')}</div>}
      </div>
    </div>
  )

  const menuItems = [
    { id: 'home', label: t('home'), Icon: Home },
    { id: 'appointments', label: t('appointments'), Icon: Calendar },
    { id: 'tasks', label: t('tasks'), Icon: CheckSquare },
    { id: 'bills', label: t('bills'), Icon: Receipt },
    { id: 'contacts', label: t('contacts'), Icon: Users },
    { id: 'notes', label: t('notes'), Icon: FileText },
    { id: 'calendar', label: t('calendar'), Icon: CalendarDays },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1">
        <nav className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-2 sticky top-4">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${activeSection === item.id ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 text-gray-700'
                }`}
            >
              <item.Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="lg:col-span-3 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {activeSection === 'home' && <>{t('greeting', { name: userName.split(' ')[0] })} <Hand className="w-7 h-7" /></>}
            {activeSection === 'appointments' && <><Calendar className="w-7 h-7" /> {t('appointments')}</>}
            {activeSection === 'tasks' && <><CheckSquare className="w-7 h-7" /> {t('tasks')}</>}
            {activeSection === 'bills' && <><Receipt className="w-7 h-7" /> {t('bills')}</>}
            {activeSection === 'contacts' && <><Users className="w-7 h-7" /> {t('contacts')}</>}
            {activeSection === 'notes' && <><FileText className="w-7 h-7" /> {t('notes')}</>}
            {activeSection === 'calendar' && <><CalendarDays className="w-7 h-7" /> {t('calendar')}</>}
          </h2>
        </div>
        {successMessage && <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 font-medium">{successMessage}</div>}
        {activeSection === 'home' && renderHome()}
        {activeSection === 'appointments' && renderAppointments()}
        {activeSection === 'tasks' && renderTasks()}
        {activeSection === 'bills' && renderBills()}
        {activeSection === 'contacts' && renderContacts()}
        {activeSection === 'notes' && renderNotes()}
        {activeSection === 'calendar' && renderCalendar()}
      </div>
      {renderEventModal()}
    </div>
  )
}