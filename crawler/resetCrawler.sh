#!/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin
cd /root/headless-crawler/crawler
pkill chrome
pkill node
pkill ts-node
yarn shell --tabs=10 --waitfor=3000

