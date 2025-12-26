import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto py-6 border-t border-blue-800 bg-blue-900 flex flex-col items-center justify-center space-y-2">
      <a 
        href="https://bizskilledu.com/" 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex flex-col items-center group"
      >
        <img 
          src="https://s6.imgcdn.dev/YUybmy.png" 
          alt="BizSkill Logo" 
          className="h-12 w-auto object-contain mb-2 transition-opacity group-hover:opacity-80"
          onError={(e) => {
            // Fallback if image fails
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <span className="text-sm text-blue-100 font-medium group-hover:text-white transition-colors">
          Powered by BizSkill
        </span>
      </a>
    </footer>
  );
};