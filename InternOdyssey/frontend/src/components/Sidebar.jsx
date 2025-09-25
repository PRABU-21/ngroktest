import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '� Dashboard', key: 'dashboard' },
    { path: '/health-check', label: '❤️ Health Check', key: 'health' }
  ];

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname === path) return true;
    return false;
  };

  return (
    <div className="w-64 bg-black text-white fixed h-full overflow-y-auto">
      <div className="p-6">
        <h1 className="text-xl font-bold mb-8">InternOdyssey</h1>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.key}
              to={item.path}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors block ${
                isActive(item.path) ? 'bg-white text-black' : 'hover:bg-gray-800'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      
      <div className="p-6 border-t border-gray-800">
        <div className="text-sm text-gray-400">Features</div>
        <div className="mt-3 space-y-2">
          <div className="px-4 py-2 text-sm text-white">📄 Upload Resume</div>
          <div className="px-4 py-2 text-sm text-white">📁 Match Candidates</div>
          <div className="px-4 py-2 text-sm text-white">👥 View Applicants</div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar 