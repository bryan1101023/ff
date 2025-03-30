"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"

interface WorkspaceCreationProps {
  onComplete: () => void;
  selectedRanks: number[];
}

// Completely rewritten workspace creation component
export default function WorkspaceCreation(props: WorkspaceCreationProps) {
  // Destructure props safely with defaults
  const { 
    onComplete = () => {}, 
    selectedRanks = [] 
  } = props || {};
  
  // Add state for animation progress
  const [progress, setProgress] = useState(0);
  
  // Log props for debugging
  useEffect(() => {
    console.log('WorkspaceCreation props:', {
      onComplete: typeof onComplete === 'function' ? 'function' : typeof onComplete,
      selectedRanks: Array.isArray(selectedRanks) ? selectedRanks : `not an array: ${typeof selectedRanks}`
    });
    
    // Validate props
    if (typeof onComplete !== 'function') {
      console.error('onComplete is not a function:', onComplete);
    }
    
    if (!Array.isArray(selectedRanks)) {
      console.error('selectedRanks is not an array:', selectedRanks);
    }
    
    // Animation progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 175);
    
    // Simulate creation process
    const timer = setTimeout(() => {
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }, 3500);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [onComplete, selectedRanks]);

  // Define shape data
  const shapes = [
    { color: "bg-indigo-500/30", size: "w-16 h-16", delay: 0 },
    { color: "bg-rose-500/30", size: "w-12 h-12", delay: 0.2 },
    { color: "bg-amber-500/30", size: "w-10 h-10", delay: 0.4 },
    { color: "bg-cyan-500/30", size: "w-14 h-14", delay: 0.6 },
    { color: "bg-violet-500/30", size: "w-8 h-8", delay: 0.8 },
  ];

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background shapes */}
      {Array.isArray(shapes) && shapes.map((shape, index) => (
        <motion.div
          key={`shape-${index}`}
          className={`absolute rounded-full ${shape?.color || ''} ${shape?.size || ''} backdrop-blur-sm`}
          initial={{
            x: Math.random() * 200 - 100,
            y: Math.random() * 200 - 100,
            opacity: 0,
          }}
          animate={{
            x: [Math.random() * 200 - 100, Math.random() * 200 - 100, Math.random() * 200 - 100],
            y: [Math.random() * 200 - 100, Math.random() * 200 - 100, Math.random() * 200 - 100],
            opacity: [0, 1, 0.8, 1, 0.9],
          }}
          transition={{
            duration: 5,
            delay: shape?.delay || 0,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />
      ))}

      <motion.div
        className="relative z-10 text-center w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-6 text-primary" />
        <h2 className="text-2xl font-bold mb-2 text-white">Creating your workspace...</h2>
        <p className="text-white/60 mb-4">Setting up your group management dashboard</p>
        
        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-white/40 mt-2">{progress}% complete</p>
      </motion.div>
    </div>
  );
}
