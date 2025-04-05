"use client"

import React, { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, collection, addDoc, getDocs, updateDoc, deleteDoc, query, where } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Book, Plus, Edit, Trash2, FileText, Link, ExternalLink } from "lucide-react"
import { getCurrentUserData } from "@/lib/auth-utils"

// Define types
interface Category {
  id: string
  name: string
  icon: string
  workspaceId: string
  createdAt: number
  createdBy: string
}

interface Document {
  id: string
  title: string
  description: string
  content: string
  categoryId: string
  workspaceId: string
  createdAt: number
  createdBy: string
}

interface QuickLink {
  id: string
  title: string
  url: string
  workspaceId: string
  createdAt: number
  createdBy: string
}

const ICONS = [
  { name: "Book", component: Book },
  { name: "FileText", component: FileText },
  { name: "Link", component: Link },
  { name: "ExternalLink", component: ExternalLink },
]

export default function KnowledgeBasePage() {
  const params = useParams<{ id: string }>()
  const workspaceId = params?.id || ""
  
  const [user, setUser] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [workspace, setWorkspace] = useState<any>(null)
  
  const [categories, setCategories] = useState<Category[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [isCreatingDocument, setIsCreatingDocument] = useState(false)
  const [isCreatingLink, setIsCreatingLink] = useState(false)
  
  // Form states
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState('Book')
  const [newDocTitle, setNewDocTitle] = useState('')
  const [newDocDescription, setNewDocDescription] = useState('')
  const [newDocContent, setNewDocContent] = useState('')
  const [newLinkTitle, setNewLinkTitle] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  
  // Handle authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      
      if (currentUser) {
        try {
          const fullUserData = await getCurrentUserData(currentUser.uid)
          setUserData(fullUserData)
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      }
      
      setAuthLoading(false)
    })
    
    return () => unsubscribe()
  }, [])
  
  // Fetch workspace data
  useEffect(() => {
    const fetchWorkspace = async () => {
      if (!workspaceId) return
      
      try {
        const workspaceRef = doc(db, "workspaces", workspaceId)
        const workspaceSnap = await getDoc(workspaceRef)
        
        if (workspaceSnap.exists()) {
          setWorkspace({ id: workspaceSnap.id, ...workspaceSnap.data() })
        }
      } catch (error) {
        console.error("Error fetching workspace:", error)
        toast({
          title: "Error",
          description: "Failed to load workspace data",
          variant: "destructive",
        })
      }
    }
    
    if (!authLoading) {
      fetchWorkspace()
    }
  }, [workspaceId, authLoading])
  
  // Fetch categories, documents, and quick links
  useEffect(() => {
    const fetchData = async () => {
      if (!workspaceId || !user) return
      
      setIsLoading(true)
      
      try {
        // Fetch categories
        const categoriesQuery = query(
          collection(db, "knowledgeCategories"),
          where("workspaceId", "==", workspaceId)
        )
        const categoriesSnap = await getDocs(categoriesQuery)
        const categoriesData = categoriesSnap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        })) as Category[]
        setCategories(categoriesData)
        
        // Fetch documents
        const documentsQuery = query(
          collection(db, "knowledgeDocuments"),
          where("workspaceId", "==", workspaceId)
        )
        const documentsSnap = await getDocs(documentsQuery)
        const documentsData = documentsSnap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        })) as Document[]
        setDocuments(documentsData)
        
        // Fetch quick links
        const linksQuery = query(
          collection(db, "quickLinks"),
          where("workspaceId", "==", workspaceId)
        )
        const linksSnap = await getDocs(linksQuery)
        const linksData = linksSnap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        })) as QuickLink[]
        setQuickLinks(linksData)
        
        // Set first category as selected if there are categories
        if (categoriesData.length > 0 && !selectedCategory) {
          setSelectedCategory(categoriesData[0].id)
        }
      } catch (error) {
        console.error("Error fetching knowledge base data:", error)
        toast({
          title: "Error",
          description: "Failed to load knowledge base data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    if (workspace && user) {
      fetchData()
    }
  }, [workspaceId, workspace, user, selectedCategory])
  
  // Create new category
  const handleCreateCategory = async () => {
    if (!workspaceId || !user || !newCategoryName.trim()) return
    
    try {
      const newCategory = {
        name: newCategoryName.trim(),
        icon: newCategoryIcon,
        workspaceId,
        createdAt: Date.now(),
        createdBy: user.uid
      }
      
      const docRef = await addDoc(collection(db, "knowledgeCategories"), newCategory)
      
      setCategories(prev => [...prev, { id: docRef.id, ...newCategory }])
      setNewCategoryName('')
      setNewCategoryIcon('Book')
      setIsCreatingCategory(false)
      
      toast({
        title: "Success",
        description: "Category created successfully",
      })
    } catch (error) {
      console.error("Error creating category:", error)
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      })
    }
  }
  
  // Create new document
  const handleCreateDocument = async () => {
    if (!workspaceId || !user || !selectedCategory || !newDocTitle.trim()) return
    
    try {
      const newDocument = {
        title: newDocTitle.trim(),
        description: newDocDescription.trim(),
        content: newDocContent.trim(),
        categoryId: selectedCategory,
        workspaceId,
        createdAt: Date.now(),
        createdBy: user.uid
      }
      
      const docRef = await addDoc(collection(db, "knowledgeDocuments"), newDocument)
      
      setDocuments(prev => [...prev, { id: docRef.id, ...newDocument }])
      setNewDocTitle('')
      setNewDocDescription('')
      setNewDocContent('')
      setIsCreatingDocument(false)
      
      toast({
        title: "Success",
        description: "Document created successfully",
      })
    } catch (error) {
      console.error("Error creating document:", error)
      toast({
        title: "Error",
        description: "Failed to create document",
        variant: "destructive",
      })
    }
  }
  
  // Create new quick link
  const handleCreateLink = async () => {
    if (!workspaceId || !user || !newLinkTitle.trim() || !newLinkUrl.trim()) return
    
    try {
      const newLink = {
        title: newLinkTitle.trim(),
        url: newLinkUrl.trim(),
        workspaceId,
        createdAt: Date.now(),
        createdBy: user.uid
      }
      
      const docRef = await addDoc(collection(db, "quickLinks"), newLink)
      
      setQuickLinks(prev => [...prev, { id: docRef.id, ...newLink }])
      setNewLinkTitle('')
      setNewLinkUrl('')
      setIsCreatingLink(false)
      
      toast({
        title: "Success",
        description: "Quick link created successfully",
      })
    } catch (error) {
      console.error("Error creating quick link:", error)
      toast({
        title: "Error",
        description: "Failed to create quick link",
        variant: "destructive",
      })
    }
  }
  
  // Get icon component by name
  const getIconByName = (iconName: string) => {
    const icon = ICONS.find(i => i.name === iconName)
    return icon ? icon.component : Book
  }
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading knowledge base...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container py-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Library</h1>
        <div className="flex items-center gap-2">
          <Dialog open={isCreatingCategory} onOpenChange={setIsCreatingCategory}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
                <DialogDescription>
                  Add a new category to organize your knowledge base.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Category Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Getting Started"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon</Label>
                  <Select value={newCategoryIcon} onValueChange={setNewCategoryIcon}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an icon" />
                    </SelectTrigger>
                    <SelectContent>
                      {ICONS.map((icon) => (
                        <SelectItem key={icon.name} value={icon.name}>
                          <div className="flex items-center gap-2">
                            {React.createElement(icon.component, { className: "h-4 w-4" })}
                            <span>{icon.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreatingCategory(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCategory}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Featured categories</h2>
            <p className="text-sm text-muted-foreground">Selected by your group</p>
          </div>
          
          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg">
              <Book className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No categories yet</h3>
              <p className="text-sm text-muted-foreground text-center mt-1 mb-4">
                Create your first category to start organizing your knowledge base.
              </p>
              <Button onClick={() => setIsCreatingCategory(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Category
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map((category) => {
                const categoryDocuments = documents.filter(doc => doc.categoryId === category.id)
                const IconComponent = getIconByName(category.icon)
                
                return (
                  <Card 
                    key={category.id} 
                    className={`cursor-pointer transition-all ${selectedCategory === category.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary">
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                      </div>
                      <CardDescription>{categoryDocuments.length} items</CardDescription>
                    </CardHeader>
                    {categoryDocuments.length > 0 && (
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 gap-2">
                          {categoryDocuments.slice(0, 2).map((doc) => (
                            <div key={doc.id} className="p-2 border rounded-md">
                              <div className="aspect-video bg-muted rounded-md mb-2 overflow-hidden">
                                <div className="flex items-center justify-center h-full">
                                  <FileText className="h-6 w-6 text-muted-foreground" />
                                </div>
                              </div>
                              <h4 className="text-sm font-medium truncate">{doc.title}</h4>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
          
          {selectedCategory && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {categories.find(c => c.id === selectedCategory)?.name} Documents
                </h2>
                <Dialog open={isCreatingDocument} onOpenChange={setIsCreatingDocument}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add content
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Document</DialogTitle>
                      <DialogDescription>
                        Add a new document to the {categories.find(c => c.id === selectedCategory)?.name} category.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          placeholder="e.g., Getting Started Guide"
                          value={newDocTitle}
                          onChange={(e) => setNewDocTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          placeholder="Brief description of the document"
                          value={newDocDescription}
                          onChange={(e) => setNewDocDescription(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="content">Content</Label>
                        <Textarea
                          id="content"
                          placeholder="Document content..."
                          className="min-h-[200px]"
                          value={newDocContent}
                          onChange={(e) => setNewDocContent(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreatingDocument(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateDocument}>Create</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              {documents.filter(doc => doc.categoryId === selectedCategory).length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No documents yet</h3>
                  <p className="text-sm text-muted-foreground text-center mt-1 mb-4">
                    Add your first document to this category.
                  </p>
                  <Button onClick={() => setIsCreatingDocument(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Document
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {documents
                    .filter(doc => doc.categoryId === selectedCategory)
                    .map((doc) => (
                      <Card key={doc.id} className="overflow-hidden">
                        <div className="aspect-video bg-muted overflow-hidden">
                          <div className="flex items-center justify-center h-full">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                          </div>
                        </div>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">{doc.title}</CardTitle>
                          {doc.description && (
                            <CardDescription>{doc.description}</CardDescription>
                          )}
                        </CardHeader>
                        <CardFooter>
                          <Button variant="outline" className="w-full">
                            View Document
                          </Button>
                        </CardFooter>
                      </Card>
                    ))
                  }
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Quick links</h2>
            <p className="text-sm text-muted-foreground">Frequently accessed tools and resources</p>
          </div>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Quick Access</CardTitle>
                <Dialog open={isCreatingLink} onOpenChange={setIsCreatingLink}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <Plus className="h-4 w-4" />
                      Add link
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Quick Link</DialogTitle>
                      <DialogDescription>
                        Add a frequently used resource or tool link.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="linkTitle">Title</Label>
                        <Input
                          id="linkTitle"
                          placeholder="e.g., Intercom"
                          value={newLinkTitle}
                          onChange={(e) => setNewLinkTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="linkUrl">URL</Label>
                        <Input
                          id="linkUrl"
                          placeholder="https://example.com"
                          value={newLinkUrl}
                          onChange={(e) => setNewLinkUrl(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreatingLink(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateLink}>Add Link</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {quickLinks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded-lg">
                  <Link className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    No quick links yet. Add your first link.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {quickLinks.map((link) => (
                    <a 
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 hover:bg-muted rounded-md transition-colors"
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      <span>{link.title}</span>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
