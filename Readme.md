# Interactive EMS

An Interactive Experiment Management System for machine translation.

A project at the [Machine Translation Marathon 2015](http://ufal.mff.cuni.cz/mtm15).

## Build

You will need [node.js](https://nodejs.org/en/).

Here is an easy way to install it:

```bash
git clone https://github.com/creationix/nvm.git ~/.nvm
cd ~/.nvm
git checkout `git describe --abbrev=0 --tags`
. ~/.nvm/nvm.sh
nvm install stable
```

Run it

```bash
npm install    # install dependencies
npm run build  # build app
npm start      # start web server
```

For development

```bash
npm run dev
```

## License

Apache 2.0
