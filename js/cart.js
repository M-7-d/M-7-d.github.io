/**
 * Product Details Page Logic
 * Handles Supabase fetching, image gallery, and UI rendering.
 */

// Supabase Configuration
const supabaseUrl = 'https://uvrozprcewgwybuhguai.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2cm96cHJjZXdnd3lidWhndWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3NTI1MTAsImV4cCI6MjA1ODMyODUxMH0.2EgqTZjwcOv_kKP38g9nsou1ECsR_ybnAaGZduXWlaQ';
let supabase;

// State
let currentProduct = null;
let currentImageIndex = 0;

/**
 * Initialize Supabase Client
 */
function initSupabase() {
    try {
        if (window.supabase) {
            supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
            return true;
        }
    } catch (error) {
        console.error('Supabase Initialization Error:', error);
    }
    return false;
}

/**
 * Get Product ID from URL parameters
 */
function getProductId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

/**
 * Fetch Product from Database
 */
async function fetchProduct(id) {
    if (!id) return null;

    try {
        if (!supabase && !initSupabase()) return null;

        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching product:', error);
        return null;
    }
}

/**
 * Render Product Details to the DOM
 */
function renderProduct(product) {
    const container = document.getElementById('productDetails');
    const breadcrumbName = document.getElementById('breadcrumb-product-name');

    if (!product) {
        container.innerHTML = `
            <div class="error-container" data-aos="fade-up">
                <i class="fas fa-exclamation-circle"></i>
                <h2>Product Not Found</h2>
                <p>The product you are looking for does not exist or has been removed.</p>
                <a href="index.html" class="back-action">Back to Home</a>
            </div>`;
        return;
    }

    currentProduct = product;
    breadcrumbName.textContent = product.name;
    document.title = `${product.name} - STONES COMPANY`;

    const images = product.image_urls || [];
    const mainImage = images[0] || 'img/placeholder.png';
    const specs = product.specifications || [];

    container.innerHTML = `
        <div class="product-gallery" data-aos="fade-right">
            <div class="main-image-placeholder">
                <img src="${mainImage}" id="main-product-img" alt="${product.name}">
            </div>
            ${images.length > 1 ? `
                <div class="thumbnails-gallery">
                    ${images.map((img, idx) => `
                        <div class="thumb-item ${idx === 0 ? 'active' : ''}" onclick="setMainImage(${idx})">
                            <img src="${img}" alt="Thumbnail ${idx + 1}">
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>

        <div class="product-info-details" data-aos="fade-left">
            <span class="detail-category">${product.category || 'Machinery'}</span>
            <h1 class="detail-title">${product.name}</h1>
            <p class="detail-description">${product.description || 'No description available for this product.'}</p>

            ${specs.length > 0 ? `
                <div class="spec-container">
                    <h4><i class="fas fa-list-ul"></i> Specifications</h4>
                    <div class="spec-list">
                        ${specs.map(spec => `
                            <div class="spec-row">
                                <span class="spec-label">${spec.name}</span>
                                <span class="spec-value">${spec.value}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="product-action-box">
                <a href="https://wa.me/+905301288498?text=${encodeURIComponent('Hi, I\'m interested in: ' + product.name)}" 
                   target="_blank" class="whatsapp-action">
                    <i class="fab fa-whatsapp"></i>
                    <span>Contact via WhatsApp</span>
                </a>
                <a href="index.html#featured-products" class="back-action">
                    <i class="fas fa-arrow-left"></i>
                    <span>Back to Products</span>
                </a>
            </div>
        </div>
    `;

    // Re-init AOS for new content
    if (window.AOS) AOS.refresh();
}

/**
 * Change main image from gallery
 */
window.setMainImage = function (index) {
    if (!currentProduct || !currentProduct.image_urls[index]) return;

    const mainImg = document.getElementById('main-product-img');
    const thumbs = document.querySelectorAll('.thumb-item');

    // Animate transition
    mainImg.style.opacity = '0';

    setTimeout(() => {
        mainImg.src = currentProduct.image_urls[index];
        mainImg.style.opacity = '1';

        // Update active thumbnail
        thumbs.forEach((t, i) => {
            t.classList.toggle('active', i === index);
        });
    }, 300);
};

/**
 * Initialize Page
 */
async function initPage() {
    const id = getProductId();
    if (!id) {
        renderProduct(null);
        return;
    }

    const product = await fetchProduct(id);
    renderProduct(product);
}

// Start
document.addEventListener('DOMContentLoaded', initPage);