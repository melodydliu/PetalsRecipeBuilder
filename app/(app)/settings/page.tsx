import { getMember } from '@/lib/supabase/get-member'
import { createAdminClient } from '@/lib/supabase/admin'
import { SettingsTabs } from './SettingsTabs'

export const metadata = { title: 'Settings — Petal' }

export default async function SettingsPage() {
  const { userId, studioId, role } = await getMember()
  const admin = createAdminClient()

  const [{ data: studio }, { data: settings }, { data: members }] = await Promise.all([
    admin.from('studios').select('*').eq('id', studioId).single(),
    admin.from('studio_settings').select('*').eq('studio_id', studioId).single(),
    admin.from('studio_members').select('*, user:user_id(email)').eq('studio_id', studioId).order('created_at'),
  ])

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-[#2D5016]">Settings</h1>
        <p className="text-sm text-[#A89880] mt-1">Manage your studio configuration and team</p>
      </div>
      <SettingsTabs
        studio={studio!}
        settings={settings!}
        members={members ?? []}
        currentRole={role}
        currentUserId={userId}
      />
    </div>
  )
}
