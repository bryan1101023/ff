"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { getCurrentUserData, signOut } from "@/lib/auth-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Ban, AlertTriangle } from "lucide-react"
import { motion } from "framer-motion"

// Add the ElegantShape component from the homepage
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
      className={`absolute ${className}`}
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
          className={`absolute inset-0 rounded-full bg-gradient-to-r to-transparent ${gradient} backdrop-blur-[2px] border-2 border-white/[0.15] shadow-[0_8px_32px_0_rgba(255,255,255,0.1)] after:absolute after:inset-0 after:rounded-full after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]`}
        />
      </motion.div>
    </motion.div>
  )
}

export default function BannedPage() {
  const [user, setUser] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser)

        // Get additional user data from Firestore
        const data = await getCurrentUserData(authUser.uid)
        setUserData(data)

        // If user is not banned, redirect to dashboard
        if (!data?.isBanned) {
          router.push("/dashboard")
        }
      } else {
        // Not logged in, redirect to beta login
        router.push("/beta")
      }

      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/beta")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303]">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden bg-[#030303] p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.05] via-transparent to-red-500/[0.05] blur-3xl" />

      {/* Add the floating shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient="from-red-500/[0.15]"
          className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
        />

        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient="from-red-500/[0.15]"
          className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]"
        />

        <ElegantShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient="from-red-500/[0.15]"
          className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10"
      >
        <Card className="w-full max-w-md border-red-500/20">
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mx-auto w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4"
            >
              <Ban className="h-8 w-8 text-red-500" />
            </motion.div>
            <CardTitle className="text-2xl">Account Banned</CardTitle>
            <CardDescription>Your account has been banned from using Hyre</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 mb-4">
              <div className="flex gap-2 items-start">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h3 className="font-medium">Reason for ban:</h3>
                  <p className="text-sm text-muted-foreground">
                    {userData?.banReason || "Violation of Hyre's terms of service"}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              If you believe this is a mistake, please contact our support team for assistance.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSignOut} className="w-full">
              Sign Out
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

