import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import { productApi } from "../services/api";
import type { Product } from "../types";

type CategoryGroup = {
  name: string;
  products: Product[];
};

type HeroTile = {
  title: string;
  category: string;
  image: string;
};

type PromoTheme = {
  eyebrow: string;
  title: string;
  subtitle: string;
  panelClass: string;
  badgeClass: string;
  titleClass: string;
};

const heroFallbackTiles: HeroTile[] = [
  {
    title: "Signature Street Sneakers",
    category: "Shoes",
    image: "https://picsum.photos/seed/okanga-shoes/900/650",
  },
  {
    title: "Smart Time Pro Watch",
    category: "Watches",
    image: "https://picsum.photos/seed/okanga-watch/900/650",
  },
  {
    title: "Studio Bass Wireless Speaker",
    category: "Speakers",
    image: "https://picsum.photos/seed/okanga-speaker/900/650",
  },
  {
    title: "Modern Layered City Wear",
    category: "Wears",
    image: "https://picsum.photos/seed/okanga-wears/900/650",
  },
];

const inlinePromoThemes: PromoTheme[] = [
  {
    eyebrow: "Seasonal Spotlight",
    title: "Up to 50% off fashion, audio, watches, and smart gadgets",
    subtitle: "Handpicked favorites refreshed automatically as new products land.",
    panelClass: "bg-gradient-to-r from-[#c9dcf7] via-[#deecff] to-[#c4dbf6]",
    badgeClass: "from-amber-400 via-orange-400 to-rose-500",
    titleClass: "text-slate-900",
  },
  {
    eyebrow: "Fast Delivery Promise",
    title: "You shop it here, we deliver it anywhere.",
    subtitle: "Product safety guaranteed 100%.",
    panelClass: "bg-gradient-to-r from-[#d2f9e6] via-[#ecfff6] to-[#ccf0ff]",
    badgeClass: "from-emerald-500 via-cyan-500 to-blue-500",
    titleClass: "text-slate-900",
  },
  {
    eyebrow: "Today’s Best Mix",
    title: "Build your outfit, sound system, and gadget stack in one go",
    subtitle: "Clickable product picks below take you straight to product details.",
    panelClass: "bg-gradient-to-r from-[#ffe5d0] via-[#fff3e3] to-[#ffe1ef]",
    badgeClass: "from-fuchsia-500 via-pink-500 to-orange-500",
    titleClass: "text-slate-900",
  },
  {
    eyebrow: "Okanga Member Deals",
    title: "Fresh arrivals + trusted essentials with real-time stock updates",
    subtitle: "Compare, click, and checkout faster with curated picks every two rows.",
    panelClass: "bg-gradient-to-r from-[#e3e8ff] via-[#ecf6ff] to-[#d8ecff]",
    badgeClass: "from-violet-500 via-indigo-500 to-cyan-500",
    titleClass: "text-slate-900",
  },
];

const categoryAnchor = (name: string) => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `category-${slug || "uncategorized"}`;
};

const getProductGridColumns = (width: number) => {
  if (width >= 1024) {
    return 3;
  }
  if (width >= 768) {
    return 2;
  }
  return 1;
};

const seededScore = (productId: number, seed: number) => {
  const value = Math.sin(productId * 12.9898 + seed * 78.233) * 43758.5453;
  return value - Math.floor(value);
};

const pickPromoProducts = (source: Product[], count: number, seed: number) =>
  [...source]
    .sort((a, b) => seededScore(a.id, seed) - seededScore(b.id, seed))
    .slice(0, Math.min(count, source.length));

const productNewestFirst = (a: Product, b: Product) => {
  const aUpdatedAt = a.updatedAt ? Date.parse(a.updatedAt) : Number.NaN;
  const bUpdatedAt = b.updatedAt ? Date.parse(b.updatedAt) : Number.NaN;

  const aTime = Number.isNaN(aUpdatedAt) ? 0 : aUpdatedAt;
  const bTime = Number.isNaN(bUpdatedAt) ? 0 : bUpdatedAt;

  if (aTime !== bTime) {
    return bTime - aTime;
  }

  return b.id - a.id;
};

const matchesSearch = (product: Product, query: string) => {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) {
    return true;
  }

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const haystack = `${product.name} ${product.description} ${product.category}`.toLowerCase();

  return terms.every((term) => haystack.includes(term));
};

