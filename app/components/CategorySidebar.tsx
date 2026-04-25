import { Link } from 'react-router';

export function CategorySidebar({ menu, currentHandle }: { menu: any, currentHandle?: string }) {
  if (!menu?.items) return null;

  const getHandle = (url?: string) => {
    if (!url) return '';
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/').filter(Boolean);
      return parts[parts.length - 1] || '';
    } catch {
      const parts = url.split('/').filter(Boolean);
      return parts[parts.length - 1] || '';
    }
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 sticky top-24">
      <h3 className="text-xl font-black text-[#1b3d2e] mb-6">التصنيفات</h3>
      <ul className="flex flex-col gap-2 relative">
        {menu.items.map((item: any) => {
          const itemHandle = getHandle(item.url);
          // Check if parent or any child is active
          const isDirectlyActive = itemHandle === currentHandle;
          const isChildActive = item.items?.some((child: any) => getHandle(child.url) === currentHandle);
          const isOpen = isDirectlyActive || isChildActive;

          return (
            <li key={item.id} className="flex flex-col">
              <Link 
                to={`/collections/${itemHandle}`}
                className={`py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-between group ${
                  isOpen ? 'bg-[#1b3d2e]/5 text-[#1b3d2e]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span>{item.title}</span>
                {item.items && item.items.length > 0 && (
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-300 ${isOpen ? 'rotate-90 text-[#1b3d2e]' : 'text-gray-300 group-hover:text-gray-500'}`}><polyline points="9 18 15 12 9 6"></polyline></svg>
                )}
              </Link>
              {item.items && item.items.length > 0 && isOpen && (
                <ul className="flex flex-col gap-1 pr-6 mt-2 border-r-[3px] border-[#1b3d2e]/10 mr-4 mb-2">
                  {item.items.map((child: any) => {
                    const childHandle = getHandle(child.url);
                    const isChildCurrentlyActive = childHandle === currentHandle;
                    return (
                      <li key={child.id} className="relative">
                        {isChildCurrentlyActive && <div className="absolute top-1/2 -translate-y-1/2 -right-[5px] w-2 h-2 rounded-full bg-[#1b3d2e]" />}
                        <Link 
                          to={`/collections/${childHandle}`}
                          className={`block py-2 px-3 rounded-xl text-sm font-bold transition-all ${
                            isChildCurrentlyActive ? 'text-[#1b3d2e] bg-[#1b3d2e]/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {child.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
