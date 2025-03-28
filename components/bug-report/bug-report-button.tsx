"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BugIcon, X, Loader2, CheckCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"

export default function BugReportButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !description) return

    setIsSubmitting(true)

    try {
      // Add the bug report to Firestore
      await addDoc(collection(db, "bugReports"), {
        title,
        description,
        status: "new",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        resolved: false,
      })

      setIsSuccess(true)

      // Reset form after 2 seconds and close
      setTimeout(() => {
        setTitle("")
        setDescription("")
        setIsSuccess(false)
        setIsOpen(false)
      }, 2000)
    } catch (error) {
      console.error("Error submitting bug report:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 rounded-full shadow-lg bg-red-500 hover:bg-red-600 text-white"
        size="icon"
      >
        <BugIcon className="h-5 w-5" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              className="bg-[#030303] border border-white/10 rounded-lg p-6 w-full max-w-md relative"
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>

              <div className="mb-4">
                <h2 className="text-xl font-bold text-white">Report a Bug</h2>
                <p className="text-white/60 text-sm">Found an issue? Let us know so we can fix it.</p>
              </div>

              {isSuccess ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-6"
                >
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-1">Bug Report Submitted</h3>
                  <p className="text-white/60 text-sm text-center">
                    Thank you for your feedback! We'll look into this issue.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Brief description of the issue"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="bg-white/5 border-white/10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Please provide details about what happened and how to reproduce the issue"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      className="bg-white/5 border-white/10 min-h-[120px]"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Report"
                    )}
                  </Button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

