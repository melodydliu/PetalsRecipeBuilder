'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createStudio, joinStudio } from './actions'

type Step = 'choose' | 'create' | 'join'

export function OnboardingFlow() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('choose')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create studio fields
  const [studioName, setStudioName] = useState('')
  const [currency, setCurrency] = useState('$')

  // Join studio fields
  const [inviteCode, setInviteCode] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await createStudio({ name: studioName, currencySymbol: currency })
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await joinStudio({ inviteCode: inviteCode.trim().toUpperCase() })
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  if (step === 'choose') {
    return (
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setStep('create')}
          className="bg-white rounded-2xl border border-[#E8E0D8] shadow-sm p-8 text-left hover:border-[#2D5016] hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#2D5016]/10 flex items-center justify-center mb-4 group-hover:bg-[#2D5016]/20 transition-colors">
            <span className="text-2xl">🌸</span>
          </div>
          <h3 className="font-serif text-lg font-semibold text-[#4A3F35] mb-1">Create a studio</h3>
          <p className="text-sm text-[#A89880]">Set up a new studio for your floral design business</p>
        </button>

        <button
          onClick={() => setStep('join')}
          className="bg-white rounded-2xl border border-[#E8E0D8] shadow-sm p-8 text-left hover:border-[#2D5016] hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#2D5016]/10 flex items-center justify-center mb-4 group-hover:bg-[#2D5016]/20 transition-colors">
            <span className="text-2xl">👥</span>
          </div>
          <h3 className="font-serif text-lg font-semibold text-[#4A3F35] mb-1">Join a studio</h3>
          <p className="text-sm text-[#A89880]">You have an invite code from your studio owner</p>
        </button>
      </div>
    )
  }

  if (step === 'create') {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E0D8] shadow-sm p-8">
        <button onClick={() => setStep('choose')} className="text-sm text-[#A89880] hover:text-[#4A3F35] mb-6 flex items-center gap-1">
          ← Back
        </button>
        <h2 className="font-serif text-2xl font-semibold text-[#4A3F35] mb-1">Create your studio</h2>
        <p className="text-sm text-[#A89880] mb-6">You'll be the Owner with full access</p>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="studioName">Studio name</Label>
            <Input
              id="studioName"
              placeholder="Bloom & Co. Florals"
              value={studioName}
              onChange={e => setStudioName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency symbol</Label>
            <Input
              id="currency"
              placeholder="$"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              maxLength={3}
              className="max-w-[80px]"
            />
          </div>

          {error && (
            <p className="text-sm text-[#C0392B] bg-[#C0392B]/8 px-3 py-2 rounded-lg">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading || !studioName.trim()}>
            {loading ? 'Creating studio…' : 'Create studio'}
          </Button>
        </form>
      </div>
    )
  }

  // Join
  return (
    <div className="bg-white rounded-2xl border border-[#E8E0D8] shadow-sm p-8">
      <button onClick={() => setStep('choose')} className="text-sm text-[#A89880] hover:text-[#4A3F35] mb-6 flex items-center gap-1">
        ← Back
      </button>
      <h2 className="font-serif text-2xl font-semibold text-[#4A3F35] mb-1">Join a studio</h2>
      <p className="text-sm text-[#A89880] mb-6">Enter the invite code from your studio owner</p>

      <form onSubmit={handleJoin} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="inviteCode">Invite code</Label>
          <Input
            id="inviteCode"
            placeholder="ABCD1234"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value.toUpperCase())}
            required
            className="font-mono tracking-widest uppercase"
          />
        </div>

        {error && (
          <p className="text-sm text-[#C0392B] bg-[#C0392B]/8 px-3 py-2 rounded-lg">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={loading || !inviteCode.trim()}>
          {loading ? 'Joining…' : 'Join studio'}
        </Button>
      </form>
    </div>
  )
}
