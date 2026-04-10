// Initialize Supabase client
// Note: Supabase client is initialized in env.js and accessible via window.supabaseClient
    
// Add this constant at the top of your script
const DEFAULT_IMAGE = 'https://via.placeholder.com/200x200?text=No+Image';
const ITEMS_PER_PAGE = 15; // Changed from 7 to 15
let currentPage = 1;

// Initialize mobile view function
function initializeMobileView() {
    const isMobile = window.innerWidth <= 768;
    const productTable = document.getElementById('productTable');
    const productCards = document.getElementById('productCards');
    
    if (isMobile) {
        if (productTable) productTable.classList.add('d-none');
        if (productCards) productCards.classList.remove('d-none');
    } else {
        if (productTable) productTable.classList.remove('d-none');
        if (productCards) productCards.classList.add('d-none');
    }
}

// Add window resize event listener
window.addEventListener('resize', debounce(() => {
    initializeMobileView();
}, 250));

// Show toast notification
function showToast(title, message, type = 'success') {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) return;

    const toastId = 'toast-' + Date.now();
    const bgColor = type === 'success' ? 'var(--bs-success)' : 'var(--bs-danger)';

    const toastHTML = `
        <div class="toast" id="${toastId}">
            <div class="toast-header" style="background: ${bgColor}; color: white;">
                <strong class="me-auto">${title}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">${message}</div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHTML);

    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
    toast.show();

    toastElement.addEventListener('hidden.bs.toast', function () {
        toastElement.remove();
    });
}

// Check if user is authenticated
async function checkAuth() {
    if (!window.supabaseClient) {
        console.error('Supabase client not initialized');
        return false;
    }

    const { data: { session }, error } = await window.supabaseClient.auth.getSession();
    
    if (error) {
        console.error('Error checking auth status:', error);
        return false;
    }
    
    return !!session;
}

// Login with Supabase Auth
async function loginWithSupabase(email, password) {
    if (!window.supabaseClient) {
        console.error('Supabase client not initialized');
        return { success: false, error: 'Authentication service not available' };
    }

    try {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            throw error;
        }
        
        return { success: true, user: data.user };
    } catch (error) {
        console.error('Login error:', error.message);
        return { success: false, error: error.message };
    }
}

// Logout from Supabase Auth
async function logoutFromSupabase() {
    if (!window.supabaseClient) {
        console.error('Supabase client not initialized');
        return { success: false, error: 'Authentication service not available' };
    }

    try {
        const { error } = await window.supabaseClient.auth.signOut();
        
        if (error) {
            throw error;
        }
        
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error.message);
        return { success: false, error: error.message };
    }
}

// Helper function to get the first image from image_urls array
function getFirstImage(imageUrls) {
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        return DEFAULT_IMAGE;
    }
    return imageUrls[0];
}

// Load products from Supabase
async function loadProducts(filters = {}, page = 1) {
    try {
        // First get total count
        let countQuery = window.supabaseClient
            .from('products')
            .select('*', { count: 'exact', head: true });

        if (filters.category) {
            countQuery = countQuery.eq('category', filters.category);
        }
        if (filters.search) {
            countQuery = countQuery.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }

        const { count, error: countError } = await countQuery;
        if (countError) throw countError;

        // Then get paginated data
        let query = window.supabaseClient
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (filters.category) {
            query = query.eq('category', filters.category);
        }
        if (filters.search) {
            query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }

        // Get exactly 20 items for current page
        const from = (page - 1) * ITEMS_PER_PAGE;
        query = query.range(from, from + ITEMS_PER_PAGE - 1);

        const { data, error } = await query;
        if (error) throw error;

        // Update table
        const tbody = document.querySelector('#products-section tbody');
        tbody.innerHTML = '';

        data.forEach(product => {
            tbody.innerHTML += `
                <tr data-product-id="${product.id}">
                    <td>
                        <span class="fw-medium">${product.id}</span>
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${product.image_urls && product.image_urls.length > 0 ? product.image_urls[0] : '/img/project1.jpg'}" class="product-image me-3" alt="Product">
                            <div>
                                <span class="fw-medium">${product.name}</span>
                                <br>
                            </div>
                        </div>
                    </td>
                    <td>${product.category}</td>
                    <td>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" 
                                    type="button" 
                                    data-bs-toggle="dropdown">
                                Actions
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li>
                                    <button class="dropdown-item edit-product" 
                                            data-product='${JSON.stringify(product)}'>
                                        <i class="fas fa-edit me-2"></i>Edit
                                    </button>
                                </li>
                                <li>
                                    <button class="dropdown-item delete-product">
                                        <i class="fas fa-trash me-2"></i>Delete
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </td>
                </tr>
            `;
        });

        // Show/hide pagination based on total count
        const paginationContainer = document.querySelector('#products-section .pagination-container');
        if (count > ITEMS_PER_PAGE) {
            paginationContainer.classList.remove('d-none');
            
            // Calculate total pages
            const totalPages = Math.ceil(count / ITEMS_PER_PAGE);
            
            // Update pagination
            const pagination = document.querySelector('#products-section .pagination');
            pagination.innerHTML = `
                <li class="page-item ${page === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${page - 1}">
                        <i class="fas fa-chevron-left"></i>
                    </a>
                </li>
                ${Array.from({ length: totalPages }, (_, i) => i + 1)
                    .map(pageNum => `
                        <li class="page-item ${pageNum === page ? 'active' : ''}">
                            <a class="page-link" href="#" data-page="${pageNum}">${pageNum}</a>
                        </li>
                    `).join('')}
                <li class="page-item ${page === totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${page + 1}">
                        <i class="fas fa-chevron-right"></i>
                    </a>
                </li>
            `;

            // Add pagination click handlers
            pagination.querySelectorAll('.page-link').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const newPage = parseInt(this.dataset.page);
                    if (!isNaN(newPage) && newPage > 0 && newPage <= totalPages) {
                        loadProducts(filters, newPage);
                    }
                });
            });
        } else {
            paginationContainer.classList.add('d-none');
        }

        // Update showing entries text
        const showingText = count > 0 
            ? `Showing ${from + 1} to ${Math.min(from + data.length, count)} of ${count} entries`
            : 'No entries to show';
        document.querySelector('#products-section .showing-entries').textContent = showingText;

        addProductEventListeners();

    } catch (error) {
        console.error('Error loading products:', error);
        showToast('Error', 'Failed to load products', 'error');
    }
}

// Helper functions for status
function getStatusBadge(stock) {
    if (stock <= 0) return 'danger';
    if (stock <= 10) return 'warning';
    return 'success';
}

function getStatusText(stock) {
    if (stock <= 0) return 'Out of Stock';
    if (stock <= 10) return 'Low Stock';
    return 'In Stock';
}

// Add file validation function
function validateImage(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload a JPG, JPEG or PNG image.');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        throw new Error('File size too large. Maximum size is 5MB.');
    }

    return true;
}

// Add these functions to handle file uploads
async function uploadImages(files) {
    try {
        const uploadPromises = Array.from(files).map(async (file) => {
            // Validate image before upload
            validateImage(file);

            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `product-images/${fileName}`;

            // Upload to Supabase storage
            const { data, error } = await window.supabaseClient.storage
                .from('products')
                .upload(filePath, file);

            if (error) {
                console.error('Upload error:', error);
                throw error;
            }

            // Get the public URL
            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('products')
                .getPublicUrl(filePath);

            console.log('Generated URL:', publicUrl); // Debug log
            return publicUrl;
        });

        const urls = await Promise.all(uploadPromises);
        console.log('Final URLs array:', urls); // Debug log
        return urls;
    } catch (error) {
        console.error('Error in uploadImages:', error);
        throw error;
    }
}

// Update the addProduct function
async function addProduct(formData) {
    try {
        const imageFiles = formData.getAll('images');
        
        if (!imageFiles || imageFiles.length === 0) {
            throw new Error('Please select at least one image for the product.');
        }

        // Show loading state
        const addButton = document.querySelector('#addProductBtn');
        addButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        addButton.disabled = true;

        // Upload images first
        const imageUrls = await uploadImages(imageFiles);
        console.log('Uploaded URLs:', imageUrls);

        // Create product with auto-generated ID
        const { data, error } = await window.supabaseClient
            .from('products')
            .insert({
                name: formData.get('name'),
                category: formData.get('category'),
                description: formData.get('description'),
                image_urls: imageUrls.length > 0 ? imageUrls : null
            })
            .select();

        if (error) throw error;

        showToast('Success', 'Product added successfully');
        
        // Reset form and previews
        const form = document.getElementById('addProductForm');
        form.reset();
        document.querySelector('.image-previews').innerHTML = '';
        
        // Close modal
        const modal = document.getElementById('addProductModal');
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) {
            bsModal.hide();
        }

        // Reload products only after modal is hidden
        modal.addEventListener('hidden.bs.modal', function handler() {
            loadProducts();
            modal.removeEventListener('hidden.bs.modal', handler);
        });

    } catch (error) {
        console.error('Error adding product:', error);
        showToast('Error', error.message || 'Failed to add product', 'error');
    } finally {
        // Reset button state
        const addButton = document.querySelector('#addProductBtn');
        addButton.innerHTML = '<i class="fas fa-plus me-2"></i>Add Product';
        addButton.disabled = false;
    }
}

// Edit product
async function editProduct(id, formData) {
    try {
        const { error } = await window.supabaseClient
            .from('products')
            .update({
                name: formData.get('name'),
                category: formData.get('category'),
                description: formData.get('description'),
            })
            .eq('id', id);

        if (error) throw error;

        showToast('Success', 'Product updated successfully');
        loadProducts();

        // Close the modal and restore focus
        const modal = document.getElementById('editProductModal');
        const modalInstance = bootstrap.Modal.getInstance(modal);
        
        // Find the edit button using a more reliable method
        const editButton = document.querySelector(`tr[data-product-id="${id}"] .edit-product`);
        
        // Hide the modal
        modalInstance.hide();
        
        // After the modal is hidden, restore focus to the edit button
        modal.addEventListener('hidden.bs.modal', function handler() {
            if (editButton) {
                editButton.focus();
            }
            // Remove the event listener to prevent memory leaks
            modal.removeEventListener('hidden.bs.modal', handler);
        });

    } catch (error) {
        console.error('Error updating product:', error);
        showToast('Error', 'Failed to update product', 'error');
    }
}

// Delete product
async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        const { error } = await window.supabaseClient
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showToast('Success', 'Product deleted successfully');
        loadProducts(); // Reload the products table

    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Error', 'Failed to delete product', 'error');
    }
}

// Add event listeners to product actions
function addProductEventListeners() {
    // Edit product
    document.querySelectorAll('.edit-product').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.target.closest('.edit-product');
            if (!button) return;
            
            try {
                // Get the product data from the data-product attribute
                const productData = button.getAttribute('data-product');
                console.log('Product data:', productData);
                
                // Parse the JSON data
                const product = JSON.parse(productData);
                console.log('Parsed product:', product);
                
                const form = document.getElementById('editProductForm');
                
                // Populate form fields
                form.querySelector('[name="id"]').value = product.id;
                form.querySelector('[name="name"]').value = product.name;
                form.querySelector('[name="category"]').value = product.category;
                form.querySelector('[name="description"]').value = product.description;
                
                // Display existing images
                const imagePreviews = document.querySelector('.edit-image-previews');
                imagePreviews.innerHTML = '';
                
                if (product.image_urls && product.image_urls.length > 0) {
                    product.image_urls.forEach((url, index) => {
                        const previewDiv = document.createElement('div');
                        previewDiv.className = 'preview-item position-relative';
                        previewDiv.style.width = '100px';
                        previewDiv.style.height = '100px';
                        previewDiv.style.display = 'inline-block';
                        previewDiv.style.marginRight = '10px';
                        previewDiv.style.marginBottom = '10px';
                        previewDiv.style.borderRadius = '8px';
                        previewDiv.style.overflow = 'hidden';
                        previewDiv.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                        
                        previewDiv.innerHTML = `
                            <img src="${url}" 
                                 style="width: 100%; height: 100%; object-fit: cover;"
                                 alt="Product image ${index + 1}">
                            <div class="position-absolute" style="top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); opacity: 0; transition: opacity 0.3s;">
                                <div class="d-flex justify-content-center align-items-center h-100">
                                    <button type="button" class="btn btn-sm btn-danger" 
                                            onclick="removeImage(this)">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                        
                        // Add hover effect
                        previewDiv.addEventListener('mouseenter', function() {
                            this.querySelector('div').style.opacity = '1';
                        });
                        
                        previewDiv.addEventListener('mouseleave', function() {
                            this.querySelector('div').style.opacity = '0';
                        });
                        
                        imagePreviews.appendChild(previewDiv);
                    });
                } else {
                    // Show a placeholder if no images
                    imagePreviews.innerHTML = `
                        <div class="text-center p-3 border rounded" style="background-color: #f8f9fa;">
                            <i class="fas fa-images fa-2x text-muted mb-2"></i>
                            <p class="text-muted mb-0">No images available</p>
                        </div>
                    `;
                }

                // Show the modal
                const modal = document.getElementById('editProductModal');
                const bsModal = new bootstrap.Modal(modal);
                
                // Set up focus management before showing the modal
                modal.addEventListener('shown.bs.modal', function handler() {
                    // Focus on the first input field
                    const firstInput = modal.querySelector('input[name="name"]');
                    if (firstInput) {
                        firstInput.focus();
                    }
                    
                    // Remove the event listener to prevent memory leaks
                    modal.removeEventListener('shown.bs.modal', handler);
                });
                
                // Set up focus management when the modal is hidden
                modal.addEventListener('hide.bs.modal', function handler() {
                    // Store the element that opened the modal
                    const editButton = document.querySelector(`tr[data-product-id="${product.id}"] .edit-product`);
                    
                    // After the modal is hidden, restore focus to the edit button
                    modal.addEventListener('hidden.bs.modal', function hiddenHandler() {
                        if (editButton) {
                            editButton.focus();
                        }
                        // Remove the event listener to prevent memory leaks
                        modal.removeEventListener('hidden.bs.modal', hiddenHandler);
                    });
                    
                    // Remove the event listener to prevent memory leaks
                    modal.removeEventListener('hide.bs.modal', handler);
                });
                
                // Show the modal
                bsModal.show();
            } catch (error) {
                console.error('Error parsing product data:', error);
                showToast('Error', 'Failed to load product data', 'error');
            }
        });
    });

    // Delete product
    document.querySelectorAll('.delete-product').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const row = e.target.closest('tr');
            const productId = row.dataset.productId;
            deleteProduct(productId);
        });
    });
}

