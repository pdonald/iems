FROM ubuntu:14.04

RUN sed -i 's/archive.ubuntu.com/ubuntu-arch.linux.edu.lv/g' /etc/apt/sources.list && apt-get update && \
  apt-get install -y git-core g++ cmake libgoogle-perftools-dev libsparsehash-dev && \
  git clone --depth=1 https://github.com/clab/fast_align && \
  cd fast_align && \
  echo 'SET(CMAKE_EXE_LINKER_FLAGS "-static")' >> CMakeLists.txt && \
  mkdir build && \
  cd build && \
  cmake .. && \
  make -j`nproc` && \
  cp atools fast_align /usr/local/bin && \
  cd / && rm -rf fast_align && \
  cd /usr/local/bin && ln -s fast_align fastalign && \
  (find /usr/local/bin -type f -executable | xargs strip -s &> /dev/null) || true && \
  apt-get remove --purge -y git-core g++ cmake libgoogle-perftools-dev libsparsehash-dev && \
  apt-get autoremove --purge -y && \
  rm -rf /var/lib/apt/lists/*

CMD ["fast_align"]
