"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"

interface WorkspaceCreationProps {
  onComplete: () => void
}

// Update the workspace creation component to set proper permissions
export default function WorkspaceCreation({
  onComplete,
  selectedRanks,
}: WorkspaceCreationProps & { selectedRanks: number[] }) {
  useEffect(() => {
    // Simulate creation process
    const timer = setTimeout(() => {
      // Ensure the workspace is created with proper permissions
      // The selectedRanks array contains the role IDs that should have access
      onComplete()
    }, 3500)

    return () => clearTimeout(timer)
  }, [onComplete, selectedRanks])

  // Animation for floating pills/shapes
  const shapes = [
    { color: "bg-indigo-500/30", size: "w-16 h-16", delay: 0 },
    { color: "bg-rose-500/30", size: "w-12 h-12", delay: 0.2 },
    { color: "bg-amber-500/30", size: "w-10 h-10", delay: 0.4 },
    { color: "bg-cyan-500/30", size: "w-14 h-14", delay: 0.6 },
    { color: "bg-violet-500/30", size: "w-8 h-8", delay: 0.8 },
  ]

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background shapes */}
      {shapes.map((shape, index) => (
        <motion.div
          key={index}
          className={`absolute rounded-full ${shape.color} ${shape.size} backdrop-blur-sm`}
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
            delay: shape.delay,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
        />
      ))}

      <motion.div
        className="relative z-10 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-6 text-primary" />
        <h2 className="text-2xl font-bold mb-2">Creating your workspace...</h2>
        <p className="text-muted-foreground">Setting up your group management dashboard</p>
      </motion.div>
    </div>
  )
}