// Set up event listeners when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    const addProductForm = document.getElementById('addProductForm');
    const addProductBtn = document.getElementById('addProductBtn');
    const addProductModal = document.getElementById('addProductModal');
    const editProductModal = document.getElementById('editProductModal');

    if (addProductBtn) {
        // Remove any existing event listeners by cloning and replacing the button
        const newAddProductBtn = addProductBtn.cloneNode(true);
        addProductBtn.parentNode.replaceChild(newAddProductBtn, addProductBtn);
        
        // Add single event listener to the new button
        newAddProductBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const form = document.getElementById('addProductForm');
            if (form && form.checkValidity()) {
                const formData = new FormData(form);
                addProduct(formData);
            } else if (form) {
                form.reportValidity();
            }
        });
    }

    // Set up focus management for modals
    if (addProductModal) {
        addProductModal.addEventListener('shown.bs.modal', function() {
            const firstInput = addProductModal.querySelector('input[name="name"]');
            if (firstInput) {
                firstInput.focus();
            }
        });
        
        addProductModal.addEventListener('hidden.bs.modal', function() {
            const triggerButton = document.querySelector('[data-bs-target="#addProductModal"]');
            if (triggerButton) {
                triggerButton.focus();
            }
        });
    }
    
    if (editProductModal) {
        editProductModal.addEventListener('shown.bs.modal', function() {
            const firstInput = editProductModal.querySelector('input[name="name"]');
            if (firstInput) {
                firstInput.focus();
            }
        });
        
        editProductModal.addEventListener('hidden.bs.modal', function() {
            const productId = editProductModal.querySelector('input[name="id"]').value;
            const editButton = document.querySelector(`tr[data-product-id="${productId}"] .edit-product`);
            if (editButton) {
                editButton.focus();
            }
        });
    }

    // Add sidebar toggle functionality
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebarToggle && sidebar) {
        // Toggle sidebar on button click
        sidebarToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            sidebar.classList.toggle('show');
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(event) {
            if (window.innerWidth <= 992 && 
                !sidebar.contains(event.target) && 
                !sidebarToggle.contains(event.target) && 
                sidebar.classList.contains('show')) {
                sidebar.classList.remove('show');
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth > 992) {
                sidebar.classList.remove('show');
            }
            initializeMobileView();
        });
    }

    // Call on load and resize
    initializeMobileView();
    window.addEventListener('resize', initializeMobileView);
});

