import React from 'react';
import Logo from './logo';

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-b-slate-200 bg-white">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <Logo />
      </div>
    </header>
  );
};

export default Header;