import { Loader2 } from "lucide-react"

export default function MembersLoading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-white/60" />
    </div>
  )
}

