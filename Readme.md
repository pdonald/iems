# Interactive EMS

An Interactive Experiment Management System for machine translation.

[Demo](http://pdonald.github.io/iems/) (Google Chrome recommended, should also work in Firefox, IE11 and Edge)

**Warning: this is still very much work in progress, it is not stable yet**

A project at the [Machine Translation Marathon 2015](http://ufal.mff.cuni.cz/mtm15).
[Project presentation](http://www.slideshare.net/matissrikters/interactive-experiment-management-system).

## Build

You will need [node.js](https://nodejs.org/en/).

Here is an easy way to install it:

```bash
curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash -
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
npm run dev &
npm start
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

and navigate to [http://localhost:8081/](http://localhost:8081/) in your browser.

Make sure you have plenty of RAM for this or it will take forever.

## Cluster

You can launch new virtual servers for running your experiments.

### AWS EC2

* Sign up for [Amazon Web Services (AWS)](https://aws.amazon.com/getting-started/). You'll need to enter your credit card details.
* Log into [AWS Management Console](https://console.aws.amazon.com/console/home)
* Go to [Security Credentials](https://console.aws.amazon.com/iam/home#security_credential), expand Access Keys (Access Key ID and Secret Access Key)
* Click `Create New Access Key`, then `Show Access Key` and then write it down (you won't be able to see the secret access key again)
* Guard the secret access key like your credit card number

### Vagrant

[Vagrant](https://www.vagrantup.com/) is a tool that lets you quickly launch machines in VirtualBox.

#### Windows

* Download and install [Oracle VirtualBox](https://www.virtualbox.org/wiki/Downloads)
* Download and install [Vagrant](https://www.vagrantup.com/downloads.html)

#### Linux

Ubuntu 14.04 LTS

```
sudo apt-get install -y virtualbox virtualbox-dkms vagrant
```

## License

Apache 2.0
