import * as React from 'react'

import Page from '../../components/Page'

import InstanceContainer from '../cluster/instance-container'
import QueueContainer from '../cluster/queue-container'

export default class Dashboard extends React.Component<{}, {}> {
  render() {
    return (
      <Page heading="Dashboard">
        <h2>Experiments</h2>
        <p>...</p>
        <h2>Jobs</h2>
        <QueueContainer/>
        <h2>Hosts</h2>
        <InstanceContainer/>
      </Page>
    )
  }
}
