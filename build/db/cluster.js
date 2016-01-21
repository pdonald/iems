module.exports = {
  services: {
    awsec2: null,
    gcloud: {
      id: 'gcloud',
      name: 'Google Cloud',
      title: 'Google Cloud',
      ui: {
        configs: {
          columns: {
            name: { title: 'Name' },
            region: { title: 'Region' },
            type: { title: 'Instance type' }
          },
          form: {
            name: { label: 'Name' },
            service: { hidden: true, value: 'gcloud' },
            sshPort: { defaultValue: 22, label: 'SSH Port' },
            sshUsername: { defaultValue: 'ubuntu', label: 'SSH Username' },
            sshPrivateKey: { label: 'SSH Private Key', secret: true }
          }
        }
      }
    }
  },
  instances: {},
  configs: {
    'testconf1': {
      id: 'testconf1',
      name: 'AWS EC2 Micro 1GB/1vCPU',
      service: 'awsec2',
      accessKeyId: '***',
      secretAccessKey: '***',
      region: 'eu-west-1b',
      instanceType: 't1.micro',
      imageId: 'ami-5da23a2a',
      sshPort: 22,
      sshUsername: 'ubuntu',
      sshPrivateKey: require('fs').readFileSync('c:\\users\\peteris\\downloads\\iems-test.pem').toString(),
      sshScript: 'touch /home/ubuntu/i-was-here && echo I am in!'
    },
    /* '1': { id: 1, service: 'awsec2', name: 'Spot 2vCPU/15GB - $0.04/h', region: 'eu-west-1b', instanceType: 'r2.large', itype: 'spot'},
    '2': { id: 2, service: 'awsec2', name: 'Spot 2vCPU/15GB - $0.04/h', region: 'eu-west-1c', instanceType: 'r2.large', itype: 'spot'},
    '3': { id: 3, service: 'awsec2', name: 'Spot 2vCPU/15GB - $0.04/h', region: 'eu-west-1c', instanceType: 'r2.large', itype: 'spot'},
    '4': { id: 4, service: 'awsec2', name: 'Spot 2vCPU/15GB - $0.04/h', region: 'eu-west-1a', instanceType: 'r2.large', itype: 'spot'},
    '5': { id: 5, service: 'awsec2', name: 'Spot 2vCPU/15GB - $0.04/h', region: 'eu-west-1b', instanceType: 'r2.large', itype: 'spot'}, */

  }
}
