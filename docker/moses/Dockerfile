FROM ubuntu:14.04

RUN sudo apt-get update
RUN sudo apt-get install -y xml-twig-tools

COPY moses/bin/moses /bin/moses
COPY moses/bin/extract /bin/extract
COPY moses/bin/score /bin/score
COPY moses/bin/consolidate /bin/consolidate
COPY moses/bin/processPhraseTableMin /bin/processPhraseTableMin
COPY moses/bin/lexical-reordering-score /bin/lexical-reordering-score
COPY moses/bin/processLexicalTableMin /bin/processLexicalTableMin
COPY moses/bin/mtt-build /bin/mtt-build
COPY moses/bin/symal2mam /bin/symal2mam
COPY moses/bin/mmlex-build /bin/mmlex-build
COPY moses/bin/mert /bin/mert
COPY moses/scripts/ /scripts/

CMD ["moses"]
