'use client'
import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { updateStudio, updateStudioSettings, inviteMember, revokeMember } from './actions'
import { HelpCircle, Copy, UserPlus, Trash2 } from 'lucide-react'
import type { Studio, StudioSettings, StudioMember } from '@/types/database'

const TOOLTIP_TEXTS: Record<string, string> = {
  default_flower_markup: 'Industry standard: 3x–5x wholesale cost. A 3.5x markup on fresh flowers covers your overhead, provides retail value, and builds profit. Most event florists use 3.5x–4x.',
  default_hardgoods_markup: 'Hard goods (containers, foam, ribbon, wire, packaging) are marked up 2x–2.5x. Lower than flowers because they have less perishability risk.',
  default_rental_markup: 'Rental items are marked up on their amortized cost per use. The higher the markup, the faster you recover the acquisition investment.',
  default_design_fee_pct: 'Design labor as a % of marked-up materials. Industry range: 20%–50%. 30% is standard for mid-complexity event work. Increase for highly intricate designs.',
  default_prep_rate: 'Hourly rate for flower processing, conditioning, and prep work. Typical range: $25–$40/hr depending on your market.',
  default_design_rate: 'Hourly rate for skilled design work. Typical range: $50–$75/hr for experienced designers.',
  default_delivery_fee: 'Delivery fee per event — set as a flat dollar amount or a percentage of the recipes subtotal. Industry average: $100–$300 flat. Adjust per event as needed.',
  default_setup_fee: 'Setup/installation fee per event — set as a flat dollar amount or a percentage of the recipes subtotal. Adjust per event as needed.',
  default_teardown_fee: 'Teardown fee per event — set as a flat dollar amount or a percentage of the recipes subtotal. Adjust per event as needed.',
  default_tax_rate: 'Sales tax rate for your region. Check your state/local requirements. Enter 0 if exempt or not applicable.',
  default_margin_target: 'Target gross profit margin. Industry-healthy range: 60%–75%. 70% is the standard for sustainable event floral businesses.',
  default_waste_buffer_pct: 'Extra stems to order to account for culling, breakage, and imperfect flowers. 10% is standard. Increase for delicate flowers like sweet peas.',
}

function FieldWithTooltip({ label, tooltipKey, children }: { label: string; tooltipKey: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label>{label}</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="w-3.5 h-3.5 text-[#A89880]" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {TOOLTIP_TEXTS[tooltipKey]}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {children}
    </div>
  )
}

interface SettingsTabsProps {
  studio: Studio
  settings: StudioSettings
  members: (StudioMember & { user?: { email: string } | null })[]
  currentRole: string
  currentUserId: string
}

