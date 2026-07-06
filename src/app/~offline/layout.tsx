import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '離線中 - ShopEasy',
};

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
