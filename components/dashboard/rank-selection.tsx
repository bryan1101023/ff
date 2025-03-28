"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Users } from "lucide-react"

interface RankSelectionProps {
  ranks: any[]
  onComplete: (selectedRanks: number[]) => void
  onBack: () => void
}

export default function RankSelection({ ranks, onComplete, onBack }: RankSelectionProps) {
  const [selectedRanks, setSelectedRanks] = useState<number[]>([])

  const toggleRank = (rankId: number) => {
    setSelectedRanks((prev) => (prev.includes(rankId) ? prev.filter((id) => id !== rankId) : [...prev, rankId]))
  }

  const handleComplete = () => {
    onComplete(selectedRanks)
  }

  // Sort ranks by rank number (highest to lowest)
  const sortedRanks = [...ranks].sort((a, b) => b.rank - a.rank)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Select Ranks with Access
        </CardTitle>
        <CardDescription>Choose which ranks in your group can access this workspace</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedRanks.map((rank) => (
            <div key={rank.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex-1">
                <Label htmlFor={`rank-${rank.id}`} className="font-medium cursor-pointer">
                  {rank.name}
                </Label>
                <p className="text-sm text-muted-foreground">
                  Rank {rank.rank} • {rank.memberCount.toLocaleString()} members
                </p>
              </div>
              <Switch
                id={`rank-${rank.id}`}
                checked={selectedRanks.includes(rank.id)}
                onCheckedChange={() => toggleRank(rank.id)}
                className="data-[state=checked]:bg-[#2DD4BF] data-[state=checked]:text-primary-foreground"
              />
            </div>
          ))}

          {ranks.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No ranks found</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleComplete} disabled={selectedRanks.length === 0}>
          Create Workspace
        </Button>
      </CardFooter>
    </Card>
  )
}

