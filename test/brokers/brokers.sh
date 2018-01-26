#!/bin/sh

# mosca
docker run --rm -d --name mosca -p 2001:1883 -p 2002:80 -v /var/db/mosca:/db matteocollina/mosca
# mosquitto
docker run --rm -d --name mosquitto -p 2011:1883 -p 2012:9001 toke/mosquitto
# emq
docker run --rm -d --name emq -p 2021:1883 -p 2022:8083 sneck/emqttd:latest
