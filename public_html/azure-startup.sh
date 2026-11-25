#!/bin/bash
set -e
cp /home/site/wwwroot/azure-nginx.conf /etc/nginx/sites-available/default
nginx -t
service nginx reload
