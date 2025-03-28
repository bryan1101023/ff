"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Briefcase, X, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

const jobPositions = [
  {
    id: "trust-safety-lead",
    title: "Trust and Safety Team Lead",
    description: "Lead our trust and safety initiatives to ensure a positive and secure environment for all users.",
    responsibilities: [
      "Develop and implement trust and safety policies",
      "Lead a team of moderators and safety specialists",
      "Work with product teams to build safety features",
      "Analyze safety metrics and create reports for leadership",
      "Handle escalated user safety issues"
    ],
    requirements: [
      "3+ years experience in trust and safety or content moderation",
      "Strong leadership skills and experience managing teams",
      "Excellent communication and problem-solving abilities",
      "Understanding of online community dynamics",
      "Experience with Roblox platform is a plus"
    ],
    location: "Remote",
    type: "Full-time"
  },
  {
    id: "customer-support",
    title: "Customer Support Specialist",
    description: "Provide exceptional support to our users and help them get the most out of our platform.",
    responsibilities: [
      "Respond to user inquiries via email and chat",
      "Troubleshoot technical issues and provide solutions",
      "Document common issues and contribute to knowledge base",
      "Collect user feedback and relay to product teams",
      "Assist with user onboarding and education"
    ],
    requirements: [
      "1+ years of customer support experience",
      "Strong written and verbal communication skills",
      "Patient and empathetic approach to problem-solving",
      "Ability to work independently and as part of a team",
      "Familiarity with Roblox platform is a plus"
    ],
    location: "Remote",
    type: "Full-time"
  }
]

