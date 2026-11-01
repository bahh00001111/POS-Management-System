import { useState, useEffect, useMemo } from 'react';
import axiosClient from '../api/axiosClient';
import { useToast } from '../context/useToast';
import { toArray } from '../utils/apiUtils';
import KhqrPaymentModal from '../components/KhqrPaymentModal';
import { ShoppingBag, Plus, Minus, Trash2, CreditCard, Search, X, Printer, LayoutGrid, Coffee, CupSoda, Soup, Sandwich, Bean, IceCreamCone, CakeSlice, Tag, UtensilsCrossed, Package, Bike, BadgePercent, Store, Smartphone, User, Phone, MapPin, Hash, Wallet, Banknote, QrCode, Loader2 } from 'lucide-react';

const STORAGE_BASE = `${new URL(axiosClient.defaults.baseURL).origin}/storage/`;

const CATEGORY_ICONS = {
  Coffee: Coffee,
  Espresso: Coffee,
  Latte: Coffee,
  Tea: CupSoda,
  'Cold Brew': CupSoda,
  Smoothie: CupSoda,
  Juice: CupSoda,
  Bakery: CakeSlice,
  Cake: CakeSlice,
  Dessert: IceCreamCone,
  Snack: Sandwich,
  Sandwich: Sandwich,
  Bean: Bean,
  Soup: Soup,
};

const NO_SUGAR_CATEGORIES = new Set([
  'pastries',
  'sandwiches',
  'breakfast',
  'snacks',
  'desserts',
  'specials',
  'water',
]);

const ORDER_TYPES = [
  { key: 'DINE_IN', label: 'Dine-in', icon: UtensilsCrossed },
  { key: 'TAKEAWAY', label: 'Takeaway', icon: Package },
  { key: 'DELIVERY', label: 'Delivery', icon: Bike },
];

const PAYMENT_METHODS = [
  { key: 'CASH', label: 'Cash', icon: Banknote, desc: 'Pay with cash' },
  { key: 'CARD', label: 'Card', icon: CreditCard, desc: 'Credit / Debit card' },
  { key: 'KHQR', label: 'Mobile / KHQR', icon: QrCode, desc: 'Bakong / KHQR scan' },
];

const getProductCategoryName = (product) => {
  return (
    product?.category?.category_name ||
    product?.category?.name ||
    product?.category_name ||
    ''
  );
};

const isNoSugarProduct = (product) => {
  const categoryName = getProductCategoryName(product).toLowerCase();
  const productName = (product?.product_name || product?.name || '').toLowerCase();
  return NO_SUGAR_CATEGORIES.has(categoryName) || productName.includes('water');
};

