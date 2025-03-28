"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Briefcase, Calendar, Mail, User, ExternalLink, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

type JobApplication = {
  id: string
  name: string
  email: string
  experience: string
  whyJoin: string
  portfolio: string
  availability: string
  heardFrom: string
  jobId: string
  jobTitle: string
  status: "new" | "reviewing" | "accepted" | "rejected"
  createdAt: any
  notes?: string
}

export default function JobApplicationsList() {
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filter, setFilter] = useState<"all" | "new" | "reviewing" | "accepted" | "rejected">("all")
  const [jobFilter, setJobFilter] = useState<string>("all")
  const [uniqueJobs, setUniqueJobs] = useState<{id: string, title: string}[]>([])
  const [notes, setNotes] = useState("")

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    setIsLoading(true)
    try {
      const applicationsQuery = query(
        collection(db, "job-applications"),
        orderBy("createdAt", "desc")
      )
      const snapshot = await getDocs(applicationsQuery)
      
      const applicationsList: JobApplication[] = []
      const jobsSet = new Set<string>()
      const jobsMap = new Map<string, string>()
      
      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<JobApplication, "id">
        const application = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as JobApplication
        
        applicationsList.push(application)
        
        if (application.jobId && application.jobTitle) {
          jobsSet.add(application.jobId)
          jobsMap.set(application.jobId, application.jobTitle)
        }
      })
      
      setApplications(applicationsList)
      
      // Extract unique jobs for filtering
      const uniqueJobsList = Array.from(jobsSet).map(jobId => ({
        id: jobId,
        title: jobsMap.get(jobId) || "Unknown Job"
      }))
      setUniqueJobs(uniqueJobsList)
      
    } catch (error) {
      console.error("Error fetching job applications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateApplicationStatus = async (id: string, status: JobApplication["status"]) => {
    try {
      const applicationRef = doc(db, "job-applications", id)
      await updateDoc(applicationRef, { status })
      
      // Update local state
      setApplications(prev => 
        prev.map(app => app.id === id ? { ...app, status } : app)
      )
      
      if (selectedApplication?.id === id) {
        setSelectedApplication(prev => prev ? { ...prev, status } : null)
      }
    } catch (error) {
      console.error("Error updating application status:", error)
    }
  }

  const saveNotes = async () => {
    if (!selectedApplication) return
    
    try {
      const applicationRef = doc(db, "job-applications", selectedApplication.id)
      await updateDoc(applicationRef, { notes })
      
      // Update local state
      setApplications(prev => 
        prev.map(app => app.id === selectedApplication.id ? { ...app, notes } : app)
      )
      
      setSelectedApplication(prev => prev ? { ...prev, notes } : null)
    } catch (error) {
      console.error("Error saving notes:", error)
    }
  }

  const deleteApplication = async (id: string) => {
    if (!confirm("Are you sure you want to delete this application? This action cannot be undone.")) {
      return
    }
    
    try {
      await deleteDoc(doc(db, "job-applications", id))
      
      // Update local state
      setApplications(prev => prev.filter(app => app.id !== id))
      
      if (selectedApplication?.id === id) {
        setIsDialogOpen(false)
        setSelectedApplication(null)
      }
    } catch (error) {
      console.error("Error deleting application:", error)
    }
  }

  const handleViewApplication = (application: JobApplication) => {
    setSelectedApplication(application)
    setNotes(application.notes || "")
    setIsDialogOpen(true)
  }

  const filteredApplications = applications.filter(app => {
    // Filter by status
    if (filter !== "all" && app.status !== filter) {
      return false
    }
    
    // Filter by job
    if (jobFilter !== "all" && app.jobId !== jobFilter) {
      return false
    }
    
    return true
  })

  const getStatusBadge = (status: JobApplication["status"]) => {
    switch (status) {
      case "new":
        return <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30">New</Badge>
      case "reviewing":
        return <Badge className="bg-amber-500/20 text-amber-500 hover:bg-amber-500/30">Reviewing</Badge>
      case "accepted":
        return <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">Accepted</Badge>
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-500 hover:bg-red-500/30">Rejected</Badge>
      default:
        return <Badge>Unknown</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/[0.02] border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Job Applications
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchApplications}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              Refresh
            </Button>
          </CardTitle>
          <CardDescription className="text-white/60">
            View and manage job applications from the careers page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="flex gap-2">
                <Select value={filter} onValueChange={(value) => setFilter(value as any)}>
                  <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                    <SelectItem value="all">All Applications</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={jobFilter} onValueChange={setJobFilter}>
                  <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Filter by job" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                    <SelectItem value="all">All Positions</SelectItem>
                    {uniqueJobs.map(job => (
                      <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="text-sm text-white/60">
                {filteredApplications.length} application{filteredApplications.length !== 1 ? 's' : ''}
              </div>
            </div>
            
            {isLoading ? (
              <div className="py-20 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                <p className="mt-4 text-white/60">Loading applications...</p>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="py-20 text-center">
                <div className="mx-auto rounded-full bg-white/5 p-3 w-16 h-16 flex items-center justify-center mb-4">
                  <Briefcase className="h-8 w-8 text-white/40" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No Applications Found</h3>
                <p className="text-white/60">
                  {filter !== "all" || jobFilter !== "all" 
                    ? "Try changing your filters to see more applications." 
                    : "When people apply for jobs, they'll appear here."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredApplications.map((application) => (
                  <div 
                    key={application.id}
                    className="p-4 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200 cursor-pointer"
                    onClick={() => handleViewApplication(application)}
                  >
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-white font-medium">{application.name}</h3>
                          {getStatusBadge(application.status)}
                        </div>
                        <p className="text-white/60 text-sm mb-2">
                          Applied for: <span className="text-primary">{application.jobTitle}</span>
                        </p>
                        <div className="flex items-center gap-4 text-sm text-white/40">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {application.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(application.createdAt, { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewApplication(application);
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Application Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-3xl bg-[#030303] border border-white/10 shadow-[0_0_25px_rgba(255,255,255,0.05)]">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] via-transparent to-rose-500/[0.02] rounded-md pointer-events-none" />
          
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              Application Details
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Review the application and update its status
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-6 pt-4">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedApplication.name}</h3>
                  <p className="text-white/60">
                    Applied for: <span className="text-primary">{selectedApplication.jobTitle}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(selectedApplication.status)}
                  <span className="text-sm text-white/40">
                    {formatDistanceToNow(selectedApplication.createdAt, { addSuffix: true })}
                  </span>
                </div>
              </div>

              <Tabs defaultValue="details" className="space-y-4">
                <TabsList className="bg-white/5 border border-white/10">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="experience">Experience</TabsTrigger>
                  <TabsTrigger value="motivation">Motivation</TabsTrigger>
                  <TabsTrigger value="notes">Admin Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-white/40">Email</label>
                      <div className="flex items-center gap-2 text-white">
                        <Mail className="h-4 w-4 text-primary" />
                        <a href={`mailto:${selectedApplication.email}`} className="hover:underline">
                          {selectedApplication.email}
                        </a>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm text-white/40">Availability</label>
                      <div className="flex items-center gap-2 text-white">
                        <Calendar className="h-4 w-4 text-primary" />
                        {selectedApplication.availability}
                      </div>
                    </div>
                    
                    {selectedApplication.portfolio && (
                      <div className="space-y-2 col-span-1 sm:col-span-2">
                        <label className="text-sm text-white/40">Portfolio/LinkedIn</label>
                        <div className="flex items-center gap-2 text-white">
                          <ExternalLink className="h-4 w-4 text-primary" />
                          <a 
                            href={selectedApplication.portfolio.startsWith('http') ? selectedApplication.portfolio : `https://${selectedApplication.portfolio}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {selectedApplication.portfolio}
                          </a>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2 col-span-1 sm:col-span-2">
                      <label className="text-sm text-white/40">How they heard about us</label>
                      <div className="text-white capitalize">
                        {selectedApplication.heardFrom.replace(/-/g, ' ')}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="experience" className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-white/40">Relevant Experience</label>
                    <div className="p-4 rounded-lg border border-white/10 bg-white/[0.02] text-white whitespace-pre-wrap">
                      {selectedApplication.experience}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="motivation" className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-white/40">Why they want to join Hyre</label>
                    <div className="p-4 rounded-lg border border-white/10 bg-white/[0.02] text-white whitespace-pre-wrap">
                      {selectedApplication.whyJoin}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-white/40">Admin Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-4 rounded-lg border border-white/10 bg-white/[0.02] text-white min-h-[150px] focus:ring-primary focus:border-primary"
                      placeholder="Add private notes about this applicant..."
                    />
                    <Button 
                      onClick={saveNotes}
                      className="bg-white/5 hover:bg-white/10 text-white border border-white/10"
                    >
                      Save Notes
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex flex-wrap justify-between gap-4 pt-4 border-t border-white/10">
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    className="bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                    onClick={() => updateApplicationStatus(selectedApplication.id, "reviewing")}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Mark as Reviewing
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                    onClick={() => updateApplicationStatus(selectedApplication.id, "accepted")}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                    onClick={() => updateApplicationStatus(selectedApplication.id, "rejected")}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
                <Button
                  variant="destructive"
                  className="bg-red-500/10 hover:bg-red-500/20"
                  onClick={() => deleteApplication(selectedApplication.id)}
                >
                  Delete Application
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
