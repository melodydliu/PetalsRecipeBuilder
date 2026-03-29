import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (process.env.DEV_BYPASS_AUTH === 'true') {
    return (
      <div className="flex h-screen overflow-hidden bg-[#FAF7F2]">
        <Sidebar studioName="Dev Studio" userEmail="dev@example.com" />
        <main className="flex-1 overflow-y-auto" style={{ marginLeft: 240 }}>
          <div className="max-w-[1280px] mx-auto px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Use admin client to bypass RLS for server-side member lookup
  const admin = createAdminClient()
  const { data: member } = await admin
    .from('studio_members')
    .select('studio_id, role, studios(name)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!member) redirect('/auth/onboarding')

  const studioName = (member.studios as { name: string } | null)?.name ?? 'My Studio'

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAF7F2]">
      <Sidebar studioName={studioName} userEmail={user.email} />
      <main className="flex-1 overflow-y-auto" style={{ marginLeft: 240 }}>
        <div className="max-w-[1280px] mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
