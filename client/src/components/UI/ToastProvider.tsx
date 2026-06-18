import React, { useState, useEffect, createContext, useContext } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

const ToastContext = createContext<any>(null);

export const useToast = () => useContext(ToastContext);

let addToastGlobal: (message: string, type?: ToastType) => void = () => {};

// Override window.alert to automatically use our beautiful toast system!
const originalAlert = window.alert;
window.alert = (message?: any) => {
    if (typeof message === 'string') {
        let type: ToastType = 'info';
        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('error') || lowerMsg.includes('failed') || lowerMsg.includes('required') || lowerMsg.includes('cannot')) {
            type = 'error';
        } else if (lowerMsg.includes('successfully') || lowerMsg.includes('saved')) {
            type = 'success';
        }
        addToastGlobal(message, type);
    } else {
        addToastGlobal(String(message), 'info');
    }
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        addToastGlobal = (message: string, type: ToastType = 'info') => {
            const id = Math.random().toString(36).substr(2, 9);
            setToasts(prev => [...prev, { id, message, type }]);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 4000);
        };
    }, []);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ addToast: addToastGlobal }}>
            {children}
            <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-[350px] pointer-events-none">
                {toasts.map(toast => (
                    <div 
                        key={toast.id}
                        className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-xl transform transition-all duration-500 animate-in slide-in-from-right-8 fade-in zoom-in-95 
                        ${toast.type === 'error' ? 'bg-red-50/95 border-red-200 text-red-900 shadow-red-900/10' : 
                          toast.type === 'success' ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900 shadow-emerald-900/10' : 
                          'bg-blue-50/95 border-blue-200 text-blue-900 shadow-blue-900/10'}`}
                    >
                        <div className="shrink-0 mt-0.5">
                            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
                            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
                        </div>
                        <div className="flex-1 font-medium text-sm leading-relaxed">
                            {toast.message}
                        </div>
                        <button 
                            onClick={() => removeToast(toast.id)}
                            className={`shrink-0 p-1.5 rounded-full transition-colors 
                            ${toast.type === 'error' ? 'hover:bg-red-100 text-red-500' : 
                              toast.type === 'success' ? 'hover:bg-emerald-100 text-emerald-500' : 
                              'hover:bg-blue-100 text-blue-500'}`}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
