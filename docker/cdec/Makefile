.PHONY: all build docker publish test clean

all: clean build docker test

build:
	sudo apt-get -y install git build-essential cmake flex libboost-all-dev libeigen3-dev libbz2-dev liblzma-dev

	git clone --depth=1 https://github.com/redpony/cdec /tmp/cdec
	mkdir cdec

	cd /tmp/cdec && \
		find -name CMakeLists.txt | xargs sed -i 's/foreach(testSrc $${TEST_SRCS})/foreach(testSrc $${TEST_SRCS})\nbreak()\n/g' && \
		head -n2 CMakeLists.txt > CMakeLists.txt.tmp && \
		echo 'set(Boost_USE_STATIC_LIBS ON)' >> CMakeLists.txt.tmp && \
		echo 'set(CMAKE_EXE_LINKER_FLAGS -static)' >> CMakeLists.txt.tmp && \
		echo 'set(CMAKE_FIND_LIBRARY_SUFFIXES .a)' >> CMakeLists.txt.tmp && \
		echo 'set(CMAKE_EXE_LINK_DYNAMIC_CXX_FLAGS)' >> CMakeLists.txt.tmp && \
		echo 'set(CMAKE_SHARED_LIBRARY_CXX_FLAGS)' >> CMakeLists.txt.tmp && \
		echo 'set(CMAKE_SHARED_LIBRARY_LINK_CXX_FLAGS)' >> CMakeLists.txt.tmp && \
		tail -n+3 CMakeLists.txt >> CMakeLists.txt.tmp && \
		mv CMakeLists.txt.tmp CMakeLists.txt && \
		mkdir build && \
		cd build && \
		cmake ..

	make -C /tmp/cdec/build -j`nproc`

	find /tmp/cdec/build -type f -executable | grep -v CMakeFiles | grep -v .so | xargs -i cp {} cdec/
	cp -r /tmp/cdec/corpus/ cdec/

	(find cdec/ -type f -executable | xargs strip -s &> /dev/null) || true

docker:
	docker build -t iems/cdec .

publish:
	docker push iems/cdec

test:
	docker run --rm iems/cdec cdec 2> /dev/null ; [ $$? -eq 1 ] && echo OK || echo FAIL
	docker run --rm iems/cdec sacompile 2> /dev/null ; [ $$? -eq 139 ] && echo OK || echo FAIL
	docker run --rm iems/cdec extract 2> /dev/null ; [ $$? -eq 139 ] && echo OK || echo FAIL

clean:
	rm -rf cdec /tmp/cdec
