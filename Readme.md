# Interactive EMS

An Interactive Experiment Management System for machine translation.

[![iEMS Demo Video](http://img.youtube.com/vi/BRu9kYJ9-iE/0.jpg)](http://www.youtube.com/watch?v=BRu9kYJ9-iE "iEMS Demo Video")

**Warning: this project is under heavy development**

## Build

You will need [node.js](https://nodejs.org/en/) 6.x.

On Windows, [download](https://nodejs.org/dist/v6.1.0/node-v6.1.0-x64.msi) and install the latest 6.x (stable) version with the Windows Installer (.msi).

On Ubuntu 14.04, here is an easy way to install node.js via apt-get

```bash
curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Run it

```bash
npm install    # install dependencies
npm run build  # build app
npm start      # start web server
```

and navigate to [http://localhost:8081](http://localhost:8081) in your browser.

For development

```bash
npm run dev &
npm start
```

and navigate to [http://localhost:8080](http://localhost:8080) in your browser.

(Note that designer performance in development mode is a lot worse)

## Cluster

You can launch new virtual servers for running your experiments.

### AWS EC2

* Sign up for [Amazon Web Services (AWS)](https://aws.amazon.com/getting-started/). You'll need to enter your credit card details.
* Log into [AWS Management Console](https://console.aws.amazon.com/console/home)
* Go to [Security Credentials](https://console.aws.amazon.com/iam/home#security_credential), expand Access Keys (Access Key ID and Secret Access Key)
* Click `Create New Access Key`, then `Show Access Key` and then write it down (you won't be able to see the secret access key again)
* Guard the secret access key like your credit card number

### Vagrant

[Vagrant](https://www.vagrantup.com/) is a tool that lets you quickly launch virtual machines in VirtualBox.

#### Windows

* Download and install [Oracle VirtualBox](https://www.virtualbox.org/wiki/Downloads)
* Download and install [Vagrant](https://www.vagrantup.com/downloads.html)

#### Linux

Ubuntu 14.04

```
sudo apt-get install -y virtualbox virtualbox-dkms vagrant
```

## License

Apache 2.0
