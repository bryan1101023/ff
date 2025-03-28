"use client"

import type React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Pacifico } from "next/font/google"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Gamepad2, CheckCircle } from "lucide-react"

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-pacifico",
})

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-white/[0.08]",
}: {
  className?: string
  delay?: number
  width?: number
  height?: number
  rotate?: number
  gradient?: string
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -150,
        rotate: rotate - 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: rotate,
      }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={{
          y: [0, 15, 0],
        }}
        transition={{
          duration: 12,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        style={{
          width,
          height,
        }}
        className="relative"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-r to-transparent",
            gradient,
            "backdrop-blur-[2px] border-2 border-white/[0.15]",
            "shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]",
            "after:absolute after:inset-0 after:rounded-full",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]",
          )}
        />
      </motion.div>
    </motion.div>
  )
}

export default function HyreLanding() {
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 0.5 + i * 0.2,
        ease: [0.25, 0.4, 0.25, 1],
      },
    }),
  }

  const formVariants = {
    visible: { opacity: 1, y: 0 },
    exit: {
      opacity: 0,
      y: -50,
      transition: {
        duration: 0.3,
        ease: "easeInOut",
      },
    },
  }

  const successVariants = {
    hidden: {
      opacity: 0,
      y: 50,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut",
        delay: 0.2,
      },
    },
  }

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setIsSubmitting(false)
    setIsSuccess(true)

    // Close the modal after showing success message
    setTimeout(() => {
      setIsWaitlistOpen(false)
      // Reset states after modal is closed
      setTimeout(() => {
        setIsSuccess(false)
        setEmail("")
      }, 300)
    }, 2500)
  }

  const handleDialogClose = () => {
    if (!isSubmitting) {
      setIsWaitlistOpen(false)
      // Reset states after modal is closed
      setTimeout(() => {
        setIsSuccess(false)
        setEmail("")
      }, 300)
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#030303]">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-rose-500/[0.05] blur-3xl" />

      <div className="absolute inset-0 overflow-hidden">
        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient="from-indigo-500/[0.15]"
          className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
        />

        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient="from-rose-500/[0.15]"
          className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]"
        />

        <ElegantShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient="from-violet-500/[0.15]"
          className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]"
        />

        <ElegantShape
          delay={0.6}
          width={200}
          height={60}
          rotate={20}
          gradient="from-amber-500/[0.15]"
          className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]"
        />

        <ElegantShape
          delay={0.7}
          width={150}
          height={40}
          rotate={-25}
          gradient="from-cyan-500/[0.15]"
          className="left-[20%] md:left-[25%] top-[5%] md:top-[10%]"
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            custom={0}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-8 md:mb-12"
          >
            <Gamepad2 className="h-5 w-5 text-white/70" />
            <span className="text-sm text-white/60 tracking-wide">Hyre</span>
          </motion.div>

          <motion.div custom={1} variants={fadeUpVariants} initial="hidden" animate="visible">
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-bold mb-6 md:mb-8 tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">Welcome to</span>
              <br />
              <span
                className={cn(
                  "bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300",
                  pacifico.className,
                )}
              >
                Hyre!
              </span>
            </h1>
          </motion.div>

          <motion.div custom={2} variants={fadeUpVariants} initial="hidden" animate="visible">
            <p className="text-base sm:text-lg md:text-xl text-white/40 mb-8 leading-relaxed font-light tracking-wide max-w-xl mx-auto px-4">
              The ultimate staff management platform for Roblox groups. Streamline recruitment, track performance, and
              grow your community.
            </p>
          </motion.div>

          <motion.div custom={3} variants={fadeUpVariants} initial="hidden" animate="visible">
            <Button
              size="lg"
              className="bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-sm px-8 py-6 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              onClick={() => setIsWaitlistOpen(true)}
            >
              Join the Waitlist
            </Button>
          </motion.div>
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-[#030303]/80 pointer-events-none" />

      <Dialog open={isWaitlistOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md bg-[#030303] border border-white/10 shadow-[0_0_25px_rgba(255,255,255,0.05)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] via-transparent to-rose-500/[0.02] rounded-md pointer-events-none" />

          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">Join the Hyre Waitlist</DialogTitle>
            <DialogDescription className="text-white/60">
              Be the first to know when we launch. Enter your email below.
            </DialogDescription>
          </DialogHeader>

          <div className="relative min-h-[200px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              {!isSuccess ? (
                <motion.form
                  key="waitlist-form"
                  variants={formVariants}
                  initial="visible"
                  exit="exit"
                  onSubmit={handleWaitlistSubmit}
                  className="space-y-4 relative z-10 w-full"
                >
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/80">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white/5 border-white/10 text-white focus:border-white/20 focus:ring-white/10"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-sm transition-all duration-300"
                    >
                      {isSubmitting ? "Submitting..." : "Join Waitlist"}
                    </Button>
                  </div>
                  <p className="text-xs text-white/40 pt-2">
                    By joining, you agree to our{" "}
                    <a href="#" className="underline underline-offset-2 hover:text-white/60">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="underline underline-offset-2 hover:text-white/60">
                      Privacy Policy
                    </a>
                    .
                  </p>
                </motion.form>
              ) : (
                <motion.div
                  key="success-message"
                  variants={successVariants}
                  initial="hidden"
                  animate="visible"
                  className="text-center py-6 absolute inset-0 flex flex-col items-center justify-center"
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{
                      scale: 1,
                      opacity: 1,
                      transition: { delay: 0.3, duration: 0.5 },
                    }}
                    className="mb-4 relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/30 to-rose-500/30 rounded-full blur-xl" />
                    <CheckCircle size={64} className="text-white relative z-10" />
                  </motion.div>
                  <motion.h3
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: { delay: 0.4, duration: 0.5 },
                    }}
                    className={cn("text-2xl font-bold text-white mb-2", pacifico.className)}
                  >
                    Wowzies! You are in!
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: { delay: 0.5, duration: 0.5 },
                    }}
                    className="text-white/60"
                  >
                    We'll notify you when Hyre launches!
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

