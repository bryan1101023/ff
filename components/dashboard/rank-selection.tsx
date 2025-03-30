"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CheckCircle, AlertCircle, Shield } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"

interface RobloxRole {
  id: number;
  name: string;
  rank: number;
  memberCount?: number;
}

interface RankSelectionProps {
  ranks: RobloxRole[];
  onComplete: (ranks: number[]) => void;
  onBack: () => void;
}

export default function RankSelection({ ranks, onComplete, onBack }: RankSelectionProps) {
  const [selectedRanks, setSelectedRanks] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)

  // Add debugging on component mount
  useEffect(() => {
    console.log('RankSelection mounted with ranks:', JSON.stringify(ranks));
    
    // Check for any invalid rank objects
    ranks.forEach((rank, index) => {
      if (typeof rank !== 'object' || rank === null) {
        console.error(`Invalid rank at index ${index}:`, rank);
      } else if (typeof rank.id !== 'number' || typeof rank.name !== 'string' || typeof rank.rank !== 'number') {
        console.error(`Rank at index ${index} has invalid properties:`, rank);
      }
    });
  }, [ranks]);

  const toggleRank = (rankId: number) => {
    setError(null)
    setSelectedRanks((prev) => 
      prev.includes(rankId) ? prev.filter((id) => id !== rankId) : [...prev, rankId]
    )
  }

  const handleComplete = () => {
    if (selectedRanks.length === 0) {
      setError("Please select at least one rank")
      return
    }
    
    // Add debugging to see what's happening
    console.log('RankSelection handleComplete called with selectedRanks:', JSON.stringify(selectedRanks));
    
    // Call the onComplete callback with the selected ranks
    if (typeof onComplete === 'function') {
      try {
        onComplete(selectedRanks)
      } catch (error) {
        console.error('Error in onComplete callback:', error);
        setError("An error occurred while processing your selection. Please try again.");
      }
    } else {
      console.error('onComplete is not a function:', onComplete);
      setError("Component configuration error. Please refresh the page and try again.");
    }
  }

  // Sort ranks by rank number (highest to lowest)
  const sortedRanks = [...ranks].filter(rank => {
    // Filter out any invalid rank objects
    if (!rank || typeof rank !== 'object') {
      console.error('Invalid rank object:', rank);
      return false;
    }
    return true;
  }).sort((a, b) => b.rank - a.rank)

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Select Allowed Ranks
        </CardTitle>
        <CardDescription className="text-base">
          Choose which ranks will have access to this workspace
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedRanks.map((rank, index) => {
            // Debug each rank before rendering
            console.log(`Rendering rank at index ${index}:`, JSON.stringify(rank));
            
            // Ensure all properties are primitives
            const id = typeof rank.id === 'number' ? rank.id : Number(rank.id || 0);
            const name = typeof rank.name === 'string' ? rank.name : String(rank.name || '');
            const rankValue = typeof rank.rank === 'number' ? rank.rank : Number(rank.rank || 0);
            const memberCount = rank.memberCount ? Number(rank.memberCount) : undefined;
            
            return (
              <div
                key={id}
                className={cn(
                  "relative flex items-center justify-between rounded-lg border p-4 shadow-sm",
                  selectedRanks.includes(id) && "border-primary"
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {`Rank ${rankValue}`}
                    {memberCount !== undefined ? ` • ${memberCount.toLocaleString()} members` : ''}
                  </p>
                </div>
                <Switch
                  checked={selectedRanks.includes(id)}
                  onCheckedChange={() => toggleRank(id)}
                  aria-label={`Toggle ${name}`}
                />
              </div>
            );
          })}

          {ranks.length === 0 && (
            <div className="text-center py-12">
              <div className="rounded-full bg-muted w-12 h-12 mx-auto flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No ranks found</p>
            </div>
          )}
        </div>
        
        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-6">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="w-28"
        >
          Back
        </Button>
        <Button 
          onClick={handleComplete}
          className="w-28"
        >
          Continue
        </Button>
      </CardFooter>
    </Card>
  )
}
