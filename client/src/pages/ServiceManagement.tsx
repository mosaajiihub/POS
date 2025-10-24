import { useState, useEffect } from 'react'
import { useServiceManagementStore } from '../stores/serviceManagementStore'
import ServiceAppointmentCalendar from '../components/service/ServiceAppointmentCalendar'
import ServiceAppointmentForm from '../components/service/ServiceAppointmentForm'
import ServiceTypeManagement from '../components/service/ServiceTypeManagement'
import TechnicianManagement from '../components/service/TechnicianManagement'
import ServiceAnalytics from '../components/service/ServiceAnalytics'

type TabType = 'calendar' | 'appointments' | 'technicians' | 'service-types' | 'analytics'

export default function ServiceManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('calendar')
  const [showAppointmentForm, setShowAppointmentForm] = useState(false)
  
  const {
    appointments,
    appointmentsLoading,
    appointmentsError,
    fetchAppointments,
    clearErrors
  } = useServiceManagementStore()

  useEffect(() => {
    // Load initial data
    fetchAppointments()
    clearErrors()
  }, [fetchAppointments, clearErrors])

  const tabs = [
    { id: 'calendar' as TabType, name: 'Calendar', icon: '📅' },
    { id: 'appointments' as TabType, name: 'Appointments', icon: '📋' },
    { id: 'technicians' as TabType, name: 'Technicians', icon: '👨‍🔧' },
    { id: 'service-types' as TabType, name: 'Service Types', icon: '🔧' },
    { id: 'analytics' as TabType, name: 'Analytics', icon: '📊' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Service Management</h2>
          <p className="text-gray-600">Manage service appointments, technicians, and service types</p>
        </div>
        <button
          onClick={() => setShowAppointmentForm(true)}
          className="btn-primary"
        >
          New Appointment
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Error Display */}
      {appointmentsError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                {appointmentsError}
              </div>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={clearErrors}
                className="text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {activeTab === 'calendar' && (
          <ServiceAppointmentCalendar
            appointments={appointments}
            loading={appointmentsLoading}
            onNewAppointment={() => setShowAppointmentForm(true)}
          />
        )}

        {activeTab === 'appointments' && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">All Appointments</h3>
            {appointmentsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No appointments found. Create your first appointment to get started.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {appointments.map((appointment) => (
                      <div key={appointment.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {appointment.appointmentNumber}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {appointment.customer?.firstName} {appointment.customer?.lastName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {appointment.serviceType?.name} - {appointment.technician?.firstName} {appointment.technician?.lastName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(appointment.scheduledDate).toLocaleDateString()} at {appointment.scheduledTime}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              appointment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              appointment.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                              appointment.status === 'SCHEDULED' ? 'bg-yellow-100 text-yellow-800' :
                              appointment.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {appointment.status.replace('_', ' ')}
                            </span>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              ${appointment.totalCost.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'technicians' && <TechnicianManagement />}
        {activeTab === 'service-types' && <ServiceTypeManagement />}
        {activeTab === 'analytics' && <ServiceAnalytics />}
      </div>

      {/* New Appointment Modal */}
      {showAppointmentForm && (
        <ServiceAppointmentForm
          onClose={() => setShowAppointmentForm(false)}
          onSuccess={() => {
            setShowAppointmentForm(false)
            fetchAppointments()
          }}
        />
      )}
    </div>
  )
}