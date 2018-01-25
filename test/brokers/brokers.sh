#!/bin/sh

# mosca
docker run --rm -d --name mosca -p 2083:1883 -p 2080:80 -v /var/db/mosca:/db matteocollina/mosca
# mosquitto
docker run --rm -d --name mosquitto eclipse-mosquitto -p 2183:1883 2180:80
# emq
docker run --rm -d --name emq -p 2022:8083 -p 2021:1883 sneck/emqttd:latest
