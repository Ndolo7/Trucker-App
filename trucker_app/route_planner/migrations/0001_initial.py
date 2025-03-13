# Generated by Django 5.1.7 on 2025-03-11 17:36

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Driver',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('license_number', models.CharField(max_length=50)),
            ],
        ),
        migrations.CreateModel(
            name='LogSheet',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.CharField(max_length=50)),
                ('from_location', models.CharField(max_length=255)),
                ('to_location', models.CharField(max_length=255)),
                ('total_miles', models.IntegerField()),
                ('carrier', models.CharField(max_length=100)),
                ('remarks', models.TextField(blank=True)),
                ('shipping_documents', models.CharField(blank=True, max_length=255)),
            ],
        ),
        migrations.CreateModel(
            name='LogActivity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('offDuty', 'Off Duty'), ('sleeperBerth', 'Sleeper Berth'), ('driving', 'Driving'), ('onDuty', 'On Duty')], max_length=20)),
                ('start_time', models.CharField(max_length=10)),
                ('end_time', models.CharField(max_length=10)),
                ('location', models.CharField(max_length=255)),
                ('remarks', models.TextField(blank=True)),
                ('log_sheet', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='activities', to='route_planner.logsheet')),
            ],
        ),
        migrations.CreateModel(
            name='Trip',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('current_location', models.CharField(max_length=255)),
                ('pickup_location', models.CharField(max_length=255)),
                ('dropoff_location', models.CharField(max_length=255)),
                ('current_cycle_hours', models.FloatField(default=0)),
                ('total_distance', models.FloatField(blank=True, null=True)),
                ('total_drive_time', models.FloatField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('driver', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='trips', to='route_planner.driver')),
            ],
        ),
        migrations.CreateModel(
            name='Stop',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('location', models.CharField(max_length=255)),
                ('stop_type', models.CharField(choices=[('PICKUP', 'Pickup'), ('DROPOFF', 'Dropoff'), ('FUEL', 'Fueling'), ('BREAK', 'Required Break'), ('REST', 'Required Rest Period')], max_length=20)),
                ('duration', models.FloatField()),
                ('arrival_time', models.CharField(max_length=20)),
                ('sequence', models.IntegerField()),
                ('trip', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='stops', to='route_planner.trip')),
            ],
        ),
        migrations.AddField(
            model_name='logsheet',
            name='trip',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='log_sheets', to='route_planner.trip'),
        ),
    ]
