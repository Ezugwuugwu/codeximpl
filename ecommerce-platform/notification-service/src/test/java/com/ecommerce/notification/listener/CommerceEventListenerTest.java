package com.ecommerce.notification.listener;

import com.ecommerce.notification.model.NotificationMessage;
import com.ecommerce.notification.service.EmailNotificationService;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CommerceEventListenerTest {

    @Mock
    private EmailNotificationService emailNotificationService;

    @InjectMocks
    private CommerceEventListener listener;

    @Test
    void onOrderEvent_validPayload_callsSendWithCorrectMessage() {
        Map<String, Object> payload = Map.of(
            "userId", "alice@example.com",
            "orderId", "ord-123",
            "status", "PAID");

        listener.onOrderEvent(payload);

        ArgumentCaptor<NotificationMessage> captor = ArgumentCaptor.forClass(NotificationMessage.class);
        verify(emailNotificationService).send(captor.capture());
        NotificationMessage msg = captor.getValue();
        assertThat(msg.recipient()).isEqualTo("alice@example.com");
        assertThat(msg.subject()).contains("ord-123");
        assertThat(msg.body()).contains("PAID");
    }

    @Test
    void onOrderEvent_missingUserId_doesNotSendEmail() {
        Map<String, Object> payload = Map.of("orderId", "ord-123", "status", "PAID");

        listener.onOrderEvent(payload);

        verify(emailNotificationService, never()).send(any(NotificationMessage.class));
    }

    @Test
    void onOrderEvent_blankUserId_doesNotSendEmail() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("userId", "   ");
        payload.put("orderId", "ord-123");

        listener.onOrderEvent(payload);

        verify(emailNotificationService, never()).send(any(NotificationMessage.class));
    }

    @Test
    void onPaymentEvent_validPayload_callsSendWithCorrectMessage() {
        Map<String, Object> payload = Map.of(
            "userId", "bob@example.com",
            "orderId", "ord-456",
            "status", "APPROVED");

        listener.onPaymentEvent(payload);

        ArgumentCaptor<NotificationMessage> captor = ArgumentCaptor.forClass(NotificationMessage.class);
        verify(emailNotificationService).send(captor.capture());
        NotificationMessage msg = captor.getValue();
        assertThat(msg.recipient()).isEqualTo("bob@example.com");
        assertThat(msg.subject()).contains("ord-456");
        assertThat(msg.body()).contains("APPROVED");
    }

    @Test
    void onPaymentEvent_missingUserId_doesNotSendEmail() {
        Map<String, Object> payload = Map.of("orderId", "ord-456", "status", "APPROVED");

        listener.onPaymentEvent(payload);

        verify(emailNotificationService, never()).send(any(NotificationMessage.class));
    }
}
