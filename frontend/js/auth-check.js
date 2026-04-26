(() => {
  'use strict';

  // Check authentication status and redirect if needed
  const checkAuth = () => {
    const sessionId = localStorage.getItem('sessionId');
    const currentPath = window.location.pathname;
    
    // Pages that require authentication
    const protectedPages = ['/code.html', '/driver.html', '/passenger.html', '/code', '/driver', '/passenger'];
    
    // Pages that should redirect if already authenticated
    const authPages = ['/signin.html', '/signup.html', '/driver-signin.html', '/driver-signup.html'];
    
    const isProtectedPage = protectedPages.some(page => currentPath.includes(page));
    const isAuthPage = authPages.some(page => currentPath.includes(page));
    
    if (!sessionId && isProtectedPage) {
      // Not authenticated but trying to access protected page
      window.location.href = '/signin.html';
      return false;
    }
    
    if (sessionId && isAuthPage) {
      // Already authenticated but trying to access auth page
      const userRole = localStorage.getItem('userRole') || 'passenger';
      const dashboardPage = userRole === 'driver' ? '/driver.html' : '/code.html';
      window.location.href = dashboardPage;
      return false;
    }
    
    return true;
  };

  // Check authentication on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
  } else {
    checkAuth();
  }

  // Expose auth check globally
  window.authCheck = { checkAuth };

})();
