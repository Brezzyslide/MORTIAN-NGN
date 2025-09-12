import { useAuth } from "@/hooks/useAuth";
import { usePermissions, ProtectedComponent } from "@/hooks/usePermissions";
import { Link, useLocation } from "wouter";

export default function Sidebar() {
  const { user } = useAuth();
  const { permissions, normalizedRole } = usePermissions();
  const [location] = useLocation();

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div className="w-64 sidebar-gradient text-white fixed h-full z-10">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <i className="fas fa-project-diagram text-primary text-sm"></i>
          </div>
          <h1 className="text-xl font-semibold">ProjectFund</h1>
        </div>
        
        {/* User Role Badge */}
        <div className="mb-6 p-3 bg-white/10 rounded-lg">
          <div className="flex items-center space-x-2">
            <i className="fas fa-crown text-yellow-300"></i>
            <div>
              <p className="text-sm font-medium" data-testid="text-user-name">
                {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || 'User'}
              </p>
              <p className="text-xs opacity-75" data-testid="text-user-role">
                {normalizedRole?.replace('_', ' ')?.toUpperCase() || 'User'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Navigation Menu */}
        <nav className="space-y-2">
          <Link 
            href="/" 
            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              isActive('/') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
            }`}
            data-testid="link-dashboard"
          >
            <i className="fas fa-chart-line w-5"></i>
            <span>Dashboard</span>
          </Link>
          <Link 
            href="/projects" 
            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              isActive('/projects') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
            }`}
            data-testid="link-projects"
          >
            <i className="fas fa-folder w-5"></i>
            <span>Projects</span>
          </Link>
          <Link 
            href="/allocations" 
            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              isActive('/allocations') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
            }`}
            data-testid="link-allocations"
          >
            <i className="fas fa-coins w-5"></i>
            <span>Fund Allocation</span>
          </Link>
          <ProtectedComponent requiredPermission="canAccessCostEntry">
            <Link 
              href="/cost-entry" 
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isActive('/cost-entry') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
              }`}
              data-testid="link-cost-entry"
            >
              <i className="fas fa-calculator w-5"></i>
              <span>Cost Entry</span>
            </Link>
          </ProtectedComponent>
          <Link 
            href="/transactions" 
            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              isActive('/transactions') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
            }`}
            data-testid="link-transactions"
          >
            <i className="fas fa-receipt w-5"></i>
            <span>Transactions</span>
          </Link>
          <Link 
            href="/analytics" 
            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              isActive('/analytics') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
            }`}
            data-testid="link-analytics"
          >
            <i className="fas fa-analytics w-5"></i>
            <span>Analytics</span>
          </Link>
          <Link 
            href="/audit" 
            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              isActive('/audit') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
            }`}
            data-testid="link-audit"
          >
            <i className="fas fa-clipboard-list w-5"></i>
            <span>Audit Log</span>
          </Link>
        </nav>
        
        {/* User Management (Admin Only) */}
        <ProtectedComponent requiredPermission="canAccessUserManagement">
          <div className="mt-8 pt-6 border-t border-white/20">
            <h3 className="text-sm font-medium opacity-75 mb-3">Management</h3>
            <Link 
              href="/users" 
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isActive('/users') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
              }`}
              data-testid="link-users"
            >
              <i className="fas fa-users w-5"></i>
              <span>Team Members</span>
            </Link>
            <ProtectedComponent requiredPermission="canAccessPermissions">
              <Link 
                href="/permissions" 
                className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                  isActive('/permissions') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
                }`}
                data-testid="link-permissions"
              >
                <i className="fas fa-shield-alt w-5"></i>
                <span>Permissions</span>
              </Link>
            </ProtectedComponent>
          </div>
        </ProtectedComponent>

        {/* Console Manager Only Section */}
        <ProtectedComponent requiredPermission="canAccessCompanyManagement">
          <div className="mt-8 pt-6 border-t border-white/20">
            <h3 className="text-sm font-medium opacity-75 mb-3">Console Management</h3>
            <Link 
              href="/companies" 
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isActive('/companies') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
              }`}
              data-testid="link-companies"
            >
              <i className="fas fa-building w-5"></i>
              <span>Company Management</span>
            </Link>
          </div>
        </ProtectedComponent>

        {/* Logout */}
        <div className="absolute bottom-6 left-6 right-6">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 transition-colors w-full"
            data-testid="button-logout"
          >
            <i className="fas fa-sign-out-alt w-5"></i>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
