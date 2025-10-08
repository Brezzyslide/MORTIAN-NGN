import { useAuth } from "@/hooks/useAuth";
import { usePermissions, ProtectedComponent } from "@/hooks/usePermissions";
import { Link, useLocation } from "wouter";
import { 
  Network, 
  Crown, 
  TrendingUp, 
  Folder, 
  Coins, 
  Calculator, 
  Banknote, 
  ClipboardList, 
  Receipt, 
  BarChart3, 
  List, 
  Package, 
  Users, 
  Shield, 
  Building2, 
  LogOut 
} from "lucide-react";

export default function Sidebar() {
  const { user } = useAuth();
  const { permissions, normalizedRole, canAccessFundAllocation } = usePermissions();
  const [location] = useLocation();

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div className="w-64 sidebar-gradient text-white fixed h-full z-[9999] flex flex-col pointer-events-auto">
      <div className="p-6 flex-shrink-0">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Network className="text-primary" size={16} />
          </div>
          <h1 className="text-xl font-semibold">ProjectFund</h1>
        </div>
        
        {/* User Role Badge */}
        <div className="mb-6 p-3 bg-white/10 rounded-lg">
          <div className="flex items-center space-x-2">
            <Crown className="text-yellow-300" size={16} />
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
      </div>
      
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* Navigation Menu */}
        <nav className="space-y-2">
          <Link 
            href="/" 
            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              isActive('/') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
            }`}
            data-testid="link-dashboard"
          >
            <TrendingUp size={20} />
            <span>Dashboard</span>
          </Link>
          <Link 
            href="/projects" 
            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              isActive('/projects') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
            }`}
            data-testid="link-projects"
          >
            <Folder size={20} />
            <span>Projects</span>
          </Link>
          {canAccessFundAllocation() && (
            <Link 
              href="/allocations" 
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors pointer-events-auto cursor-pointer ${
                isActive('/allocations') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
              }`}
              data-testid="link-allocations"
            >
              <Coins size={20} />
              <span>Fund Allocation</span>
            </Link>
          )}
          <ProtectedComponent requiredPermission="canAccessCostEntry">
            <Link 
              href="/cost-entry" 
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isActive('/cost-entry') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
              }`}
              data-testid="link-cost-entry"
            >
              <Calculator size={20} />
              <span>Cost Entry</span>
            </Link>
          </ProtectedComponent>
          <ProtectedComponent requiredPermission="canAccessCostEntry">
            <Link 
              href="/revenue-entry" 
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isActive('/revenue-entry') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
              }`}
              data-testid="link-revenue-entry"
            >
              <Banknote size={20} />
              <span>Revenue Entry</span>
            </Link>
          </ProtectedComponent>
          <Link 
            href="/project-costings" 
            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              isActive('/project-costings') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
            }`}
            data-testid="link-project-costings"
          >
            <ClipboardList size={20} />
            <span>Project Costings</span>
          </Link>
          <Link 
            href="/transactions" 
            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              isActive('/transactions') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
            }`}
            data-testid="link-transactions"
          >
            <Receipt size={20} />
            <span>Transactions</span>
          </Link>
          <Link 
            href="/analytics" 
            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              isActive('/analytics') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
            }`}
            data-testid="link-analytics"
          >
            <BarChart3 size={20} />
            <span>Analytics</span>
          </Link>
          <Link 
            href="/audit" 
            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              isActive('/audit') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
            }`}
            data-testid="link-audit"
          >
            <ClipboardList size={20} />
            <span>Audit Log</span>
          </Link>
        </nav>
        
        {/* Configuration */}
        <div className="mt-8 pt-6 border-t border-white/20">
          <h3 className="text-sm font-medium opacity-75 mb-3">Configuration</h3>
          <nav className="space-y-2">
            <Link 
              href="/line-items" 
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isActive('/line-items') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
              }`}
              data-testid="link-line-items"
            >
              <List size={20} />
              <span>Line Items</span>
            </Link>
            <Link 
              href="/materials" 
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isActive('/materials') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
              }`}
              data-testid="link-materials"
            >
              <Package size={20} />
              <span>Materials</span>
            </Link>
          </nav>
        </div>
        
        {/* User Management (Admin Only) */}
        <ProtectedComponent requiredPermission="canAccessUserManagement">
          <div className="mt-8 pt-6 border-t border-white/20">
            <h3 className="text-sm font-medium opacity-75 mb-3">Management</h3>
            <ProtectedComponent requiredPermission="canViewTeams">
              <Link 
                href="/teams" 
                className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                  isActive('/teams') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
                }`}
                data-testid="link-teams"
              >
                <Network size={20} />
                <span>Teams</span>
              </Link>
            </ProtectedComponent>
            <Link 
              href="/users" 
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isActive('/users') ? 'bg-white/20 text-white' : 'hover:bg-white/10'
              }`}
              data-testid="link-users"
            >
              <Users size={20} />
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
                <Shield size={20} />
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
              <Building2 size={20} />
              <span>Company Management</span>
            </Link>
          </div>
        </ProtectedComponent>

        {/* Logout */}
        <div className="mt-8 pt-6 border-t border-white/20">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 transition-colors w-full"
            data-testid="button-logout"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
