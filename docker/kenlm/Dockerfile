FROM ubuntu:14.04

RUN sed -i 's/archive.ubuntu.com/ubuntu-arch.linux.edu.lv/g' /etc/apt/sources.list && apt-get update && \
  apt-get install -y git-core g++ libboost-all-dev && \
  git clone --depth=1 https://github.com/kpu/kenlm && \
  cd kenlm && \
  ./bjam -a -j`nproc` --static && \
  find bin -maxdepth 1 -type f -executable -exec cp {} /usr/local/bin \;  && \
  (find /usr/local/bin -type f -executable | xargs strip -s &> /dev/null) || true && \
  cd / && rm -rf kenlm && \
  apt-get remove -y git-core g++ libboost-all-dev && \
  apt-get autoremove -y && \
  rm -rf /var/lib/apt/lists/*

CMD ["lmplz"]
