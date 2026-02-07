import React from 'react'
import Sidebar from '@/components/sidebar/index'
import InfoBar from '@/components/infobar'

type Props = { children: React.ReactNode }

const Layout = (props: Props) => {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <InfoBar />
        <div className="flex-1 overflow-auto">
          {props.children}
        </div>
      </div>
    </div>
  )
}

export default Layout
