import { collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore"
import { db } from "./firebase"
import { createLogEntry } from "./logs-utils"

export interface AutomationRule {
  id?: string
  workspaceId: string
  name: string
  type: "inactivity_reminder" | "rank_change" | "member_join" | "member_leave" | "custom"
  conditions: {
    field: string
    operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "not_contains"
    value: any
  }[]
  actions: {
    type: "discord_webhook" | "notification" | "email" | "custom"
    config: any
  }[]
  createdBy: string
  createdAt: number
  updatedAt: number
  isActive: boolean
  lastTriggered?: number
  triggerCount?: number
}

export async function createAutomationRule(
  rule: Omit<AutomationRule, "createdAt" | "updatedAt" | "triggerCount">,
): Promise<string> {
  try {
    const ruleRef = await addDoc(collection(db, "automationRules"), {
      ...rule,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      triggerCount: 0,
    })

    // Log the action
    await createLogEntry({
      workspaceId: rule.workspaceId,
      userId: rule.createdBy,
      username: "", // This should be filled with the actual username
      action: "automation_created",
      details: {
        ruleId: ruleRef.id,
        ruleName: rule.name,
      },
    })

    return ruleRef.id
  } catch (error) {
    console.error("Error creating automation rule:", error)
    throw new Error("Failed to create automation rule")
  }
}

export async function getWorkspaceAutomationRules(workspaceId: string): Promise<AutomationRule[]> {
  try {
    const q = query(collection(db, "automationRules"), where("workspaceId", "==", workspaceId))

    const querySnapshot = await getDocs(q)

    const rules: AutomationRule[] = []
    querySnapshot.forEach((doc) => {
      rules.push({
        id: doc.id,
        ...doc.data(),
      } as AutomationRule)
    })

    return rules
  } catch (error) {
    console.error("Error getting workspace automation rules:", error)
    return []
  }
}

export async function updateAutomationRule(
  ruleId: string,
  updates: Partial<Omit<AutomationRule, "id" | "workspaceId" | "createdBy" | "createdAt" | "triggerCount">>,
  userId: string,
): Promise<void> {
  try {
    const ruleRef = doc(db, "automationRules", ruleId)
    const ruleDoc = await getDoc(ruleRef)

    if (!ruleDoc.exists()) {
      throw new Error("Automation rule not found")
    }

    const rule = ruleDoc.data() as AutomationRule

    await updateDoc(ruleRef, {
      ...updates,
      updatedAt: Date.now(),
    })

    // Log the action
    await createLogEntry({
      workspaceId: rule.workspaceId,
      userId,
      username: "", // This should be filled with the actual username
      action: "automation_updated",
      details: {
        ruleId,
        ruleName: rule.name,
        updates,
      },
    })
  } catch (error) {
    console.error("Error updating automation rule:", error)
    throw new Error("Failed to update automation rule")
  }
}

export async function deleteAutomationRule(ruleId: string, userId: string): Promise<void> {
  try {
    const ruleRef = doc(db, "automationRules", ruleId)
    const ruleDoc = await getDoc(ruleRef)

    if (!ruleDoc.exists()) {
      throw new Error("Automation rule not found")
    }

    const rule = ruleDoc.data() as AutomationRule

    await deleteDoc(ruleRef)

    // Log the action
    await createLogEntry({
      workspaceId: rule.workspaceId,
      userId,
      username: "", // This should be filled with the actual username
      action: "automation_deleted",
      details: {
        ruleId,
        ruleName: rule.name,
      },
    })
  } catch (error) {
    console.error("Error deleting automation rule:", error)
    throw new Error("Failed to delete automation rule")
  }
}

export async function triggerAutomationRule(ruleId: string, context: any): Promise<void> {
  try {
    const ruleRef = doc(db, "automationRules", ruleId)
    const ruleDoc = await getDoc(ruleRef)

    if (!ruleDoc.exists()) {
      throw new Error("Automation rule not found")
    }

    const rule = ruleDoc.data() as AutomationRule

    if (!rule.isActive) {
      return
    }

    // Check if the conditions are met
    const conditionsMet = rule.conditions.every((condition) => {
      const fieldValue = context[condition.field]

      switch (condition.operator) {
        case "equals":
          return fieldValue === condition.value
        case "not_equals":
          return fieldValue !== condition.value
        case "greater_than":
          return fieldValue > condition.value
        case "less_than":
          return fieldValue < condition.value
        case "contains":
          return Array.isArray(fieldValue)
            ? fieldValue.includes(condition.value)
            : typeof fieldValue === "string" && fieldValue.includes(condition.value)
        case "not_contains":
          return Array.isArray(fieldValue)
            ? !fieldValue.includes(condition.value)
            : typeof fieldValue === "string" && !fieldValue.includes(condition.value)
        default:
          return false
      }
    })

    if (!conditionsMet) {
      return
    }

    // Execute the actions
    for (const action of rule.actions) {
      switch (action.type) {
        case "discord_webhook":
          // Send a Discord webhook
          if (action.config.url) {
            await fetch(action.config.url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                content: action.config.message,
                embeds: action.config.embeds,
              }),
            })
          }
          break
        case "notification":
          // Create a notification
          if (action.config.userId) {
            await addDoc(collection(db, "notifications"), {
              userId: action.config.userId,
              message: action.config.message,
              type: action.config.notificationType || "info",
              read: false,
              createdAt: Date.now(),
            })
          }
          break
        case "email":
          // Send an email (this would typically be handled by a server-side function)
          console.log("Email action not implemented yet")
          break
        case "custom":
          // Custom action (this would typically be handled by a server-side function)
          console.log("Custom action not implemented yet")
          break
      }
    }

    // Update the rule's trigger count and last triggered timestamp
    await updateDoc(ruleRef, {
      lastTriggered: Date.now(),
      triggerCount: (rule.triggerCount || 0) + 1,
    })

    // Log the action
    await createLogEntry({
      workspaceId: rule.workspaceId,
      userId: "system",
      username: "System",
      action: "automation_triggered",
      details: {
        ruleId,
        ruleName: rule.name,
        context,
      },
    })
  } catch (error) {
    console.error("Error triggering automation rule:", error)
  }
}

