import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Hackathon Template</h1>
        <p className="text-muted-foreground">Next.js + Supabase + Vercel</p>
        <Button>Comece por aqui</Button>
      </div>
    </main>
  )
}
