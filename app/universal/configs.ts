enum Service {
  AwsEc2,
  Vagrant,
  LocalSsh
}

interface LaunchConfig {
  id: string;
  service: Service;
  name: string;
}

class AwsEc2LaunchConfig implements LaunchConfig {
  id: string;
  service: Service = Service.AwsEc2;
  name: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  instanceType: string;
  imageId: string;
  spotPrice: number;
  sshPort: number;
  sshUsername: string;
  sshScript: string;
}

class VagrantLaunchConfig implements LaunchConfig {
  id: string;
  service: Service = Service.Vagrant;
  name: string;
  box: string;
  memory: number;
  cores: number;
  sshScript: string;
}

class LocalSshLaunchConfig implements LaunchConfig {
  id: string;
  service: Service = Service.LocalSsh;
  name: string;
  sshHost: string;
  sshPort: number;
  sshUsername: string;
  sshPassword: string;
  sshPrivateKey: string;
  sshScript: string;
}
