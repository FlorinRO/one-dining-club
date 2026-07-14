#!/bin/sh
set -e

python manage.py migrate
python manage.py collectstatic --noinput
python manage.py run_dispatch_worker --interval 2 &
exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}"
