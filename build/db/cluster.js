module.exports = {
  configs: {
    'testconf9': {
      id: 'testconf9',
      service: 'vagrant',
      name: 'Vagrant Ubuntu 14.04 LTS x64',
      box: 'ubuntu/trusty64',
      memory: '256',
      cores: '1',
      sshScript: 'touch /home/ubuntu/i-was-here && echo I am in!'
    },
    'testconf1': {
      id: 'testconf1',
      service: 'awsec2',
      name: 'AWS EC2 Spot Micro 1GB/1vCPU',
      accessKeyId: 'AKIAIUF3Z6TBM7PW4GAQ',
      secretAccessKey: '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',
      region: 'eu-west-1b',
      instanceType: 't1.micro',
      imageId: 'ami-5da23a2a',
      spotPrice: '0.05',
      sshPort: 22,
      sshUsername: 'ubuntu',
      sshPrivateKey: require('fs').readFileSync('c:\\users\\peteris\\downloads\\iems-test.pem').toString(),
      sshScript: 'touch /home/ubuntu/i-was-here && echo I am in!'
    },
    'testconf2': {
      id: 'testconf2',
      service: 'awsec2',
      name: 'AWS EC2 Micro 1GB/1vCPU',
      accessKeyId: 'AKIAIUF3Z6TBM7PW4GAQ',
      secretAccessKey: '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',
      region: 'eu-west-1b',
      instanceType: 't1.micro',
      imageId: 'ami-5da23a2a',
      spotPrice: null,
      sshPort: 22,
      sshUsername: 'ubuntu',
      sshPrivateKey: require('fs').readFileSync('c:\\users\\peteris\\downloads\\iems-test.pem').toString(),
      sshScript: 'touch /home/ubuntu/i-was-here && echo I am in!'
    },
  }
}
