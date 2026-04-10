// First declare supabase variable
let supabase;

// Initialize Supabase client
const supabaseUrl = 'https://uvrozprcewgwybuhguai.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2cm96cHJjZXdnd3lidWhndWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3NTI1MTAsImV4cCI6MjA1ODMyODUxMH0.2EgqTZjwcOv_kKP38g9nsou1ECsR_ybnAaGZduXWlaQ';
const DEFAULT_IMAGE = 'img/new%20images/1.jpg';

// Global variables for pagination
let currentPage = 1;
let productsPerPage = 8;
let allProducts = [];
let heroSliderInterval = null;

// Function to update all translatable elements
function updateTranslations() {
    // Update elements with data-translate attribute
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        element.textContent = getTranslation(key);
    });

    // Update elements with data-translate-placeholder attribute
    document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
        const key = element.getAttribute('data-translate-placeholder');
        element.placeholder = getTranslation(key);
    });
}

// Initialize all responsive functionality
document.addEventListener('DOMContentLoaded', () => {
    console.log('Document loaded, initializing...');
    handleResponsive();
    setupScrollAnimations();
    initializeApp();
    initHeroSlider();

    // Update the dropdown button text
    const langBtn = document.querySelector('.lang-btn');
    if (langBtn) {
        const langText = getCurrentLang() === 'en' ? 'English' :
            getCurrentLang() === 'ar' ? 'عربي' :
                getCurrentLang() === 'tr' ? 'Türkçe' : 'English';
        const langSpan = langBtn.querySelector('span');
        if (langSpan) {
            langSpan.textContent = langText;
        }

        // Ensure dropdown items are centered
        const dropdownItems = document.querySelectorAll('.language-switcher .dropdown-item');
        dropdownItems.forEach(item => {
            item.style.justifyContent = 'center';
            item.style.textAlign = 'center';
        });
    }

    // Add language switcher event listeners
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const lang = item.dataset.lang;
            if (lang && (lang === 'en' || lang === 'ar' || lang === 'tr')) {
                updateLanguage(lang);

                // Update dropdown button text
                const langBtn = document.querySelector('.lang-btn');
                if (langBtn) {
                    const langText = lang === 'en' ? 'English' :
                        lang === 'ar' ? 'عربي' :
                            lang === 'tr' ? 'Türkçe' : 'English';
                    const langSpan = langBtn.querySelector('span');
                    if (langSpan) {
                        langSpan.textContent = langText;
                    }
                }

                // Close language dropdown and mobile menu if open
                const dropdown = document.querySelector('.language-switcher.show');
                if (dropdown) {
                    const dropdownToggle = document.querySelector('[data-bs-toggle="dropdown"]');
                    if (dropdownToggle) {
                        const bsDropdown = bootstrap.Dropdown.getInstance(dropdownToggle);
                        if (bsDropdown) bsDropdown.hide();
                    }
                }

                // Close mobile menu
                const navLinks = document.getElementById('links');
                if (navLinks && navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    document.body.style.overflow = '';
                }

                // Apply RTL-specific styles immediately for better UX
                if (lang === 'ar') {
                    if (window.adjustRTLStyles) {
                        window.adjustRTLStyles();
                    }
                } else {
                    if (window.resetRTLStyles) {
                        window.resetRTLStyles();
                    }
                }
            }
        });
    });

    // Enhanced search functionality with debounce
    const searchInput = document.getElementById('searchProducts');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            currentPage = 1; // Reset to first page on new search
            loadProducts(e.target.value);
        }, 300));
    }

    // Admin sayfasına yönlendirme için event listener
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
        adminBtn.addEventListener('click', function (e) {
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

    // Ensure mobile menu is properly initialized
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('links');

    if (menuToggle && navLinks) {
        // Add touch event for better mobile experience
        menuToggle.addEventListener('touchstart', function (e) {
            e.preventDefault();
            navLinks.classList.toggle('active');
            document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
        });

        // Ensure menu closes when clicking outside
        document.addEventListener('click', function (e) {
            if (navLinks.classList.contains('active') &&
                !navLinks.contains(e.target) &&
                !menuToggle.contains(e.target)) {
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
});

// Fetch and display products from Supabase with improved error handling
async function loadProducts(searchQuery = '') {
    console.log('Starting to load products...');

    if (!supabase) {
        console.error('Supabase client not initialized');
        const initialized = initializeSupabase();
        if (!initialized) {
            console.error('Failed to initialize Supabase client');
            return;
        }
    }

    const productCards = document.getElementById('productCards');
    const paginationContainer = document.getElementById('pagination');

    if (!productCards) {
        console.error('Product cards container not found');
        return;
    }

    try {
        console.log('Attempting to fetch products from Supabase...');
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log('Products fetched successfully. Number of products:', data?.length || 0);

        productCards.innerHTML = '';

        if (!data || data.length === 0) {
            console.log('No products found in database');
            productCards.innerHTML = `<p class="no-products">No products available</p>`;
            paginationContainer.innerHTML = '';
            return;
        }

        // Filter products based on search query
        allProducts = searchQuery
            ? data.filter(product =>
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.description.toLowerCase().includes(searchQuery.toLowerCase())
            )
            : data;

        // Calculate pagination
        const totalPages = Math.ceil(allProducts.length / productsPerPage);
        const startIndex = (currentPage - 1) * productsPerPage;
        const endIndex = startIndex + productsPerPage;
        const currentProducts = allProducts.slice(startIndex, endIndex);

        // Display current page products
        currentProducts.forEach(product => {
            const primaryImage = getFirstImage(product.image_urls);
            const productName = product.name;
            const productDesc = product.description;
            const productCategory = product.category;

            productCards.innerHTML += `
            <div class="product-card" data-aos="fade-up">
                <div class="product-image">
                    <img src="${primaryImage}" alt="${productName}" loading="lazy">
                    <div class="product-overlay">
                        <a href="cart.html?id=${product.id}" class="view-details-btn">
                            <i class="fas fa-expand-alt"></i>
                        </a>
                    </div>
                </div>
                <div class="product-info">
                    <div class="product-meta">
                        <span class="product-category">${productCategory}</span>
                    </div>
                    <h3 class="product-title">${productName}</h3>
                    <p class="product-description">${productDesc}</p>
                    <div class="product-footer">
                        <a href="cart.html?id=${product.id}" class="details-link">
                            <span>View Details</span>
                            <i class="fas fa-arrow-right"></i>
                        </a>
                    </div>
                </div>
            </div>`;
        });

        // Update pagination
        updatePagination(totalPages);
    } catch (error) {
        console.error('Error loading products:', error);
        productCards.innerHTML = `
            <div class="error-message">
                <p>Error loading products. Please try again later.</p>
                <p>Error: ${error.message}</p>
            </div>
        `;
    }
}

// Function to update pagination buttons
function updatePagination(totalPages) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';

    paginationContainer.innerHTML = `
        <button class="pagination-btn" onclick="changePage(${currentPage - 1})" ${prevDisabled}>
            <i class="fas fa-chevron-left"></i>
        </button>
        <span class="pagination-label">Page ${currentPage} of ${totalPages}</span>
        <button class="pagination-btn" onclick="changePage(${currentPage + 1})" ${nextDisabled}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
}

// Function to change page
function changePage(newPage) {
    if (newPage < 1 || newPage > Math.ceil(allProducts.length / productsPerPage)) return;
    currentPage = newPage;
    loadProducts();
}

// Handle contact form submission with improved error handling
const contactForm = document.getElementById('contactForm');
if (contactForm) {  // Only add event listener if form exists
    contactForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!supabase) {
            console.error('Supabase client not initialized');
            alert(getTranslation('systemError'));
            return;
        }

        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');

        // Disable submit button to prevent double submission
        submitButton.disabled = true;
        submitButton.textContent = getTranslation('sending');

        const formData = {
            full_name: form.fullName.value,
            email: form.email.value,
            mobile: form.mobile.value,
            subject: form.subject.value,
            message: form.message.value,
            created_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase
                .from('contacts')
                .insert([formData]);

            if (error) throw error;

            alert(getTranslation('messageSent'));
            form.reset();
        } catch (error) {
            console.error('Error submitting form:', error.message);
            alert(getTranslation('submitError'));
        } finally {
            // Re-enable submit button
            submitButton.disabled = false;
            submitButton.textContent = getTranslation('send');
        }
    });
}

// Helper function to get first image
function getFirstImage(imageUrls) {
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        return DEFAULT_IMAGE;
    }
    return imageUrls[0];
}

// Wait for document and Supabase to be ready
function initializeApp() {
    console.log('Initializing app...');
    if (initializeSupabase()) {
        console.log('Supabase initialized, loading products...');
        loadProducts();
    } else {
        console.log('Retrying Supabase initialization in 500ms...');
        setTimeout(initializeApp, 500);
    }
}

function initHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.dot');

    if (!slides.length) return;

    const setSlide = (index) => {
        slides.forEach((slide, slideIndex) => {
            slide.classList.toggle('active', slideIndex === index);
        });
        dots.forEach((dot, dotIndex) => {
            dot.classList.toggle('active', dotIndex === index);
        });
    };

    const nextSlide = () => {
        const activeIndex = Array.from(slides).findIndex(slide => slide.classList.contains('active'));
        const nextIndex = activeIndex === slides.length - 1 ? 0 : activeIndex + 1;
        setSlide(nextIndex);
    };


    if (heroSliderInterval) {
        clearInterval(heroSliderInterval);
    }
    heroSliderInterval = setInterval(nextSlide, 3000);
}

// Add debounce function if not already present
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

// Initialize Supabase immediately when the script loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Document loaded, initializing Supabase...');
    initializeSupabase();
    loadProducts(); // Load products immediately after initialization
});

// Enhanced responsive handling
function handleResponsive() {
    const header = document.querySelector('header');
    const navLinks = document.getElementById('links');
    const menuToggle = document.getElementById('menu-toggle');
    const closeMenu = document.querySelector('.close_menu');
    const allLinks = document.querySelectorAll('.links a');
    const isRTL = document.documentElement.dir === 'rtl';

    // Header scroll effect with throttle
    let lastScrollPosition = 0;
    let ticking = false;

    window.addEventListener('scroll', () => {
        lastScrollPosition = window.scrollY;

        if (!ticking) {
            window.requestAnimationFrame(() => {
                if (lastScrollPosition >= 50) {
                    header.classList.add('active');
                } else {
                    header.classList.remove('active');
                }
                ticking = false;
            });

            ticking = true;
        }
    });

    // Mobile menu functionality with improved animations
    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event from bubbling up

            // Handle RTL direction for mobile menu
            if (isRTL) {
                navLinks.style.right = '0';
            } else {
                navLinks.style.left = '0';
            }

            navLinks.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        });
    }

    if (closeMenu) {
        closeMenu.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event from bubbling up

            // Handle RTL direction for mobile menu
            if (isRTL) {
                navLinks.style.right = '-100%';
            } else {
                navLinks.style.left = '-100%';
            }

            navLinks.classList.remove('active');
            document.body.style.overflow = ''; // Restore scrolling
        });
    }

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (navLinks.classList.contains('active') &&
            !navLinks.contains(e.target) &&
            !menuToggle.contains(e.target)) {

            // Handle RTL direction for mobile menu
            if (isRTL) {
                navLinks.style.right = '-100%';
            } else {
                navLinks.style.left = '-100%';
            }

            navLinks.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Close menu when clicking a link with smooth scroll
    allLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (navLinks.classList.contains('active')) {
                // Handle RTL direction for mobile menu
                if (isRTL) {
                    navLinks.style.right = '-100%';
                } else {
                    navLinks.style.left = '-100%';
                }

                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            }

            // Smooth scroll to section
            const targetId = link.getAttribute('href');
            if (targetId && targetId !== '#') {
                e.preventDefault();
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    const headerHeight = header.offsetHeight;
                    const targetPosition = targetElement.offsetTop - headerHeight;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.innerWidth > 992 && navLinks.classList.contains('active')) {
                // Reset styles when viewport becomes larger
                navLinks.style.left = '';
                navLinks.style.right = '';
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            }
            updateProductGrid();

            // Check if RTL and apply appropriate styles
            if (document.documentElement.dir === 'rtl') {
                if (window.adjustRTLStyles) {
                    window.adjustRTLStyles();
                }
            }
        }, 250);
    });

    // Fix for mobile menu toggle button
    if (menuToggle) {
        menuToggle.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent default touch behavior
            menuToggle.click(); // Trigger the click event
        });
    }

    // Add swipe to close menu for better mobile UX
    if (navLinks) {
        let touchStartX = 0;
        let touchEndX = 0;

        navLinks.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, false);

        navLinks.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const isRTL = document.documentElement.dir === 'rtl';

            // Calculate swipe distance and direction
            const swipeDistance = Math.abs(touchEndX - touchStartX);
            const swipeDirection = touchEndX - touchStartX;

            // Close menu on swipe (left for LTR, right for RTL)
            if (swipeDistance > 70) {
                if ((!isRTL && swipeDirection < 0) || (isRTL && swipeDirection > 0)) {
                    if (isRTL) {
                        navLinks.style.right = '-100%';
                    } else {
                        navLinks.style.left = '-100%';
                    }
                    navLinks.classList.remove('active');
                    document.body.style.overflow = '';
                }
            }
        }, false);
    }
}

// Update product grid layout based on screen size
function updateProductGrid() {
    const productCards = document.getElementById('productCards');
    if (!productCards) return;

    const width = window.innerWidth;
    let columns;

    if (width >= 1200) columns = 4;
    else if (width >= 992) columns = 3;
    else if (width >= 768) columns = 2;
    else columns = 1;

    // Update products per page based on grid
    if (width <= 768) {
        productsPerPage = 7; // Show 5 products in mobile view
    } else {
        productsPerPage = columns * 3; // Keep 3 products per column for larger screens
    }

    // Adjust grid gap for better mobile display
    if (width <= 576) {
        productCards.style.gap = '15px';
    } else if (width <= 768) {
        productCards.style.gap = '20px';
    } else {
        productCards.style.gap = '30px';
    }

    // No page reset - just reload products with current page
    loadProducts();
}

// Enhanced animation on scroll with Intersection Observer
function setupScrollAnimations() {
    const animatedElements = document.querySelectorAll('.project_box, .feature-card, .product-card');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target); // Stop observing once animated
            }
        });
    }, {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'all 0.6s cubic-bezier(0.165, 0.84, 0.44, 1)';
        observer.observe(element);
    });

    // Add touch swipe detection for product navigation on mobile
    if (window.innerWidth <= 768) {
        const productSection = document.querySelector('.featured-products');
        if (productSection) {
            let touchStartX = 0;
            let touchEndX = 0;

            productSection.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            }, false);

            productSection.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                handleSwipe();
            }, false);

            function handleSwipe() {
                const swipeThreshold = 50; // Minimum distance for swipe
                if (touchEndX + swipeThreshold < touchStartX) {
                    // Swipe left - go to next page
                    changePage(currentPage + 1);
                }
                if (touchEndX > touchStartX + swipeThreshold) {
                    // Swipe right - go to previous page
                    changePage(currentPage - 1);
                }
            }
        }
    }
}

function initializeSupabase() {
    console.log('Initializing Supabase client...');

    try {
        // Create Supabase client using the imported supabase object
        supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
        console.log('Supabase client initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        // Show error message to user
        const productCards = document.getElementById('productCards');
        if (productCards) {
            productCards.innerHTML = `
                <div class="error-message">
                    <p>Failed to connect to the database. Please try refreshing the page.</p>
                    <p>Error: ${error.message}</p>
                </div>
            `;
        }
        return false;
    }
}
