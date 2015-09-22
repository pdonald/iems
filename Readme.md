# Interactive EMS

An Interactive Experiment Management System for machine translation.

**Warning: this is still very much work in progress, it is not stable yet**

A project at the [Machine Translation Marathon 2015](http://ufal.mff.cuni.cz/mtm15).

<iframe src="//www.slideshare.net/slideshow/embed_code/key/FM3p5wbs4BX27" width="425" height="355" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px; max-width: 100%;" allowfullscreen> </iframe>

## Build

You will need [node.js](https://nodejs.org/en/).

Here is an easy way to install it:

```bash
curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash -
sudo apt-get install -y nodejs
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

### Moses and other tools

`setup.sh` will compile and install moses, mgiza, fast align, kenlm and cdec on Ubuntu Server 14.04.

### Vagrant

If you use Vagrant with VirtualBox, just do

```bash
vagrant up     # create, boot and setup virtual machine
vagrant ssh    # connect to VM
cd /vagrant    # go to this directory

npm install --no-bin-links
npm run build
npm start
```

and navigate to http://localhost:8080/ in Google Chrome.

Make sure you have plenty of RAM for this or it will take forever.

## TODO

* load/save
* multiple experiments
* error pane for missing connections, make output
* view file
* add tools in UI

## License

Apache 2.0
