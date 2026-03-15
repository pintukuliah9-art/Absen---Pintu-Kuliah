import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Maximize2 } from 'lucide-react';

interface ImageModalProps {
    isOpen: boolean;
    imageUrl: string | null;
    onClose: () => void;
    referrerPolicy?: React.HTMLAttributeReferrerPolicy;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, imageUrl, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && imageUrl && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={onClose}
                            className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors flex items-center gap-2 font-bold"
                        >
                            <X size={24} /> <span>Tutup</span>
                        </button>
                        
                        <div className="bg-white p-2 rounded-3xl shadow-2xl overflow-hidden">
                            <img 
                                src={imageUrl} 
                                alt="Full Size" 
                                className="max-w-full max-h-[75vh] object-contain rounded-2xl"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://picsum.photos/seed/broken/800/600`;
                                }}
                            />
                        </div>
                        
                        <div className="mt-6 flex gap-4">
                            <button 
                                onClick={() => window.open(imageUrl, '_blank')}
                                className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl backdrop-blur-md border border-white/20 flex items-center gap-2 font-bold transition-all active:scale-95"
                            >
                                <Maximize2 size={18} /> Buka di Tab Baru
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ImageModal;
