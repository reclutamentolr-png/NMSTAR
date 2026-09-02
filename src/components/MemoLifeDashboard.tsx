'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Home, Calendar, CheckSquare, Receipt, Users, FileText, CalendarDays,
  Bell, AlertTriangle, Banknote, Target, Trash2, Phone, Mail,
  Hand, Clock, Save, X, Plus, AlertCircle
} from 'lucide-react'

type MemoLifeDashboardProps = {
  userId: string
  userName: string
}

export default function MemoLifeDashboard({ userId, userName }: MemoLifeDashboardProps) {
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
  const [successMessage, setSuccessMessage] = useState('')
  const [financialStats, setFinancialStats] = useState({
    totalUnpaid: 0, totalPaid: 0, dueThisMonth: 0, overdue: 0
  })
  const [upcomingAlerts, setUpcomingAlerts] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => { loadData() }, [userId, activeSection])
  useEffect(() => { setShowAddForm(false); setNewItem({}) }, [activeSection])
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
      ...overdueBills.map(b => ({ type: 'overdue_bill', item: b, message: `Bolletta scaduta: ${b.title} (€${b.amount})` })),
      ...upcomingBills.map(b => ({ type: 'upcoming_bill', item: b, message: `Bolletta in scadenza: ${b.title} - €${b.amount} il ${new Date(b.due_date).toLocaleDateString('it-IT')}` })),
      ...upcomingTasks.map(t => ({ type: 'upcoming_task', item: t, message: `Task in scadenza: ${t.title} il ${new Date(t.due_date).toLocaleDateString('it-IT')}` }))
    ])
  }

  const handleAddItem = async () => {
    try {
      let result: any = null
      if (activeSection === 'appointments') {
        result = await supabase.from('appointments').insert({ user_id: userId, title: newItem.title, date_time: newItem.date_time, description: newItem.description })
      } else if (activeSection === 'tasks') {
        result = await supabase.from('tasks').insert({ user_id: userId, title: newItem.title, due_date: newItem.due_date, priority: newItem.priority || 'medium' })
      } else if (activeSection === 'bills') {
        result = await supabase.from('bills').insert({ user_id: userId, title: newItem.title, amount: newItem.amount, due_date: newItem.due_date, category: newItem.category })
      } else if (activeSection === 'contacts') {
        result = await supabase.from('contacts').insert({ user_id: userId, name: newItem.name, phone: newItem.phone, email: newItem.email })
      } else if (activeSection === 'notes') {
        result = await supabase.from('notes').insert({ user_id: userId, title: newItem.title, content: newItem.content })
      }
      if (result?.error) throw result.error
      setShowAddForm(false)
      setNewItem({})
      setSuccessMessage('Elemento creato con successo!')
      setTimeout(() => setSuccessMessage(''), 3000)
      await loadData()
    } catch (error: any) {
      console.error(error)
      alert(`Errore: ${error.message || 'Riprova'}`)
    }
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
    if (confirm('Sei sicuro di voler eliminare questo elemento?')) {
      await supabase.from(table).delete().eq('id', id)
      loadData()
    }
  }

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay()
  const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

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
                  {type === 'appointment' ? 'Appuntamento' : type === 'bill' ? 'Bolletta' : 'Task'}
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
                  <span className="font-medium">{new Date(item.date_time).toLocaleString('it-IT')}</span>
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
                  <span className="font-medium">Scadenza: {new Date(item.due_date).toLocaleDateString('it-IT')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Banknote className="w-4 h-4" />
                  <span className="font-bold text-lg">{item.paid ? `€${item.amount} (Pagata)` : `€${item.amount} (Da pagare)`}</span>
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
                  <span className="font-medium">Scadenza: {item.due_date ? new Date(item.due_date).toLocaleDateString('it-IT') : 'Non impostata'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    item.priority === 'high' ? 'bg-red-100 text-red-600' :
                      item.priority === 'medium' ? 'bg-orange-100 text-orange-600' :
                        'bg-green-100 text-green-600'
                    }`}>
                    Priorità: {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Media' : 'Bassa'}
                  </span>
                </div>
                {item.description && (
                  <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">{item.description}</div>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2">
            {type === 'bill' && (
              <button
                onClick={() => { toggleBillPaid(item.id, item.paid); closeEventModal() }}
                className={`flex-1 py-2 rounded-lg font-medium ${
                  item.paid ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
              >
                {item.paid ? 'Segna come non pagata' : 'Segna come pagata'}
              </button>
            )}
            {type === 'task' && (
              <button
                onClick={() => { toggleTask(item.id, item.completed); closeEventModal() }}
                className={`flex-1 py-2 rounded-lg font-medium ${
                  item.completed ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
              >
                {item.completed ? 'Segna come non completato' : 'Segna come completato'}
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
              Elimina
            </button>
            <button onClick={closeEventModal} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium">
              Chiudi
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
      const weekTitle = `${firstDay.getDate()} ${monthNames[firstDay.getMonth()]} - ${lastDay.getDate()} ${monthNames[lastDay.getMonth()]} ${lastDay.getFullYear()}`
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <button onClick={prevWeek} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 font-bold text-sm">&lt; Prec.</button>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-gray-900">{weekTitle}</h3>
              <button onClick={() => setCalendarView('month')} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm">Vista Mese</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setWeekOffset(0)} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-sm font-medium">Oggi</button>
              <button onClick={nextWeek} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 font-bold text-sm">Succ. &gt;</button>
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
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-indigo-100 rounded"></span> Appuntamenti</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 rounded"></span> Bollette da pagare</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 rounded"></span> Bollette pagate</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-100 rounded"></span> Task</span>
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
              <div className="text-[9px] text-gray-500">+{events.appts.length + events.bills.length + events.tasks.length - 3} altri</div>
            )}
          </div>
        </div>
      )
    }
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <button onClick={prevMonth} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">&lt; Mese prec.</button>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900">{monthNames[currentMonth]} {currentYear}</h3>
            <button onClick={() => setCalendarView('week')} className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm">Vista Settimana</button>
          </div>
          <button onClick={nextMonth} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">Mese succ. &gt;</button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(d => <div key={d} className="text-center text-xs font-semibold text-gray-600 py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">{days}</div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-indigo-100 rounded"></span> Appuntamenti</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 rounded"></span> Bollette da pagare</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 rounded"></span> Bollette pagate</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-100 rounded"></span> Task</span>
        </div>
      </div>
    )
  }

  // ✅ HOME PURA: solo riepilogo, nessun input
  const renderHome = () => (
    <div className="space-y-6">
      {upcomingAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 p-4 rounded-lg">
          <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Alert Scadenze ({upcomingAlerts.length})
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
          <div className="text-xs text-gray-500 uppercase tracking-wide">Da Pagare Totale</div>
          <div className="text-2xl font-bold text-red-600 mt-1 flex items-center gap-1">
            <Banknote className="w-5 h-5" />
            €{financialStats.totalUnpaid.toFixed(2)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Pagato Questo Mese</div>
          <div className="text-2xl font-bold text-green-600 mt-1 flex items-center gap-1">
            <Banknote className="w-5 h-5" />
            €{financialStats.totalPaid.toFixed(2)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 uppercase tracking-wide">In Scadenza Questo Mese</div>
          <div className="text-2xl font-bold text-orange-600 mt-1 flex items-center gap-1">
            <Clock className="w-5 h-5" />
            €{financialStats.dueThisMonth.toFixed(2)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Scadute</div>
          <div className="text-2xl font-bold text-red-700 mt-1 flex items-center gap-1">
            <AlertCircle className="w-5 h-5" />
            €{financialStats.overdue.toFixed(2)}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide"><Calendar className="w-4 h-4" /> Appuntamenti</div>
          <div className="text-3xl font-bold text-indigo-600 mt-2">{stats.appointments}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide"><CheckSquare className="w-4 h-4" /> Da Fare</div>
          <div className="text-3xl font-bold text-orange-600 mt-2">{stats.tasks}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide"><Receipt className="w-4 h-4" /> Bollette</div>
          <div className="text-3xl font-bold text-red-600 mt-2">{stats.bills}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide"><FileText className="w-4 h-4" /> Note</div>
          <div className="text-3xl font-bold text-green-600 mt-2">{stats.notes}</div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Calendar className="w-5 h-5" /> Prossimi Appuntamenti</h3>
          <div className="space-y-2">
            {appointments.slice(0, 3).map(a => (
              <div key={a.id} onClick={() => handleEventClick(a, 'appointment')} className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-50">
                <div><div className="font-medium text-sm">{a.title}</div><div className="text-xs text-gray-500">{new Date(a.date_time).toLocaleString('it-IT')}</div></div>
              </div>
            ))}
            {appointments.length === 0 && <div className="text-sm text-gray-400 text-center py-4">Nessun appuntamento</div>}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><CheckSquare className="w-5 h-5" /> Task & Bollette</h3>
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
      <button onClick={() => setShowAddForm(!showAddForm)} className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center justify-center gap-2">
        <Plus className="w-5 h-5" /> Nuovo Appuntamento
      </button>
      {showAddForm && (
        <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
          <input placeholder="Titolo (es. Dentista)" value={newItem.title || ''} onChange={e => setNewItem({ ...newItem, title: e.target.value })} className="w-full p-2 border rounded" />
          <input type="datetime-local" value={newItem.date_time || ''} onChange={e => setNewItem({ ...newItem, date_time: e.target.value })} className="w-full p-2 border rounded" />
          <textarea placeholder="Note (opzionale)" value={newItem.description || ''} onChange={e => setNewItem({ ...newItem, description: e.target.value })} className="w-full p-2 border rounded h-20" />
          <div className="flex gap-2">
            <button onClick={handleAddItem} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"><Save className="w-4 h-4" /> Salva</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">Annulla</button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {appointments.map(a => (
          <div key={a.id} onClick={() => handleEventClick(a, 'appointment')} className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-50">
            <div><div className="font-semibold">{a.title}</div><div className="text-sm text-gray-500">{new Date(a.date_time).toLocaleString('it-IT')}</div></div>
            <button onClick={(e) => { e.stopPropagation(); deleteItem('appointments', a.id) }} className="text-red-500 hover:text-red-700"><Trash2 className="w-5 h-5" /></button>
          </div>
        ))}
        {appointments.length === 0 && <div className="text-center text-gray-400 py-8">Nessun appuntamento. Clicca "Nuovo Appuntamento" per crearne uno.</div>}
      </div>
    </div>
  )

  const renderTasks = () => (
    <div className="space-y-4">
      <button onClick={() => setShowAddForm(!showAddForm)} className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium flex items-center justify-center gap-2">
        <Plus className="w-5 h-5" /> Nuovo Task
      </button>
      {showAddForm && (
        <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
          <input placeholder="Cosa devi fare?" value={newItem.title || ''} onChange={e => setNewItem({ ...newItem, title: e.target.value })} className="w-full p-2 border rounded" />
          <input type="date" value={newItem.due_date || ''} onChange={e => setNewItem({ ...newItem, due_date: e.target.value })} className="w-full p-2 border rounded" />
          <select value={newItem.priority || 'medium'} onChange={e => setNewItem({ ...newItem, priority: e.target.value })} className="w-full p-2 border rounded">
            <option value="low">Bassa</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </select>
          <div className="flex gap-2">
            <button onClick={handleAddItem} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"><Save className="w-4 h-4" /> Salva</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">Annulla</button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {tasks.map(t => (
          <div key={t.id} className={`bg-white p-4 rounded-xl border flex items-center justify-between ${t.completed ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={t.completed} onChange={() => toggleTask(t.id, t.completed)} className="w-5 h-5 text-indigo-600 rounded" />
              <div onClick={() => handleEventClick(t, 'task')} className="cursor-pointer hover:bg-gray-50 p-2 rounded">
                <div className={`font-medium ${t.completed ? 'line-through' : ''}`}>{t.title}</div>
                {t.due_date && <div className="text-xs text-gray-500">Scadenza: {new Date(t.due_date).toLocaleDateString('it-IT')}</div>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded ${t.priority === 'high' ? 'bg-red-100 text-red-600' : t.priority === 'medium' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>{t.priority}</span>
              <button onClick={() => deleteItem('tasks', t.id)} className="text-red-500"><Trash2 className="w-5 h-5" /></button>
            </div>
          </div>
        ))}
        {tasks.length === 0 && <div className="text-center text-gray-400 py-8">Nessun task. Clicca "Nuovo Task" per crearne uno.</div>}
      </div>
    </div>
  )

  const renderBills = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 p-3 rounded-lg border border-red-200">
          <div className="text-xs text-red-600 flex items-center gap-1"><Receipt className="w-3 h-3" /> Da Pagare</div>
          <div className="text-xl font-bold text-red-700">€{financialStats.totalUnpaid.toFixed(2)}</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <div className="text-xs text-green-600 flex items-center gap-1"><Banknote className="w-3 h-3" /> Pagato</div>
          <div className="text-xl font-bold text-green-700">€{financialStats.totalPaid.toFixed(2)}</div>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
          <div className="text-xs text-orange-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Scadute</div>
          <div className="text-xl font-bold text-orange-700">€{financialStats.overdue.toFixed(2)}</div>
        </div>
      </div>
      <button onClick={() => setShowAddForm(!showAddForm)} className="w-full py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium flex items-center justify-center gap-2">
        <Plus className="w-5 h-5" /> Nuova Bolletta
      </button>
      {showAddForm && (
        <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
          <input placeholder="Titolo (es. Luce)" value={newItem.title || ''} onChange={e => setNewItem({ ...newItem, title: e.target.value })} className="w-full p-2 border rounded" />
          <input type="number" placeholder="Importo €" value={newItem.amount || ''} onChange={e => setNewItem({ ...newItem, amount: e.target.value })} className="w-full p-2 border rounded" />
          <input type="date" value={newItem.due_date || ''} onChange={e => setNewItem({ ...newItem, due_date: e.target.value })} className="w-full p-2 border rounded" />
          <div className="flex gap-2">
            <button onClick={handleAddItem} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"><Save className="w-4 h-4" /> Salva</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">Annulla</button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {bills.map(b => (
          <div key={b.id} onClick={() => handleEventClick(b, 'bill')} className={`bg-white p-4 rounded-xl border flex justify-between items-center cursor-pointer hover:bg-gray-50 ${b.paid ? 'bg-green-50 border-green-200' : ''}`}>
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={b.paid} onChange={(e) => { e.stopPropagation(); toggleBillPaid(b.id, b.paid) }} className="w-5 h-5 text-green-600 rounded" />
              <div><div className={`font-semibold ${b.paid ? 'line-through text-gray-500' : ''}`}>{b.title}</div><div className="text-xs text-gray-500">Scadenza: {new Date(b.due_date).toLocaleDateString('it-IT')}</div></div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-lg font-bold ${b.paid ? 'text-green-600' : 'text-red-600'}`}>€{b.amount}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteItem('bills', b.id) }} className="text-red-500"><Trash2 className="w-5 h-5" /></button>
            </div>
          </div>
        ))}
        {bills.length === 0 && <div className="text-center text-gray-400 py-8">Nessuna bolletta. Clicca "Nuova Bolletta" per crearne una.</div>}
      </div>
    </div>
  )

  const renderContacts = () => (
    <div className="space-y-4">
      <button onClick={() => setShowAddForm(!showAddForm)} className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium flex items-center justify-center gap-2">
        <Plus className="w-5 h-5" /> Nuovo Contatto
      </button>
      {showAddForm && (
        <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
          <input placeholder="Nome" value={newItem.name || ''} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="w-full p-2 border rounded" />
          <input placeholder="Telefono" value={newItem.phone || ''} onChange={e => setNewItem({ ...newItem, phone: e.target.value })} className="w-full p-2 border rounded" />
          <input placeholder="Email" value={newItem.email || ''} onChange={e => setNewItem({ ...newItem, email: e.target.value })} className="w-full p-2 border rounded" />
          <div className="flex gap-2">
            <button onClick={handleAddItem} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"><Save className="w-4 h-4" /> Salva</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">Annulla</button>
          </div>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-3">
        {contacts.map(c => (
          <div key={c.id} className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="font-semibold text-gray-900">{c.name}</div>
            {c.phone && <div className="text-sm text-gray-600 flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</div>}
            {c.email && <div className="text-sm text-gray-600 flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</div>}
            <button onClick={() => deleteItem('contacts', c.id)} className="text-red-500 text-xs mt-2 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Elimina</button>
          </div>
        ))}
        {contacts.length === 0 && <div className="text-center text-gray-400 py-8 col-span-2">Nessun contatto. Clicca "Nuovo Contatto" per crearne uno.</div>}
      </div>
    </div>
  )

  const renderNotes = () => (
    <div className="space-y-4">
      <button onClick={() => setShowAddForm(!showAddForm)} className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium flex items-center justify-center gap-2">
        <Plus className="w-5 h-5" /> Nuova Nota
      </button>
      {showAddForm && (
        <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
          <input placeholder="Titolo" value={newItem.title || ''} onChange={e => setNewItem({ ...newItem, title: e.target.value })} className="w-full p-2 border rounded" />
          <textarea placeholder="Contenuto..." value={newItem.content || ''} onChange={e => setNewItem({ ...newItem, content: e.target.value })} className="w-full p-2 border rounded h-24" />
          <div className="flex gap-2">
            <button onClick={handleAddItem} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"><Save className="w-4 h-4" /> Salva</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">Annulla</button>
          </div>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-3">
        {notes.map(n => (
          <div key={n.id} className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
            <div className="font-semibold text-gray-900 mb-1">{n.title}</div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{n.content}</div>
            <button onClick={() => deleteItem('notes', n.id)} className="text-red-500 text-xs mt-2 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Elimina</button>
          </div>
        ))}
        {notes.length === 0 && <div className="text-center text-gray-400 py-8 col-span-2">Nessuna nota. Clicca "Nuova Nota" per crearne una.</div>}
      </div>
    </div>
  )

  const menuItems = [
    { id: 'home', label: 'Home', Icon: Home },
    { id: 'appointments', label: 'Appuntamenti', Icon: Calendar },
    { id: 'tasks', label: 'Da Fare', Icon: CheckSquare },
    { id: 'bills', label: 'Bollette', Icon: Receipt },
    { id: 'contacts', label: 'Contatti', Icon: Users },
    { id: 'notes', label: 'Note', Icon: FileText },
    { id: 'calendar', label: 'Calendario', Icon: CalendarDays },
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
            {activeSection === 'home' && <>Ciao, {userName.split(' ')[0]}! <Hand className="w-7 h-7" /></>}
            {activeSection === 'appointments' && <><Calendar className="w-7 h-7" /> I tuoi Appuntamenti</>}
            {activeSection === 'tasks' && <><CheckSquare className="w-7 h-7" /> Le tue Cose da Fare</>}
            {activeSection === 'bills' && <><Receipt className="w-7 h-7" /> Bollette & Scadenze</>}
            {activeSection === 'contacts' && <><Users className="w-7 h-7" /> La tua Rubrica</>}
            {activeSection === 'notes' && <><FileText className="w-7 h-7" /> Le tue Note</>}
            {activeSection === 'calendar' && <><CalendarDays className="w-7 h-7" /> Calendario</>}
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