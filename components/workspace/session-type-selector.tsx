"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, Users } from "lucide-react"

interface SessionTypeSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelectTraining: () => void
  onSelectShift: () => void
}

export function SessionTypeSelector({
  isOpen,
  onClose,
  onSelectTraining,
  onSelectShift,
}: SessionTypeSelectorProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Session Type</DialogTitle>
          <DialogDescription>
            Choose the type of session you want to create
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <Button
            variant="outline"
            className="flex flex-col items-center justify-center h-32 space-y-2 hover:border-primary"
            onClick={onSelectTraining}
          >
            <Calendar className="h-8 w-8 text-primary" />
            <span className="font-medium">Training Session</span>
            <span className="text-xs text-muted-foreground">For training events and classes</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col items-center justify-center h-32 space-y-2 hover:border-primary"
            onClick={onSelectShift}
          >
            <Users className="h-8 w-8 text-primary" />
            <span className="font-medium">Shift</span>
            <span className="text-xs text-muted-foreground">For regular work shifts</span>
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
