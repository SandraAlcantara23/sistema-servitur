"""
core/management/commands/seed_turnos.py

Crea los 8 turnos estándar (si no existen ya) para que el formulario de
Aforo tenga algo que mostrar sin tener que darlos de alta a mano uno por
uno desde /admin/. Es seguro correrlo más de una vez: usa get_or_create,
así que no duplica nada si ya existen.

Uso:
    docker compose exec backend python manage.py seed_turnos
"""
from django.core.management.base import BaseCommand

from core.models import Turno

TURNOS = [
    "Primer turno entrada",
    "Primer turno salida",
    "Segundo turno entrada",
    "Segundo turno salida",
    "Tercer turno entrada",
    "Tercer turno salida",
    "Turno mixto entrada",
    "Turno mixto salida",
]


class Command(BaseCommand):
    help = "Crea los 8 turnos estándar usados en Aforo, si no existen ya."

    def handle(self, *args, **options):
        creados = 0
        for nombre in TURNOS:
            _, fue_creado = Turno.objects.get_or_create(nombre=nombre)
            if fue_creado:
                creados += 1
        self.stdout.write(self.style.SUCCESS(
            f"Listo: {creados} turno(s) nuevo(s) creado(s), {len(TURNOS) - creados} ya existían."
        ))