import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, PlusCircle, ClipboardList, Settings } from 'lucide-react';

export default function BottomNav() {
  const navItems = [
    {
      to: '/',
      label: 'Accueil',
      icon: Home,
    },
    {
      to: '/new',
      label: 'Nouvelle',
      icon: PlusCircle,
      isSpecial: true,
    },
    {
      to: '/history',
      label: 'Historique',
      icon: ClipboardList,
    },
    {
      to: '/settings',
      label: 'Paramètres',
      icon: Settings,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] safe-bottom">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 py-1.5 transition-all duration-200 ${
                  item.isSpecial
                    ? 'group'
                    : ''
                } ${
                  isActive
                    ? 'text-blue-600 font-semibold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {item.isSpecial ? (
                    <div className="relative -top-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95 ${
                        isActive 
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-blue-200' 
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
                      }`}>
                        <Icon className="w-6 h-6 stroke-[2.2]" />
                      </div>
                      <span className={`block text-[11px] text-center mt-0.5 ${isActive ? 'text-blue-600 font-bold' : 'text-slate-600'}`}>
                        {item.label}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className={`relative p-1 rounded-xl transition-colors ${isActive ? 'bg-blue-50' : ''}`}>
                        <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                        {isActive && (
                          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                        )}
                      </div>
                      <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
                    </>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
