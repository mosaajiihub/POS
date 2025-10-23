import { useState } from 'react'
import { X, RefreshCw, Copy, Check } from 'lucide-react'

interface BarcodeGeneratorProps {
  onBarcodeGenerated: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeGenerator({ onBarcodeGenerated, onClose }: BarcodeGeneratorProps) {
  const [barcodeType, setBarcodeType] = useState<'EAN13' | 'UPC' | 'CODE128'>('EAN13')
  const [generatedBarcode, setGeneratedBarcode] = useState('')
  const [copied, setCopied] = useState(false)

  const generateBarcode = () => {
    let barcode = ''
    
    switch (barcodeType) {
      case 'EAN13':
        // Generate 13-digit EAN barcode
        barcode = '2' + Math.random().toString().slice(2, 13)
        break
      case 'UPC':
        // Generate 12-digit UPC barcode
        barcode = Math.random().toString().slice(2, 14)
        break
      case 'CODE128':
        // Generate alphanumeric CODE128 barcode
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        barcode = Array.from({ length: 10 }, () => 
          chars.charAt(Math.floor(Math.random() * chars.length))
        ).join('')
        break
    }
    
    setGeneratedBarcode(barcode)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedBarcode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy barcode:', err)
    }
  }

  const handleUseBarcode = () => {
    if (generatedBarcode) {
      onBarcodeGenerated(generatedBarcode)
    }
  }

  // Generate initial barcode
  useState(() => {
    generateBarcode()
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Generate Barcode
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Barcode Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Barcode Type
            </label>
            <select
              value={barcodeType}
              onChange={(e) => setBarcodeType(e.target.value as any)}
              className="input w-full"
            >
              <option value="EAN13">EAN-13 (European Article Number)</option>
              <option value="UPC">UPC (Universal Product Code)</option>
              <option value="CODE128">Code 128 (Alphanumeric)</option>
            </select>
          </div>

          {/* Generated Barcode Display */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Generated Barcode
              </label>
              <button
                onClick={generateBarcode}
                className="text-primary-600 hover:text-primary-700 flex items-center space-x-1"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm">Regenerate</span>
              </button>
            </div>
            
            <div className="relative">
              <input
                type="text"
                value={generatedBarcode}
                readOnly
                className="input w-full pr-10 font-mono"
              />
              <button
                onClick={copyToClipboard}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Barcode Visual Representation */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-center">
              <div className="bg-white p-4 rounded border inline-block">
                {/* Simple barcode visualization */}
                <div className="flex items-end space-x-px">
                  {generatedBarcode.split('').map((digit, index) => (
                    <div
                      key={index}
                      className="bg-black"
                      style={{
                        width: '3px',
                        height: `${20 + (parseInt(digit) || 0) * 2}px`
                      }}
                    />
                  ))}
                </div>
                <div className="text-xs font-mono mt-2 text-gray-600">
                  {generatedBarcode}
                </div>
              </div>
            </div>
          </div>

          {/* Barcode Type Information */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm text-blue-800">
              {barcodeType === 'EAN13' && (
                <p>EAN-13 is commonly used for retail products worldwide. It consists of 13 digits.</p>
              )}
              {barcodeType === 'UPC' && (
                <p>UPC is primarily used in North America for retail products. It consists of 12 digits.</p>
              )}
              {barcodeType === 'CODE128' && (
                <p>Code 128 can encode letters, numbers, and symbols. It's versatile for various applications.</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t">
          <button
            onClick={onClose}
            className="btn-outline"
          >
            Cancel
          </button>
          <button
            onClick={handleUseBarcode}
            className="btn-primary"
          >
            Use This Barcode
          </button>
        </div>
      </div>
    </div>
  )
}