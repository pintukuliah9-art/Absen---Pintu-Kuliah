
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Ya, Lanjutkan", 
  cancelText = "Batal",
  variant = 'danger'
}) => {
  const colors = {
    danger: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700 shadow-red-100',
      icon: <Trash2 size={32} />
    },
    warning: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-100',
      icon: <AlertTriangle size={32} />
    },
    info: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-100',
      icon: <AlertTriangle size={32} />
    }
  };

  const current = colors[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl relative overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
            >
              <X size={20} />
            </button>

            <div className={`w-16 h-16 ${current.bg} ${current.text} rounded-2xl flex items-center justify-center mb-6 mx-auto`}>
              {current.icon}
            </div>

            <h3 className="text-xl font-black text-gray-900 text-center mb-2"><span>{title}</span></h3>
            <p className="text-gray-500 text-center mb-8 leading-relaxed text-sm font-medium px-4">
              <span>{message}</span>
            </p>

            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="flex-1 py-3.5 text-sm font-black text-gray-500 hover:bg-gray-100 rounded-2xl transition-all active:scale-95"
              >
                <span>{cancelText}</span>
              </button>
              <button 
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 py-3.5 ${current.button} text-white text-sm font-black rounded-2xl shadow-lg transition-all active:scale-95`}
              >
                <span>{confirmText}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
