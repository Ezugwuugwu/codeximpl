import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { productApi } from "../services/api";
import type { Product } from "../types";
import axios from "axios";
import RatingDisplay from "../components/RatingDisplay";
import { getProductRating, getProductReviewCount } from "../utils/productPresentation";

const fallbackImage = "https://picsum.photos/seed/product-fallback/1000/700";
const productReviewsStorageKey = "okanga_product_reviews_v1";

type ProductReview = {
  id: string;
  productId: number;
  reviewer: string;
  comment: string;
  rating: number;
  createdAt: string;
};

const clampReviewRating = (value: number) => Math.min(5, Math.max(1, Math.round(value)));

const readStoredReviews = (): Record<string, ProductReview[]> => {
  try {
    const raw = localStorage.getItem(productReviewsStorageKey);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, ProductReview[]>;
    }
    return {};
  } catch {
    return {};
  }
};

const writeStoredReviews = (reviewsByProduct: Record<string, ProductReview[]>) => {
  localStorage.setItem(productReviewsStorageKey, JSON.stringify(reviewsByProduct));
};

const getReviewerName = () => {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    return "Anonymous customer";
  }

  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return "Verified customer";
    }
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = JSON.parse(atob(normalizedPayload)) as { sub?: string };

    if (typeof decodedPayload.sub === "string" && decodedPayload.sub.trim().length > 0) {
      return decodedPayload.sub.trim();
    }

    return "Verified customer";
  } catch {
    return "Verified customer";
  }
};

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
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const openedFromCart = searchParams.get("from") === "cart";

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

  useEffect(() => {
    if (!product) {
      return;
    }
    setQuantity(existingCartQuantity);
  }, [existingCartQuantity, product]);

  useEffect(() => {
    const id = Number(productId);
    if (!id) {
      setReviews([]);
      return;
    }
    const storedReviews = readStoredReviews();
    const normalizedReviews = (storedReviews[String(id)] ?? []).map((review) => ({
      ...review,
      rating: Number.isFinite(review.rating) ? clampReviewRating(review.rating) : 5,
    }));
    setReviews(normalizedReviews);
  }, [productId]);

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

  const submitReview = () => {
    if (!product) {
      return;
    }

    const trimmedComment = reviewComment.trim();
    if (trimmedComment.length < 8) {
      setReviewError("Please enter at least 8 characters in your review.");
      setReviewSuccess("");
      return;
    }
    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError("Please select a star rating before submitting.");
      setReviewSuccess("");
      return;
    }

    const review: ProductReview = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productId: product.id,
      reviewer: getReviewerName(),
      comment: trimmedComment,
      rating: clampReviewRating(reviewRating),
      createdAt: new Date().toISOString(),
    };

    const nextReviews = [review, ...reviews];
    setReviews(nextReviews);
    setReviewComment("");
    setReviewRating(0);
    setReviewError("");
    setReviewSuccess("Thanks for your review.");

    const storedReviews = readStoredReviews();
    storedReviews[String(product.id)] = nextReviews;
    writeStoredReviews(storedReviews);

    setTimeout(() => setReviewSuccess(""), 2400);
  };

  const hasSelection = quantity > 0;
  const addToCartButtonClass = hasSelection
    ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500"
    : "border-[#0d1d47] bg-[#0d1d47] text-white";

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
  const fallbackRating = getProductRating(product);
  const rating = reviews.length > 0
    ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1))
    : fallbackRating;
  const reviewCount = reviews.length > 0 ? reviews.length : getProductReviewCount(product);

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
            <button
              className={`inline-flex items-center rounded-full border px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-100 ${addToCartButtonClass}`}
              disabled={!hasSelection}
              onClick={addItem}
              type="button"
            >
              <svg aria-hidden="true" className="mr-2 h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M6 6h15l-1.5 9h-12z" />
                <circle cx="9" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
                <path d="M6 6l-2-2" />
              </svg>
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

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">Customer Reviews</h3>
          <p className="text-sm text-slate-500">
            {reviews.length} customer comments{reviews.length > 0 ? ` • Avg ${rating.toFixed(1)}/5` : ""}
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label className="text-sm font-medium text-slate-700" htmlFor="review-comment">
            Share your experience with this product
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-600">Your Rating</p>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, index) => {
                const value = index + 1;
                const active = value <= reviewRating;
                return (
                  <button
                    aria-label={`Set rating ${value} star${value > 1 ? "s" : ""}`}
                    className="rounded-md p-0.5"
                    key={`review-star-${value}`}
                    onClick={() => setReviewRating(value)}
                    type="button"
                  >
                    <svg
                      aria-hidden="true"
                      className={`h-6 w-6 ${active ? "text-yellow-400" : "text-slate-300"}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 1.25l2.626 5.322 5.874.854-4.25 4.142 1.003 5.848L10 14.654l-5.253 2.762 1.003-5.848L1.5 7.426l5.874-.854L10 1.25z" />
                    </svg>
                  </button>
                );
              })}
            </div>
            <p className="text-sm font-semibold text-yellow-600">{reviewRating > 0 ? `${reviewRating}.0 / 5` : "Select stars"}</p>
          </div>
          <textarea
            className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500"
            id="review-comment"
            placeholder="Tell us what you think about this product..."
            value={reviewComment}
            onChange={(event) => setReviewComment(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              onClick={submitReview}
              type="button"
            >
              Submit Review
            </button>
            {reviewError && <p className="text-sm text-red-600">{reviewError}</p>}
            {reviewSuccess && <p className="text-sm text-emerald-700">{reviewSuccess}</p>}
          </div>
        </div>

        {reviews.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            No customer reviews yet. Be the first to share your experience.
          </p>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <article className="rounded-xl border border-slate-200 bg-white p-4" key={review.id}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{review.reviewer}</p>
                  <p className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleString()}</p>
                </div>
                <div className="mb-2 flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, index) => (
                    <svg
                      aria-hidden="true"
                      className={`h-4 w-4 ${index < review.rating ? "text-yellow-400" : "text-slate-300"}`}
                      fill="currentColor"
                      key={`${review.id}-star-${index}`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 1.25l2.626 5.322 5.874.854-4.25 4.142 1.003 5.848L10 14.654l-5.253 2.762 1.003-5.848L1.5 7.426l5.874-.854L10 1.25z" />
                    </svg>
                  ))}
                  <span className="ml-1 text-xs font-semibold text-yellow-600">{review.rating.toFixed(1)}</span>
                </div>
                <p className="text-sm leading-6 text-slate-700">{review.comment}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export default ProductDetailsPage;
