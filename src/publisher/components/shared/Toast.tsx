import React from 'react';
import { CheckCircle2, AlertTriangle, Info, AlertOctagon } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';

export const Toast: React.FC = () => {
  const { toast } = useStudio();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    error: <AlertOctagon className="w-5 h-5 text-red-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-primary shrink-0" />,
  };

  const borders = {
    success: 'border-secondary/40 bg-[#051424]/95 shadow-emerald-glow',
    warning: 'border-amber-500/40 bg-[#051424]/95 shadow-gold-glow',
    error: 'border-red-500/40 bg-[#051424]/95 shadow-red-500/20',
    info: 'border-primary/40 bg-[#051424]/95 shadow-gold-glow',
  };

  return (
    <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-none">
      <div className={`p-4 rounded-2xl border ${borders[toast.type]} backdrop-blur-2xl shadow-2xl flex items-center gap-3 max-w-md pointer-events-auto`}>
        {icons[toast.type]}
        <p className="text-xs font-mono text-white font-medium leading-relaxed">
          {toast.message}
        </p>
      </div>
    </div>
  );
};
