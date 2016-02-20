.PHONY: all build docker publish test clean

all: clean build docker test

build:
	sudo apt-get -y install git build-essential automake libtool \
	  libboost-all-dev zlib1g-dev libbz2-dev liblzma-dev \
	  libgoogle-perftools-dev python-dev \
	  pigz

	mkdir -p moses/bin

	wget http://downloads.sourceforge.net/project/cmph/cmph/cmph-2.0.tar.gz -O /tmp/cmph-2.0.tar.gz
	tar xf /tmp/cmph-2.0.tar.gz -C /tmp
	cd /tmp/cmph-2.0 && \
		./configure --prefix=/tmp/cmph-2.0/build && \
		make && \
		make install

	git clone --depth=1 https://github.com/moses-smt/mosesdecoder /tmp/moses

	cd /tmp/moses && \
		./bjam -a --static -j`nproc` --with-mm --with-cmph=/tmp/cmph-2.0/build

	find /tmp/moses/bin -maxdepth 1 -type f -executable -exec cp {} moses/bin/ \;
	cp -r /tmp/moses/scripts moses/ || true

	(find moses/ -type f -executable | xargs strip -s &> /dev/null) || true

docker:
	docker build -t iems/moses .

publish:
	docker push iems/moses

test:
	docker run --rm iems/moses moses 2> /dev/null ; [ $$? -eq 1 ] && echo OK || echo FAIL
	docker run --rm iems/moses extract 2> /dev/null ; [ $$? -eq 1 ] && echo OK || echo FAIL
	docker run --rm iems/moses perl /scripts/tokenizer/tokenizer.perl 2> /dev/null ; [ $$? -eq 0 ] && echo OK || echo FAIL

clean:
	rm -rf moses /tmp/moses /tmp/cmph-*
