#!/bin/bash
cd "$(dirname "$0")/python_backend"
nohup /usr/bin/python3.11 main.py > /tmp/julia_python_server.log 2>&1 &
echo "Python server started on port 8013"
