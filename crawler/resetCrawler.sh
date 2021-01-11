#!/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin
cd /root/headless-crawler
pkill chrome
pkill node
pkill ts-node
service mysql restart
forever start -c "yarn shell --crawler=localhost --tabs=10 --waitfor=3000" ./
