// components/Toast.tsx
import { useEffect, useState } from "react";
import {
  Toast as ToastType,
  ToastType as ToastTypeEnum,
} from "../hooks/useToast";

interface ToastProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

const Toast = ({ toast, onRemove }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Show animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 250);
  };

  const getToastStyles = () => {
    const baseStyles = "transform transition-all duration-300 ease-out";

    if (isRemoving) {
      return `${baseStyles} translate-y-2 opacity-0 scale-95`;
    }

    if (isVisible) {
      return `${baseStyles} translate-y-0 opacity-100 scale-100`;
    }

    return `${baseStyles} -translate-y-2 opacity-0 scale-95`;
  };

  const getToastConfig = () => {
    switch (toast.type) {
      case "success":
        return {
          bg: "bg-gradient-to-r from-emerald-50 to-green-50",
          border: "border-emerald-200",
          accent: "bg-emerald-500",
          icon: "✓",
          iconBg: "bg-emerald-100",
          iconColor: "text-emerald-600",
          titleColor: "text-emerald-800",
          messageColor: "text-emerald-700",
        };
      case "error":
        return {
          bg: "bg-gradient-to-r from-red-50 to-rose-50",
          border: "border-red-200",
          accent: "bg-red-500",
          icon: "✕",
          iconBg: "bg-red-100",
          iconColor: "text-red-600",
          titleColor: "text-red-800",
          messageColor: "text-red-700",
        };
      case "warning":
        return {
          bg: "bg-gradient-to-r from-amber-50 to-yellow-50",
          border: "border-amber-200",
          accent: "bg-amber-500",
          icon: "⚠",
          iconBg: "bg-amber-100",
          iconColor: "text-amber-600",
          titleColor: "text-amber-800",
          messageColor: "text-amber-700",
        };
      case "info":
        return {
          bg: "bg-gradient-to-r from-blue-50 to-indigo-50",
          border: "border-blue-200",
          accent: "bg-blue-500",
          icon: "i",
          iconBg: "bg-blue-100",
          iconColor: "text-blue-600",
          titleColor: "text-blue-800",
          messageColor: "text-blue-700",
        };
      default:
        return {
          bg: "bg-gradient-to-r from-gray-50 to-slate-50",
          border: "border-gray-200",
          accent: "bg-gray-500",
          icon: "•",
          iconBg: "bg-gray-100",
          iconColor: "text-gray-600",
          titleColor: "text-gray-800",
          messageColor: "text-gray-700",
        };
    }
  };

  const config = getToastConfig();

  return (
    <div
      className={`${getToastStyles()} w-full max-w-md mx-auto mb-3 pointer-events-auto`}
    >
      <div
        className={`
        ${config.bg} ${config.border} 
        backdrop-blur-sm border rounded-xl shadow-lg 
        hover:shadow-xl transition-shadow duration-200
        relative overflow-hidden
      `}
      >
        {/* Accent bar */}
        <div className={`absolute left-0 top-0 w-1 h-full ${config.accent}`} />

        {/* Content */}
        <div className="p-4 pl-6">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className={`
              ${config.iconBg} ${config.iconColor}
              w-8 h-8 rounded-full flex items-center justify-center
              flex-shrink-0 font-semibold text-sm
            `}
            >
              {config.icon}
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <h4
                className={`${config.titleColor} font-medium text-sm leading-5`}
              >
                {toast.title}
              </h4>
              {toast.message && (
                <p
                  className={`${config.messageColor} text-sm mt-1 leading-relaxed`}
                >
                  {toast.message}
                </p>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={handleRemove}
              className={`
                ${config.iconColor} hover:bg-black/5 
                p-1 rounded-md transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current
                flex-shrink-0
              `}
              aria-label="Close notification"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}

export const ToastContainer = ({ toasts, onRemove }: ToastContainerProps) => {
  return (
    <div className="fixed top-4 right-4 z-50 w-full max-w-md">
      <div className="space-y-0">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
};

export default Toast;
