#!/bin/bash

echo "Running database migrations and seeders..."
php artisan migrate --force --seed

echo "Creating storage symlink..."
php artisan storage:link --force

echo "Starting Apache server..."
exec apache2-foreground