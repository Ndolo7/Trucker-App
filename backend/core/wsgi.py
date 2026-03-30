"""
WSGI config for trucker_app project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application
from decouple import config

django_env = config('DJANGO_ENV', default='dev')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', f'core.settings.{django_env}')

application = get_wsgi_application()
