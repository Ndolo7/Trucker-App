"""
ASGI config for trucker_app project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
from decouple import config

django_env = config('DJANGO_ENV', default='dev')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', f'core.settings.{django_env}')

application = get_asgi_application()
