// Mock Product Data
const products = [
    {
        id: 1,
        title: "Aura Pro Max Headphones",
        category: "Audio",
        price: 299.99,
        image: "assets/premium_headphones_1776436172663.png",
        description: "Premium over-ear wireless headphones."
    },
    {
        id: 2,
        title: "Nexus Series 8 Smartwatch",
        category: "Wearables",
        price: 349.50,
        image: "assets/smartwatch_1776436192229.png",
        description: "Luxury modern smartwatch with a dark metal band."
    },
    {
        id: 3,
        title: "Chroma MK-1 Keyboard",
        category: "Peripherals",
        price: 189.99,
        image: "assets/mechanical_keyboard_1776436212758.png",
        description: "Premium mechanical keyboard with vibrant RGB."
    }
];

// State
let cart = [];

// DOM Elements
const productGrid = document.getElementById('productGrid');
const cartBtn = document.getElementById('cartBtn');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const cartItemsContainer = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartTotalValue = document.getElementById('cartTotalValue');

// Initialize
function init() {
    renderProducts();
    loadCart();
    attachEventListeners();
}

// Render Products to DOM
function renderProducts() {
    productGrid.innerHTML = '';
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-img-wrapper">
                <img src="${product.image}" alt="${product.title}">
            </div>
            <div class="product-info">
                <span class="product-category">${product.category}</span>
                <h3 class="product-title">${product.title}</h3>
                <div class="product-price">$${product.price.toFixed(2)}</div>
                <button class="btn-add" onclick="addToCart(${product.id})">
                    <i class="ph ph-shopping-cart-simple"></i> Add to Cart
                </button>
            </div>
        `;
        productGrid.appendChild(card);
    });
}

// Cart Functionality
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    saveCart();
    updateCartUI();
    openCart();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
            updateCartUI();
        }
    }
}

// Update Cart UI
function updateCartUI() {
    // Update count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;

    // Update total
    const totalValue = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotalValue.textContent = `$${totalValue.toFixed(2)}`;

    // Render items
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-msg">Your cart is empty.</p>';
        return;
    }

    cart.forEach(item => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-img">
                <img src="${item.image}" alt="${item.title}">
            </div>
            <div class="cart-item-info">
                <h4 class="cart-item-title">${item.title}</h4>
                <div class="cart-item-price">$${item.price.toFixed(2)}</div>
            </div>
            <div class="cart-item-actions">
                <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                <button class="btn-remove" onclick="removeFromCart(${item.id})">
                    <i class="ph ph-trash"></i>
                </button>
            </div>
        `;
        cartItemsContainer.appendChild(cartItem);
    });
}

// Save/Load Cart from Local Storage
function saveCart() {
    localStorage.setItem('nexusCart', JSON.stringify(cart));
}

function loadCart() {
    const savedCart = localStorage.getItem('nexusCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartUI();
    }
}

// Sidebar Toggles
function openCart() {
    cartSidebar.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeCart() {
    cartSidebar.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Event Listeners
function attachEventListeners() {
    cartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openCart();
    });
    
    closeCartBtn.addEventListener('click', closeCart);
    
    cartOverlay.addEventListener('click', closeCart);

    // Sticky Header effect
    window.addEventListener('scroll', () => {
        const header = document.getElementById('header');
        if (window.scrollY > 50) {
            header.style.padding = '0';
            header.style.background = 'rgba(11, 15, 25, 0.9)';
        } else {
            header.style.padding = '0.5rem 0';
            header.style.background = 'rgba(11, 15, 25, 0.7)';
        }
    });
}

// Start app
init();
