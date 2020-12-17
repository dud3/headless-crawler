#!/bin/bash
cd /root/headless-crawler
forever stopall
pkill chrome
pkill node
service mysql restart
forever start -c "yarn shell --tabs=10 --waitfor=3000 --sites=47350" ./
forever list
