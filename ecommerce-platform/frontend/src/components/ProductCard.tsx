import { useState } from "react";
import type { Product } from "../types";
import { Link } from "react-router-dom";
import RatingDisplay from "./RatingDisplay";
import { getProductRating, getProductReviewCount } from "../utils/productPresentation";

type Props = {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
};

const fallbackImage = "https://picsum.photos/seed/product-fallback/1000/700";

function ProductCard({ product, onAddToCart }: Props) {
  const previewImage = product.imageUrls?.[0] || fallbackImage;
  const [quantity, setQuantity] = useState(0);
  const rating = getProductRating(product);
  const reviewCount = getProductReviewCount(product);
  const hasSelection = quantity > 0;
  const stockLabel = product.stock <= 10 ? "Limited Stock" : "In Demand";
  const stockLabelClass = product.stock <= 10
    ? "bg-rose-100 text-rose-700"
    : "bg-cyan-100 text-cyan-700";
  const addToCartButtonClass = hasSelection
    ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500"
    : "border-[#0d1d47] bg-[#0d1d47] text-white";

  const decrement = () => {
    setQuantity((current) => Math.max(0, current - 1));
  };

  const increment = () => {
    setQuantity((current) => Math.min(product.stock, current + 1));
  };

  const addSelected = () => {
    if (quantity <= 0) {
      return;
    }
    onAddToCart(product, quantity);
    setQuantity(0);
  };

  return (
    <article className="group overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-b from-white via-white to-amber-50/60 shadow-lg transition hover:-translate-y-1 hover:shadow-2xl">
      <Link to={`/products/${product.id}`} className="block" state={{ productPreview: product }}>
        <img
          alt={product.name}
          className="h-48 w-full bg-slate-100 object-contain transition duration-300 group-hover:scale-[1.03]"
          src={previewImage}
        />
      </Link>
      <div className="p-5">
        <div className="mb-3 flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold">{product.name}</h3>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white">{product.category}</span>
        </div>
        <RatingDisplay className="mb-3" compact rating={rating} reviewCount={reviewCount} />
        <div className="mb-4 flex flex-wrap gap-2">
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${stockLabelClass}`}>{stockLabel}</span>
          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">Top Rated</span>
        </div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xl font-bold text-emerald-700">${Number(product.price).toFixed(2)}</p>
          <p className="text-sm text-slate-500">Stock: {product.stock}</p>
        </div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
          <button
            className="h-8 w-8 rounded-lg border border-slate-300 bg-white text-lg leading-none text-slate-700 disabled:opacity-40"
            disabled={quantity === 0}
            onClick={decrement}
            type="button"
          >
            -
          </button>
          <span className="w-8 text-center text-sm font-semibold text-slate-800">{quantity}</span>
          <button
            className="h-8 w-8 rounded-lg border border-slate-300 bg-white text-lg leading-none text-slate-700 disabled:opacity-40"
            disabled={quantity >= product.stock}
            onClick={increment}
            type="button"
          >
            +
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-100 ${addToCartButtonClass}`}
            disabled={!hasSelection}
            onClick={addSelected}
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
          <Link
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            state={{ productPreview: product }}
            to={`/products/${product.id}`}
          >
            View Details
          </Link>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
