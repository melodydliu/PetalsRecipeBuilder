import { OnboardingFlow } from './OnboardingFlow'
import { Flower } from 'lucide-react'

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-[#2D5016] flex items-center justify-center mb-4">
            <Flower className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-serif text-3xl font-semibold text-[#2D5016]">Welcome to Petal</h1>
          <p className="text-sm text-[#A89880] mt-1">Let's set up your studio</p>
        </div>
        <OnboardingFlow />
      </div>
    </div>
  )
}
