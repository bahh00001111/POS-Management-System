import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { ShoppingBag, Plus, Minus, Trash2, CreditCard, Search, X, Printer, LayoutGrid, Coffee, CupSoda, Soup, Sandwich, Bean, IceCreamCone, CakeSlice, Tag, UtensilsCrossed, Package, Bike, BadgePercent, Store, Smartphone, User, Phone, MapPin, Hash } from 'lucide-react';

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

  const EXCHANGE_RATE = 4000;

  // គណនាតម្លៃផ្អែកលើ Size
  const calculateUnitPrice = (basePrice, selectedSize) => {
    const price = parseFloat(basePrice || 0);
    if (selectedSize === 'Small') return Math.max(0, price - 0.20);
    if (selectedSize === 'Large') return price + 0.50;
    return price;
  };

  // ១. Fetch Products & Categories
  const fetchData = async () => {
    try {
      const [prodRes, catRes] = await Promise.allSettled([
        axiosClient.get('/products'),
        axiosClient.get('/categories')
      ]);

      const loadedProducts =
        prodRes.status === 'fulfilled'
          ? Array.isArray(prodRes.value.data)
            ? prodRes.value.data
            : (prodRes.value.data.data || [])
          : [];
      const loadedCategories =
        catRes.status === 'fulfilled'
          ? Array.isArray(catRes.value.data)
            ? catRes.value.data
            : (catRes.value.data.data || [])
          : [];

      setProducts(loadedProducts);
      setCategories(loadedCategories);
    } catch (err) {
      console.error('Error loading POS data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ២. Open Product Modal
  const openProductModal = (product) => {
    setSelectedProduct(product);
    setSugarLevel('50%');
    setSize('Medium');
    setItemQty(1);
    setRemarks('');
  };

  // ៣. Add Item to Cart
  const handleAddToCart = () => {
    if (!selectedProduct) return;

    const prodId = selectedProduct.product_id || selectedProduct.id;
    const finalUnitPrice = calculateUnitPrice(selectedProduct.price, size);
    const noSugar = isNoSugarProduct(selectedProduct);

    const cartItem = {
      ...selectedProduct,
      cartItemId: `${prodId}-${sugarLevel}-${size}-${Date.now()}`,
      product_id: prodId,
      sugar_level: noSugar ? null : sugarLevel,
      size: size,
      quantity: itemQty,
      remarks: remarks,
      price: finalUnitPrice,
    };

    setCart((prevCart) => [...prevCart, cartItem]);
    setSelectedProduct(null);
  };

  const updateQuantity = (cartItemId, delta) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (cartItemId) => {
    setCart((prevCart) => prevCart.filter((item) => item.cartItemId !== cartItemId));
  };

  // ៤. Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const discountAmount = (() => {
    if (!discount.active) return 0;
    const value = parseFloat(discount.value);
    if (!Number.isFinite(value) || value <= 0) return 0;
    return discount.type === 'PERCENT'
      ? Math.min(subtotal * (value / 100), subtotal)
      : Math.min(value, subtotal);
  })();

  const deliveryFee =
    orderType === 'DELIVERY' && delivery.method === 'IN_HOUSE'
      ? Math.max(0, parseFloat(delivery.deliveryFee) || 0)
      : 0;

  const finalTotal = Math.max(0, subtotal + deliveryFee - discountAmount);

  // ៥. Submit Order
  const handleCheckout = async () => {
    if (cart.length === 0 || loading) return;

    const payload = {
      order_type: orderType,
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

    try {
      const res = await axiosClient.post('/orders', payload);
      const newOrder = res.data?.data || res.data;

      setCompletedOrder({
        queueNumber: newOrder?.queue_number || `#${String(newOrder?.order_id || newOrder?.id || 8).padStart(2, '0')}`,
        orderType: ORDER_TYPES.find((t) => t.key === orderType)?.label || orderType,
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
      fetchData();
    } catch (err) {
      console.error('Checkout error:', err.response?.data);
      alert(`Error: ${err.response?.data?.message || 'Failed to place order.'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((prod) => {
    const matchesCategory =
      selectedCategory === 'ALL' ||
      String(prod.category_id) === String(selectedCategory) ||
      String(prod.category?.category_id || prod.category?.id) === String(selectedCategory);

    const prodName = prod.product_name || prod.name || '';
    return matchesCategory && prodName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const currentModalPrice = selectedProduct
    ? calculateUnitPrice(selectedProduct.price, size)
    : 0;

  const hideSugar = selectedProduct ? isNoSugarProduct(selectedProduct) : false;

  return (
    <div className="flex h-full bg-slate-100 overflow-hidden relative">
      {/* ផ្នែកខាងឆ្វេង៖ Main Menu Layout */}
      <div className="flex-1 flex flex-col h-full p-6 overflow-hidden gap-4">
        
        {/* ១. Search Input (shrink-0 ការពារកុំឱ្យរួមទំហំ) */}
        <div className="shrink-0">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search coffee or menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
          </div>
        </div>

        {/* ២. Categories Bar (shrink-0 និង Scroll ដាច់ដោយឡែក) */}
        <div className="shrink-0 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
              selectedCategory === 'ALL' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50'
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
                  selectedCategory === catId ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon size={16} /> {cat.category_name || cat.name}
              </button>
            );
          })}
        </div>

        {/* ៣. Products Grid (flex-1 overflow-y-auto សម្រាប់ Scroll តែផ្នែក Card ប៉ុណ្ណោះ) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pr-1">
          {filteredProducts.map((prod) => (
            <div
              key={prod.product_id || prod.id}
              onClick={() => openProductModal(prod)}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer flex flex-col justify-between h-fit"
            >
              <img
                src={prod.image ? `http://localhost:8000/storage/${prod.image}` : 'https://placehold.co/150?text=Coffee'}
                alt={prod.product_name}
                className="w-full h-32 object-cover rounded-xl mb-3"
              />
              <div>
                <h3 className="font-semibold text-slate-800 line-clamp-1">{prod.product_name || prod.name}</h3>
                <p className="text-emerald-600 font-bold mt-1">${parseFloat(prod.price || 0).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Summary Panel */}
      <div className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-lg h-full overflow-hidden">
        <div className="p-5 border-b shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ShoppingBag className="text-emerald-600" /> Current Order
            </h2>
            <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full text-slate-600 font-semibold">
              {cart.reduce((n, item) => n + item.quantity, 0)} Items
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          <div className="p-5 space-y-4">
          {/* Order Type Switcher */}
          <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
            {ORDER_TYPES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setOrderType(key)}
                className={`flex flex-col items-center gap-1 py-2 rounded-lg text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                  orderType === key
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-white'
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
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pt-1">
                <Bike size={16} className="text-emerald-600" /> Delivery Details
              </h3>

              {/* Delivery Method Switch */}
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
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
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-800 hover:bg-white'
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
                    <User className="absolute left-3 top-2.5 text-slate-400" size={15} />
                    <input
                      type="text"
                      value={delivery.customerName}
                      onChange={(e) => setDelivery((d) => ({ ...d, customerName: e.target.value }))}
                      placeholder="Customer name"
                      className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 text-slate-400" size={15} />
                    <input
                      type="tel"
                      value={delivery.phoneNumber}
                      onChange={(e) => setDelivery((d) => ({ ...d, phoneNumber: e.target.value }))}
                      placeholder="Phone number"
                      className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 text-slate-400" size={15} />
                    <textarea
                      rows={2}
                      value={delivery.deliveryAddress}
                      onChange={(e) => setDelivery((d) => ({ ...d, deliveryAddress: e.target.value }))}
                      placeholder="Delivery address"
                      className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-sm bg-slate-50 resize-none focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={delivery.deliveryFee}
                      onChange={(e) => setDelivery((d) => ({ ...d, deliveryFee: e.target.value }))}
                      placeholder="Delivery fee (0.00)"
                      className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Platform</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {['Foodpanda', 'GrabFood', 'NHAM24', 'WOWNOW'].map((platform) => (
                        <button
                          key={platform}
                          type="button"
                          onClick={() => setDelivery((d) => ({ ...d, platform }))}
                          className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            delivery.platform === platform
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {platform}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <Hash className="absolute left-3 top-2.5 text-slate-400" size={15} />
                    <input
                      type="text"
                      value={delivery.externalOrderId}
                      onChange={(e) => setDelivery((d) => ({ ...d, externalOrderId: e.target.value }))}
                      placeholder="External order ID / reference code"
                      className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 space-y-3">
          {cart.length === 0 && (
            <div className="text-center text-slate-400 text-sm py-10">
              <ShoppingBag className="mx-auto mb-2 text-slate-300" size={32} />
              Add items to start an order
            </div>
          )}
          {cart.map((item) => (
            <div key={item.cartItemId} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="min-w-0 pr-2">
                <h4 className="font-semibold text-sm text-slate-800 truncate">{item.product_name || item.name}</h4>
                <p className="text-[11px] text-slate-500">
                  {item.size}
                  {item.sugar_level ? ` \u2022 ${item.sugar_level}` : ''}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">${item.price.toFixed(2)} ea</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => updateQuantity(item.cartItemId, -1)}
                  className="p-1 border border-slate-200 bg-white rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <Minus size={14} className="text-slate-600" />
                </button>
                <span className="text-xs font-bold w-5 text-center text-slate-800">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.cartItemId, 1)}
                  className="p-1 border border-slate-200 bg-white rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <Plus size={14} className="text-emerald-600" />
                </button>
                <button
                  onClick={() => removeFromCart(item.cartItemId)}
                  className="p-1.5 text-rose-500 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
                <span className="w-14 text-right text-xs font-bold text-emerald-600">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 z-10 p-4 space-y-3 shrink-0">
          {/* Subtotal */}
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-800">${subtotal.toFixed(2)}</span>
          </div>

          {/* Delivery Fee */}
          {deliveryFee > 0 && (
            <div className="flex justify-between text-sm text-slate-600">
              <span>Delivery Fee</span>
              <span className="font-semibold text-emerald-700">+${deliveryFee.toFixed(2)}</span>
            </div>
          )}

          {/* Discount */}
          {discount.active ? (
            <div className="bg-white border border-emerald-200 rounded-xl p-3 space-y-3">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Discount</span>
                <span className="font-bold text-emerald-600">-${discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg overflow-hidden border border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDiscount((d) => ({ ...d, type: 'PERCENT' }))}
                    className={`px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      discount.type === 'PERCENT'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscount((d) => ({ ...d, type: 'FIXED' }))}
                    className={`px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      discount.type === 'FIXED'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    $
                  </button>
                </div>
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
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
                    className="w-full rounded-lg border border-slate-200 pl-7 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setDiscount({ active: false, type: 'PERCENT', value: '' })}
                  className="shrink-0 p-2 text-rose-500 rounded-lg hover:bg-rose-50 transition cursor-pointer"
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
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 border border-dashed border-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
            >
              <BadgePercent size={14} /> Add Discount
            </button>
          )}

          {/* Total */}
          <div className="flex justify-between items-center bg-emerald-600 text-white rounded-xl px-4 py-3 shadow-sm shadow-emerald-600/20">
            <span className="font-bold">Total</span>
            <span className="font-extrabold text-lg tracking-tight">${finalTotal.toFixed(2)}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading || cart.length === 0}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
          >
            <CreditCard size={18} /> {loading ? 'Processing...' : 'Place Order'}
          </button>
        </div>
      </div>

      {/* Dynamic Price Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-5">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800">
                {selectedProduct.product_name || selectedProduct.name}
              </h3>
              <button onClick={() => setSelectedProduct(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <img
                src={selectedProduct.image ? `http://localhost:8000/storage/${selectedProduct.image}` : 'https://placehold.co/150?text=Coffee'}
                alt={selectedProduct.product_name}
                className="w-24 h-24 object-cover rounded-xl border"
              />
              <div>
                <span className="text-2xl font-extrabold text-emerald-600">
                  ${currentModalPrice.toFixed(2)}
                </span>
                <span className="block text-xs text-slate-400 mt-0.5">Size: {size}</span>
              </div>
            </div>

            {/* Sugar Level (hidden for non-drink categories) */}
            {!hideSugar && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">Sugar Level</label>
                <div className="grid grid-cols-5 gap-2">
                  {['0%', '25%', '50%', '75%', '100%'].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setSugarLevel(lvl)}
                      className={`py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                        sugarLevel === lvl ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600'
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
              <label className="text-xs font-bold text-slate-700 block mb-2">Size</label>
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
                      size === sz.name ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600'
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
              <button onClick={() => setItemQty((prev) => prev + 1)} className="p-2 border rounded cursor-pointer"><Plus size={16} /></button>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setSelectedProduct(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">
                Cancel
              </button>
              <button onClick={handleAddToCart} className="flex-1 py-2.5 bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer">
                Add to Order (${(currentModalPrice * itemQty).toFixed(2)})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && completedOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm p-6 rounded-3xl shadow-2xl font-mono text-slate-700 relative space-y-4">
            
            <button
              onClick={() => setShowReceipt(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="text-center pt-2 space-y-1">
              <h2 className="font-bold text-xl tracking-wider text-amber-600 uppercase">
                COFFEE POS
              </h2>
              <p className="text-xs text-slate-500">
                វិក្កយបត្រ / Official Receipt
              </p>

              <div className="py-2">
                <span className="text-4xl font-extrabold text-slate-800 tracking-wider">
                  {completedOrder.queueNumber}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 font-sans">
                {completedOrder.date}
              </p>
              {completedOrder.orderType && (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                  {completedOrder.orderType}
                </span>
              )}
            </div>

            <div className="border-b border-dashed border-slate-300 my-2"></div>

            <div className="space-y-3">
              <div className="grid grid-cols-12 font-semibold text-xs text-slate-600 border-b border-slate-300 pb-2">
                <span className="col-span-6">Item / Category</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-2 text-right">Price</span>
                <span className="col-span-2 text-right">Total</span>
              </div>

              <div className="space-y-3 max-h-52 overflow-y-auto">
                {completedOrder.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 text-xs items-center">
                    <div className="col-span-6">
                      <p className="font-bold text-slate-800">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-sans">{item.categoryName || 'Coffee'}</p>
                    </div>
                    <span className="col-span-2 text-center font-medium">{item.qty}</span>
                    <span className="col-span-2 text-right font-medium">${item.price.toFixed(2)}</span>
                    <span className="col-span-2 text-right font-bold text-slate-800">
                      ${(item.qty * item.price).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-b border-dashed border-slate-300 my-2"></div>

            <div className="space-y-2 text-xs font-sans">
              <div className="flex justify-between text-slate-500 font-medium">
                <span>សរុបចំនួន (Total Qty):</span>
                <span className="font-bold text-slate-800">
                  {completedOrder.items.reduce((sum, item) => sum + item.qty, 0)}
                </span>
              </div>

              <div className="flex justify-between text-slate-500 font-medium">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-800">${completedOrder.subtotal.toFixed(2)}</span>
              </div>

              {completedOrder.deliveryInfo && (
                <div className="space-y-1.5 text-[11px] font-sans bg-emerald-50 rounded-xl p-3">
                  <p className="font-bold text-emerald-800 uppercase tracking-wide">
                    {completedOrder.deliveryInfo.method}
                    {completedOrder.deliveryInfo.platform
                      ? ` - ${completedOrder.deliveryInfo.platform}`
                      : ''}
                  </p>
                  {completedOrder.deliveryInfo.customerName && (
                    <p className="text-slate-600">
                      <span className="font-semibold text-slate-700">Name:</span> {completedOrder.deliveryInfo.customerName}
                      {completedOrder.deliveryInfo.phoneNumber
                        ? ` | ${completedOrder.deliveryInfo.phoneNumber}`
                        : ''}
                    </p>
                  )}
                  {completedOrder.deliveryInfo.address && (
                    <p className="text-slate-600">
                      <span className="font-semibold text-slate-700">Address:</span> {completedOrder.deliveryInfo.address}
                    </p>
                  )}
                  {completedOrder.deliveryInfo.orderId && (
                    <p className="text-slate-600">
                      <span className="font-semibold text-slate-700">Order ID:</span> {completedOrder.deliveryInfo.orderId}
                    </p>
                  )}
                </div>
              )}

              {completedOrder.deliveryFee > 0 && (
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Delivery Fee:</span>
                  <span className="font-bold text-emerald-700">+${completedOrder.deliveryFee.toFixed(2)}</span>
                </div>
              )}

              {completedOrder.discountAmount > 0 && (
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Discount:</span>
                  <span className="font-bold text-rose-600">-${completedOrder.discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-slate-900 font-bold text-base pt-1">
                <span>សរុបដុល្លារ ($):</span>
                <span className="text-amber-600 text-lg font-extrabold">
                  ${completedOrder.total.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-900 font-bold text-sm">
                <span>លុយខ្មែរ (KHR):</span>
                <span className="text-emerald-600 font-bold">
                  {(completedOrder.total * EXCHANGE_RATE).toLocaleString()} ៛
                </span>
              </div>
            </div>

            <div className="border-b border-dashed border-slate-300 my-2"></div>

            <div className="pt-2 space-y-2.5 font-sans">
              <button
                onClick={() => window.print()}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
              >
                <Printer size={16} /> Print Receipt
              </button>

              <button
                onClick={() => setShowReceipt(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close / បិទ
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}