import React from 'react'
import { AdminLayout } from '../components/AdminLayout'
import { AuditDashboard } from '../components/audit/AuditDashboard'

export function AuditLogs() {
  return (
    <AdminLayout>
      <div className="p-6">
        <AuditDashboard />
      </div>
    </AdminLayout>
  )
}