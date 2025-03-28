import BetaLoginForm from "@/components/auth/beta-login-form"

export default function BetaPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#030303] p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-rose-500/[0.05] blur-3xl" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Hyre Beta Access</h1>
          <p className="text-white/60">Sign in to access the beta version of Hyre</p>
        </div>

        <BetaLoginForm />
      </div>
    </div>
  )
}

