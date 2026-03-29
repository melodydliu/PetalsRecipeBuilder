import { SignupForm } from './SignupForm'
import { Flower } from 'lucide-react'

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-[#2D5016] flex items-center justify-center mb-4">
            <Flower className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-serif text-3xl font-semibold text-[#2D5016]">Petal</h1>
          <p className="text-sm text-[#A89880] mt-1">Floral recipe management</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E0D8] shadow-sm p-8">
          <h2 className="font-serif text-2xl font-semibold text-[#4A3F35] mb-1">Create your account</h2>
          <p className="text-sm text-[#A89880] mb-6">Start managing your floral recipes</p>
          <SignupForm />
        </div>

        <p className="text-center text-sm text-[#A89880] mt-6">
          Already have an account?{' '}
          <a href="/auth/login" className="text-[#2D5016] font-medium hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}
