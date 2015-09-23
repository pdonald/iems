#!/bin/bash

set -ex

export TOOLS=/tools
export WORK=$HOME

sudo apt-get -qq update
sudo apt-get -qq install htop unzip pigz wget curl coreutils
sudo apt-get -qq install build-essential cmake git automake libtool flex
sudo apt-get -qq install zlib1g-dev libboost-all-dev libbz2-dev liblzma-dev python-dev
sudo apt-get -qq install libboost-all-dev libgoogle-perftools-dev libsparsehash-dev libeigen3-dev
sudo apt-get -qq install graphviz imagemagick

sudo PERL_MM_USE_DEFAULT=1 cpan install XML::Twig > /dev/null

curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash -
sudo apt-get install -y nodejs

sudo mkdir -p $TOOLS $WORK
sudo chown -R $USER $TOOLS $WORK

cd $WORK
wget http://downloads.sourceforge.net/project/cmph/cmph/cmph-2.0.tar.gz
tar xf cmph-*.tar.gz
cd cmph-*
./configure --prefix=$PWD/build
make
make install

cd $WORK
git clone --depth=1 https://github.com/moses-smt/mosesdecoder
cd mosesdecoder
./bjam -a -j`nproc` --with-mm --with-cmph=$WORK/cmph-2.0/build --static
mkdir -p $TOOLS/moses && find bin -maxdepth 1 -type f -executable -exec cp {} $TOOLS/moses \;
cp -r scripts $TOOLS/moses

cd $WORK
git clone --depth=1 https://github.com/moses-smt/mgiza.git
cd mgiza/mgizapp
mkdir build
cd build
cmake ..
make -j`nproc`
mkdir -p $TOOLS/mgiza && cp bin/* $TOOLS/mgiza

cd $WORK
git clone --depth=1 https://github.com/clab/fast_align
cd fast_align
echo 'SET(CMAKE_EXE_LINKER_FLAGS "-static")' >> CMakeLists.txt
mkdir build
cd build
cmake ..
make -j`nproc`
mkdir -p $TOOLS/fast_align && cp atools fast_align $TOOLS/fast_align

cd $WORK
git clone --depth=1 https://github.com/kpu/kenlm
cd kenlm
./bjam -a -j`nproc` --static
mkdir -p $TOOLS/kenlm && find bin -maxdepth 1 -type f -executable -exec cp {} $TOOLS/kenlm \;

cd $WORK
git clone --depth=1 https://github.com/redpony/cdec
cd cdec
mkdir build
cd build
cmake ..
make -j`nproc`
mkdir -p $TOOLS/cdec && find . -type f -executable | grep -v CMakeFiles | grep -v .so | xargs -i cp {} $TOOLS/cdec
cp -r ../corpus $TOOLS/cdec

# strip executables
# before: 1.2G after: 279M
(find $TOOLS -type f -executable | xargs strip -s &> /dev/null) || true
