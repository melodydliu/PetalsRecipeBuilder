'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sidebar } from './Sidebar'

const EXPANDED = 240
const COLLAPSED = 64

interface SidebarShellProps {
  studioName?: string
  userEmail?: string
  children: React.ReactNode
}

export function SidebarShell({ studioName, userEmail, children }: SidebarShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      <Sidebar
        studioName={studioName}
        userEmail={userEmail}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />
      <motion.main
        animate={{ marginLeft: collapsed ? COLLAPSED : EXPANDED }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className="min-h-screen overflow-y-auto"
      >
        <div className="max-w-[1280px] mx-auto px-8 py-8">
          {children}
        </div>
      </motion.main>
    </>
  )
}
