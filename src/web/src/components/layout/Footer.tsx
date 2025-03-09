import React from 'react';
import classNames from 'classnames';
import Link from 'next/link';

interface FooterLinkProps {
  href: string;
  label: string;
}

const FooterLink: React.FC<FooterLinkProps> = ({ href, label }) => {
  return (
    <Link 
      href={href}
      className={classNames(
        "text-gray-400 hover:text-white transition-colors duration-200",
        "mx-2 md:mx-4",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800",
        "text-sm"
      )}
    >
      {label}
    </Link>
  );
};

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-800 text-gray-300 py-6 px-4 mt-auto border-t border-gray-700">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="mb-4 md:mb-0">
          <p className="text-sm">
            &copy; {currentYear} AI Agent Network. All rights reserved.
          </p>
        </div>
        <nav className="flex" aria-label="Footer Navigation">
          <FooterLink href="/privacy" label="Privacy Policy" />
          <FooterLink href="/terms" label="Terms of Service" />
        </nav>
      </div>
    </footer>
  );
};

export default Footer;