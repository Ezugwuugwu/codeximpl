package com.ecommerce.order.config;

import com.ecommerce.order.domain.CustomerOrder;
import com.ecommerce.order.domain.OrderItem;
import com.ecommerce.order.domain.OrderStatus;
import com.ecommerce.order.repository.CustomerOrderRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class OrderDataSeeder implements CommandLineRunner {

    private final CustomerOrderRepository repository;

    public OrderDataSeeder(CustomerOrderRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        long currentCount = repository.count();
        if (currentCount >= 6) {
            return;
        }

        List<CustomerOrder> demoOrders = List.of(
            order("demo-user", OrderStatus.PAID, Instant.now().minusSeconds(60L * 60 * 4),
                item(1L, "Aether Pro Wireless Earbuds", 2, "129.99"),
                item(10L, "ChefCraft Air Fryer 7L", 1, "132.49")),
            order("demo-user", OrderStatus.SHIPPED, Instant.now().minusSeconds(60L * 60 * 11),
                item(18L, "ArcadeStorm Mechanical Keyboard", 1, "119.99"),
                item(19L, "TitanX Wireless Mouse", 1, "89.00")),
            order("user-1002", OrderStatus.DELIVERED, Instant.now().minusSeconds(60L * 60 * 27),
                item(5L, "PulseFit Smartwatch X2", 1, "249.00")),
            order("user-1003", OrderStatus.CREATED, Instant.now().minusSeconds(60L * 90),
                item(12L, "PureSleep Memory Foam Pillow", 2, "38.00"),
                item(15L, "HydraRepair Moisturizer", 1, "29.50")),
            order("user-1004", OrderStatus.FULFILLING, Instant.now().minusSeconds(60L * 60 * 8),
                item(3L, "Luma 4K Smart TV 55\"", 1, "699.00")),
            order("demo-user", OrderStatus.PAYMENT_PENDING, Instant.now().minusSeconds(60L * 35),
                item(20L, "CanvasCraft Denim Jacket", 1, "74.00"))
        );

        int missing = (int) Math.max(0, 6 - currentCount);
        repository.saveAll(demoOrders.subList(0, Math.min(missing, demoOrders.size())));
    }

    private CustomerOrder order(String userId, OrderStatus status, Instant createdAt, OrderItem... items) {
        CustomerOrder order = new CustomerOrder();
        order.setUserId(userId);
        order.setStatus(status);
        order.setCreatedAt(createdAt);

        BigDecimal total = BigDecimal.ZERO;
        for (OrderItem item : items) {
            order.addItem(item);
            total = total.add(item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
        }
        order.setTotalAmount(total);
        return order;
    }

    private OrderItem item(Long productId, String productName, Integer quantity, String unitPrice) {
        OrderItem item = new OrderItem();
        item.setProductId(productId);
        item.setProductName(productName);
        item.setQuantity(quantity);
        item.setUnitPrice(new BigDecimal(unitPrice));
        return item;
    }
}
