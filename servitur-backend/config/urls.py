"""
config/urls.py
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView
from core.views import MiTokenObtainPairView
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/token/", MiTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/", include("core.urls")),
]
# Sirve los archivos subidos (p. ej. el documento de un Permiso) en
# desarrollo. En producción esto normalmente lo maneja el servidor web o un
# almacenamiento externo, no Django.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    context_processors = [
        'django.template.context_processors.debug',
        'django.template.context_processors.request',
        'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages'
    ]
    