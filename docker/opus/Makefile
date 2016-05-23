.PHONY: all docker publish test

all: docker test

docker:
	docker build -t iems/opus .

publish:
	docker push iems/opus

test:
	docker run --rm iems/opus unzip > /dev/null ; [ $$? -eq 0 ] && echo OK || echo FAIL
	docker run --rm iems/opus wget --help > /dev/null ; [ $$? -eq 0 ] && echo OK || echo FAIL
