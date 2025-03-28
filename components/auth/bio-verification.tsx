"use client"

import type React from "react"

import { useState } from "react"
import { generateVerificationCode, verifyBioCode } from "@/lib/roblox-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Copy, CheckCircle, ArrowRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { getUserGroups } from "@/lib/roblox-api"

interface BioVerificationProps {
  onVerified: (username: string, userId: number) => void
}

export default function BioVerification({ onVerified }: BioVerificationProps) {
  const [step, setStep] = useState(1)
  const [username, setUsername] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username) {
      setError("Please enter your Roblox username")
      return
    }

    // Generate a verification code
    const code = generateVerificationCode()
    setVerificationCode(code)
    setStep(2)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(verificationCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Add this function inside the component
  const checkCelestaAccess = async (robloxUserId: number) => {
    try {
      // Fetch user's groups
      const groups = await getUserGroups(robloxUserId)

      // Check if user is in Celesta group
      const celestaGroup = groups.find((g) => g.name.includes("Celesta"))

      if (celestaGroup) {
        // Check if user has appropriate rank
        // This would be a more complex check in a real implementation
        console.log("User is in Celesta group with rank:", celestaGroup.rank)
        return true
      }

      return false
    } catch (error) {
      console.error("Error checking Celesta access:", error)
      return false
    }
  }

  // Update the handleBioVerified function to check if the Roblox account is already linked
  const handleBioVerified = async (username: string, userId: number) => {
    setIsLoading(true)
    setError(null)

    try {
      // Check if this Roblox account is already linked to another account
      const isLinked = await checkRobloxAccountLinked(username, userId)

      if (isLinked) {
        setError(
          `This Roblox account (${username}) is already linked to another Hyre account. Each Roblox account can only be linked to one Hyre account.`,
        )
        setIsLoading(false)
        return
      }

      // If not linked, proceed with verification
      onVerified(username, userId)
    } catch (err: any) {
      setError(err.message || "An error occurred during verification")
      setIsLoading(false)
    }
  }

  // Add this function to check if a Roblox account is already linked
  const checkRobloxAccountLinked = async (username: string, userId: number): Promise<boolean> => {
    try {
      // Query Firestore to check if any user has this Roblox username or ID
      const response = await fetch(`/api/check-roblox-linked?username=${encodeURIComponent(username)}&userId=${userId}`)

      if (!response.ok) {
        throw new Error("Failed to check Roblox account status")
      }

      const data = await response.json()
      return data.isLinked
    } catch (error) {
      console.error("Error checking Roblox account:", error)
      throw error
    }
  }

  // Update the handleVerify function to check for Celesta access
  const handleVerify = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await verifyBioCode(username, verificationCode)

      if (result.verified) {
        // Check if user has access to Celesta workspace
        if (result.userId) {
          const hasCelestaAccess = await checkCelestaAccess(result.userId)
          console.log("User has Celesta access:", hasCelestaAccess)
          // You could store this information in the user's data
        }

        handleBioVerified(result.username, result.userId)
      } else {
        setError(result.message || "Verification failed. Please make sure the code is in your bio.")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during verification")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Verify Your Roblox Account</CardTitle>
        <CardDescription>This is a one-time verification to link your Roblox account</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={handleUsernameSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Roblox Username</Label>
                  <Input
                    id="username"
                    placeholder="Enter your Roblox username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="rounded-lg border p-4 bg-muted/30">
                <h3 className="font-medium mb-2">Verification Instructions</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Copy the verification code below</li>
                  <li>
                    Go to your{" "}
                    <a
                      href={`https://www.roblox.com/users/profile`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      Roblox profile
                    </a>
                  </li>
                  <li>Edit your profile and paste the code in your About section</li>
                  <li>Save your profile changes</li>
                  <li>Come back here and click "Verify"</li>
                </ol>
              </div>

              <div className="space-y-2">
                <Label>Your Verification Code</Label>
                <div className="flex">
                  <div className="flex-1 p-3 bg-muted rounded-l-md border-y border-l font-mono text-lg overflow-x-auto">
                    {verificationCode}
                  </div>
                  <Button variant="secondary" className="rounded-l-none" onClick={copyToClipboard}>
                    {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleVerify} disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify"
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

