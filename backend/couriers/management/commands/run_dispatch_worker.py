import time

from django.core.management.base import BaseCommand

from couriers.dispatch import dispatch_waiting_orders, process_expired_offers


class Command(BaseCommand):
    help = "Continuously advances expired courier offers and dispatches waiting delivery orders."

    def add_arguments(self, parser):
        parser.add_argument("--interval", type=float, default=2.0)
        parser.add_argument("--once", action="store_true")

    def handle(self, *args, **options):
        interval = max(0.5, options["interval"])
        while True:
            process_expired_offers()
            dispatch_waiting_orders()
            if options["once"]:
                return
            time.sleep(interval)
