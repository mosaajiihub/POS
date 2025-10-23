import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'
import { Camera, X, Zap } from 'lucide-react'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
  isOpen: boolean
}

export default function BarcodeScanner({ onScan, onClose, isOpen }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)

  useEffect(() => {
    if (isOpen) {
      initializeScanner()
    } else {
      stopScanning()
    }

    return () => {
      stopScanning()
    }
  }, [isOpen])

  const initializeScanner = async () => {
    try {
      setError(null)
      
      // Check for camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      setHasPermission(true)
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop())
      
      // Initialize the barcode reader
      codeReaderRef.current = new BrowserMultiFormatReader()
      
      if (videoRef.current) {
        setIsScanning(true)
        
        codeReaderRef.current.decodeFromVideoDevice(
          undefined, // Use default camera
          videoRef.current,
          (result, error) => {
            if (result) {
              const barcode = result.getText()
              onScan(barcode)
              stopScanning()
              onClose()
            }
            
            if (error && !(error instanceof NotFoundException)) {
              console.error('Barcode scanning error:', error)
            }
          }
        )
      }
    } catch (err) {
      console.error('Failed to initialize barcode scanner:', err)
      setHasPermission(false)
      setError('Camera access denied or not available')
      setIsScanning(false)
    }
  }

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset()
      codeReaderRef.current = null
    }
    setIsScanning(false)
  }

  const handleClose = () => {
    stopScanning()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Camera className="w-5 h-5 mr-2" />
            Scan Barcode
          </h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {hasPermission === false && (
          <div className="text-center py-8">
            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Camera access is required to scan barcodes</p>
            <button
              onClick={initializeScanner}
              className="btn btn-primary"
            >
              Grant Camera Access
            </button>
          </div>
        )}

        {hasPermission === true && (
          <div className="space-y-4">
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 bg-black rounded-lg object-cover"
                playsInline
                muted
              />
              
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-primary-500 w-48 h-32 rounded-lg relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary-500 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary-500 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary-500 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary-500 rounded-br-lg"></div>
                    
                    {/* Scanning line animation */}
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary-500 animate-pulse"></div>
                  </div>
                </div>
              )}
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center text-sm text-gray-600 mb-2">
                <Zap className="w-4 h-4 mr-1" />
                Position barcode within the frame
              </div>
              {isScanning && (
                <div className="text-xs text-gray-500">
                  Scanning for barcodes...
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={handleClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}