// Add filter event listeners
document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
    loadProducts({ category: e.target.value });
});

// Add event listener for search input
document.getElementById('searchProducts')?.addEventListener('input', debounce((e) => {
    loadProducts({ search: e.target.value });
}, 300));

// Add event listener for search button
document.querySelector('.input-group .btn-outline-primary')?.addEventListener('click', () => {
    const searchValue = document.getElementById('searchProducts').value;
    loadProducts({ search: searchValue });
});

document.getElementById('resetFilters')?.addEventListener('click', () => {
    document.getElementById('categoryFilter').value = '';
    document.getElementById('searchProducts').value = '';
    loadProducts();
});

// Utility function for debouncing search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Load all data when admin dashboard is shown
function initializeAdminDashboard() {
    if (localStorage.getItem('adminAuthenticated')) {
        loadProducts();
    }
}

// Initialize dashboard when loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded event fired');
    
    // Check authentication status
    const isAuthenticated = await checkAuth();
    console.log('Authentication status:', isAuthenticated);
    
    if (!isAuthenticated) {
        document.getElementById('login-screen').classList.remove('d-none');
        document.getElementById('admin-dashboard').classList.add('d-none');
    } else {
        document.getElementById('login-screen').classList.add('d-none');
        document.getElementById('admin-dashboard').classList.remove('d-none');
        
        // Update user profile information
        updateUserProfile();
        
        // Initialize category filter
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            console.log('Category filter found, adding event listener');
            categoryFilter.addEventListener('change', (e) => {
                console.log('Category filter changed:', e.target.value);
                loadProducts({ category: e.target.value });
            });
        }
        
        // Initialize search functionality
        const searchInput = document.getElementById('searchProducts');
        console.log('Search input element:', searchInput);
        
        if (searchInput) {
            console.log('Search input found, adding event listeners');
            searchInput.addEventListener('input', debounce((e) => {
                console.log('Search input changed:', e.target.value);
                loadProducts({ search: e.target.value });
            }, 300));
        }
        
        const searchButton = document.querySelector('.input-group .btn-outline-primary');
        console.log('Search button element:', searchButton);
        
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                console.log('Search button clicked');
                const searchValue = searchInput.value;
                loadProducts({ search: searchValue });
            });
        }
        
        // Initialize reset filters button
        const resetFilters = document.getElementById('resetFilters');
        if (resetFilters) {
            resetFilters.addEventListener('click', () => {
                console.log('Reset filters clicked');
                document.getElementById('categoryFilter').value = '';
                document.getElementById('searchProducts').value = '';
                loadProducts();
            });
        }
        
        loadProducts();
    }
    
    // Add login form event listener
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Show loading state
        const submitButton = this.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Signing in...';
        submitButton.disabled = true;
        
        try {
            const result = await loginWithSupabase(email, password);
            
            if (result.success) {
                document.getElementById('login-screen').classList.add('d-none');
                document.getElementById('admin-dashboard').classList.remove('d-none');
                
                // Update user profile information
                updateUserProfile();
                
                showToast('Success', 'Login successful. Welcome to the admin panel!');
                loadProducts();
            } else {
                showToast('Error', result.error || 'Invalid credentials. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast('Error', 'An error occurred during login. Please try again.', 'error');
        } finally {
            // Reset button state
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
        }
    });
    
    // Add logout button event listener
    document.getElementById('logoutBtn').addEventListener('click', async function(e) {
        e.preventDefault();
        
        try {
            const result = await logoutFromSupabase();
            
            if (result.success) {
                document.getElementById('login-screen').classList.remove('d-none');
                document.getElementById('admin-dashboard').classList.add('d-none');
                showToast('Success', 'You have been logged out successfully.');
            } else {
                showToast('Error', result.error || 'Failed to logout. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Error', 'An error occurred during logout. Please try again.', 'error');
        }
    });
    
    // Initialize mobile view
    initializeMobileView();
});

