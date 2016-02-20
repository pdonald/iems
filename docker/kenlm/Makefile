.PHONY: all build docker publish test clean

all: clean build docker test

build:
	sudo apt-get -y install git build-essential libboost-all-dev

	git clone --depth=1 https://github.com/kpu/kenlm /tmp/kenlm
	mkdir kenlm

	cd /tmp/kenlm && \
		./bjam -a --static -j`nproc`

	find /tmp/kenlm/bin -maxdepth 1 -type f -executable -exec cp {} kenlm \;

docker:
	docker build -t iems/kenlm .

publish:
	docker push iems/kenlm

test:
	docker run --rm iems/kenlm lmplz 2> /dev/null ; [ $$? -eq 1 ] && echo OK || echo FAIL
	docker run --rm iems/kenlm build_binary 2> /dev/null ; [ $$? -eq 1 ] && echo OK || echo FAIL

clean:
	rm -rf kenlm /tmp/kenlm
