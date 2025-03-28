"use client"

import { useState, useEffect } from "react"
import { verifyGroupOwnership } from "@/lib/roblox-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react"
import { motion } from "framer-motion"

interface GroupVerificationProps {
  userId: string
  robloxUserId: number
  groupId: number
  groupName: string
  onVerified: (ranks: any[]) => void
  onCancel: () => void
}

export default function GroupVerification({
  userId,
  robloxUserId,
  groupId,
  groupName,
  onVerified,
  onCancel,
}: GroupVerificationProps) {
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ranks, setRanks] = useState<any[]>([])

  useEffect(() => {
    verifyOwnership()
  }, [])

  const verifyOwnership = async () => {
    setIsVerifying(true)
    setError(null)

    try {
      const result = await verifyGroupOwnership(robloxUserId, groupId)

      if (result.verified) {
        setIsVerified(true)
        setRanks(result.ranks || [])
      } else {
        setError(result.message || "Failed to verify group ownership")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during verification")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleContinue = () => {
    onVerified(ranks)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Group Verification
        </CardTitle>
        <CardDescription>Verifying your ownership of {groupName}</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col items-center justify-center py-6">
          {isVerifying ? (
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-lg font-medium">Verifying group ownership...</p>
              <p className="text-sm text-muted-foreground mt-2">This may take a moment</p>
            </div>
          ) : isVerified ? (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Verification Successful!</h3>
              <p className="text-muted-foreground mb-6">You have been verified as a manager of {groupName}</p>
              <Button onClick={handleContinue} className="w-full">
                Continue to Rank Selection
              </Button>
            </motion.div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Verification Failed</h3>
              <p className="text-muted-foreground mb-6">
                We couldn't verify your ownership of this group. Please make sure you have sufficient permissions.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={onCancel} className="flex-1">
                  Go Back
                </Button>
                <Button onClick={verifyOwnership} className="flex-1">
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

