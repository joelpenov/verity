#!/bin/bash
set -euo pipefail
exec gunicorn --chdir /home/site/wwwroot --workers 1 --timeout 300 --bind 0.0.0.0:8000 app:app
