import { useState } from 'react'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { Calendar, ChevronDown } from 'lucide-react'

interface DateRange {
  startDate: string
  endDate: string
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

const presetRanges = [
  {
    label: 'Today',
    getValue: () => ({
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd')
    })
  },
  {
    label: 'Yesterday',
    getValue: () => ({
      startDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
      endDate: format(subDays(new Date(), 1), 'yyyy-MM-dd')
    })
  },
  {
    label: 'Last 7 days',
    getValue: () => ({
      startDate: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd')
    })
  },
  {
    label: 'Last 30 days',
    getValue: () => ({
      startDate: format(subDays(new Date(), 29), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd')
    })
  },
  {
    label: 'This month',
    getValue: () => ({
      startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    })
  },
  {
    label: 'Last month',
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1)
      return {
        startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd')
      }
    }
  }
]

export default function DateRangePicker({ value, onChange, className = '' }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customMode, setCustomMode] = useState(false)

  const handlePresetSelect = (preset: typeof presetRanges[0]) => {
    const range = preset.getValue()
    onChange(range)
    setIsOpen(false)
    setCustomMode(false)
  }

  const handleCustomDateChange = (field: 'startDate' | 'endDate', date: string) => {
    onChange({
      ...value,
      [field]: date
    })
  }

  const getDisplayText = () => {
    if (value.startDate === value.endDate) {
      return format(new Date(value.startDate), 'MMM dd, yyyy')
    }
    return `${format(new Date(value.startDate), 'MMM dd')} - ${format(new Date(value.endDate), 'MMM dd, yyyy')}`
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      >
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium">{getDisplayText()}</span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Select Date Range</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {!customMode ? (
              <div className="space-y-1">
                {presetRanges.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetSelect(preset)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md"
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  onClick={() => setCustomMode(true)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md text-primary-600"
                >
                  Custom Range
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={value.startDate}
                    onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={value.endDate}
                    onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCustomMode(false)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-3 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}