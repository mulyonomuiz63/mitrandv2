import React from 'react';
import { 
  Bell, 
  FileText, 
  Video, 
  CheckCircle2, 
  Clock, 
  X, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { NotificationItem } from '../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onSelectAction: (type: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onSelectAction,
}) => {
  if (!isOpen) return null;

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'tools_update':
        return <FileText className="w-4 h-4 text-blue-700" />;
      case 'training':
        return <Video className="w-4 h-4 text-purple-700" />;
      case 'commission':
        return <CheckCircle2 className="w-4 h-4 text-emerald-700" />;
      case 'verification':
        return <Sparkles className="w-4 h-4 text-amber-700" />;
      default:
        return <Bell className="w-4 h-4 text-slate-700" />;
    }
  };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  Notifikasi Real-Time
                </h3>
                <p className="text-[11px] text-slate-500">
                  Pembaruan materi, tools, &amp; status komisi
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onMarkAllAsRead}
                className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 px-2 py-1 rounded"
              >
                Tandai Dibaca
              </button>
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Tidak ada notifikasi baru saat ini.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.type === 'tools_update' || item.type === 'training') {
                      onSelectAction('marketing-tools');
                    } else if (item.type === 'commission') {
                      onSelectAction('commissions');
                    } else if (item.type === 'verification') {
                      onSelectAction('idcard');
                    }
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer text-xs ${
                    !item.isRead
                      ? 'bg-blue-50/60 border-blue-200 hover:bg-blue-50'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-slate-900 line-clamp-1">
                          {item.title}
                        </h4>
                        {!item.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-slate-600 mt-1 leading-relaxed text-[11px]">
                        {item.message}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-1.5">
                        {formatTime(item.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 text-center">
            <p className="text-[11px] text-slate-500">
              Sistem pemberitahuan otomatis aktif untuk portal NDTAXANDLAW.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