export default function JobsSection() {
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [isApplicationOpen, setIsApplicationOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    experience: "",
    whyJoin: "",
    portfolio: "",
    availability: "",
    heardFrom: "social-media"
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        delay: 0.2 + i * 0.1,
        ease: [0.25, 0.4, 0.25, 1],
      },
    }),
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleRadioChange = (value: string) => {
    setFormData(prev => ({ ...prev, heardFrom: value }))
  }

  const handleJobSelect = (jobId: string) => {
    setSelectedJob(jobId)
    setIsApplicationOpen(true)
  }

  const handleApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Get the selected job details
      const job = jobPositions.find(job => job.id === selectedJob)
      
      // Save to Firestore
      await addDoc(collection(db, "job-applications"), {
        ...formData,
        jobId: selectedJob,
        jobTitle: job?.title,
        status: "new",
        createdAt: serverTimestamp(),
      })

      // Show success message
      setIsSubmitting(false)
      setIsSuccess(true)

      // Reset form after delay
      setTimeout(() => {
        setIsApplicationOpen(false)
        setTimeout(() => {
          setIsSuccess(false)
          setFormData({
            name: "",
            email: "",
            experience: "",
            whyJoin: "",
            portfolio: "",
            availability: "",
            heardFrom: "social-media"
          })
        }, 300)
      }, 2000)
    } catch (error) {
      console.error("Error submitting application:", error)
      setIsSubmitting(false)
      // Could add error handling here
    }
  }

  const handleDialogClose = () => {
    if (!isSubmitting) {
      setIsApplicationOpen(false)
      // Reset states after modal is closed
      setTimeout(() => {
        setIsSuccess(false)
        setFormData({
          name: "",
          email: "",
          experience: "",
          whyJoin: "",
          portfolio: "",
          availability: "",
          heardFrom: "social-media"
        })
      }, 300)
    }
  }

  return (
    <section className="relative">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-rose-500/[0.03] pointer-events-none" />
      
      {/* Hiring Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-5xl mx-auto mb-16 px-4"
      >
        <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.02] backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/[0.05] to-rose-500/[0.05]" />
          <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">We're hiring staff members!</h3>
                <p className="text-white/60 mt-1">Join our team and help shape the future of Hyre</p>
              </div>
            </div>
            <Button 
              onClick={() => window.location.href = "#job-listings"}
              className="bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-sm px-6 py-5 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            >
              View Openings
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 md:px-6">

        <div id="job-listings" className="max-w-4xl mx-auto space-y-6">
          {jobPositions.map((job, index) => (
            <motion.div
              key={job.id}
              custom={index + 3}
              variants={fadeUpVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.04] transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/[0.02] to-rose-500/[0.02]" />
              <div className="relative p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{job.title}</h3>
                    <p className="text-white/60 mb-4">{job.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-3 py-1 rounded-full text-xs bg-white/10 text-white/70">{job.type}</span>
                      <span className="px-3 py-1 rounded-full text-xs bg-white/10 text-white/70">{job.location}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Button 
                      onClick={() => handleJobSelect(job.id)}
                      className="bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-sm transition-all duration-300 flex items-center gap-2"
                    >
                      Apply Now
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-white/80 mb-2">Responsibilities</h4>
                    <ul className="space-y-2">
                      {job.responsibilities.map((item, i) => (
                        <li key={i} className="text-sm text-white/50 flex items-start gap-2">
                          <span className="h-5 w-5 flex-shrink-0 rounded-full bg-white/10 flex items-center justify-center text-white/70 text-xs">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white/80 mb-2">Requirements</h4>
                    <ul className="space-y-2">
                      {job.requirements.map((item, i) => (
                        <li key={i} className="text-sm text-white/50 flex items-start gap-2">
                          <span className="h-5 w-5 flex-shrink-0 rounded-full bg-white/10 flex items-center justify-center text-white/70 text-xs">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Application Dialog */}
      <Dialog open={isApplicationOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-lg bg-[#030303] border border-white/10 shadow-[0_0_25px_rgba(255,255,255,0.05)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] via-transparent to-rose-500/[0.02] rounded-md pointer-events-none" />
          
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center justify-between">
              <span>
                {selectedJob && jobPositions.find(job => job.id === selectedJob)?.title}
              </span>
              <Button variant="ghost" size="icon" onClick={handleDialogClose} className="h-8 w-8">
                <X className="h-4 w-4 text-white/70" />
              </Button>
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Tell us about yourself and why you're interested in this position.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            {!isSuccess ? (
              <form onSubmit={handleApplicationSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white/80">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="bg-white/5 border-white/10 text-white focus:border-white/20 focus:ring-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/80">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="bg-white/5 border-white/10 text-white focus:border-white/20 focus:ring-white/10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience" className="text-white/80">Relevant Experience</Label>
                  <Textarea
                    id="experience"
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    required
                    className="bg-white/5 border-white/10 text-white focus:border-white/20 focus:ring-white/10 min-h-[100px]"
                    placeholder="Tell us about your relevant experience..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whyJoin" className="text-white/80">Why do you want to join Hyre?</Label>
                  <Textarea
                    id="whyJoin"
                    name="whyJoin"
                    value={formData.whyJoin}
                    onChange={handleInputChange}
                    required
                    className="bg-white/5 border-white/10 text-white focus:border-white/20 focus:ring-white/10 min-h-[100px]"
                    placeholder="Tell us why you're interested in joining our team..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="portfolio" className="text-white/80">Portfolio/LinkedIn URL (Optional)</Label>
                    <Input
                      id="portfolio"
                      name="portfolio"
                      value={formData.portfolio}
                      onChange={handleInputChange}
                      className="bg-white/5 border-white/10 text-white focus:border-white/20 focus:ring-white/10"
                      placeholder="https://"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="availability" className="text-white/80">Availability</Label>
                    <Input
                      id="availability"
                      name="availability"
                      value={formData.availability}
                      onChange={handleInputChange}
                      required
                      className="bg-white/5 border-white/10 text-white focus:border-white/20 focus:ring-white/10"
                      placeholder="When can you start?"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80">How did you hear about us?</Label>
                  <RadioGroup 
                    value={formData.heardFrom} 
                    onValueChange={handleRadioChange}
                    className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="social-media" id="social-media" className="border-white/20" />
                      <Label htmlFor="social-media" className="text-white/60">Social Media</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="friend" id="friend" className="border-white/20" />
                      <Label htmlFor="friend" className="text-white/60">Friend</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="roblox" id="roblox" className="border-white/20" />
                      <Label htmlFor="roblox" className="text-white/60">Roblox</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="job-board" id="job-board" className="border-white/20" />
                      <Label htmlFor="job-board" className="text-white/60">Job Board</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="other" id="other" className="border-white/20" />
                      <Label htmlFor="other" className="text-white/60">Other</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-sm transition-all duration-300"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Application"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto rounded-full bg-white/5 p-3 w-16 h-16 flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Application Submitted!</h3>
                <p className="text-white/60 mb-6">
                  Thank you for your interest in joining our team. We'll review your application and get back to you soon.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

import { CheckCircle } from "lucide-react"
