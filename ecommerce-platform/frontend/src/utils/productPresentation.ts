import type { Product } from "../types";

const clampRating = (value: number) => Math.min(5, Math.max(1, value));

export const getProductRating = (product: Product): number => {
  if (typeof product.rating === "number" && Number.isFinite(product.rating)) {
    return Number(clampRating(product.rating).toFixed(1));
  }

  const seed = product.id * 19 + product.name.length * 7 + product.category.length * 5;
  const generatedRating = 3.8 + (seed % 13) / 10;
  return Number(clampRating(generatedRating).toFixed(1));
};

export const getProductReviewCount = (product: Product): number => {
  if (typeof product.reviewCount === "number" && Number.isFinite(product.reviewCount)) {
    return Math.max(0, Math.round(product.reviewCount));
  }

  const seed = product.id * 53 + product.stock * 11 + Math.round(product.price);
  return 32 + (seed % 670);
};
