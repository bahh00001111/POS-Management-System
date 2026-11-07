#!/bin/bash

echo "Running database migrations and seeders..."
php artisan migrate --force --seed

echo "Starting Apache server..."
exec apache2-foreground