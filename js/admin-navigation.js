document.addEventListener('DOMContentLoaded', function() {
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
        adminBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Check if user is already logged in
            const isAuthenticated = localStorage.getItem('adminAuthenticated');
            if (isAuthenticated) {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'admin.html#login';
            }
        });
    }
}); 