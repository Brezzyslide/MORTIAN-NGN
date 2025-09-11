import { useAuth } from "@/hooks/useAuth";

export default function Sidebar() {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = '/api/logout';
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
                {user?.role?.replace('_', ' ')?.toUpperCase() || 'User'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Navigation Menu */}
        <nav className="space-y-2">
          <a 
            href="#dashboard" 
            className="flex items-center space-x-3 p-3 rounded-lg bg-white/20 text-white"
            data-testid="link-dashboard"
          >
            <i className="fas fa-chart-line w-5"></i>
            <span>Dashboard</span>
          </a>
          <a 
            href="#projects" 
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 transition-colors"
            data-testid="link-projects"
          >
            <i className="fas fa-folder w-5"></i>
            <span>Projects</span>
          </a>
          <a 
            href="#allocations" 
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 transition-colors"
            data-testid="link-allocations"
          >
            <i className="fas fa-coins w-5"></i>
            <span>Fund Allocation</span>
          </a>
          <a 
            href="#transactions" 
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 transition-colors"
            data-testid="link-transactions"
          >
            <i className="fas fa-receipt w-5"></i>
            <span>Transactions</span>
          </a>
          <a 
            href="#analytics" 
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 transition-colors"
            data-testid="link-analytics"
          >
            <i className="fas fa-analytics w-5"></i>
            <span>Analytics</span>
          </a>
          <a 
            href="#audit" 
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 transition-colors"
            data-testid="link-audit"
          >
            <i className="fas fa-clipboard-list w-5"></i>
            <span>Audit Log</span>
          </a>
        </nav>
        
        {/* User Management (Manager Only) */}
        {user?.role === 'manager' && (
          <div className="mt-8 pt-6 border-t border-white/20">
            <h3 className="text-sm font-medium opacity-75 mb-3">Management</h3>
            <a 
              href="#users" 
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 transition-colors"
              data-testid="link-users"
            >
              <i className="fas fa-users w-5"></i>
              <span>Team Members</span>
            </a>
            <a 
              href="#permissions" 
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 transition-colors"
              data-testid="link-permissions"
            >
              <i className="fas fa-shield-alt w-5"></i>
              <span>Permissions</span>
            </a>
          </div>
        )}

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
