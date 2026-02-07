import { Metadata } from 'next';
import { ReactNode } from 'react';

import InfoBar from '@/components/infobar';
import Sidebar from '@/components/sidebar/index';

export const metadata: Metadata = {
  title: 'Commando AI',
  description: 'Commando AI',
};

const RootLayout = ({ children }: Readonly<{children: ReactNode}>) => {
  return (
    <main className="relative">

      <div className="flex">
        <section className="flex min-h-screen flex-1 flex-col px-6 pb-6 pt-28 max-md:pb-14 sm:px-14">
          <div className="w-full">{children}</div>
        </section>
      </div>
    </main>
  );
};

export default RootLayout;
