Vagrant.configure("2") do |config|
  # Ubuntu 14.04 LTS x64 official cloud image
  config.vm.box = "ubuntu/trusty64"
  config.vm.box_check_update = false

  # VirtualBox
  config.vm.provider "virtualbox" do |vb|
    vb.name = "iEMS" # friendly name that shows up in Oracle VM VirtualBox Manager
    vb.memory = 4096 # memory in megabytes
    vb.cpus = 2 # cpu cores, can't be more than the host actually has!
    vb.customize ["modifyvm", :id, "--natdnshostresolver1", "on"] # fixes slow dns lookups
  end

  # use local ubuntu mirror
  config.vm.provision :shell, inline: "sed -i 's/archive.ubuntu.com/lv.archive.ubuntu.com/g' /etc/apt/sources.list"
  # add swap
  config.vm.provision :shell, inline: "fallocate -l 4G /swapfile && chmod 0600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab"
  # install moses & friends
  config.vm.provision :shell, path: "setup.sh", privileged: false

  # enable logging in via ssh with a password
  config.ssh.username = "vagrant"
  config.ssh.password = "vagrant"

  # network
  config.vm.network "forwarded_port", guest: 8080, host: 8080
  config.vm.network "forwarded_port", guest: 8081, host: 8081
end
