import { Menu } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-3">
          <button className="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Open sidebar">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Gringotts</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Notifications">
            {/* Notification bell icon would go here */}
          </button>
          <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Quick add">
            {/* Plus icon for quick add */}
          </button>
          <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="User menu">
            {/* User avatar/icon would go here */}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
