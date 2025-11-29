
import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'
import React, { ReactNode } from 'react'
import { isAuthenticated } from '@/lib/action/auth.action'

const layout = async ({ children }: { children: ReactNode }) => {
    const isUserAuthenticated = await isAuthenticated()
    if (isUserAuthenticated) redirect('/')
    return (
        <div className='auth-layout'>
            {children}
            <Toaster />
        </div>
    )
}

export default layout
