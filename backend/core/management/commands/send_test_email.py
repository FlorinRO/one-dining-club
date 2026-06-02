from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.email import EmailDeliveryError, send_transactional_email


class Command(BaseCommand):
    help = "Send a test email using the configured transactional email provider."

    def add_arguments(self, parser):
        parser.add_argument(
            "recipient",
            nargs="?",
            default=settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL,
            help="Recipient address for the test email.",
        )

    def handle(self, *args, **options):
        recipient = options["recipient"]
        if not recipient:
            raise CommandError(
                "No recipient was provided. Pass an email address or set EMAIL_HOST_USER in the environment."
            )

        try:
            send_transactional_email(
                subject="Yumzy transactional email test",
                message=(
                    "This is a Yumzy transactional email connectivity test.\n\n"
                    f"Provider: {settings.EMAIL_DELIVERY_PROVIDER}\n"
                    f"Base URL: {settings.SENDGRID_API_BASE_URL if settings.EMAIL_DELIVERY_PROVIDER == 'sendgrid' else 'n/a'}\n"
                ),
                recipient_list=[recipient],
            )
        except EmailDeliveryError as exc:
            raise CommandError(f"Failed to send test email to {recipient}.") from exc

        self.stdout.write(self.style.SUCCESS(f"Test email sent to {recipient}."))
