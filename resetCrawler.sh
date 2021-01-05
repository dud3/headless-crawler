#!/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin
cd /root/headless-crawler
forever stopall
pkill chrome
pkill node
# service mysql restart
forever start -c "yarn shell --tabs=4 --waitfor=3000 --closetabs=true" ./
forever list
