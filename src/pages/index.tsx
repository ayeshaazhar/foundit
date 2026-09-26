import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">
        FoundIt
      </p>

      <h1 className="mb-4 max-w-2xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        Lost something? Let FoundIt help you find it.
      </h1>

      <p className="mb-8 max-w-xl text-muted-foreground">
        Report lost and found items, see new reports in real time, and use
        AI-assisted matching to discover potential matches.
      </p>

      <Link
        to="/home"
        className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Enter FoundIt
      </Link>

      <p className="mt-6 max-w-md text-xs text-muted-foreground">
        AI suggests possible matches. You decide whether it's the item you're
        looking for.
      </p>
    </div>
  )
}