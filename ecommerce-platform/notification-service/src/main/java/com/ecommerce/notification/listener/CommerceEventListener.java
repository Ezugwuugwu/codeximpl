package com.ecommerce.notification.listener;

import com.ecommerce.notification.model.NotificationMessage;
import com.ecommerce.notification.service.EmailNotificationService;
import java.util.Map;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class CommerceEventListener {

    private final EmailNotificationService emailNotificationService;

    public CommerceEventListener(EmailNotificationService emailNotificationService) {
        this.emailNotificationService = emailNotificationService;
    }

    @RabbitListener(queues = "order.events")
    public void onOrderEvent(Map<String, Object> payload) {
        String recipient = payload.getOrDefault("userId", "customer").toString() + "@example.com";
        String orderId = payload.getOrDefault("orderId", "N/A").toString();
        String status = payload.getOrDefault("status", "UNKNOWN").toString();

        emailNotificationService.send(new NotificationMessage(
            recipient,
            "Order update: " + orderId,
            "Your order status is now " + status + "."));
    }

    @RabbitListener(queues = "payment.events")
    public void onPaymentEvent(Map<String, Object> payload) {
        String recipient = payload.getOrDefault("userId", "customer").toString() + "@example.com";
        String orderId = payload.getOrDefault("orderId", "N/A").toString();
        String status = payload.getOrDefault("status", "UNKNOWN").toString();

        emailNotificationService.send(new NotificationMessage(
            recipient,
            "Payment update for order " + orderId,
            "Payment status: " + status + "."));
    }
}
