"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ChangelogItem {
  title: string
  description: string
  date: string
  type: "feature" | "improvement" | "fix"
}

interface ChangelogPopupProps {
  isOpen: boolean
  onClose: () => void
}

const CHANGELOG_ITEMS: ChangelogItem[] = [
  {
    title: "Recommendations Feature",
    description: "We've fully enrolled the recommendations feature! Now you can recommend users for rank promotions, support recommendations from others, and track promotion status.",
    date: "April 4, 2025",
    type: "feature"
  },
  {
    title: "Knowledge Base",
    description: "Introducing our new Knowledge Base! Create categories, add documents, and access important information quickly.",
    date: "April 4, 2025",
    type: "feature"
  },
  {
    title: "Improved Sessions",
    description: "Sessions now have a streamlined workflow with options for Training Sessions or Shifts.",
    date: "April 4, 2025",
    type: "improvement"
  }
]

export function ChangelogPopup({ isOpen, onClose }: ChangelogPopupProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen && !isVisible) return null

  const getBadgeColor = (type: ChangelogItem["type"]) => {
    switch (type) {
      case "feature":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "improvement":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "fix":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
      onClick={onClose}
    >
      <Card 
        className={`w-full max-w-2xl max-h-[80vh] overflow-y-auto transition-transform duration-300 ${isOpen ? "scale-100" : "scale-95"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">What's New</CardTitle>
            <CardDescription>Latest updates and improvements</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          {CHANGELOG_ITEMS.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <Badge className={getBadgeColor(item.type)}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">{item.date}</span>
              </div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex justify-end pt-2">
          <Button onClick={onClose}>Got it</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