export function SettingsTabs({ studio, settings, members, currentRole, currentUserId }: SettingsTabsProps) {
  const isOwner = currentRole === 'owner'
  const isOwnerOrDesigner = ['owner', 'designer'].includes(currentRole)

  // Studio form
  const [studioForm, setStudioForm] = useState({
    name: studio.name,
    currency_symbol: studio.currency_symbol,
    timezone: studio.timezone,
  })
  const [studioSaving, setStudioSaving] = useState(false)

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    default_flower_markup: settings.default_flower_markup,
    default_hardgoods_markup: settings.default_hardgoods_markup,
    default_rental_markup: settings.default_rental_markup,
    default_labor_mode: settings.default_labor_mode,
    default_design_fee_pct: settings.default_design_fee_pct,
    default_prep_rate: settings.default_prep_rate,
    default_design_rate: settings.default_design_rate,
    default_delivery_fee: settings.default_delivery_fee,
    default_setup_fee: settings.default_setup_fee,
    default_teardown_fee: settings.default_teardown_fee,
    default_delivery_fee_type: settings.default_delivery_fee_type,
    default_setup_fee_type: settings.default_setup_fee_type,
    default_teardown_fee_type: settings.default_teardown_fee_type,
    default_tax_rate: settings.default_tax_rate,
    default_margin_target: settings.default_margin_target,
    default_waste_buffer_pct: settings.default_waste_buffer_pct,
  })
  const [settingsSaving, setSettingsSaving] = useState(false)

  // Team invite
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'designer' | 'staff'>('staff')
  const [membersList, setMembersList] = useState(members)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [codeCopied, setCodeCopied] = useState(false)

  const handleSaveStudio = async () => {
    setStudioSaving(true)
    await updateStudio(studioForm)
    setStudioSaving(false)
  }

  const handleSaveSettings = async () => {
    setSettingsSaving(true)
    await updateStudioSettings(settingsForm as Record<string, number | string>)
    setSettingsSaving(false)
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteLoading(true)
    setInviteError(null)
    const { error } = await inviteMember(inviteEmail, inviteRole)
    if (error) { setInviteError(error) }
    else { setInviteEmail(''); window.location.reload() }
    setInviteLoading(false)
  }

  const handleRevoke = async (id: string) => {
    setMembersList(m => m.map(mem => mem.id === id ? { ...mem, status: 'revoked' as const } : mem))
    await revokeMember(id)
  }

  const copyInviteCode = () => {
    navigator.clipboard.writeText(studio.invite_code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  const setS = (k: keyof typeof settingsForm, v: number | string) =>
    setSettingsForm(f => ({ ...f, [k]: v }))

  return (
    <Tabs defaultValue="studio">
      <TabsList className="mb-8">
        <TabsTrigger value="studio">Studio</TabsTrigger>
        <TabsTrigger value="pricing">Pricing Defaults</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
        <TabsTrigger value="plan">Plan</TabsTrigger>
      </TabsList>

      {/* Studio tab */}
      <TabsContent value="studio">
        <div className="max-w-lg space-y-6">
          <div className="space-y-1.5">
            <Label>Studio name</Label>
            <Input
              value={studioForm.name}
              onChange={e => setStudioForm(f => ({ ...f, name: e.target.value }))}
              disabled={!isOwner}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Currency symbol</Label>
            <Input
              value={studioForm.currency_symbol}
              onChange={e => setStudioForm(f => ({ ...f, currency_symbol: e.target.value }))}
              maxLength={3}
              className="max-w-[80px]"
              disabled={!isOwner}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Select
              value={studioForm.timezone}
              onValueChange={v => setStudioForm(f => ({ ...f, timezone: v }))}
              disabled={!isOwner}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
                  'America/Phoenix', 'Pacific/Honolulu', 'America/Anchorage',
                  'Europe/London', 'Europe/Paris', 'Australia/Sydney',
                ].map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {isOwner && (
            <Button onClick={handleSaveStudio} disabled={studioSaving}>
              {studioSaving ? 'Saving…' : 'Save studio settings'}
            </Button>
          )}
        </div>
      </TabsContent>

      {/* Pricing Defaults tab */}
      <TabsContent value="pricing">
        <div className="max-w-lg space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <FieldWithTooltip label="Flower markup" tooltipKey="default_flower_markup">
              <div className="flex items-center gap-1">
                <Input type="number" step="0.1" min="1" value={settingsForm.default_flower_markup}
                  onChange={e => setS('default_flower_markup', parseFloat(e.target.value) || 3.5)}
                  disabled={!isOwnerOrDesigner} />
                <span className="text-sm text-[#A89880]">x</span>
              </div>
            </FieldWithTooltip>
            <FieldWithTooltip label="Hard goods markup" tooltipKey="default_hardgoods_markup">
              <div className="flex items-center gap-1">
                <Input type="number" step="0.1" min="1" value={settingsForm.default_hardgoods_markup}
                  onChange={e => setS('default_hardgoods_markup', parseFloat(e.target.value) || 2.5)}
                  disabled={!isOwnerOrDesigner} />
                <span className="text-sm text-[#A89880]">x</span>
              </div>
            </FieldWithTooltip>
            <FieldWithTooltip label="Rental markup" tooltipKey="default_rental_markup">
              <div className="flex items-center gap-1">
                <Input type="number" step="0.1" min="1" value={settingsForm.default_rental_markup}
                  onChange={e => setS('default_rental_markup', parseFloat(e.target.value) || 2.5)}
                  disabled={!isOwnerOrDesigner} />
                <span className="text-sm text-[#A89880]">x</span>
              </div>
            </FieldWithTooltip>
          </div>

          <div className="space-y-1.5">
            <Label>Default labor mode</Label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setS('default_labor_mode', 'percentage')}
                disabled={!isOwnerOrDesigner}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${settingsForm.default_labor_mode === 'percentage' ? 'bg-[#2D5016] text-white' : 'bg-[#F5F1EC] text-[#A89880]'}`}
              >% of materials</button>
              <button
                onClick={() => setS('default_labor_mode', 'hourly')}
                disabled={!isOwnerOrDesigner}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${settingsForm.default_labor_mode === 'hourly' ? 'bg-[#2D5016] text-white' : 'bg-[#F5F1EC] text-[#A89880]'}`}
              >Hourly</button>
            </div>
          </div>

          {settingsForm.default_labor_mode === 'percentage' ? (
            <FieldWithTooltip label="Design fee %" tooltipKey="default_design_fee_pct">
              <div className="flex items-center gap-1 max-w-[120px]">
                <Input type="number" step="1" min="0" max="100" value={settingsForm.default_design_fee_pct}
                  onChange={e => setS('default_design_fee_pct', parseFloat(e.target.value) || 30)}
                  disabled={!isOwnerOrDesigner} />
                <span className="text-sm text-[#A89880]">%</span>
              </div>
            </FieldWithTooltip>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <FieldWithTooltip label="Prep rate ($/hr)" tooltipKey="default_prep_rate">
                <Input type="number" step="1" value={settingsForm.default_prep_rate}
                  onChange={e => setS('default_prep_rate', parseFloat(e.target.value) || 35)}
                  disabled={!isOwnerOrDesigner} />
              </FieldWithTooltip>
              <FieldWithTooltip label="Design rate ($/hr)" tooltipKey="default_design_rate">
                <Input type="number" step="1" value={settingsForm.default_design_rate}
                  onChange={e => setS('default_design_rate', parseFloat(e.target.value) || 65)}
                  disabled={!isOwnerOrDesigner} />
              </FieldWithTooltip>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            {(
              [
                { key: 'default_delivery_fee', typeKey: 'default_delivery_fee_type', label: 'Delivery fee', tooltipKey: 'default_delivery_fee' },
                { key: 'default_setup_fee',    typeKey: 'default_setup_fee_type',    label: 'Setup fee',    tooltipKey: 'default_setup_fee' },
                { key: 'default_teardown_fee', typeKey: 'default_teardown_fee_type', label: 'Teardown fee', tooltipKey: 'default_teardown_fee' },
              ] as const
            ).map(({ key, typeKey, label, tooltipKey }) => (
              <FieldWithTooltip key={key} label={label} tooltipKey={tooltipKey}>
                <div className="flex items-center gap-1.5">
                  <div className="flex rounded border border-[#E8E0D8] overflow-hidden text-xs shrink-0">
                    <button
                      type="button"
                      onClick={() => setS(typeKey, 'flat')}
                      disabled={!isOwnerOrDesigner}
                      className={`px-2 py-1 font-medium transition-colors ${settingsForm[typeKey] === 'flat' ? 'bg-[#2D5016] text-white' : 'bg-white text-[#A89880]'}`}
                    >$</button>
                    <button
                      type="button"
                      onClick={() => setS(typeKey, 'percentage')}
                      disabled={!isOwnerOrDesigner}
                      className={`px-2 py-1 font-medium transition-colors ${settingsForm[typeKey] === 'percentage' ? 'bg-[#2D5016] text-white' : 'bg-white text-[#A89880]'}`}
                    >%</button>
                  </div>
                  <Input type="number" step="1" min="0" value={settingsForm[key]}
                    onChange={e => setS(key, parseFloat(e.target.value) || 0)}
                    disabled={!isOwnerOrDesigner} />
                  <span className="text-sm text-[#A89880] shrink-0">
                    {settingsForm[typeKey] === 'flat' ? '$' : '%'}
                  </span>
                </div>
              </FieldWithTooltip>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FieldWithTooltip label="Tax rate (%)" tooltipKey="default_tax_rate">
              <Input type="number" step="0.1" value={settingsForm.default_tax_rate}
                onChange={e => setS('default_tax_rate', parseFloat(e.target.value) || 0)}
                disabled={!isOwnerOrDesigner} />
            </FieldWithTooltip>
            <FieldWithTooltip label="Margin target (%)" tooltipKey="default_margin_target">
              <Input type="number" step="1" value={settingsForm.default_margin_target}
                onChange={e => setS('default_margin_target', parseFloat(e.target.value) || 70)}
                disabled={!isOwnerOrDesigner} />
            </FieldWithTooltip>
            <FieldWithTooltip label="Waste buffer (%)" tooltipKey="default_waste_buffer_pct">
              <Input type="number" step="1" value={settingsForm.default_waste_buffer_pct}
                onChange={e => setS('default_waste_buffer_pct', parseFloat(e.target.value) || 10)}
                disabled={!isOwnerOrDesigner} />
            </FieldWithTooltip>
          </div>

          {isOwnerOrDesigner && (
            <Button onClick={handleSaveSettings} disabled={settingsSaving}>
              {settingsSaving ? 'Saving…' : 'Save pricing defaults'}
            </Button>
          )}
        </div>
      </TabsContent>

      {/* Team tab */}
      <TabsContent value="team">
        <div className="max-w-2xl space-y-8">
          {/* Invite code */}
          {isOwner && (
            <div className="bg-[#F5F1EC] rounded-xl px-5 py-4">
              <p className="text-sm font-medium text-[#4A3F35] mb-1">Studio invite code</p>
              <p className="text-xs text-[#A89880] mb-3">Share this code with staff to let them join your studio</p>
              <div className="flex items-center gap-2">
                <code className="font-mono text-lg font-bold text-[#2D5016] tracking-widest">{studio.invite_code}</code>
                <Button size="sm" variant="outline" onClick={copyInviteCode}>
                  {codeCopied ? '✓ Copied' : <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copy</>}
                </Button>
              </div>
            </div>
          )}

          {/* Invite form */}
          {isOwner && (
            <div>
              <h3 className="font-medium text-[#4A3F35] mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Invite team member
              </h3>
              <form onSubmit={handleInvite} className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label>Email address</Label>
                  <Input
                    type="email"
                    placeholder="designer@studio.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={v => setInviteRole(v as 'designer' | 'staff')}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="designer">Designer</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={inviteLoading || !inviteEmail.trim()}>
                  {inviteLoading ? 'Inviting…' : 'Invite'}
                </Button>
              </form>
              {inviteError && <p className="text-sm text-[#C0392B] mt-2">{inviteError}</p>}
            </div>
          )}

          {/* Members list */}
          <div>
            <h3 className="font-medium text-[#4A3F35] mb-3">Team members ({membersList.length})</h3>
            <div className="bg-white rounded-xl border border-[#E8E0D8] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E8E0D8] bg-[#F5F1EC]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Status</th>
                    {isOwner && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody>
                  {membersList.map(m => (
                    <tr key={m.id} className="border-b border-[#E8E0D8] last:border-0">
                      <td className="px-4 py-3 text-sm text-[#4A3F35]">
                        {m.user?.email ?? m.invited_email ?? '—'}
                        {m.user_id === currentUserId && <span className="ml-2 text-xs text-[#A89880]">(you)</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize">{m.role}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={m.status === 'active' ? 'green' : m.status === 'pending' ? 'gold' : 'red'}
                          className="capitalize"
                        >
                          {m.status}
                        </Badge>
                      </td>
                      {isOwner && (
                        <td className="px-4 py-3">
                          {m.user_id !== currentUserId && m.status !== 'revoked' && (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => handleRevoke(m.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-[#C0392B]" />
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </TabsContent>

      {/* Plan tab */}
      <TabsContent value="plan">
        <div className="max-w-lg">
          <div className="bg-white rounded-xl border border-[#E8E0D8] p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#2D5016]/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🌺</span>
            </div>
            <h3 className="font-serif text-xl font-semibold text-[#4A3F35] mb-2">Petal Pro</h3>
            <p className="text-sm text-[#A89880]">All features unlocked · Unlimited recipes and events</p>
            <Badge variant="green" className="mt-3">Active</Badge>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