// Update user profile information
async function updateUserProfile() {
    try {
        const { data: { user }, error } = await window.supabaseClient.auth.getUser();
        
        if (error) {
            throw error;
        }
        
        if (user) {
            // Update user name
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = user.user_metadata?.full_name || user.email || 'Admin User';
            }
            
            // Update user avatar
            const userAvatarElement = document.getElementById('userAvatar');
            if (userAvatarElement) {
                const userName = user.user_metadata?.full_name || user.email || 'Admin User';
                userAvatarElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=1e40af&color=fff`;
            }
            
            // Update user role
            const userRoleElement = document.getElementById('userRole');
            if (userRoleElement) {
                userRoleElement.textContent = user.user_metadata?.role || 'Administrator';
            }
        }
    } catch (error) {
        console.error('Error updating user profile:', error);
    }
}

// Refresh data when switching tabs
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        const section = this.getAttribute('data-section');
        if (section === 'dashboard') {
            loadDashboardStats();
            loadRecentProducts();
        } else if (section === 'products') {
            loadProducts();
        }
    });
});

// Add this function to fetch dashboard stats
async function loadDashboardStats() {
    try {
        // Get total products count
        const { data: productsCount, error: productsError } = await window.supabaseClient
            .from('products')
            .select('id', { count: 'exact' });

        if (productsError) throw productsError;




        // Update dashboard stats
        document.querySelector('.stat-card.products h3').textContent = productsCount;

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showToast('Error', 'Failed to load dashboard statistics', 'error');
    }
}

// Add this function to load recent products
async function loadRecentProducts() {
    try {
        const { data, error } = await window.supabaseClient
            .from('products')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(4);

        if (error) throw error;

        const recentProductsTable = document.querySelector('#dashboard-section .table tbody');
        recentProductsTable.innerHTML = '';

        data.forEach(product => {
            recentProductsTable.innerHTML += `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${product.image_url || DEFAULT_IMAGE}" class="product-image me-3" alt="Product">
                            <span class="fw-medium">${product.name}</span>
                        </div>
                    </td>
                    <td>${product.category}</td>
                    <td>$${product.price.toFixed(2)}</td>
                    <td><span class="badge bg-${getStatusBadge(product.stock)}">${getStatusText(product.stock)}</span></td>
                </tr>
            `;
        });

    } catch (error) {
        console.error('Error loading recent products:', error);
        showToast('Error', 'Failed to load recent products', 'error');
    }
}

// Function to remove an image from the edit modal
window.removeImage = function(button) {
    const previewItem = button.closest('.preview-item');
    if (previewItem) {
        // Add a fade-out effect
        previewItem.style.transition = 'opacity 0.3s, transform 0.3s';
        previewItem.style.opacity = '0';
        previewItem.style.transform = 'scale(0.8)';
        
        // Remove the element after the animation completes
        setTimeout(() => {
            previewItem.remove();
            
            // Check if there are no more images and show placeholder if needed
            const imagePreviews = previewItem.closest('.edit-image-previews') || previewItem.closest('.image-previews');
            if (imagePreviews && imagePreviews.children.length === 0) {
                imagePreviews.innerHTML = `
                    <div class="text-center p-3 border rounded" style="background-color: #f8f9fa;">
                        <i class="fas fa-images fa-2x text-muted mb-2"></i>
                        <p class="text-muted mb-0">No images available</p>
                    </div>
                `;
            }
        }, 300);
    }
};

// Make updateProduct function globally available
window.updateProduct = async function() {
    const form = document.getElementById('editProductForm');
    const formData = new FormData(form);
    const productId = formData.get('id');

    try {
        // Show loading state
        const updateButton = document.querySelector('#editProductModal .btn-primary');
        updateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        updateButton.disabled = true;

        // Get existing image URLs from the previews
        const existingImages = Array.from(document.querySelectorAll('.edit-image-previews img'))
            .map(img => img.src)
            .filter(url => !url.startsWith('data:')); // Filter out data URLs (newly uploaded images)

        // Get new images from the file input
        const newImageFiles = formData.getAll('images');
        let newImageUrls = [];

        if (newImageFiles.length > 0) {
            // Show loading indicator for image uploads
            const imagePreviews = document.querySelector('.edit-image-previews');
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'text-center p-3';
            loadingIndicator.innerHTML = `
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 mb-0">Uploading images...</p>
            `;
            imagePreviews.appendChild(loadingIndicator);
            
            const validFiles = newImageFiles.filter(file => {
                if (file.size === 0) return false;
                try {
                    validateImage(file);
                    return true;
                } catch (error) {
                    console.warn('Invalid file:', error.message);
                    return false;
                }
            });

            if (validFiles.length > 0) {
                newImageUrls = await uploadImages(validFiles);
                console.log('Uploaded new image URLs:', newImageUrls);
            }
            
            // Remove loading indicator
            loadingIndicator.remove();
        }

        // Combine existing and new image URLs
        const allImageUrls = [...existingImages, ...newImageUrls];
        console.log('Final image URLs:', allImageUrls);

        const { error } = await window.supabaseClient
            .from('products')
            .update({
                name: formData.get('name'),
                category: formData.get('category'),
                description: formData.get('description'),
                image_urls: allImageUrls.length > 0 ? allImageUrls : null
            })
            .eq('id', productId);

        if (error) throw error;

        showToast('Success', 'Product updated successfully');
        loadProducts();
        
        // Close the modal and restore focus
        const modal = document.getElementById('editProductModal');
        const modalInstance = bootstrap.Modal.getInstance(modal);
        
        // Find the edit button using a more reliable method
        const editButton = document.querySelector(`tr[data-product-id="${productId}"] .edit-product`);
        
        // Hide the modal
        modalInstance.hide();
        
        // After the modal is hidden, restore focus to the edit button
        modal.addEventListener('hidden.bs.modal', function handler() {
            if (editButton) {
                editButton.focus();
            }
            // Remove the event listener to prevent memory leaks
            modal.removeEventListener('hidden.bs.modal', handler);
        });

    } catch (error) {
        console.error('Error updating product:', error);
        showToast('Error', error.message || 'Failed to update product', 'error');
    } finally {
        // Reset button state
        const updateButton = document.querySelector('#editProductModal .btn-primary');
        updateButton.innerHTML = 'Update Product';
        updateButton.disabled = false;
    }
};

// Add image preview handler
document.getElementById('productImages')?.addEventListener('change', function(e) {
    const files = e.target.files;
    console.log('Selected files:', files); // Debug log
    const previewContainer = document.querySelector('.image-previews');
    previewContainer.innerHTML = '';

    if (files) {
        Array.from(files).forEach(file => {
            try {
                validateImage(file);
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    const previewDiv = document.createElement('div');
                    previewDiv.className = 'preview-item position-relative';
                    previewDiv.style.width = '80px';
                    previewDiv.style.height = '80px';
                    
                    previewDiv.innerHTML = `
                        <img src="${e.target.result}" 
                             style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;"
                             alt="Preview">
                    `;
                    
                    previewContainer.appendChild(previewDiv);
                };
                reader.readAsDataURL(file);
            } catch (error) {
                showToast('Error', error.message, 'error');
            }
        });
    }
});

// Add image preview handler for edit product images
document.getElementById('editProductImages')?.addEventListener('change', function(e) {
    const files = e.target.files;
    console.log('Selected files for edit:', files); // Debug log
    const previewContainer = document.querySelector('.edit-image-previews');
    
    // Don't clear existing previews when adding new images
    // previewContainer.innerHTML = '';
    
    if (files) {
        Array.from(files).forEach(file => {
            try {
                validateImage(file);
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    const previewDiv = document.createElement('div');
                    previewDiv.className = 'preview-item position-relative';
                    previewDiv.style.width = '100px';
                    previewDiv.style.height = '100px';
                    previewDiv.style.display = 'inline-block';
                    previewDiv.style.marginRight = '10px';
                    previewDiv.style.marginBottom = '10px';
                    previewDiv.style.borderRadius = '8px';
                    previewDiv.style.overflow = 'hidden';
                    previewDiv.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    
                    previewDiv.innerHTML = `
                        <img src="${e.target.result}" 
                             style="width: 100%; height: 100%; object-fit: cover;"
                             alt="Preview">
                        <div class="position-absolute" style="top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); opacity: 0; transition: opacity 0.3s;">
                            <div class="d-flex justify-content-center align-items-center h-100">
                                <button type="button" class="btn btn-sm btn-danger" 
                                        onclick="removeImage(this)">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                    
                    // Add hover effect
                    previewDiv.addEventListener('mouseenter', function() {
                        this.querySelector('div').style.opacity = '1';
                    });
                    
                    previewDiv.addEventListener('mouseleave', function() {
                        this.querySelector('div').style.opacity = '0';
                    });
                    
                    previewContainer.appendChild(previewDiv);
                };
                reader.readAsDataURL(file);
            } catch (error) {
                showToast('Error', error.message, 'error');
            }
        });
    }
});

