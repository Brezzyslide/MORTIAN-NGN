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
  LogOut,
  ChevronRight 
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
    <aside 
      className="w-64 sidebar-gradient text-white fixed h-full z-[99999] flex flex-col pointer-events-auto shadow-2xl"
      role="navigation"
      aria-label="Main navigation sidebar"
      style={{ isolation: 'isolate', textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)' }}
    >
      <div className="p-6 flex-shrink-0">
        <div className="flex items-center space-x-3 mb-8 group animate-fade-in">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-white/30">
            <Network className="text-white" size={20} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">TrackIt Naija</h1>
        </div>
        
        <div className="mb-6 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/15 transition-all duration-300 animate-slide-up">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <Crown className="text-white" size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" data-testid="text-user-name">
                {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || 'User'}
              </p>
              <p className="text-xs opacity-90 font-medium uppercase tracking-wider" data-testid="text-user-role">
                {normalizedRole?.replace('_', ' ') || 'User'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
        <nav className="space-y-1.5" aria-label="Primary navigation">
          <Link 
            href="/" 
            className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
              isActive('/') 
                ? 'bg-white/25 backdrop-blur-sm text-white shadow-lg border border-white/30' 
                : 'hover:bg-white/10 hover:translate-x-1 text-white'
            }`}
            data-testid="link-dashboard"
          >
            <div className="flex items-center space-x-3">
              <TrendingUp size={20} aria-hidden="true" className={isActive('/') ? 'text-white' : 'text-white/90'} />
              <span className="font-medium">Dashboard</span>
            </div>
            {isActive('/') && <ChevronRight size={16} className="text-white/70" />}
          </Link>
          
          <Link 
            href="/projects" 
            className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
              isActive('/projects') 
                ? 'bg-white/25 backdrop-blur-sm text-white shadow-lg border border-white/30' 
                : 'hover:bg-white/10 hover:translate-x-1 text-white'
            }`}
            data-testid="link-projects"
          >
            <div className="flex items-center space-x-3">
              <Folder size={20} aria-hidden="true" className={isActive('/projects') ? 'text-white' : 'text-white/90'} />
              <span className="font-medium">Projects</span>
            </div>
            {isActive('/projects') && <ChevronRight size={16} className="text-white/70" />}
          </Link>
          
          {canAccessFundAllocation() && (
            <Link 
              href="/allocations" 
              className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 pointer-events-auto cursor-pointer ${
                isActive('/allocations') 
                  ? 'bg-white/25 backdrop-blur-sm text-white shadow-lg border border-white/30' 
                  : 'hover:bg-white/10 hover:translate-x-1 text-white'
              }`}
              data-testid="link-allocations"
            >
              <div className="flex items-center space-x-3">
                <Coins size={20} aria-hidden="true" className={isActive('/allocations') ? 'text-white' : 'text-white/90'} />
                <span className="font-medium">Fund Allocation</span>
              </div>
              {isActive('/allocations') && <ChevronRight size={16} className="text-white/70" />}
            </Link>
          )}
          
          <ProtectedComponent requiredPermission="canAccessCostEntry">
            <Link 
              href="/cost-entry" 
              className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                isActive('/cost-entry') 
                  ? 'bg-white/25 backdrop-blur-sm text-white shadow-lg border border-white/30' 
                  : 'hover:bg-white/10 hover:translate-x-1 text-white'
              }`}
              data-testid="link-cost-entry"
            >
              <div className="flex items-center space-x-3">
                <Calculator size={20} aria-hidden="true" className={isActive('/cost-entry') ? 'text-white' : 'text-white/90'} />
                <span className="font-medium">Cost Entry</span>
              </div>
              {isActive('/cost-entry') && <ChevronRight size={16} className="text-white/70" />}
            </Link>
          </ProtectedComponent>
          
          <ProtectedComponent requiredPermission="canAccessCostEntry">
            <Link 
              href="/revenue-entry" 
              className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                isActive('/revenue-entry') 
                  ? 'bg-white/25 backdrop-blur-sm text-white shadow-lg border border-white/30' 
                  : 'hover:bg-white/10 hover:translate-x-1 text-white'
              }`}
              data-testid="link-revenue-entry"
            >
              <div className="flex items-center space-x-3">
                <Banknote size={20} aria-hidden="true" className={isActive('/revenue-entry') ? 'text-white' : 'text-white/90'} />
                <span className="font-medium">Revenue Entry</span>
              </div>
              {isActive('/revenue-entry') && <ChevronRight size={16} className="text-white/70" />}
            </Link>
          </ProtectedComponent>
          
          <Link 
            href="/project-costings" 
            className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
              isActive('/project-costings') 
                ? 'bg-white/25 backdrop-blur-sm text-white shadow-lg border border-white/30' 
                : 'hover:bg-white/10 hover:translate-x-1 text-white'
            }`}
            data-testid="link-project-costings"
          >
            <div className="flex items-center space-x-3">
              <ClipboardList size={20} aria-hidden="true" className={isActive('/project-costings') ? 'text-white' : 'text-white/90'} />
              <span className="font-medium">Project Costings</span>
            </div>
            {isActive('/project-costings') && <ChevronRight size={16} className="text-white/70" />}
          </Link>
          
          <Link 
            href="/transactions" 
            className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
              isActive('/transactions') 
                ? 'bg-white/25 backdrop-blur-sm text-white shadow-lg border border-white/30' 
                : 'hover:bg-white/10 hover:translate-x-1 text-white'
            }`}
            data-testid="link-transactions"
          >
            <div className="flex items-center space-x-3">
              <Receipt size={20} aria-hidden="true" className={isActive('/transactions') ? 'text-white' : 'text-white/90'} />
              <span className="font-medium">Transactions</span>
            </div>
            {isActive('/transactions') && <ChevronRight size={16} className="text-white/70" />}
          </Link>
          
          <Link 
            href="/analytics" 
            className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
              isActive('/analytics') 
                ? 'bg-white/25 backdrop-blur-sm text-white shadow-lg border border-white/30' 
                : 'hover:bg-white/10 hover:translate-x-1 text-white'
            }`}
            data-testid="link-analytics"
          >
            <div className="flex items-center space-x-3">
              <BarChart3 size={20} aria-hidden="true" className={isActive('/analytics') ? 'text-white' : 'text-white/90'} />
              <span className="font-medium">Analytics</span>
            </div>
            {isActive('/analytics') && <ChevronRight size={16} className="text-white/70" />}
          </Link>
          
          <Link 
            href="/audit" 
            className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
              isActive('/audit') 
                ? 'bg-white/25 backdrop-blur-sm text-white shadow-lg border border-white/30' 
                : 'hover:bg-white/10 hover:translate-x-1 text-white'
            }`}
            data-testid="link-audit"
          >
            <div className="flex items-center space-x-3">
              <ClipboardList size={20} aria-hidden="true" className={isActive('/audit') ? 'text-white' : 'text-white/90'} />
              <span className="font-medium">Audit Log</span>
            </div>
            {isActive('/audit') && <ChevronRight size={16} className="text-white/70" />}
          </Link>
        </nav>
        
        <div className="mt-6 pt-6 border-t border-white/20">
          <h3 className="text-xs font-bold uppercase tracking-wider opacity-80 text-white mb-3 px-3">Configuration</h3>
          <nav className="space-y-1.5" aria-label="Configuration">
            <Link 
              href="/line-items" 
              className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                isActive('/line-items') 
                  ? 'bg-white/25 backdrop-blur-sm text-white shadow-lg border border-white/30' 
                  : 'hover:bg-white/10 hover:translate-x-1 text-white'
              }`}
              data-testid="link-line-items"
            >
              <div className="flex items-center space-x-3">
                <List size={20} aria-hidden="true" className={isActive('/line-items') ? 'text-white' : 'text-white/90'} />
                <span className="font-medium">Line Items</span>
              </div>
              {isActive('/line-items') && <ChevronRight size={16} className="text-white/70" />}
            </Link>
            
            <Link 
              href="/materials" 
              className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                isActive('/materials') 
                  ? 'bg-white/25 backdrop-blur-sm text-white shadow-lg border border-white/30' 
                  : 'hover:bg-white/10 hover:translate-x-1 text-white'
              }`}
              data-testid="link-materials"
            >
              <div className="flex items-center space-x-3">
                <Package size={20} aria-hidden="true" className={isActive('/materials') ? 'text-white' : 'text-white/90'} />
                <span className="font-medium">Materials</span>
              </div>
              {isActive('/materials') && <ChevronRight size={16} className="text-white/70" />}
            </Link>
          </nav>
        </div>
        
        <ProtectedComponent requiredPermission="canAccessUserManagement">
          <div className="mt-6 pt-6 border-t border-white/20">
            <h3 className="text-xs font-bold uppercase tracking-wider opacity-80 text-white mb-3 px-3">Management</h3>
            <nav className="space-y-1.5" aria-label="Management">
              <ProtectedComponent requiredPermission="canViewTeams">
                <Link 
                  href="/teams" 
                  className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                    isActive('/teams') 
                      ? 'bg-white/25 backdrop-blur-sm text-white shadow-lg border border-white/30' 
                      : 'hover:bg-white/10 hover:translate-x-1 text-white'
                  }`}
                  data-testid="link-teams"
                >
                  <div className="flex items-center space-x-3">
                    <Network size={20} aria-hidden="true" className={isActive('/teams') ? 'text-white' : 'text-white/90'} />
                    <span className="font-medium">Teams</span>
                  </div>
                  {isActive('/teams') && <ChevronRight size={16} className="text-white/70" />}
                </Link>
              </ProtectedComponent>
              
              <Link 
                href="/users" 
                className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                  isActive('/users') 
                    ? 'bg-white/25 backdrop-blur-sm text-white shadow-lg border border-white/30' 
                    : 'hover:bg-white/10 hover:translate-x-1 text-white'
                }`}
                data-testid="link-users"
              >
                <div className="flex items-center space-x-3">
                  <Users size={20} aria-hidden="true" className={isActive('/users') ? 'text-white' : 'text-white/90'} />
                  <span className="font-medium">Team Members</span>
                </div>
                {isActive('/users') && <ChevronRight size={16} className="text-white/70" />}
              </Link>
              
              <ProtectedComponent requiredPermission="canAccessPermissions">
                <Link 
                  href="/permissions" 
                  className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                    isActive('/permissions') 
                      ? 'bg-white/25 backdrop-blur-sm text-white shadow-lg border border-white/30' 
                      : 'hover:bg-white/10 hover:translate-x-1 text-white'
                  }`}
                  data-testid="link-permissions"
                >
                  <div className="flex items-center space-x-3">
                    <Shield size={20} aria-hidden="true" className={isActive('/permissions') ? 'text-white' : 'text-white/90'} />
                    <span className="font-medium">Permissions</span>
                  </div>
                  {isActive('/permissions') && <ChevronRight size={16} className="text-white/70" />}
                </Link>
              </ProtectedComponent>
            </nav>
          </div>
        </ProtectedComponent>

        <ProtectedComponent requiredPermission="canAccessCompanyManagement">
          <div className="mt-6 pt-6 border-t border-white/20">
            <h3 className="text-xs font-bold uppercase tracking-wider opacity-80 text-white mb-3 px-3">Console Management</h3>
            <nav className="space-y-1.5" aria-label="Console Management">
              <Link 
                href="/companies" 
                className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                  isActive('/companies') 
                    ? 'bg-white/25 backdrop-blur-sm text-white shadow-lg border border-white/30' 
                    : 'hover:bg-white/10 hover:translate-x-1 text-white'
                }`}
                data-testid="link-companies"
              >
                <div className="flex items-center space-x-3">
                  <Building2 size={20} aria-hidden="true" className={isActive('/companies') ? 'text-white' : 'text-white/90'} />
                  <span className="font-medium">Company Management</span>
                </div>
                {isActive('/companies') && <ChevronRight size={16} className="text-white/70" />}
              </Link>
            </nav>
          </div>
        </ProtectedComponent>

        <div className="mt-6 pt-6 border-t border-white/20">
          <button
            onClick={handleLogout}
            className="group flex items-center justify-between p-3 rounded-xl hover:bg-red-500/20 transition-all duration-200 w-full hover:translate-x-1 border border-transparent hover:border-red-400/30"
            data-testid="button-logout"
          >
            <div className="flex items-center space-x-3">
              <LogOut size={20} aria-hidden="true" className="text-white/80 group-hover:text-red-300" />
              <span className="font-medium">Sign Out</span>
            </div>
          </button>
        </div>
      </div>
    </aside>
  );
}
