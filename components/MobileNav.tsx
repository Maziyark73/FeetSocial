import Link from 'next/link';
import { useRouter } from 'next/router';

interface MobileNavProps {
  currentUserId?: string;
}

export default function MobileNav({ currentUserId }: MobileNavProps) {
  const router = useRouter();
  const currentPath = router.pathname;

  const navItems = [
    {
      name: 'Home',
      path: '/feed',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Live',
      path: '/go-live',
      icon: (active: boolean) => (
        <svg className="w-7 h-7" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      accent: true, // Special styling for "Go Live" button
    },
    {
      name: 'Upload',
      path: '/upload',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      name: 'Profile',
      path: currentUserId ? `/profile/${currentUserId}` : '/login',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-50 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          
          if (item.accent) {
            // Special "Go Live" button
            return (
              <Link
                key={item.name}
                href={item.path}
                className="flex flex-col items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full text-white shadow-lg hover:scale-105 transition-transform"
              >
                {item.icon(isActive)}
              </Link>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-purple-500' : 'text-gray-400 hover:text-white'
              }`}
            >
              {item.icon(isActive)}
              <span className={`text-xs mt-1 font-medium ${isActive ? 'text-purple-500' : 'text-gray-400'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

