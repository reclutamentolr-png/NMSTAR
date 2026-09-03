import { Construction, Clock } from 'lucide-react'

type MaintenanceScreenProps = {
  message: string
}

export default function MaintenanceScreen({ message }: MaintenanceScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl p-10 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
          <Construction className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
          Torneremo presto!
        </h1>
        
        <p className="text-gray-600 whitespace-pre-wrap mb-8 leading-relaxed">
          {message}
        </p>
        
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <Clock className="w-4 h-4" />
          Manutenzione programmata
        </div>
      </div>
    </div>
  )
}