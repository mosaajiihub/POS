import { useState, useMemo } from 'react'
import { ServiceAppointment } from '../../stores/serviceManagementStore'
import ServiceCompletionWorkflow from './ServiceCompletionWorkflow'

interface ServiceAppointmentCalendarProps {
  appointments: ServiceAppointment[]
  loading: boolean
  onNewAppointment: () => void
}

export default function ServiceAppointmentCalendar({
  appointments,
  loading,
  onNewAppointment
}: ServiceAppointmentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')
  const [selectedAppointment, setSelectedAppointment] = useState<ServiceAppointment | null>(null)
  const [showCompletionWorkflow, setShowCompletionWorkflow] = useState(false)

  // Get the first day of the current month
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  
  // Get the first day of the calendar (might be from previous month)
  const firstDayOfCalendar = new Date(firstDayOfMonth)
  firstDayOfCalendar.setDate(firstDayOfCalendar.getDate() - firstDayOfMonth.getDay())
  
  // Get the last day of the calendar (might be from next month)
  const lastDayOfCalendar = new Date(lastDayOfMonth)
  lastDayOfCalendar.setDate(lastDayOfCalendar.getDate() + (6 - lastDayOfMonth.getDay()))

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = []
    const current = new Date(firstDayOfCalendar)
    
    while (current <= lastDayOfCalendar) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }, [firstDayOfCalendar, lastDayOfCalendar])

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const grouped: { [key: string]: ServiceAppointment[] } = {}
    
    appointments.forEach(appointment => {
      const dateKey = appointment.scheduledDate.toDateString()
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(appointment)
    })
    
    return grouped
  }, [appointments])

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'SCHEDULED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'CONFIRMED':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'NO_SHOW':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium text-gray-900">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              ←
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              →
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex space-x-1 bg-gray-100 rounded-md p-1">
            {(['month', 'week', 'day'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-sm rounded-md capitalize ${
                  viewMode === mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <button
            onClick={onNewAppointment}
            className="btn-primary"
          >
            New Appointment
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      {viewMode === 'month' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Days of week header */}
          <div className="grid grid-cols-7 bg-gray-50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-3 text-center text-sm font-medium text-gray-700 border-r border-gray-200 last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const isCurrentMonth = day.getMonth() === currentDate.getMonth()
              const isToday = day.toDateString() === new Date().toDateString()
              const dayAppointments = appointmentsByDate[day.toDateString()] || []

              return (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 border-r border-b border-gray-200 last:border-r-0 ${
                    !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                  } ${isToday ? 'bg-blue-50' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    !isCurrentMonth ? 'text-gray-400' : 
                    isToday ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {day.getDate()}
                  </div>
                  
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 3).map((appointment) => (
                      <div
                        key={appointment.id}
                        className={`text-xs p-1 rounded border ${getStatusColor(appointment.status)} cursor-pointer hover:opacity-80`}
                        title={`${appointment.appointmentNumber} - ${appointment.customer?.firstName} ${appointment.customer?.lastName} - ${appointment.scheduledTime}`}
                        onClick={() => {
                          setSelectedAppointment(appointment)
                          if (appointment.status === 'IN_PROGRESS' || appointment.status === 'CONFIRMED') {
                            setShowCompletionWorkflow(true)
                          }
                        }}
                      >
                        <div className="font-medium truncate">
                          {appointment.scheduledTime} - {appointment.customer?.firstName} {appointment.customer?.lastName}
                        </div>
                        <div className="truncate">
                          {appointment.serviceType?.name}
                        </div>
                      </div>
                    ))}
                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{dayAppointments.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Week and Day views can be implemented later */}
      {viewMode === 'week' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-center text-gray-500">
            Week view coming soon...
          </div>
        </div>
      )}

      {viewMode === 'day' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-center text-gray-500">
            Day view coming soon...
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200"></div>
          <span>Scheduled</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-purple-100 border border-purple-200"></div>
          <span>Confirmed</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></div>
          <span>In Progress</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-200"></div>
          <span>Completed</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-red-100 border border-red-200"></div>
          <span>Cancelled</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-gray-100 border border-gray-200"></div>
          <span>No Show</span>
        </div>
      </div>

      {/* Service Completion Workflow */}
      {showCompletionWorkflow && selectedAppointment && (
        <ServiceCompletionWorkflow
          appointment={selectedAppointment}
          onClose={() => {
            setShowCompletionWorkflow(false)
            setSelectedAppointment(null)
          }}
          onSuccess={() => {
            setShowCompletionWorkflow(false)
            setSelectedAppointment(null)
            // Refresh appointments would be handled by parent component
          }}
        />
      )}
    </div>
  )
}