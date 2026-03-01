import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { productApi } from "../services/api";
import type { Product } from "../types";
import axios from "axios";
import RatingDisplay from "../components/RatingDisplay";
import { getProductRating, getProductReviewCount } from "../utils/productPresentation";

const fallbackImage = "https://picsum.photos/seed/product-fallback/1000/700";

function ProductDetailsPage() {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [loading, setLoading] = useState(true);
  const openedFromCart = searchParams.get("from") === "cart";
  const quantityInitializedRef = useRef(false);

  const existingCartQuantity = useMemo(() => {
    if (!product) {
      return 0;
    }
    const match = cart?.items.find((item) => item.productId === product.id);
    return match?.quantity ?? 0;
  }, [cart?.items, product]);

  useEffect(() => {
    const id = Number(productId);
    if (!id) {
      setLoadError("Invalid product link.");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("auth_token") || undefined;
    productApi
      .getById(id, token)
      .then((result) => {
        setProduct(result);
        setSelectedImage(result.imageUrls?.[0] || fallbackImage);
      })
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          if (status === 404) {
            setLoadError("Product not found.");
            return;
          }
          if (status === 401 || status === 403) {
            setLoadError("Please login first to view product details.");
            return;
          }
        }
        setLoadError("Could not load product details right now. Please retry.");
      })
      .finally(() => setLoading(false));
  }, [productId]);

  // Reset initialization when navigating to a different product
  useEffect(() => {
    quantityInitializedRef.current = false;
  }, [productId]);

  // Initialize quantity once when both product and cart are first loaded.
  // Using a ref prevents the cart-update that follows "Add to Cart" from
  // re-syncing quantity back to the new cart total (which caused the bug
  // where each subsequent click added an ever-growing amount).
  useEffect(() => {
    if (!product || cart === null || quantityInitializedRef.current) {
      return;
    }
    quantityInitializedRef.current = true;
    setQuantity(openedFromCart ? existingCartQuantity : 0);
  }, [product, cart, existingCartQuantity, openedFromCart]);

  const addItem = async () => {
    if (!product) {
      return;
    }
    if (quantity <= 0) {
      setMessage("Quantity must be at least 1.");
      return;
    }
    try {
      await addToCart(product, quantity);
      setMessage(`${quantity} x ${product.name} added to cart.`);
      setQuantity(0);
      setTimeout(() => setMessage(""), 2200);
    } catch {
      setMessage("Login required before adding to cart.");
    }
  };

  const addAndCheckout = async () => {
    if (!product) {
      return;
    }
    if (quantity <= 0) {
      setMessage("Quantity must be at least 1.");
      return;
    }
    try {
      await addToCart(product, quantity);
      navigate("/cart");
    } catch {
      setMessage("Login required before placing orders.");
    }
  };

  const updateCartQuantity = async () => {
    if (!product) {
      return;
    }
    if (quantity < 0) {
      setMessage("Quantity cannot be negative.");
      return;
    }

    try {
      if (existingCartQuantity > 0) {
        await removeFromCart(product.id);
      }

      if (quantity > 0) {
        await addToCart(product, quantity);
        setMessage(`Cart updated. ${product.name} quantity is now ${quantity}.`);
      } else {
        setMessage(`${product.name} removed from cart.`);
      }
      setTimeout(() => setMessage(""), 2200);
    } catch {
      setMessage("Could not update cart quantity right now.");
    }
  };

  const decrement = () => {
    setQuantity((current) => Math.max(0, current - 1));
  };

  const increment = () => {
    if (!product) {
      return;
    }
    setQuantity((current) => Math.min(product.stock, current + 1));
  };

  if (loading) {
    return <p className="text-sm text-slate-600">Loading product details...</p>;
  }

  if (!product) {
    return (
      <section className="space-y-4">
        <p className="rounded-xl bg-red-50 p-4 text-red-700">{loadError || "Product not found."}</p>
        <Link className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700" to="/">
          Back to Store
        </Link>
      </section>
    );
  }

  const photos = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls : [fallbackImage];
  const rating = getProductRating(product);
  const reviewCount = getProductReviewCount(product);

  return (
    <section className="space-y-6">
      <Link className="inline-block rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700" to={openedFromCart ? "/cart" : "/"}>
        {openedFromCart ? "Back to Cart" : "Back to Store"}
      </Link>
      {openedFromCart && (
        <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          Editing from cart: set your preferred quantity, then click <strong>Update Cart Quantity</strong>.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
          <img alt={product.name} className="h-[420px] w-full rounded-xl bg-slate-100 object-contain" src={selectedImage || fallbackImage} />
          <div className="grid grid-cols-4 gap-2">
            {photos.map((photo) => (
              <button
                className={`overflow-hidden rounded-lg border ${selectedImage === photo ? "border-ink" : "border-slate-200"}`}
                key={photo}
                onClick={() => setSelectedImage(photo)}
                type="button"
              >
                <img alt={product.name} className="h-20 w-full bg-slate-100 object-contain" src={photo} />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{product.category}</p>
          <h2 className="text-3xl font-semibold">{product.name}</h2>
          <RatingDisplay rating={rating} reviewCount={reviewCount} />
          <p className="text-sm leading-6 text-slate-600">{product.description}</p>
          <p className="text-3xl font-bold text-emerald-700">${Number(product.price).toFixed(2)}</p>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <p><span className="text-slate-500">Stock:</span> {product.stock}</p>
            {/* <p><span className="text-slate-500">Photos:</span> {photos.length}</p> */}
            <p><span className="text-slate-500">Status:</span> {product.stock > 0 ? "In Stock" : "Out of Stock"}</p>
            <p><span className="text-slate-500">Item ID:</span> {product.id}</p>
            <p><span className="text-slate-500">In Cart:</span> {existingCartQuantity}</p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
            <button
              className="h-9 w-9 rounded-lg border border-slate-300 bg-white text-lg leading-none text-slate-700 disabled:opacity-40"
              disabled={quantity === 0}
              onClick={decrement}
              type="button"
            >
              -
            </button>
            <span className="w-10 text-center text-base font-semibold text-slate-900">{quantity}</span>
            <button
              className="h-9 w-9 rounded-lg border border-slate-300 bg-white text-lg leading-none text-slate-700 disabled:opacity-40"
              disabled={quantity >= product.stock}
              onClick={increment}
              type="button"
            >
              +
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="rounded-xl bg-ink px-5 py-2 text-white disabled:opacity-50" disabled={quantity === 0} onClick={addItem} type="button">
              Add to Cart
            </button>
            <button className="rounded-xl bg-mint px-5 py-2 font-medium text-ink disabled:opacity-50" disabled={quantity === 0} onClick={addAndCheckout} type="button">
              Buy Now
            </button>
            <button
              className="rounded-xl border border-slate-300 px-5 py-2 text-slate-700 disabled:opacity-50"
              disabled={quantity < 0}
              onClick={updateCartQuantity}
              type="button"
            >
              Update Cart Quantity
            </button>
          </div>
          {message && <p className="text-sm text-emerald-700">{message}</p>}
        </div>
      </div>
    </section>
  );
}

export default ProductDetailsPage;