function StorePage() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [productGridColumns, setProductGridColumns] = useState(() =>
    typeof window === "undefined" ? 3 : getProductGridColumns(window.innerWidth)
  );
  const [allProductsQuery, setAllProductsQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const { addToCart } = useCart();
  const selectedCategory = searchParams.get("category")?.trim() || "";
  const normalizedSelectedCategory = selectedCategory.toLowerCase();

  useEffect(() => {
    const token = localStorage.getItem("auth_token") || undefined;
    productApi
      .list(token)
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setAllProductsQuery("");
    setCategoryQuery("");
  }, [normalizedSelectedCategory]);

  useEffect(() => {
    const syncColumns = () => {
      setProductGridColumns(getProductGridColumns(window.innerWidth));
    };

    syncColumns();
    window.addEventListener("resize", syncColumns);
    return () => window.removeEventListener("resize", syncColumns);
  }, []);

  const sortedProducts = useMemo(() => [...products].sort(productNewestFirst), [products]);

  const onAddToCart = async (product: Product, quantity: number) => {
    try {
      await addToCart(product, quantity);
      setStatusMessage(`${quantity} x ${product.name} added to cart.`);
      setTimeout(() => setStatusMessage(""), 2500);
    } catch {
      setStatusMessage("Login first before adding items to cart.");
    }
  };

  const heroShowcase = useMemo<HeroTile[]>(() => {
    const featuredTiles = sortedProducts.slice(0, 4).map((product) => ({
      title: product.name,
      category: product.category || "Featured",
      image: product.imageUrls?.[0] || `https://picsum.photos/seed/okanga-${product.id}/900/650`,
    }));

    if (featuredTiles.length >= 4) {
      return featuredTiles;
    }

    return [...featuredTiles, ...heroFallbackTiles.slice(0, 4 - featuredTiles.length)];
  }, [sortedProducts]);

  const filteredProducts = useMemo(
    () =>
      sortedProducts.filter((product) => {
        const productCategory = (product.category?.trim() || "Uncategorized").toLowerCase();
        const categoryMatches = normalizedSelectedCategory
          ? productCategory === normalizedSelectedCategory
          : true;
        return categoryMatches && matchesSearch(product, allProductsQuery);
      }),
    [sortedProducts, allProductsQuery, normalizedSelectedCategory]
  );

  const allProductsWithPromos = useMemo(() => {
    if (filteredProducts.length === 0) {
      return [];
    }

    const itemsPerBlock = Math.max(2, productGridColumns * 2);
    const productBlocks: Product[][] = [];
    for (let index = 0; index < filteredProducts.length; index += itemsPerBlock) {
      productBlocks.push(filteredProducts.slice(index, index + itemsPerBlock));
    }

    return productBlocks.map((block, blockIndex) => ({
      products: block,
      theme: inlinePromoThemes[blockIndex % inlinePromoThemes.length],
      promoProducts: pickPromoProducts(filteredProducts, 4, blockIndex + 1),
      showPromo: blockIndex < productBlocks.length - 1,
    }));
  }, [filteredProducts, productGridColumns]);

  const categories = useMemo(() => {
    const grouped = new Map<string, CategoryGroup>();

    sortedProducts.forEach((product) => {
      const categoryName = product.category?.trim() || "Uncategorized";
      const key = categoryName.toLowerCase();
      const current = grouped.get(key);

      if (current) {
        current.products.push(product);
      } else {
        grouped.set(key, {
          name: categoryName,
          products: [product],
        });
      }
    });

    const normalizedCategoryQuery = categoryQuery.toLowerCase().trim();
    const terms = normalizedCategoryQuery.split(/\s+/).filter(Boolean);

    return Array.from(grouped.values())
      .map((group) => {
        if (normalizedSelectedCategory && group.name.toLowerCase() !== normalizedSelectedCategory) {
          return null;
        }

        const categoryMatches = terms.length === 0
          ? true
          : terms.every((term) => group.name.toLowerCase().includes(term));

        const visibleProducts = categoryMatches
          ? [...group.products]
          : group.products.filter((product) => matchesSearch(product, normalizedCategoryQuery));

        if (visibleProducts.length === 0) {
          return null;
        }

        return {
          ...group,
          products: visibleProducts.sort(productNewestFirst),
        };
      })
      .filter((group): group is CategoryGroup => group !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sortedProducts, categoryQuery, normalizedSelectedCategory]);

  return (
    <section className="space-y-8">
      <section className="relative mb-6 overflow-hidden rounded-3xl border border-sky-200/70 bg-gradient-to-r from-[#b8d3f2] via-[#dcecff] to-[#c4dbf6] p-6 shadow-xl lg:p-8">
        <div className="pointer-events-none absolute -left-14 -top-14 h-56 w-56 rounded-full bg-white/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-700/80">Seasonal Spotlight</p>
            <h2 className="mt-2 text-3xl font-bold leading-tight text-slate-900 md:text-5xl">
              Up to 50% off wears, shoes, watches, speakers and smart gadgets
            </h2>
            <p className="mt-3 max-w-xl text-sm text-slate-700 md:text-base">
              Fresh drops and everyday essentials in one place. Style your look, upgrade your sound, and shop tech that fits your day.
            </p>

            <div className="okanga-sparkle mt-5 inline-flex items-center rounded-2xl border border-white/70 bg-white/80 px-4 py-2 shadow-sm backdrop-blur">
              <span className="okanga-glitter text-xl font-black md:text-3xl">OKANGA MART</span>
            </div>

            <p className="mt-3 text-xs uppercase tracking-[0.14em] text-slate-700/70">
              Fashion picks. Audio power. Smart lifestyle.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {heroShowcase.map((tile) => (
              <article
                className="group relative overflow-hidden rounded-2xl border border-white/70 shadow-md"
                key={`${tile.category}-${tile.title}`}
              >
                <img
                  alt={tile.title}
                  className="h-36 w-full bg-slate-100 object-contain transition duration-500 group-hover:scale-105 md:h-40"
                  src={tile.image}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent p-3 text-white">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/80">{tile.category}</p>
                  <p className="line-clamp-1 text-sm font-semibold">{tile.title}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      {statusMessage && <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{statusMessage}</p>}

      {loading ? (
        <p className="text-sm text-slate-600">Loading products...</p>
      ) : (
        <>
          <section id="products" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold">
                  {selectedCategory ? `${selectedCategory} Products` : "All Products"}
                </h3>
                {selectedCategory && (
                  <Link
                    className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    to="/"
                  >
                    Clear Category
                  </Link>
                )}
              </div>
              <input
                className="w-full max-w-md rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm"
                placeholder="Search products by name, keywords, or category..."
                type="search"
                value={allProductsQuery}
                onChange={(event) => setAllProductsQuery(event.target.value)}
              />
            </div>

            {filteredProducts.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                No products match your search.
              </p>
            ) : (
              <div className="space-y-6">
                {allProductsWithPromos.map((section, sectionIndex) => (
                  <div className="space-y-5" key={`product-block-${sectionIndex}`}>
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                      {section.products.map((product) => (
                        <ProductCard key={product.id} onAddToCart={onAddToCart} product={product} />
                      ))}
                    </div>

                    {section.showPromo && section.promoProducts.length > 0 && (
                      <article
                        className={`relative overflow-hidden rounded-3xl border border-white/70 p-6 shadow-xl lg:p-8 ${section.theme.panelClass}`}
                      >
                        <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-white/40 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-cyan-200/30 blur-3xl" />

                        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
                          <div className="space-y-3">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-700/80">{section.theme.eyebrow}</p>
                            <h4 className={`text-2xl font-black leading-tight md:text-4xl ${section.theme.titleClass}`}>
                              {section.theme.title}
                            </h4>
                            <p className="max-w-xl text-sm text-slate-700 md:text-base">{section.theme.subtitle}</p>

                            <div className="inline-flex items-center rounded-2xl border border-white/70 bg-white/85 px-4 py-2 shadow-sm backdrop-blur">
                              <span className={`bg-gradient-to-r bg-clip-text text-xl font-black text-transparent md:text-2xl ${section.theme.badgeClass}`}>
                                OKANGA MART
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {section.promoProducts.map((product) => (
                              <Link
                                className="group relative overflow-hidden rounded-2xl border border-white/60 shadow-md transition hover:-translate-y-0.5 hover:shadow-xl"
                                key={`promo-${sectionIndex}-${product.id}`}
                                to={`/products/${product.id}`}
                              >
                                <img
                                  alt={product.name}
                                  className="h-36 w-full bg-slate-100 object-contain transition duration-500 group-hover:scale-105 md:h-40"
                                  src={product.imageUrls?.[0] || `https://picsum.photos/seed/promo-${product.id}/900/650`}
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/85 via-slate-900/45 to-transparent p-3 text-white">
                                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/80">
                                    {product.category || "Featured"}
                                  </p>
                                  <p className="line-clamp-1 text-sm font-semibold">{product.name}</p>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </article>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section id="categories" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-semibold">Categories</h3>
              <input
                className="w-full max-w-md rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm"
                placeholder="Search categories or related product keywords..."
                type="search"
                value={categoryQuery}
                onChange={(event) => setCategoryQuery(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <a
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  href={`#${categoryAnchor(category.name)}`}
                  key={category.name}
                >
                  {category.name} ({category.products.length})
                </a>
              ))}
            </div>

            {categories.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                No categories match your search.
              </p>
            ) : (
              <div className="space-y-4">
                {categories.map((category) => (
                  <article
                    className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"
                    id={categoryAnchor(category.name)}
                    key={category.name}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-lg font-semibold">{category.name}</h4>
                      <p className="text-sm text-slate-500">{category.products.length} products</p>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                      {category.products.map((product) => (
                        <ProductCard key={`category-${category.name}-${product.id}`} onAddToCart={onAddToCart} product={product} />
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}

export default StorePage;
