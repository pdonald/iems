module.exports = {
  configs: {
    'testconf1': {
      id: 'testconf1',
      service: 'awsec2',
      name: 'AWS EC2 Micro 1GB/1vCPU',
      accessKeyId: 'AKIAIUF3Z6TBM7PW4GAQ',
      secretAccessKey: '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',
      region: 'eu-west-1b',
      instanceType: 't1.micro',
      imageId: 'ami-5da23a2a',
      sshPort: 22,
      sshUsername: 'ubuntu',
      sshPrivateKey: require('fs').readFileSync('c:\\users\\peteris\\downloads\\iems-test.pem').toString(),
      sshScript: 'touch /home/ubuntu/i-was-here && echo I am in!'
    },
  }
}
