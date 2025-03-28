"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Plus, Trash2, Clock, Bot, Users, Bell, MessageSquare, Calendar } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import {
  getWorkspaceAutomationRules,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  type AutomationRule,
} from "@/lib/automation-utils"
import { getWorkspaceWebhooks, createWebhook, updateWebhook, deleteWebhook, type Webhook } from "@/lib/webhook-utils"

// Add these imports at the top of the file

export default function AutomationPage() {
  const { id: workspaceId } = useParams<{ id: string }>()
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([])
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState<any>(null)
  const [isCreatingRule, setIsCreatingRule] = useState(false)
  const [isCreatingWebhook, setIsCreatingWebhook] = useState(false)
  const [newRule, setNewRule] = useState<Partial<AutomationRule>>({
    name: "",
    type: "inactivity_reminder",
    conditions: [{ field: "days_inactive", operator: "greater_than", value: 7 }],
    actions: [{ type: "notification", config: { message: "Reminder: You have been inactive for over 7 days" } }],
    isActive: true,
  })
  const [newWebhook, setNewWebhook] = useState<Partial<Webhook>>({
    name: "",
    url: "",
    events: ["member_added", "member_removed"],
    isActive: true,
  })

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch user data
        const userDataFromStorage = localStorage.getItem("userData")
        if (userDataFromStorage) {
          setUserData(JSON.parse(userDataFromStorage))
        }

        // Fetch automation rules
        const rules = await getWorkspaceAutomationRules(workspaceId as string)
        setAutomationRules(rules)

        // Fetch webhooks
        const webhooksData = await getWorkspaceWebhooks(workspaceId as string)
        setWebhooks(webhooksData)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [workspaceId])

  const handleCreateRule = async () => {
    if (!newRule.name || !userData?.uid) {
      toast({
        title: "Error",
        description: "Please provide a name for the automation rule",
        variant: "destructive",
      })
      return
    }

    setIsCreatingRule(true)
    try {
      const ruleId = await createAutomationRule({
        ...(newRule as AutomationRule),
        workspaceId: workspaceId as string,
        createdBy: userData.uid,
      })

      // Add the new rule to the state
      setAutomationRules((prev) => [
        ...prev,
        {
          id: ruleId,
          ...(newRule as AutomationRule),
          workspaceId: workspaceId as string,
          createdBy: userData.uid,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          triggerCount: 0,
        },
      ])

      // Reset the form
      setNewRule({
        name: "",
        type: "inactivity_reminder",
        conditions: [{ field: "days_inactive", operator: "greater_than", value: 7 }],
        actions: [{ type: "notification", config: { message: "Reminder: You have been inactive for over 7 days" } }],
        isActive: true,
      })

      toast({
        title: "Success",
        description: "Automation rule created successfully",
      })
    } catch (error) {
      console.error("Error creating automation rule:", error)
      toast({
        title: "Error",
        description: "Failed to create automation rule",
        variant: "destructive",
      })
    } finally {
      setIsCreatingRule(false)
    }
  }

  const handleCreateWebhook = async () => {
    if (!newWebhook.name || !newWebhook.url || !userData?.uid) {
      toast({
        title: "Error",
        description: "Please provide a name and URL for the webhook",
        variant: "destructive",
      })
      return
    }

    setIsCreatingWebhook(true)
    try {
      const webhookId = await createWebhook({
        ...(newWebhook as Webhook),
        workspaceId: workspaceId as string,
        createdBy: userData.uid,
      })

      // Add the new webhook to the state
      setWebhooks((prev) => [
        ...prev,
        {
          id: webhookId,
          ...(newWebhook as Webhook),
          workspaceId: workspaceId as string,
          createdBy: userData.uid,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ])

      // Reset the form
      setNewWebhook({
        name: "",
        url: "",
        events: ["member_added", "member_removed"],
        isActive: true,
      })

      toast({
        title: "Success",
        description: "Webhook created successfully",
      })
    } catch (error) {
      console.error("Error creating webhook:", error)
      toast({
        title: "Error",
        description: "Failed to create webhook",
        variant: "destructive",
      })
    } finally {
      setIsCreatingWebhook(false)
    }
  }

  const handleToggleRuleStatus = async (ruleId: string, isActive: boolean) => {
    try {
      await updateAutomationRule(ruleId, { isActive }, userData.uid)

      // Update the rule in the state
      setAutomationRules((prev) =>
        prev.map((rule) => (rule.id === ruleId ? { ...rule, isActive, updatedAt: Date.now() } : rule)),
      )

      toast({
        title: "Success",
        description: `Automation rule ${isActive ? "enabled" : "disabled"} successfully`,
      })
    } catch (error) {
      console.error("Error updating automation rule:", error)
      toast({
        title: "Error",
        description: "Failed to update automation rule",
        variant: "destructive",
      })
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await deleteAutomationRule(ruleId, userData.uid)

      // Remove the rule from the state
      setAutomationRules((prev) => prev.filter((rule) => rule.id !== ruleId))

      toast({
        title: "Success",
        description: "Automation rule deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting automation rule:", error)
      toast({
        title: "Error",
        description: "Failed to delete automation rule",
        variant: "destructive",
      })
    }
  }

  const handleToggleWebhookStatus = async (webhookId: string, isActive: boolean) => {
    try {
      await updateWebhook(webhookId, { isActive }, userData.uid)

      // Update the webhook in the state
      setWebhooks((prev) =>
        prev.map((webhook) => (webhook.id === webhookId ? { ...webhook, isActive, updatedAt: Date.now() } : webhook)),
      )

      toast({
        title: "Success",
        description: `Webhook ${isActive ? "enabled" : "disabled"} successfully`,
      })
    } catch (error) {
      console.error("Error updating webhook:", error)
      toast({
        title: "Error",
        description: "Failed to update webhook",
        variant: "destructive",
      })
    }
  }

  const handleDeleteWebhook = async (webhookId: string) => {
    try {
      await deleteWebhook(webhookId, userData.uid)

      // Remove the webhook from the state
      setWebhooks((prev) => prev.filter((webhook) => webhook.id !== webhookId))

      toast({
        title: "Success",
        description: "Webhook deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting webhook:", error)
      toast({
        title: "Error",
        description: "Failed to delete webhook",
        variant: "destructive",
      })
    }
  }

  const getRuleIcon = (type: string) => {
    switch (type) {
      case "inactivity_reminder":
        return <Clock className="h-4 w-4" />
      case "rank_change":
        return <Users className="h-4 w-4" />
      case "member_join":
        return <Users className="h-4 w-4" />
      case "member_leave":
        return <Users className="h-4 w-4" />
      default:
        return <Bot className="h-4 w-4" />
    }
  }

  const getRuleDescription = (rule: AutomationRule) => {
    switch (rule.type) {
      case "inactivity_reminder":
        return `Sends a reminder when a member is inactive for ${rule.conditions[0]?.value || "X"} days`
      case "rank_change":
        return "Triggers actions when a member's rank changes"
      case "member_join":
        return "Triggers actions when a new member joins"
      case "member_leave":
        return "Triggers actions when a member leaves"
      default:
        return "Custom automation rule"
    }
  }

  // Create rule dialog content
  const createRuleDialogContent = (
    <>
      <DialogHeader>
        <DialogTitle>Create Automation Rule</DialogTitle>
        <DialogDescription>Set up automated actions based on specific triggers and conditions</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="rule-name">Rule Name</Label>
          <Input
            id="rule-name"
            placeholder="Enter a name for this rule"
            value={newRule.name}
            onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rule-type">Rule Type</Label>
          <Select value={newRule.type} onValueChange={(value) => setNewRule({ ...newRule, type: value as any })}>
            <SelectTrigger id="rule-type">
              <SelectValue placeholder="Select a rule type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inactivity_reminder">Inactivity Reminder</SelectItem>
              <SelectItem value="rank_change">Rank Change</SelectItem>
              <SelectItem value="member_join">Member Join</SelectItem>
              <SelectItem value="member_leave">Member Leave</SelectItem>
              <SelectItem value="custom">Custom Rule</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Conditions</h3>
          {newRule.type === "inactivity_reminder" && (
            <div className="flex items-center gap-2">
              <Label htmlFor="days-inactive" className="min-w-[120px]">
                Days Inactive
              </Label>
              <Select
                value={newRule.conditions?.[0]?.operator || "greater_than"}
                onValueChange={(value) => {
                  const updatedConditions = [...(newRule.conditions || [])]
                  if (updatedConditions[0]) {
                    updatedConditions[0] = { ...updatedConditions[0], operator: value as any }
                  }
                  setNewRule({ ...newRule, conditions: updatedConditions })
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="greater_than">Greater than</SelectItem>
                  <SelectItem value="equals">Equals</SelectItem>
                  <SelectItem value="less_than">Less than</SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="days-inactive"
                type="number"
                min="1"
                className="w-[100px]"
                value={newRule.conditions?.[0]?.value || 7}
                onChange={(e) => {
                  const updatedConditions = [...(newRule.conditions || [])]
                  if (updatedConditions[0]) {
                    updatedConditions[0] = { ...updatedConditions[0], value: Number.parseInt(e.target.value) }
                  }
                  setNewRule({ ...newRule, conditions: updatedConditions })
                }}
              />
              <span className="text-sm">days</span>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Actions</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="action-type">Action Type</Label>
              <Select
                value={newRule.actions?.[0]?.type || "notification"}
                onValueChange={(value) => {
                  const updatedActions = [...(newRule.actions || [])]
                  if (updatedActions[0]) {
                    updatedActions[0] = {
                      type: value as any,
                      config:
                        value === "discord_webhook"
                          ? { url: "", message: "" }
                          : { message: "Reminder: You have been inactive for over 7 days" },
                    }
                  }
                  setNewRule({ ...newRule, actions: updatedActions })
                }}
              >
                <SelectTrigger id="action-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notification">In-App Notification</SelectItem>
                  <SelectItem value="discord_webhook">Discord Webhook</SelectItem>
                  <SelectItem value="email">Email Notification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newRule.actions?.[0]?.type === "notification" && (
              <div className="space-y-2">
                <Label htmlFor="notification-message">Notification Message</Label>
                <Textarea
                  id="notification-message"
                  placeholder="Enter the notification message"
                  value={newRule.actions[0].config?.message || ""}
                  onChange={(e) => {
                    const updatedActions = [...(newRule.actions || [])]
                    if (updatedActions[0]) {
                      updatedActions[0] = {
                        ...updatedActions[0],
                        config: { ...updatedActions[0].config, message: e.target.value },
                      }
                    }
                    setNewRule({ ...newRule, actions: updatedActions })
                  }}
                />
              </div>
            )}

            {newRule.actions?.[0]?.type === "discord_webhook" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Discord Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    placeholder="Enter the Discord webhook URL"
                    value={newRule.actions[0].config?.url || ""}
                    onChange={(e) => {
                      const updatedActions = [...(newRule.actions || [])]
                      if (updatedActions[0]) {
                        updatedActions[0] = {
                          ...updatedActions[0],
                          config: { ...updatedActions[0].config, url: e.target.value },
                        }
                      }
                      setNewRule({ ...newRule, actions: updatedActions })
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook-message">Message</Label>
                  <Textarea
                    id="webhook-message"
                    placeholder="Enter the message to send to Discord"
                    value={newRule.actions[0].config?.message || ""}
                    onChange={(e) => {
                      const updatedActions = [...(newRule.actions || [])]
                      if (updatedActions[0]) {
                        updatedActions[0] = {
                          ...updatedActions[0],
                          config: { ...updatedActions[0].config, message: e.target.value },
                        }
                      }
                      setNewRule({ ...newRule, actions: updatedActions })
                    }}
                  />
                </div>
              </div>
            )}

            {newRule.actions?.[0]?.type === "email" && (
              <div className="space-y-2">
                <Label htmlFor="email-subject">Email Subject</Label>
                <Input
                  id="email-subject"
                  placeholder="Enter the email subject"
                  value={newRule.actions[0].config?.subject || ""}
                  onChange={(e) => {
                    const updatedActions = [...(newRule.actions || [])]
                    if (updatedActions[0]) {
                      updatedActions[0] = {
                        ...updatedActions[0],
                        config: { ...updatedActions[0].config, subject: e.target.value },
                      }
                    }
                    setNewRule({ ...newRule, actions: updatedActions })
                  }}
                />
                <Label htmlFor="email-body">Email Body</Label>
                <Textarea
                  id="email-body"
                  placeholder="Enter the email body"
                  value={newRule.actions[0].config?.body || ""}
                  onChange={(e) => {
                    const updatedActions = [...(newRule.actions || [])]
                    if (updatedActions[0]) {
                      updatedActions[0] = {
                        ...updatedActions[0],
                        config: { ...updatedActions[0].config, body: e.target.value },
                      }
                    }
                    setNewRule({ ...newRule, actions: updatedActions })
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <Switch
            id="rule-active"
            checked={newRule.isActive}
            onCheckedChange={(checked) => setNewRule({ ...newRule, isActive: checked })}
          />
          <Label htmlFor="rule-active">Enable this rule</Label>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={handleCreateRule} disabled={isCreatingRule}>
          {isCreatingRule ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Rule"
          )}
        </Button>
      </DialogFooter>
    </>
  )

  // Create webhook dialog content
  const createWebhookDialogContent = (
    <>
      <DialogHeader>
        <DialogTitle>Add Discord Webhook</DialogTitle>
        <DialogDescription>
          Connect your Discord server to receive notifications about workspace events
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="webhook-name">Webhook Name</Label>
          <Input
            id="webhook-name"
            placeholder="Enter a name for this webhook"
            value={newWebhook.name}
            onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="webhook-url">Discord Webhook URL</Label>
          <Input
            id="webhook-url"
            placeholder="Enter the Discord webhook URL"
            value={newWebhook.url}
            onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">You can create a webhook URL in your Discord server settings</p>
        </div>

        <div className="space-y-2">
          <Label>Events to Send</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="event-member-added"
                checked={newWebhook.events?.includes("member_added")}
                onCheckedChange={(checked) => {
                  const events = [...(newWebhook.events || [])]
                  if (checked) {
                    if (!events.includes("member_added")) {
                      events.push("member_added")
                    }
                  } else {
                    const index = events.indexOf("member_added")
                    if (index !== -1) {
                      events.splice(index, 1)
                    }
                  }
                  setNewWebhook({ ...newWebhook, events })
                }}
              />
              <Label htmlFor="event-member-added">Member Added</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="event-member-removed"
                checked={newWebhook.events?.includes("member_removed")}
                onCheckedChange={(checked) => {
                  const events = [...(newWebhook.events || [])]
                  if (checked) {
                    if (!events.includes("member_removed")) {
                      events.push("member_removed")
                    }
                  } else {
                    const index = events.indexOf("member_removed")
                    if (index !== -1) {
                      events.splice(index, 1)
                    }
                  }
                  setNewWebhook({ ...newWebhook, events })
                }}
              />
              <Label htmlFor="event-member-removed">Member Removed</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="event-announcement-created"
                checked={newWebhook.events?.includes("announcement_created")}
                onCheckedChange={(checked) => {
                  const events = [...(newWebhook.events || [])]
                  if (checked) {
                    if (!events.includes("announcement_created")) {
                      events.push("announcement_created")
                    }
                  } else {
                    const index = events.indexOf("announcement_created")
                    if (index !== -1) {
                      events.splice(index, 1)
                    }
                  }
                  setNewWebhook({ ...newWebhook, events })
                }}
              />
              <Label htmlFor="event-announcement-created">Announcement Created</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="event-session-created"
                checked={newWebhook.events?.includes("session_created")}
                onCheckedChange={(checked) => {
                  const events = [...(newWebhook.events || [])]
                  if (checked) {
                    if (!events.includes("session_created")) {
                      events.push("session_created")
                    }
                  } else {
                    const index = events.indexOf("session_created")
                    if (index !== -1) {
                      events.splice(index, 1)
                    }
                  }
                  setNewWebhook({ ...newWebhook, events })
                }}
              />
              <Label htmlFor="event-session-created">Session Created</Label>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <Switch
            id="webhook-active"
            checked={newWebhook.isActive}
            onCheckedChange={(checked) => setNewWebhook({ ...newWebhook, isActive: checked })}
          />
          <Label htmlFor="webhook-active">Enable this webhook</Label>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={handleCreateWebhook} disabled={isCreatingWebhook}>
          {isCreatingWebhook ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Add Webhook"
          )}
        </Button>
      </DialogFooter>
    </>
  )

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Automation</h1>
        <p className="text-muted-foreground">Automate tasks and notifications in your workspace</p>
      </div>

      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rules">Automation Rules</TabsTrigger>
          <TabsTrigger value="webhooks">Discord Webhooks</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <div className="grid gap-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Automation Rules</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Rule
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">{createRuleDialogContent}</DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : automationRules.length > 0 ? (
              <div className="grid gap-4">
                {automationRules.map((rule) => (
                  <Card key={rule.id} className={!rule.isActive ? "opacity-60" : undefined}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-full bg-primary/10">{getRuleIcon(rule.type)}</div>
                          <div>
                            <CardTitle className="text-lg">{rule.name}</CardTitle>
                            <CardDescription>{getRuleDescription(rule)}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.isActive}
                            onCheckedChange={(checked) => handleToggleRuleStatus(rule.id!, checked)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteRule(rule.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {rule.triggerCount || 0} {rule.triggerCount === 1 ? "trigger" : "triggers"}
                            </span>
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Bell className="h-3 w-3" />
                            <span>
                              {rule.actions[0]?.type === "notification"
                                ? "In-app notification"
                                : rule.actions[0]?.type === "discord_webhook"
                                  ? "Discord webhook"
                                  : rule.actions[0]?.type === "email"
                                    ? "Email notification"
                                    : "Custom action"}
                            </span>
                          </Badge>
                          {rule.lastTriggered && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Last triggered: {new Date(rule.lastTriggered).toLocaleDateString()}</span>
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No automation rules yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create your first automation rule to streamline your workflow
                  </p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Rule
                      </Button>
                    </DialogTrigger>
                    <DialogContent>{createRuleDialogContent}</DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="webhooks">
          <div className="grid gap-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Discord Webhooks</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Webhook
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">{createWebhookDialogContent}</DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : webhooks.length > 0 ? (
              <div className="grid gap-4">
                {webhooks.map((webhook) => (
                  <Card key={webhook.id} className={!webhook.isActive ? "opacity-60" : undefined}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-full bg-primary/10">
                            <MessageSquare className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{webhook.name}</CardTitle>
                            <CardDescription className="truncate max-w-[300px]">{webhook.url}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={webhook.isActive}
                            onCheckedChange={(checked) => handleToggleWebhookStatus(webhook.id!, checked)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteWebhook(webhook.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {webhook.events.map((event) => (
                            <Badge key={event} variant="outline">
                              {event.replace("_", " ")}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No webhooks yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Connect your Discord server to receive notifications about workspace events
                  </p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Webhook
                      </Button>
                    </DialogTrigger>
                    <DialogContent>{createWebhookDialogContent}</DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="grid gap-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Automation Templates</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="cursor-pointer hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle>Inactivity Reminder</CardTitle>
                  <CardDescription>
                    Automatically notify members who have been inactive for a specified period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Triggers after specified days of inactivity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Sends in-app notification or Discord message</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Use Template</Button>
                </CardFooter>
              </Card>

              <Card className="cursor-pointer hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle>New Member Welcome</CardTitle>
                  <CardDescription>Automatically welcome new members when they join your workspace</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Triggers when a new member joins</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Sends welcome message via Discord</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Use Template</Button>
                </CardFooter>
              </Card>

              <Card className="cursor-pointer hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle>Session Reminder</CardTitle>
                  <CardDescription>Send reminders before scheduled training sessions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Triggers before scheduled sessions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Sends notifications to all attendees</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Use Template</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

