import toast from 'react-hot-toast'

export const showToast = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast(message),
  warning: (message: string) => toast(message, { icon: '⚠️' }),
}