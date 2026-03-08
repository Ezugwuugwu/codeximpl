package com.ecommerce.product.config;

import com.ecommerce.product.domain.Product;
import com.ecommerce.product.repository.ProductRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ProductCatalogSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ProductCatalogSeeder.class);

    private final ProductRepository repository;
    private final JdbcTemplate jdbcTemplate;

    public ProductCatalogSeeder(ProductRepository repository, JdbcTemplate jdbcTemplate) {
        this.repository = repository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @Transactional
    public void run(String... args) {
        ensureImageColumnSupportsLargePayloads();

        List<Product> existing = repository.findAll();
        boolean patchedExisting = false;
        for (Product product : existing) {
            boolean patchedProduct = false;
            List<String> imageUrls = product.getImageUrls();
            if (imageUrls == null || imageUrls.isEmpty()) {
                imageUrls = defaultImages(product.getName());
                product.setImageUrls(imageUrls);
                patchedProduct = true;
            }
            if (product.getPrimaryImageUrl() == null && imageUrls != null && !imageUrls.isEmpty()) {
                product.setPrimaryImageUrl(imageUrls.get(0));
                patchedProduct = true;
            }
            if (product.getImageCount() == null || product.getImageCount() != (imageUrls == null ? 0 : imageUrls.size())) {
                product.setImageCount(imageUrls == null ? 0 : imageUrls.size());
                patchedProduct = true;
            }
            if (patchedProduct) {
                product.setUpdatedAt(Instant.now());
                patchedExisting = true;
            }
        }
        if (patchedExisting) {
            repository.saveAll(existing);
        }

        if (existing.size() >= 20) {
            return;
        }

        List<Product> catalog = List.of(
            product("Aether Pro Wireless Earbuds", "Adaptive noise cancellation earbuds with transparency mode and wireless charging case.", "129.99", 340, "Audio"),
            product("NordicSound Studio Headphones", "Over-ear Bluetooth headphones with 40-hour battery life and hi-res audio tuning.", "219.00", 140, "Audio"),
            product("Luma 4K Smart TV 55\"", "55-inch 4K UHD panel with HDR10+, voice assistant support, and app streaming.", "699.00", 55, "Electronics"),
            product("OrbitMesh Wi-Fi 6 Router", "Dual-band Wi-Fi 6 mesh router with parental controls and guest network isolation.", "179.50", 120, "Electronics"),
            product("PulseFit Smartwatch X2", "Fitness smartwatch with blood oxygen sensor, GPS tracking, and sleep insights.", "249.00", 95, "Wearables"),
            product("StrideFlow Running Shoes", "Breathable lightweight shoes with reactive foam cushioning for daily training.", "98.00", 260, "Footwear"),
            product("TerraGrip Hiking Boots", "Water-resistant hiking boots with reinforced ankle support and anti-slip outsole.", "154.99", 88, "Footwear"),
            product("NovaFlex Yoga Mat", "Eco-friendly non-slip yoga mat with extra knee support and alignment markings.", "42.75", 420, "Fitness"),
            product("IronCore Kettlebell Set", "Cast-iron kettlebells in 8kg, 12kg, and 16kg sizes with textured grip handles.", "139.00", 70, "Fitness"),
            product("ChefCraft Air Fryer 7L", "Digital air fryer with 10 preset programs, rapid heating, and dishwasher-safe basket.", "132.49", 110, "Home Appliances"),
            product("BrewMaster Espresso Machine", "Semi-automatic espresso machine with pressure gauge and steam wand for latte art.", "359.00", 48, "Home Appliances"),
            product("PureSleep Memory Foam Pillow", "Cooling memory foam pillow with ergonomic neck support and hypoallergenic cover.", "38.00", 300, "Home & Living"),
            product("AeroDesk Ergonomic Chair", "Adjustable office chair with lumbar support, breathable mesh back, and 3D armrests.", "289.99", 65, "Home & Living"),
            product("GlowSkin Vitamin C Serum", "Brightening facial serum with vitamin C, niacinamide, and hyaluronic acid.", "24.99", 500, "Beauty"),
            product("HydraRepair Moisturizer", "Ceramide-rich daily moisturizer for dry and sensitive skin with SPF 30.", "29.50", 390, "Beauty"),
            product("UrbanShield Backpack", "Anti-theft commuter backpack with laptop compartment, USB passthrough, and rain cover.", "79.00", 210, "Bags"),
            product("Nimbus Traveler Carry-On", "Hard-shell 360-spinner carry-on luggage with TSA lock and compression straps.", "169.00", 78, "Travel"),
            product("ArcadeStorm Mechanical Keyboard", "Hot-swappable RGB mechanical keyboard with gasket mount and PBT keycaps.", "119.99", 160, "Gaming"),
            product("TitanX Wireless Mouse", "Ultra-light gaming mouse with 26K DPI sensor and lag-free 2.4GHz connectivity.", "89.00", 230, "Gaming"),
            product("CanvasCraft Denim Jacket", "Classic-fit denim jacket with stretch comfort lining and reinforced seams.", "74.00", 175, "Fashion")
        );

        List<Product> missingProducts = catalog.stream()
            .filter(product -> !repository.existsByNameIgnoreCase(product.getName()))
            .toList();

        if (!missingProducts.isEmpty()) {
            repository.saveAll(missingProducts);
        }
    }

    private Product product(String name, String description, String price, Integer stock, String category) {
        Product product = new Product();
        product.setName(name);
        product.setDescription(description);
        product.setPrice(new BigDecimal(price));
        product.setStock(stock);
        product.setCategory(category);
        List<String> imageUrls = defaultImages(name);
        product.setImageUrls(imageUrls);
        product.setPrimaryImageUrl(imageUrls.get(0));
        product.setImageCount(imageUrls.size());
        product.setActive(true);
        product.setUpdatedAt(Instant.now());
        return product;
    }

    private List<String> defaultImages(String seedBase) {
        String slug = seedBase.toLowerCase()
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("(^-|-$)", "");

        return List.of(
            "https://picsum.photos/seed/" + slug + "-1/1000/700",
            "https://picsum.photos/seed/" + slug + "-2/1000/700",
            "https://picsum.photos/seed/" + slug + "-3/1000/700"
        );
    }

    private void ensureImageColumnSupportsLargePayloads() {
        try {
            jdbcTemplate.execute("ALTER TABLE IF EXISTS product_images ALTER COLUMN image_url TYPE TEXT");
        } catch (Exception exception) {
            log.warn("Could not alter product_images.image_url to TEXT. Continuing startup.", exception);
        }
    }
}
