module.exports = {
  services: {
    awsec2: {
      id: 'awsec2',
      name: 'AWS EC2',
      title: 'Amazon Web Services (AWS) Elastic Cloud Compute (EC2)',
      ui: {
        configs: {
          columns: {
            name: { title: 'Name' },
            region: { title: 'Region' },
            instanceType: { title: 'Instance type' }
          },
          form: {
            name: { label: 'Name' },
            provider: { hidden: true, value: 'aws-ec2' },
            accessKeyId: { label: 'Access Key' },
            secretAccessKey: { secret: true, label: 'Secret Access Key' },
            region: { options: { 'eu-west-1': { title: 'EU West (Ireland)', options: ['eu-west-1a', 'eu-west-1b', 'eu-west-1c'] },
                                'us-east-1': { title: 'US East (N. Virginia)', options: ['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d', 'us-east-1e'] } },
                      label: 'Region' },
            instanceType: { options: ['t1.micro', 'r2.large'], label: 'Instance Type' },
            imageId: { defaultValue: 'ami-5da23a2a', label: 'Image ID' },
            sshPort: { defaultValue: 22, label: 'SSH Port' },
            sshUsername: { defaultValue: 'ubuntu', label: 'SSH Username' },
            sshPrivateKy: { label: 'SSH Private Key', secret: true }
          }
        }
      }
    },
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
          }
        }
      }
    }
  },
  configs: {
    '1': { id: 1, service: 'awsec2', name: 'Spot 2vCPU/15GB - $0.04/h', region: 'eu-west-1b', instanceType: 'r2.large', itype: 'spot'},
    '2': { id: 2, service: 'awsec2', name: 'Spot 2vCPU/15GB - $0.04/h', region: 'eu-west-1c', instanceType: 'r2.large', itype: 'spot'},
    '3': { id: 3, service: 'awsec2', name: 'Spot 2vCPU/15GB - $0.04/h', region: 'eu-west-1c', instanceType: 'r2.large', itype: 'spot'},
    '4': { id: 4, service: 'awsec2', name: 'Spot 2vCPU/15GB - $0.04/h', region: 'eu-west-1a', instanceType: 'r2.large', itype: 'spot'},
    '5': { id: 5, service: 'awsec2', name: 'Spot 2vCPU/15GB - $0.04/h', region: 'eu-west-1b', instanceType: 'r2.large', itype: 'spot'},
  }
}