// Add this event listener for viewing images
document.addEventListener('click', function(e) {
    if (e.target.closest('.view-images')) {
        const button = e.target.closest('.view-images');
        const images = JSON.parse(button.dataset.images);
        const container = document.getElementById('modalImageContainer');
        
        container.innerHTML = images.map(url => `
            <div class="col-md-4">
                <img src="${url}" 
                     class="img-fluid rounded shadow" 
                     style="width: 100%; height: 200px; object-fit: cover;"
                     alt="Product image">
            </div>
        `).join('');
    }
});

// Add this function to help debug
async function checkDatabaseState() {
    const { data, error } = await window.supabaseClient
        .from('products')
        .select('*');
    
    console.log('Current database state:', data);
    console.log('Any errors:', error);
}

// Tablo görünümünü mobil için optimize et
function optimizeTableForMobile() {
    const tableHeaders = document.querySelectorAll('table th');
    const tableRows = document.querySelectorAll('table td');
    
    if (window.innerWidth < 768) {
        tableHeaders.forEach(th => th.style.fontSize = '0.8rem');
        tableRows.forEach(td => td.style.fontSize = '0.9rem');
    } else {
        tableHeaders.forEach(th => th.style.fontSize = '');
        tableRows.forEach(td => td.style.fontSize = '');
    }
}

// Sayfa yüklendiğinde ve ekran boyutu değiştiğinde tabloyu optimize et
window.addEventListener('load', optimizeTableForMobile);
window.addEventListener('resize', optimizeTableForMobile); 