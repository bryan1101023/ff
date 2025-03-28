export default function AutomationLoading() {
  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <div className="h-8 w-48 bg-muted rounded-md animate-pulse mb-2" />
        <div className="h-4 w-96 bg-muted rounded-md animate-pulse" />
      </div>

      <div className="space-y-4">
        <div className="h-10 w-full bg-muted rounded-md animate-pulse" />
        <div className="h-64 w-full bg-muted rounded-md animate-pulse" />
      </div>
    </div>
  )
}

