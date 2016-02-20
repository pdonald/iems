FROM ubuntu:14.04

RUN sed -i 's/archive.ubuntu.com/ubuntu-arch.linux.edu.lv/g' /etc/apt/sources.list && apt-get update && \
  apt-get install -y git-core g++ cmake libboost-all-dev && \
  git clone --depth=1 https://github.com/moses-smt/mgiza.git && \
  cd mgiza/mgizapp && \
  mkdir build && \
  cd build && \
  cmake .. && \
  make -j`nproc` && \
  cp bin/* /usr/local/bin && \
  cd / && rm -rf mgiza && \
  (find /usr/local/bin -type f -executable | xargs strip -s &> /dev/null) || true && \
  apt-get remove -y git-core g++ cmake && \
  apt-get autoremove -y && \
  rm -rf /var/lib/apt/lists/*

CMD ["bash"]
