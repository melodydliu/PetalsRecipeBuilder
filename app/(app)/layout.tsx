import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SidebarShell } from '@/components/layout/SidebarShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (process.env.DEV_BYPASS_AUTH === 'true') {
    return (
      <div className="bg-[#F6F7F8]">
        <SidebarShell studioName="Dev Studio" userEmail="dev@example.com">
          {children}
        </SidebarShell>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

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
    <div className="bg-[#F6F7F8]">
      <SidebarShell studioName={studioName} userEmail={user.email}>
        {children}
      </SidebarShell>
    </div>
  )
}