export default function PosTerminal() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  // Selection & Cart States
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  // Order Type & Discount State
  const [orderType, setOrderType] = useState('DINE_IN');
  const [discount, setDiscount] = useState({
    active: false,
    type: 'PERCENT', // 'PERCENT' | 'FIXED'
    value: '',
  });

  // Delivery Details State
  const [delivery, setDelivery] = useState({
    method: 'IN_HOUSE', // 'IN_HOUSE' | 'THIRD_PARTY'
    customerName: '',
    phoneNumber: '',
    deliveryAddress: '',
    deliveryFee: '',
    platform: 'Foodpanda',
    externalOrderId: '',
  });

  // Product Selection Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sugarLevel, setSugarLevel] = useState('50%');
  const [size, setSize] = useState('Medium');
  const [itemQty, setItemQty] = useState(1);
  const [remarks, setRemarks] = useState('');

  // Receipt Modal State
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(4000);
  const [settings, setSettings] = useState({});

  // Payment Modal State
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountCurrency, setAmountCurrency] = useState('USD'); // 'USD' | 'KHR'
  const [amountReceived, setAmountReceived] = useState('');

  // Cart drawer state (mobile / tablet only, < lg)
  const [cartOpen, setCartOpen] = useState(false);

  // KHQR State (Option 1: order-first flow)
  const [kqOrder, setKqOrder] = useState(null);
  const [khqrCurrency, setKhqrCurrency] = useState('KHR'); // 'USD' | 'KHR' (cashier selects before generating QR)

  // តម្លៃ Settings ដែលបានកាត់ថ្លៃសម្រាប់វិក្កយបត្រ
  const receiptSettings = useMemo(
    () => ({
      storeName: (settings?.store_name || '').trim() || 'COFFEE POS',
      storeAddress: (settings?.store_address || '').trim(),
      storePhone: (settings?.store_phone || '').trim(),
      receiptFooter: (settings?.receipt_footer_text || '').trim(),
      rate: Number(settings?.exchange_rate) > 0 ? Number(settings.exchange_rate) : exchangeRate,
    }),
    [settings, exchangeRate]
  );

  // គណនាតម្លៃផ្អែកលើ Size
  const calculateUnitPrice = (basePrice, selectedSize) => {
    const price = parseFloat(basePrice || 0);
    if (selectedSize === 'Small') return Math.max(0, price - 0.20);
    if (selectedSize === 'Large') return price + 0.50;
    return price;
  };

  // ១. Fetch Products, Categories & Settings
  const fetchData = async () => {
    try {
      const [prodRes, catRes, setRes] = await Promise.allSettled([
        axiosClient.get('/products'),
        axiosClient.get('/categories'),
        axiosClient.get('/settings')
      ]);

      const loadedProducts = prodRes.status === 'fulfilled' ? toArray(prodRes.value.data) : [];
      const loadedCategories = catRes.status === 'fulfilled' ? toArray(catRes.value.data) : [];
      const loadedRate =
        setRes.status === 'fulfilled'
          ? parseFloat(setRes.value.data?.data?.exchange_rate) || 4000
          : 4000;

      setProducts(loadedProducts);
      setCategories(loadedCategories);
      setExchangeRate(loadedRate);
    } catch (err) {
      console.error('Error loading POS data:', err);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchData();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ៤. ទាញ Settings ឡើងវិញពេលបើកវិក្កយបត្រ
  useEffect(() => {
    if (!showReceipt) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await axiosClient.get('/settings');
        if (!cancelled) setSettings(res.data?.data || {});
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showReceipt]);

  // ២. Open Product Modal
  const openProductModal = (product) => {
    const stock = Number(product.stock || 0);
    if (stock <= 0) {
      toast.error('This product is out of stock', 'Out of Stock');
      return;
    }
    setSelectedProduct(product);
    setSugarLevel('50%');
    setSize('Medium');
    setItemQty(1);
    setRemarks('');
  };

  // ចំនួនសរុបក្នុង Cart នៃ Product មួយ (ដើម្បីគណនាចំនួនស្តុកនៅសល់) — O(1) lookup map
  const cartQtyMap = useMemo(() => {
    const map = {};
    cart.forEach((i) => {
      map[i.product_id] = (map[i.product_id] || 0) + i.quantity;
    });
    return map;
  }, [cart]);

  const totalCartQtyFor = (prodId) => cartQtyMap[prodId] || 0;

  // ចំនួនស្តុកដែលនៅសល់សម្រាប់យកទៅដាក់ក្នុង Cart (ស្តុក DB ដកអ្វីដែលក្នុង Cart)
  const availableStockFor = (prod) =>
    Math.max(0, Number(prod?.stock || 0) - totalCartQtyFor(prod?.product_id || prod?.id));

  // ៣. Add Item to Cart
  const handleAddToCart = () => {
    if (!selectedProduct) return;

    const prodId = selectedProduct.product_id || selectedProduct.id;
    const available = availableStockFor(selectedProduct);
    if (available <= 0) {
      toast.error('This product is out of stock', 'Out of Stock');
      return;
    }

    const qty = Math.min(itemQty, available);
    const finalUnitPrice = calculateUnitPrice(selectedProduct.price, size);
    const noSugar = isNoSugarProduct(selectedProduct);

    const cartItem = {
      ...selectedProduct,
      cartItemId: `${prodId}-${sugarLevel}-${size}-${Date.now()}`,
      product_id: prodId,
      sugar_level: noSugar ? null : sugarLevel,
      size: size,
      quantity: qty,
      remarks: remarks,
      price: finalUnitPrice,
    };

    if (qty < itemQty) {
      toast.info(`Cart filled to available stock (${available} left)`, 'Stock Limit');
    }

    setCart((prevCart) => [...prevCart, cartItem]);
    setSelectedProduct(null);
  };

  const updateQuantity = (cartItemId, delta) => {
    setCart((prevCart) => {
      const target = prevCart.find((item) => item.cartItemId === cartItemId);
      if (!target) return prevCart;

      const prodId = target.product_id;
      const stock = Number(target.stock || 0);
      const otherQty = prevCart
        .filter((i) => i.cartItemId !== cartItemId && i.product_id === prodId)
        .reduce((n, i) => n + i.quantity, 0);

      const newQty = target.quantity + delta;

      if (newQty <= 0) {
        return prevCart.filter((item) => item.cartItemId !== cartItemId);
      }

      if (stock > 0 && newQty > stock - otherQty) {
        const remaining = Math.max(0, stock - otherQty);
        toast.info(`Only ${remaining} left in stock for this product`, 'Stock Limit');
        if (remaining <= 0) return prevCart;
        return prevCart.map((item) =>
          item.cartItemId === cartItemId ? { ...item, quantity: remaining } : item
        );
      }

      return prevCart.map((item) =>
        item.cartItemId === cartItemId ? { ...item, quantity: newQty } : item
      );
    });
  };

  const removeFromCart = (cartItemId) => {
    setCart((prevCart) => prevCart.filter((item) => item.cartItemId !== cartItemId));
  };

  // ៤. Calculations
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const discountAmount = useMemo(() => {
    if (!discount.active) return 0;
    const value = parseFloat(discount.value);
    if (!Number.isFinite(value) || value <= 0) return 0;
    return discount.type === 'PERCENT'
      ? Math.min(subtotal * (value / 100), subtotal)
      : Math.min(value, subtotal);
  }, [discount.active, discount.type, discount.value, subtotal]);

  const deliveryFee = useMemo(
    () =>
      orderType === 'DELIVERY' && delivery.method === 'IN_HOUSE'
        ? Math.max(0, parseFloat(delivery.deliveryFee) || 0)
        : 0,
    [orderType, delivery.method, delivery.deliveryFee]
  );

  const finalTotal = useMemo(
    () => Math.max(0, subtotal + deliveryFee - discountAmount),
    [subtotal, deliveryFee, discountAmount]
  );

  // ៥. Open Payment Modal (do NOT submit the order yet)
  const openPaymentModal = () => {
    if (cart.length === 0 || loading) return;
    setCartOpen(false);
    setPaymentMethod('CASH');
    setAmountCurrency('USD');
    setAmountReceived('');
    setKqOrder(null);
    setKhqrCurrency((settings?.merchant_currency || 'KHR').toUpperCase() === 'KHR' ? 'KHR' : 'USD');
    setShowPayment(true);
  };

  // Show the receipt for a successfully paid order
  const showReceiptForOrder = (order) => {
    // ធ្វើបច្ចុប្បន្នភាពស្តុកពីចម្លើយរបស់ Server តែម្តង (ជំនួសឲ្យការទាញយក Catalog ទាំងមូលវិញ)
    const stockMap = order?.updated_stock;
    if (stockMap) {
      setProducts((prev) =>
        Array.isArray(prev)
          ? prev.map((prod) => {
              const prodId = prod.product_id || prod.id;
              if (stockMap[prodId] == null) return prod;
              return { ...prod, stock: stockMap[prodId] };
            })
          : prev
      );
    }

    setCompletedOrder({
      queueNumber: order?.queue_number || `#${String(order?.order_id || order?.id || 8).padStart(2, '0')}`,
      orderType: ORDER_TYPES.find((t) => t.key === orderType)?.label || orderType,
      paymentLabel: PAYMENT_METHODS.find((m) => m.key === paymentMethod)?.label || paymentMethod,
      items: cart.map((item) => ({
        name: item.product_name || item.name,
        categoryName: item.category?.category_name || item.category?.name || 'Coffee',
        qty: item.quantity,
        price: item.price,
        sugar: item.sugar_level,
        size: item.size,
        remarks: item.remarks,
      })),
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      deliveryInfo:
        orderType === 'DELIVERY'
          ? delivery.method === 'IN_HOUSE'
            ? {
                method: 'In-House',
                customerName: delivery.customerName,
                phoneNumber: delivery.phoneNumber,
                address: delivery.deliveryAddress,
              }
            : {
                method: 'Third-Party App',
                platform: delivery.platform,
                orderId: delivery.externalOrderId,
              }
          : null,
      discountAmount: discountAmount,
      total: finalTotal,
      date: new Date().toLocaleString(),
    });

    setShowReceipt(true);
    setCart([]);
    setDiscount({ active: false, type: 'PERCENT', value: '' });
    setDelivery({
      method: 'IN_HOUSE',
      customerName: '',
      phoneNumber: '',
      deliveryAddress: '',
      deliveryFee: '',
      platform: 'Foodpanda',
      externalOrderId: '',
    });
    setSelectedCategory('ALL');
    window.dispatchEvent(new CustomEvent('pos-stock-alert'));
  };

  // KHQR payment confirmed: server marked the order PAID, show the receipt
  const handleKqPaid = () => {
    if (!kqOrder) return;
    showReceiptForOrder(kqOrder);
    setKqOrder(null);
  };

  // ៦. Confirm Payment + Submit Order
  const handleConfirmPayment = async () => {
    if (cart.length === 0 || loading) return;

    const rawReceived = parseFloat(amountReceived) || 0;
    const received = amountCurrency === 'KHR' ? rawReceived / receiptSettings.rate : rawReceived;
    if (paymentMethod === 'CASH' && received < finalTotal) {
      alert(`Amount received must be at least $${finalTotal.toFixed(2)}.`);
      return;
    }

    const payload = {
      order_type: orderType,
      payment_method: paymentMethod,
      payment_status: paymentMethod === 'KHQR' ? 'UNPAID' : 'PAID',
      amount_received: paymentMethod === 'CASH' ? received : null,
      change_due: paymentMethod === 'CASH' ? Math.max(0, received - finalTotal) : null,
      subtotal: subtotal,
      discount_type: discount.active ? discount.type : null,
      discount_value: discount.active ? (parseFloat(discount.value) || 0) : null,
      discount_amount: discountAmount,
      delivery_fee: deliveryFee,
      delivery_method: orderType === 'DELIVERY' ? delivery.method : null,
      customer_name: orderType === 'DELIVERY' && delivery.method === 'IN_HOUSE' ? delivery.customerName || null : null,
      phone_number: orderType === 'DELIVERY' && delivery.method === 'IN_HOUSE' ? delivery.phoneNumber || null : null,
      delivery_address:
        orderType === 'DELIVERY' && delivery.method === 'IN_HOUSE' ? delivery.deliveryAddress || null : null,
      delivery_platform:
        orderType === 'DELIVERY' && delivery.method === 'THIRD_PARTY' ? delivery.platform : null,
      external_order_id:
        orderType === 'DELIVERY' && delivery.method === 'THIRD_PARTY'
          ? delivery.externalOrderId || null
          : null,
      total_amount: finalTotal,
      items: cart.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        sugar_level: item.sugar_level,
        size: item.size,
        price: item.price,
        remarks: item.remarks,
      })),
    };

    setLoading(true);
    setShowPayment(false);

    try {
      const res = await axiosClient.post('/orders', payload);
      const newOrder = res.data?.data || res.data;

      // KHQR: keep the cart and open the payment modal to scan the QR.
      // The order is UNPAID until the payment is confirmed.
      if (paymentMethod === 'KHQR') {
        setKqOrder(newOrder);
      } else {
        showReceiptForOrder(newOrder);
      }
    } catch (err) {
      console.error('Checkout error:', err.response?.data);
      setShowPayment(true);
      alert(`Error: ${err.response?.data?.message || 'Failed to place order.'}`);
    } finally {
      setLoading(false);
    }
  };

  // Defensive normalizer: guard against any stale non-array value in state so
  // .filter() below can never be called on an object.
  const productList = Array.isArray(products) ? products : toArray(products);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return productList.filter((prod) => {
      const matchesCategory =
        selectedCategory === 'ALL' ||
        String(prod.category_id) === String(selectedCategory) ||
        String(prod.category?.category_id || prod.category?.id) === String(selectedCategory);

      const prodName = prod.product_name || prod.name || '';
      return matchesCategory && prodName.toLowerCase().includes(q);
    });
  }, [productList, selectedCategory, searchQuery]);

  const currentModalPrice = selectedProduct
    ? calculateUnitPrice(selectedProduct.price, size)
    : 0;

  const hideSugar = selectedProduct ? isNoSugarProduct(selectedProduct) : false;

  // Payment Modal derived values (dual currency)
  const receivedUSD =
    amountCurrency === 'KHR'
      ? (parseFloat(amountReceived) || 0) / receiptSettings.rate
      : (parseFloat(amountReceived) || 0);
  const changeDueUSD = Math.max(0, receivedUSD - finalTotal);
  const changeDueKHR = changeDueUSD * receiptSettings.rate;
  const cashValid =
    paymentMethod !== 'CASH' || (amountReceived !== '' && receivedUSD >= finalTotal - 0.001);
  const quickCashAmounts = useMemo(() => {
    const exact = finalTotal.toFixed(2);
    return [
      { label: 'Exact', value: exact },
      { label: `$${Math.ceil(finalTotal)}`, value: Math.ceil(finalTotal).toFixed(2) },
      { label: `$${Math.ceil(finalTotal / 5) * 5}`, value: (Math.ceil(finalTotal / 5) * 5).toFixed(2) },
      { label: `$${Math.ceil(finalTotal / 10) * 10}`, value: (Math.ceil(finalTotal / 10) * 10).toFixed(2) },
    ];
  }, [finalTotal]);
  const quickKHRAmounts = useMemo(() => {
    const minKHR = Math.ceil((finalTotal * receiptSettings.rate) / 1000) * 1000;
    return [
      { label: '10,000៛', value: '10000' },
      { label: '20,000៛', value: '20000' },
      { label: '50,000៛', value: '50000' },
      { label: '100,000៛', value: '100000' },
      { label: `${minKHR.toLocaleString()}៛`, value: String(minKHR) },
    ];
  }, [finalTotal, receiptSettings.rate]);

  // KHQR amount depends on the cashier-selected currency
  // USD  → raw USD total; KHR → total converted via the exchange rate
  const khqrAmount =
    khqrCurrency === 'KHR'
      ? Math.max(0, Math.round(finalTotal * receiptSettings.rate))
      : finalTotal;

  return (
    <div className="flex h-full bg-stone-100 overflow-hidden relative">
      {/* ផ្នែកខាងឆ្វេង៖ Main Menu Layout */}
      <div className="flex-1 min-w-0 flex flex-col h-full p-3 sm:p-4 lg:p-6 overflow-hidden gap-3 lg:gap-4 pb-16 lg:pb-6">
        
        {/* ១. Search Input (shrink-0 ការពារកុំឱ្យរួមទំហំ) */}
        <div className="shrink-0">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-3 text-stone-400" size={18} />
            <input
              type="text"
              placeholder="Search coffee or menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500 shadow-sm"
            />
          </div>
        </div>

        {/* ២. Categories Bar (shrink-0 និង Scroll ដាច់ដោយឡែក) */}
        <div className="shrink-0 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
              selectedCategory === 'ALL' ? 'bg-coffee-600 text-white shadow-sm' : 'bg-white text-stone-600 hover:bg-stone-50'
            }`}
          >
            <LayoutGrid size={16} /> All Items
          </button>
          {categories.map((cat) => {
            const catId = cat.category_id || cat.id;
            const catName = cat.category_name?.toLowerCase() || cat.name?.toLowerCase() || '';
            const Icon = CATEGORY_ICONS[cat.category_name || cat.name]
              || Object.entries(CATEGORY_ICONS).find(([key]) => catName.includes(key.toLowerCase()))?.[1]
              || Tag;
            return (
              <button
                key={catId}
                onClick={() => setSelectedCategory(catId)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
                  selectedCategory === catId ? 'bg-coffee-600 text-white shadow-sm' : 'bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Icon size={16} /> {cat.category_name || cat.name}
              </button>
            );
          })}
        </div>

        {/* ៣. Products Grid (flex-1 overflow-y-auto សម្រាប់ Scroll តែផ្នែក Card ប៉ុណ្ណោះ) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 pr-1">
          {filteredProducts.map((prod) => {
            const prodStock = Number(prod.stock || 0);
            const outOfStock = prodStock <= 0;
            return (
              <div
                key={prod.product_id || prod.id}
                onClick={() => !outOfStock && openProductModal(prod)}
                className={`relative bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-stone-100 transition flex flex-col justify-between h-fit ${
                  outOfStock
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:shadow-md cursor-pointer'
                }`}
              >
                <img
                  src={prod.image ? `${STORAGE_BASE}${prod.image}` : 'https://placehold.co/150?text=Coffee'}
                  alt={prod.product_name}
                  className="w-full h-24 sm:h-32 object-cover rounded-xl mb-3"
                />
                <div>
                  <h3 className="font-semibold text-stone-800 line-clamp-1">{prod.product_name || prod.name}</h3>
                  <p className="text-coffee-600 font-bold mt-1">${parseFloat(prod.price || 0).toFixed(2)}</p>
                </div>
                {prodStock <= 5 ? (
                  <span
                    className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset ${
                      outOfStock
                        ? 'bg-red-50 text-red-600 ring-red-600/20'
                        : 'bg-amber-50 text-amber-600 ring-amber-600/20'
                    }`}
                  >
                    {outOfStock ? 'Out of stock' : `${prodStock} left`}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart Summary Panel — persistent on desktop (lg+), slide-in drawer on mobile/tablet */}
      <div
        className={`bg-white border-l border-stone-200 flex flex-col shadow-lg h-full overflow-hidden fixed inset-y-0 right-0 z-40 w-[min(100vw,26rem)] transition-transform duration-300 ease-in-out lg:static lg:inset-auto lg:z-auto lg:w-96 lg:translate-x-0 ${
          cartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-5 border-b shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
              <ShoppingBag className="text-coffee-600" /> Current Order
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-stone-100 px-2.5 py-1 rounded-full text-stone-600 font-semibold">
                {cart.reduce((n, item) => n + item.quantity, 0)} Items
              </span>
              <button
                onClick={() => setCartOpen(false)}
                className="lg:hidden p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition cursor-pointer"
                aria-label="Close cart"
                title="Close cart"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          <div className="p-5 space-y-4">
          {/* Order Type Switcher */}
          <div className="grid grid-cols-3 gap-1.5 bg-stone-100 p-1 rounded-xl">
            {ORDER_TYPES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setOrderType(key)}
                className={`flex flex-col items-center gap-1 py-2 rounded-lg text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                  orderType === key
                    ? 'bg-coffee-600 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-800 hover:bg-white'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {/* Delivery Details */}
          {orderType === 'DELIVERY' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2 pt-1">
                <Bike size={16} className="text-coffee-600" /> Delivery Details
              </h3>

              {/* Delivery Method Switch */}
              <div className="grid grid-cols-2 gap-1.5 bg-stone-100 p-1 rounded-xl">
                {[
                  { key: 'IN_HOUSE', label: 'In-House', icon: Store },
                  { key: 'THIRD_PARTY', label: 'Third-Party App', icon: Smartphone },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDelivery((d) => ({ ...d, method: key }))}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      delivery.method === key
                        ? 'bg-coffee-600 text-white shadow-sm'
                        : 'text-stone-600 hover:text-stone-800 hover:bg-white'
                    }`}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>

              {delivery.method === 'IN_HOUSE' ? (
                <div className="space-y-2.5">
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 text-stone-400" size={15} />
                    <input
                      type="text"
                      value={delivery.customerName}
                      onChange={(e) => setDelivery((d) => ({ ...d, customerName: e.target.value }))}
                      placeholder="Customer name"
                      className="w-full rounded-lg border border-stone-200 pl-8 pr-3 py-2 text-sm bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-coffee-500"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 text-stone-400" size={15} />
                    <input
                      type="tel"
                      value={delivery.phoneNumber}
                      onChange={(e) => setDelivery((d) => ({ ...d, phoneNumber: e.target.value }))}
                      placeholder="Phone number"
                      className="w-full rounded-lg border border-stone-200 pl-8 pr-3 py-2 text-sm bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-coffee-500"
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 text-stone-400" size={15} />
                    <textarea
                      rows={2}
                      value={delivery.deliveryAddress}
                      onChange={(e) => setDelivery((d) => ({ ...d, deliveryAddress: e.target.value }))}
                      placeholder="Delivery address"
                      className="w-full rounded-lg border border-stone-200 pl-8 pr-3 py-2 text-sm bg-stone-50 resize-none focus:bg-white focus:outline-none focus:ring-2 focus:ring-coffee-500"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-stone-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={delivery.deliveryFee}
                      onChange={(e) => setDelivery((d) => ({ ...d, deliveryFee: e.target.value }))}
                      placeholder="Delivery fee (0.00)"
                      className="w-full rounded-lg border border-stone-200 pl-8 pr-3 py-2 text-sm bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-coffee-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div>
                    <p className="text-[11px] font-semibold text-stone-500 mb-1.5">Platform</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {['Foodpanda', 'GrabFood', 'NHAM24', 'WOWNOW'].map((platform) => (
                        <button
                          key={platform}
                          type="button"
                          onClick={() => setDelivery((d) => ({ ...d, platform }))}
                          className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            delivery.platform === platform
                              ? 'bg-coffee-600 text-white shadow-sm'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          {platform}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <Hash className="absolute left-3 top-2.5 text-stone-400" size={15} />
                    <input
                      type="text"
                      value={delivery.externalOrderId}
                      onChange={(e) => setDelivery((d) => ({ ...d, externalOrderId: e.target.value }))}
                      placeholder="External order ID / reference code"
                      className="w-full rounded-lg border border-stone-200 pl-8 pr-3 py-2 text-sm bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-coffee-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 space-y-3">
          {cart.length === 0 && (
            <div className="text-center text-stone-400 text-sm py-10">
              <ShoppingBag className="mx-auto mb-2 text-stone-300" size={32} />
              Add items to start an order
            </div>
          )}
          {cart.map((item) => {
            const remainingForItem = Number(item.stock || 0) - totalCartQtyFor(item.product_id);
            return (
              <div key={item.cartItemId} className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-100">
                <div className="min-w-0 pr-2">
                  <h4 className="font-semibold text-sm text-stone-800 truncate">{item.product_name || item.name}</h4>
                  <p className="text-[11px] text-stone-500">
                    {item.size}
                    {item.sugar_level ? ` \u2022 ${item.sugar_level}` : ''}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">${item.price.toFixed(2)} ea</p>
                  <span
                    className={`inline-block text-[10px] font-bold mt-1 px-1.5 py-0.5 rounded-full ring-1 ring-inset ${
                      remainingForItem <= 0
                        ? 'bg-red-50 text-red-600 ring-red-600/20'
                        : 'bg-emerald-50 text-emerald-600 ring-emerald-600/20'
                    }`}
                  >
                    Remaining: {Math.max(0, remainingForItem)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateQuantity(item.cartItemId, -1)}
                    className="p-1 border border-stone-200 bg-white rounded-lg hover:bg-stone-100 transition cursor-pointer"
                  >
                    <Minus size={14} className="text-stone-600" />
                  </button>
                  <span className="text-xs font-bold w-5 text-center text-stone-800">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.cartItemId, 1)}
                    className="p-1 border border-stone-200 bg-white rounded-lg hover:bg-stone-100 transition cursor-pointer"
                  >
                    <Plus size={14} className="text-coffee-600" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.cartItemId)}
                    className="p-1.5 text-coffee-500 rounded-lg hover:bg-coffee-50 transition cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                  <span className="w-14 text-right text-xs font-bold text-coffee-600">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-stone-200 z-10 p-4 space-y-3 shrink-0">
          {/* Subtotal */}
          <div className="flex justify-between text-sm text-stone-600">
            <span>Subtotal</span>
            <span className="font-semibold text-stone-800">${subtotal.toFixed(2)}</span>
          </div>

          {/* Delivery Fee */}
          {deliveryFee > 0 && (
            <div className="flex justify-between text-sm text-stone-600">
              <span>Delivery Fee</span>
              <span className="font-semibold text-coffee-700">+${deliveryFee.toFixed(2)}</span>
            </div>
          )}

          {/* Discount */}
          {discount.active ? (
            <div className="bg-white border border-coffee-200 rounded-xl p-3 space-y-3">
              <div className="flex justify-between text-sm text-stone-600">
                <span>Discount</span>
                <span className="font-bold text-coffee-600">-${discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg overflow-hidden border border-stone-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDiscount((d) => ({ ...d, type: 'PERCENT' }))}
                    className={`px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      discount.type === 'PERCENT'
                        ? 'bg-coffee-600 text-white'
                        : 'bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscount((d) => ({ ...d, type: 'FIXED' }))}
                    className={`px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      discount.type === 'FIXED'
                        ? 'bg-coffee-600 text-white'
                        : 'bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    $
                  </button>
                </div>
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                    {discount.type === 'PERCENT' ? '%' : '$'}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={discount.type === 'PERCENT' ? 100 : undefined}
                    step="0.01"
                    value={discount.value}
                    onChange={(e) => setDiscount((d) => ({ ...d, value: e.target.value }))}
                    placeholder={discount.type === 'PERCENT' ? 'e.g. 10' : 'e.g. 2.00'}
                    className="w-full rounded-lg border border-stone-200 pl-7 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setDiscount({ active: false, type: 'PERCENT', value: '' })}
                  className="shrink-0 p-2 text-coffee-500 rounded-lg hover:bg-coffee-50 transition cursor-pointer"
                  title="Remove discount"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDiscount((d) => ({ ...d, active: true }))}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-coffee-700 bg-coffee-50 border border-dashed border-coffee-300 hover:bg-coffee-100 transition cursor-pointer"
            >
              <BadgePercent size={14} /> Add Discount
            </button>
          )}

          {/* Total */}
          <div className="flex justify-between items-center bg-coffee-600 text-white rounded-xl px-4 py-3 shadow-sm shadow-coffee-600/20">
            <span className="font-bold">Total</span>
            <span className="font-extrabold text-lg tracking-tight">${finalTotal.toFixed(2)}</span>
          </div>

          <button
            onClick={openPaymentModal}
            disabled={cart.length === 0}
            className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition cursor-pointer disabled:opacity-50"
          >
            <CreditCard size={18} /> Place Order
          </button>
        </div>
      </div>

      {/* Mobile floating cart bar (below lg) */}
      {cart.length > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 mx-3 mb-3 flex items-center justify-between gap-3 rounded-2xl bg-stone-900 text-white px-4 py-3.5 shadow-2xl shadow-stone-900/30 cursor-pointer"
          style={{ marginBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <span className="flex items-center gap-2 text-sm font-bold">
            <ShoppingBag size={18} className="text-coffee-300" />
            View Cart · {cart.reduce((n, item) => n + item.quantity, 0)}
          </span>
          <span className="font-extrabold">${finalTotal.toFixed(2)}</span>
        </button>
      )}

      {/* Mobile backdrop for cart drawer (below lg) */}
      {cartOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-stone-950/50 backdrop-blur-sm z-30"
          onClick={() => setCartOpen(false)}
        />
      )}

      {/* Dynamic Price Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl p-4 sm:p-6 shadow-2xl relative space-y-4 sm:space-y-5 max-h-[88vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-stone-800">
                {selectedProduct.product_name || selectedProduct.name}
              </h3>
              <button onClick={() => setSelectedProduct(null)} className="text-stone-400 hover:text-stone-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <img
                src={selectedProduct.image ? `${STORAGE_BASE}${selectedProduct.image}` : 'https://placehold.co/150?text=Coffee'}
                alt={selectedProduct.product_name}
                className="w-24 h-24 object-cover rounded-xl border"
              />
              <div>
                <span className="text-2xl font-extrabold text-coffee-600">
                  ${currentModalPrice.toFixed(2)}
                </span>
                <span className="block text-xs text-stone-400 mt-0.5">Size: {size}</span>
                <span className="inline-flex items-center text-[11px] font-bold mt-1.5 px-2 py-0.5 rounded-full ring-1 ring-inset bg-emerald-50 text-emerald-600 ring-emerald-600/20">
                  {availableStockFor(selectedProduct)} in stock
                </span>
              </div>
            </div>

            {/* Sugar Level (hidden for non-drink categories) */}
            {!hideSugar && (
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-2">Sugar Level</label>
                <div className="grid grid-cols-5 gap-2">
                  {['0%', '25%', '50%', '75%', '100%'].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setSugarLevel(lvl)}
                      className={`py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                        sugarLevel === lvl ? 'bg-coffee-700 text-white' : 'bg-white text-stone-600'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Options */}
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-2">Size</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: 'Small', label: 'Small (-$0.20)' },
                  { name: 'Medium', label: 'Medium (Default)' },
                  { name: 'Large', label: 'Large (+$0.50)' },
                ].map((sz) => (
                  <button
                    key={sz.name}
                    onClick={() => setSize(sz.name)}
                    className={`py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                      size === sz.name ? 'bg-coffee-700 text-white' : 'bg-white text-stone-600'
                    }`}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-3">
              <button onClick={() => setItemQty((prev) => Math.max(1, prev - 1))} className="p-2 border rounded cursor-pointer"><Minus size={16} /></button>
              <span className="font-bold text-base w-8 text-center">{itemQty}</span>
              <button
                onClick={() => setItemQty((prev) => Math.min(prev + 1, availableStockFor(selectedProduct) || 1))}
                className="p-2 border rounded cursor-pointer"
              >
                <Plus size={16} />
              </button>
              {availableStockFor(selectedProduct) < 10 && (
                <span className="text-[11px] font-semibold text-amber-600">
                  Max {availableStockFor(selectedProduct)}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setSelectedProduct(null)} className="flex-1 py-2.5 bg-stone-100 text-stone-700 font-bold rounded-xl text-xs cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleAddToCart}
                disabled={availableStockFor(selectedProduct) <= 0}
                className="flex-1 py-2.5 bg-coffee-700 text-white font-bold rounded-xl text-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                {availableStockFor(selectedProduct) <= 0
                  ? 'Out of Stock'
                  : `Add to Order ($${(currentModalPrice * Math.min(itemQty, availableStockFor(selectedProduct))).toFixed(2)})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl relative space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-stone-800 flex items-center gap-2">
                  <Wallet size={20} className="text-coffee-600" /> Payment
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">Confirm the payment method to place the order</p>
              </div>
              <button onClick={() => setShowPayment(false)} className="text-stone-400 hover:text-stone-600 transition cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Amount Due (USD + KHR) */}
            <div className="bg-gradient-to-br from-coffee-800 to-coffee-600 rounded-2xl px-5 py-4 text-white">
              <div className="flex items-end justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-coffee-100/80">Amount Due</span>
                <span className="text-[11px] font-semibold text-coffee-100/80">
                  {(finalTotal * receiptSettings.rate).toLocaleString()} ៛ (KHR)
                </span>
              </div>
              <p className="mt-1 text-4xl font-extrabold tracking-tight">${finalTotal.toFixed(2)}</p>
            </div>

            {/* Payment Method Cards */}
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-2">Payment Method</label>
              <div className="grid grid-cols-3 gap-2.5">
                {PAYMENT_METHODS.map(({ key, label, desc, icon: Icon }) => {
                  const active = paymentMethod === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPaymentMethod(key)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-4 text-center transition cursor-pointer ${
                        active
                          ? 'border-coffee-600 bg-coffee-50 shadow-sm shadow-coffee-600/10'
                          : 'border-stone-200 bg-white hover:border-coffee-300 hover:bg-coffee-50/40'
                      }`}
                    >
                      <Icon size={24} className={active ? 'text-coffee-700' : 'text-stone-400'} />
                      <span className={`text-xs font-bold ${active ? 'text-coffee-800' : 'text-stone-700'}`}>{label}</span>
                      <span className="text-[10px] leading-tight text-stone-500">{desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cash Quick Calculator (dual currency) */}
            {paymentMethod === 'CASH' && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3">
                {/* Quick Cash presets */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-xs font-bold text-stone-700">Quick Cash</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(amountCurrency === 'USD' ? quickCashAmounts : quickKHRAmounts).map((q) => (
                      <button
                        key={q.label}
                        type="button"
                        onClick={() => setAmountReceived(String(q.value))}
                        className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-xs font-bold text-stone-700 hover:border-coffee-400 hover:text-coffee-700 transition cursor-pointer"
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Currency toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-700">Received In</label>
                  <div className="flex rounded-xl overflow-hidden border border-stone-200 bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => setAmountCurrency('USD')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        amountCurrency === 'USD'
                          ? 'bg-coffee-600 text-white'
                          : 'text-stone-600 hover:text-stone-800'
                      }`}
                    >
                      $ USD
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmountCurrency('KHR')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        amountCurrency === 'KHR'
                          ? 'bg-coffee-600 text-white'
                          : 'text-stone-600 hover:text-stone-800'
                      }`}
                    >
                      ៛ KHR
                    </button>
                  </div>
                </div>

                <div>
                  <div className="relative">
                    {amountCurrency === 'USD' && (
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-400">$</span>
                    )}
                    {amountCurrency === 'KHR' && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-400">៛</span>
                    )}
                    <input
                      type="number"
                      min="0"
                      step={amountCurrency === 'USD' ? '0.01' : '1000'}
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      placeholder={amountCurrency === 'USD' ? '0.00' : '0'}
                      className={`w-full rounded-xl border border-stone-200 bg-white py-2.5 text-xl font-extrabold text-stone-800 focus:outline-none focus:ring-2 focus:ring-coffee-500 text-left ${
                        amountCurrency === 'USD' ? 'pl-8 pr-3' : 'pl-3 pr-10'
                      }`}
                    />
                  </div>
                  {amountReceived !== '' && receivedUSD < finalTotal && (
                    <p className="text-[11px] font-semibold text-red-500 mt-1.5">
                      Insufficient amount. Please enter at least ${finalTotal.toFixed(2)} /{' '}
                      {Math.ceil(finalTotal * receiptSettings.rate).toLocaleString()}៛.
                    </p>
                  )}
                </div>

                {/* Change Due (USD + KHR) */}
                <div className="flex items-center justify-between rounded-xl bg-white border border-stone-200 px-4 py-3">
                  <span className="text-xs font-bold text-stone-600">Change Due</span>
                  <div className="text-right">
                    <p className={`text-lg font-extrabold ${changeDueUSD > 0 ? 'text-coffee-700' : 'text-stone-400'}`}>
                      ${changeDueUSD.toFixed(2)}
                    </p>
                    <p className={`text-xs font-bold ${changeDueUSD > 0 ? 'text-stone-600' : 'text-stone-400'}`}>
                      {changeDueKHR.toLocaleString()} ៛
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Card Note */}
            {paymentMethod === 'CARD' && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-center space-y-1.5">
                <CreditCard size={22} className="mx-auto text-coffee-600" />
                <p className="text-xs font-bold text-stone-700">Credit / Debit Card</p>
                <p className="text-[11px] text-stone-500">
                  Swipe, insert or tap the card on the payment terminal to complete the transaction.
                </p>
              </div>
            )}

            {/* KHQR Payment */}
            {paymentMethod === 'KHQR' && (
              <div className="rounded-2xl border border-dashed border-coffee-300 bg-coffee-50/40 p-4 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <QrCode size={22} className="text-coffee-600" />
                  <p className="text-xs font-bold text-stone-800">Bakong / KHQR Mobile Payment</p>
                </div>

                {/* Currency Toggle: USD vs KHR */}
                <div className="w-full">
                  <p className="text-[10px] font-bold text-stone-500 mb-1.5 text-center font-sans">
                    Payment Currency
                  </p>
                  <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-200/70 p-1">
                    {[
                      { key: 'USD', label: '$ USD' },
                      { key: 'KHR', label: '៛ KHR' },
                    ].map((c) => {
                      const amount = c.key === 'KHR' ? khqrAmount : finalTotal;
                      return (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setKhqrCurrency(c.key)}
                          className={`rounded-lg py-2 text-center transition cursor-pointer ${
                            khqrCurrency === c.key
                              ? 'bg-coffee-600 text-white shadow-sm'
                              : 'bg-transparent text-stone-600 hover:bg-white/60'
                          }`}
                        >
                          <span className="block text-xs font-extrabold">{c.label}</span>
                          <span
                            className={`block text-[10px] font-sans ${
                              khqrCurrency === c.key ? 'text-coffee-100' : 'text-stone-400'
                            }`}
                          >
                            {c.key === 'KHR'
                              ? `${amount.toLocaleString()}៛`
                              : `$${amount.toFixed(2)}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[11px] text-stone-500 font-sans">
                  Press "Confirm &amp; Place Order" to create the (UNPAID) order and show the payment
                  QR code. The order is marked PAID automatically once the transfer is confirmed.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowPayment(false)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={loading || cart.length === 0 || (paymentMethod === 'CASH' && !cashValid)}
                className="flex-[1.4] py-3 bg-coffee-600 hover:bg-coffee-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm shadow-coffee-600/20 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Processing...
                  </>
                ) : (
                  <>Confirm &amp; Place Order</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && completedOrder && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm p-4 sm:p-6 rounded-3xl shadow-2xl font-mono text-stone-700 relative space-y-4 max-h-[88vh] overflow-y-auto">
            
            <button
              onClick={() => setShowReceipt(false)}
              className="absolute right-5 top-5 text-stone-400 hover:text-stone-600 transition cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="text-center pt-2 space-y-1">
              <h2 className="font-bold text-xl tracking-wider text-coffee-600 uppercase">
                {receiptSettings.storeName}
              </h2>
              {(receiptSettings.storeAddress || receiptSettings.storePhone) && (
                <div className="text-[11px] text-stone-500 space-y-0.5 font-sans">
                  {receiptSettings.storeAddress && <p>{receiptSettings.storeAddress}</p>}
                  {receiptSettings.storePhone && <p>{receiptSettings.storePhone}</p>}
                </div>
              )}
              <p className="text-xs text-stone-500">
                វិក្កយបត្រ / Official Receipt
              </p>

              <div className="py-2">
                <span className="text-4xl font-extrabold text-stone-800 tracking-wider">
                  {completedOrder.queueNumber}
                </span>
              </div>

              <p className="text-[11px] text-stone-400 font-sans">
                {completedOrder.date}
              </p>
              {(completedOrder.orderType || completedOrder.paymentLabel) && (
                <span className="inline-flex items-center justify-center gap-1.5 pt-0.5">
                  {completedOrder.orderType && (
                    <span className="inline-flex items-center rounded-full bg-coffee-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-coffee-700 ring-1 ring-inset ring-coffee-600/10">
                      {completedOrder.orderType}
                    </span>
                  )}
                  {completedOrder.paymentLabel && (
                    <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-600 ring-1 ring-inset ring-stone-200">
                      {completedOrder.paymentLabel}
                    </span>
                  )}
                </span>
              )}
            </div>

            <div className="border-b border-dashed border-stone-300 my-2"></div>

            <div className="space-y-3">
              <div className="grid grid-cols-12 font-semibold text-xs text-stone-600 border-b border-stone-300 pb-2">
                <span className="col-span-6">Item / Category</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-2 text-right">Price</span>
                <span className="col-span-2 text-right">Total</span>
              </div>

              <div className="space-y-3 max-h-52 overflow-y-auto">
                {completedOrder.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 text-xs items-center">
                    <div className="col-span-6">
                      <p className="font-bold text-stone-800">{item.name}</p>
                      <p className="text-[10px] text-stone-400 font-sans">{item.categoryName || 'Coffee'}</p>
                    </div>
                    <span className="col-span-2 text-center font-medium">{item.qty}</span>
                    <span className="col-span-2 text-right font-medium">${item.price.toFixed(2)}</span>
                    <span className="col-span-2 text-right font-bold text-stone-800">
                      ${(item.qty * item.price).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-b border-dashed border-stone-300 my-2"></div>

            <div className="space-y-2 text-xs font-sans">
              <div className="flex justify-between text-stone-500 font-medium">
                <span>សរុបចំនួន (Total Qty):</span>
                <span className="font-bold text-stone-800">
                  {completedOrder.items.reduce((sum, item) => sum + item.qty, 0)}
                </span>
              </div>

              <div className="flex justify-between text-stone-500 font-medium">
                <span>Subtotal:</span>
                <span className="font-bold text-stone-800">${completedOrder.subtotal.toFixed(2)}</span>
              </div>

              {completedOrder.deliveryInfo && (
                <div className="space-y-1.5 text-[11px] font-sans bg-coffee-50 rounded-xl p-3">
                  <p className="font-bold text-coffee-800 uppercase tracking-wide">
                    {completedOrder.deliveryInfo.method}
                    {completedOrder.deliveryInfo.platform
                      ? ` - ${completedOrder.deliveryInfo.platform}`
                      : ''}
                  </p>
                  {completedOrder.deliveryInfo.customerName && (
                    <p className="text-stone-600">
                      <span className="font-semibold text-stone-700">Name:</span> {completedOrder.deliveryInfo.customerName}
                      {completedOrder.deliveryInfo.phoneNumber
                        ? ` | ${completedOrder.deliveryInfo.phoneNumber}`
                        : ''}
                    </p>
                  )}
                  {completedOrder.deliveryInfo.address && (
                    <p className="text-stone-600">
                      <span className="font-semibold text-stone-700">Address:</span> {completedOrder.deliveryInfo.address}
                    </p>
                  )}
                  {completedOrder.deliveryInfo.orderId && (
                    <p className="text-stone-600">
                      <span className="font-semibold text-stone-700">Order ID:</span> {completedOrder.deliveryInfo.orderId}
                    </p>
                  )}
                </div>
              )}

              {completedOrder.deliveryFee > 0 && (
                <div className="flex justify-between text-stone-500 font-medium">
                  <span>Delivery Fee:</span>
                  <span className="font-bold text-coffee-700">+${completedOrder.deliveryFee.toFixed(2)}</span>
                </div>
              )}

              {completedOrder.discountAmount > 0 && (
                <div className="flex justify-between text-stone-500 font-medium">
                  <span>Discount:</span>
                  <span className="font-bold text-coffee-600">-${completedOrder.discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-stone-900 font-bold text-base pt-1">
                <span>សរុបដុល្លារ ($):</span>
                <span className="text-coffee-600 text-lg font-extrabold">
                  ${completedOrder.total.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center text-stone-900 font-bold text-sm">
                <span>លុយខ្មែរ (KHR):</span>
                <span className="text-coffee-600 font-bold">
                  {(completedOrder.total * receiptSettings.rate).toLocaleString()} ៛
                </span>
              </div>
            </div>

            <div className="border-b border-dashed border-stone-300 my-2"></div>

            {receiptSettings.receiptFooter && (
              <div className="text-center pt-1 pb-1">
                <p className="text-xs italic text-stone-600 leading-relaxed">
                  {receiptSettings.receiptFooter}
                </p>
              </div>
            )}

            <div className="pt-2 space-y-2.5 font-sans">
              <button
                onClick={() => window.print()}
                className="w-full py-3 bg-coffee-600 hover:bg-coffee-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
              >
                <Printer size={16} /> Print Receipt
              </button>

              <button
                onClick={() => setShowReceipt(false)}
                className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close / បិទ
              </button>
            </div>

          </div>
        </div>
      )}

      {/* KHQR Payment Modal (Option 1: order-first + mock payment) */}
      <KhqrPaymentModal
        open={kqOrder !== null}
        orderId={kqOrder?.order_id ?? kqOrder?.id}
        amount={khqrAmount}
        currency={khqrCurrency}
        merchantName={receiptSettings.storeName}
        onClose={() => setKqOrder(null)}
        onSuccess={handleKqPaid}
      />
    </div>
  );
}