import { Bell, AlertCircle, TrendingUp, CheckCircle } from 'lucide-react';

export function AlertsDashboard() {
  const alerts = [
    { id: 1, type: 'error', title: 'Function Failed', message: 'processCommission threw an unhandled exception', time: '10m ago' },
    { id: 2, type: 'warning', title: 'Sign-up Spike', message: 'Unusual amount of sign-ups detected (+300% in 1h)', time: '2h ago' },
    { id: 3, type: 'success', title: 'Deploy Successful', message: 'Rules updated for firestore', time: '5h ago' },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Alerts</h2>
        <span className="w-6 h-6 bg-red-500/20 text-red-500 rounded-full text-xs font-bold flex items-center justify-center">2</span>
      </div>

      <div className="space-y-3">
        {alerts.map(alert => (
          <div key={alert.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
              alert.type === 'error' ? 'bg-red-500' :
              alert.type === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
            }`} />
            <div className="pl-2">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  {alert.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-500" /> :
                   alert.type === 'warning' ? <TrendingUp className="w-4 h-4 text-amber-500" /> :
                   <CheckCircle className="w-4 h-4 text-emerald-500" />}
                  {alert.title}
                </h3>
                <span className="text-[10px] text-neutral-500">{alert.time}</span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">{alert.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
