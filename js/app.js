const cart = new Map();
let globalMultiplier = 0;

function getMultiplier(product) {
  return product.multiplier ?? globalMultiplier;
}

function calcFinalPrice(price, multiplier = 0) {
  return price - price * multiplier;
}

function formatPrice(value) {
  return Math.round(value).toLocaleString("uk-UA");
}

function getQuantity(productId) {
  return cart.get(productId) || 0;
}

function setQuantity(productId, quantity) {
  if (quantity <= 0) {
    cart.delete(productId);
  } else {
    cart.set(productId, quantity);
  }
  renderCart();
  updateProductQuantity(productId);
}

function updateProductQuantity(productId) {
  const el = document.querySelector(`[data-product-id="${productId}"] .quantity`);
  if (el) {
    el.textContent = getQuantity(productId);
  }
}

function renderProductCard(product) {
  const finalPrice = calcFinalPrice(product.price, getMultiplier(product));
  const qty = getQuantity(product.id);

  return `
    <article class="product-card" data-product-id="${product.id}">
      <div class="product-info">
        <h3 class="product-name">${escapeHtml(product.name)}</h3>
        <p class="product-price">${formatPrice(finalPrice)}</p>
      </div>
      <div class="product-controls">
        <button type="button" class="btn btn-minus" aria-label="Зменшити кількість">−</button>
        <span class="quantity">${qty}</span>
        <button type="button" class="btn btn-plus" aria-label="Збільшити кількість">+</button>
      </div>
    </article>
  `;
}

function groupByCategory(products) {
  const groups = new Map();

  for (const product of products) {
    const category = product.category || "Інше";
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category).push(product);
  }

  return groups;
}

function renderProducts(products) {
  const container = document.getElementById("products-list");

  if (products.length === 0) {
    container.innerHTML = '<p class="cart-empty">Товарів немає</p>';
    return;
  }

  const groups = groupByCategory(products);

  container.innerHTML = [...groups.entries()]
    .map(([category, items]) => `
      <section class="category-group">
        <h3 class="category-title">${escapeHtml(category)}</h3>
        <div class="category-items">
          ${items.map(renderProductCard).join("")}
        </div>
      </section>
    `)
    .join("");

  container.querySelectorAll(".product-card").forEach((card) => {
    const productId = card.dataset.productId;

    card.querySelector(".btn-plus").addEventListener("click", () => {
      setQuantity(productId, getQuantity(productId) + 1);
    });

    card.querySelector(".btn-minus").addEventListener("click", () => {
      setQuantity(productId, getQuantity(productId) - 1);
    });
  });
}

function renderCart() {
  const itemsEl = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");

  if (cart.size === 0) {
    itemsEl.innerHTML = '<p class="cart-empty">Кошик порожній</p>';
    totalEl.textContent = "0";
    return;
  }

  let total = 0;
  const lines = [];

  for (const [productId, quantity] of cart) {
    const product = productsById.get(productId);
    if (!product) continue;

    const unitPrice = calcFinalPrice(product.price, getMultiplier(product));
    const lineTotal = unitPrice * quantity;
    total += lineTotal;

    lines.push(`
      <div class="cart-line">
        <span class="cart-line-name">${escapeHtml(product.name)}</span>
        <span class="cart-line-qty">× ${quantity}</span>
        <span class="cart-line-price">${formatPrice(lineTotal)}</span>
      </div>
    `);
  }

  itemsEl.innerHTML = lines.join("");
  totalEl.textContent = formatPrice(total);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

let productsById = new Map();

async function init() {
  const container = document.getElementById("products-list");

  try {
    const response = await fetch("products.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    let products;
    if (Array.isArray(data)) {
      products = data;
    } else if (Array.isArray(data.products)) {
      globalMultiplier = data.multiplier ?? 0;
      products = data.products;
    } else {
      throw new Error("products.json має бути масивом або об'єктом з полем products");
    }

    productsById = new Map(products.map((p) => [p.id, p]));
    renderProducts(products);
    renderCart();
  } catch (err) {
    container.innerHTML = `<p class="error">Не вдалося завантажити товари: ${escapeHtml(err.message)}</p>`;
  }
}

init();
