"""
Email service using Python standard libraries.

Usage:
  1) Set environment variables:
     - SMTP_HOST
     - SMTP_PORT (e.g., 587 for STARTTLS or 465 for SSL)
     - SMTP_USER
     - SMTP_PASSWORD (use an app password if provider requires it)
     - SMTP_USE_TLS (true/false, optional; defaults to true for port 587)
  2) Call EmailService(...).send_email(...)
"""

from __future__ import annotations

import os
import smtplib
import ssl
from getpass import getpass
from dataclasses import dataclass
from email.message import EmailMessage
from typing import Iterable, Optional


@dataclass(frozen=True)
class SmtpConfig:
    host: str
    port: int
    username: str
    password: str
    use_tls: bool


class EmailService:
    """
    Sends emails via SMTP with secure defaults.
    Uses only the Python standard library.
    """

    def __init__(self, config: SmtpConfig) -> None:
        self._config = config

    @staticmethod
    def from_env() -> "EmailService":
        """
        Create an EmailService from environment variables.
        """
        host = os.environ.get("SMTP_HOST", "").strip()
        port_str = os.environ.get("SMTP_PORT", "").strip() or "587"
        user = os.environ.get("SMTP_USER", "").strip()
        password = os.environ.get("SMTP_PASSWORD", "")
        use_tls_str = os.environ.get("SMTP_USE_TLS", "").strip().lower()

        if not host or not user or not password:
            raise ValueError(
                "Missing SMTP configuration. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD."
            )

        try:
            port = int(port_str)
        except ValueError as exc:
            raise ValueError("SMTP_PORT must be an integer.") from exc

        if use_tls_str in {"true", "1", "yes"}:
            use_tls = True
        elif use_tls_str in {"false", "0", "no"}:
            use_tls = False
        else:
            use_tls = port == 587

        return EmailService(
            SmtpConfig(
                host=host,
                port=port,
                username=user,
                password=password,
                use_tls=use_tls,
            )
        )

    def send_email(
        self,
        *,
        subject: str,
        body: str,
        sender: str,
        recipients: Iterable[str],
        reply_to: Optional[str] = None,
    ) -> None:
        """
        Send an email.
        """
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = sender
        msg["To"] = ", ".join(recipients)
        if reply_to:
            msg["Reply-To"] = reply_to
        msg.set_content(body)

        if self._config.use_tls and self._config.port == 465:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(
                self._config.host, self._config.port, context=context
            ) as server:
                server.login(self._config.username, self._config.password)
                server.send_message(msg)
            return

        with smtplib.SMTP(self._config.host, self._config.port) as server:
            if self._config.use_tls:
                context = ssl.create_default_context()
                server.starttls(context=context)
            server.login(self._config.username, self._config.password)
            server.send_message(msg)

    @staticmethod
    def delivery_instructions() -> str:
        """
        How to make sure you can receive the email.
        """
        return (
            "To receive emails sent by this code:\n"
            "1) Use a real SMTP provider (e.g., Gmail, Outlook, SendGrid).\n"
            "2) Create an app password if your provider requires it.\n"
            "3) Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD in your environment.\n"
            "4) Make sure the sender address is allowed by your SMTP provider.\n"
            "5) Check spam/junk folders the first time you test.\n"
        )


def _get_env_recipients() -> list[str]:
    raw = os.environ.get("TEST_EMAIL_TO", "").strip()
    if not raw:
        raise ValueError(
            "Missing TEST_EMAIL_TO. Set it to a comma-separated list of recipients."
        )
    return [addr.strip() for addr in raw.split(",") if addr.strip()]


def _run_test_email() -> None:
    # If required env vars are missing, fall back to interactive prompts.
    try:
        service = EmailService.from_env()
        recipients = _get_env_recipients()
        sender = os.environ.get("TEST_EMAIL_FROM", "").strip() or service._config.username
        subject = os.environ.get("TEST_EMAIL_SUBJECT", "").strip() or "EmailService test"
        body = os.environ.get("TEST_EMAIL_BODY", "").strip() or (
            "This is a test email sent by EmailService."
        )
    except ValueError:
        host = input("SMTP host (e.g., smtp.gmail.com): ").strip()
        port = int(input("SMTP port (e.g., 587): ").strip() or "587")
        user = input("SMTP user (email address): ").strip()
        password = getpass("SMTP app password (hidden): ").strip()
        use_tls_input = input("Use TLS? [Y/n]: ").strip().lower()
        use_tls = use_tls_input not in {"n", "no"}

        to_raw = input("Recipient email(s) (comma-separated): ").strip()
        recipients = [addr.strip() for addr in to_raw.split(",") if addr.strip()]
        sender = input("From email (blank = SMTP user): ").strip() or user
        subject = input("Subject (blank = default): ").strip() or "EmailService test"
        body = input("Body (blank = default): ").strip() or (
            "This is a test email sent by EmailService."
        )

        service = EmailService(
            SmtpConfig(
                host=host,
                port=port,
                username=user,
                password=password,
                use_tls=use_tls,
            )
        )

    service.send_email(
        subject=subject,
        body=body,
        sender=sender,
        recipients=recipients,
    )
    print("Test email sent.")


if __name__ == "__main__":
    _run_test_email()
