#!/bin/bash

set -ex

curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash -
sudo apt-get install -y nodejs

curl -sSL https://get.docker.com/ | sudo sh
sudo usermod -aG docker $USER
