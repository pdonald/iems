.PHONY: all build docker publish test clean

all: clean build docker test

build:
	sudo apt-get install -y git build-essential cmake libgoogle-perftools-dev libsparsehash-dev

	git clone --depth=1 https://github.com/clab/fast_align

	cd fast_align && \
		echo 'SET(CMAKE_EXE_LINKER_FLAGS "-static")' >> CMakeLists.txt && \
		mkdir build && \
		cd build && \
		cmake ..

	make -C fast_align/build -j`nproc`

docker:
	docker build -t iems/fastalign .

publish:
	docker push iems/fastalign

test:
	docker run --rm iems/fastalign fast_align 2> /dev/null ; [ $$? -eq 1 ] && echo OK || echo FAIL
	docker run --rm iems/fastalign atools 2> /dev/null ; [ $$? -eq 1 ] && echo OK || echo FAIL

clean:
	rm -rf fast_align
