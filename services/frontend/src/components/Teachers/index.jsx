import React from 'react'
import { Header, Segment, Tab } from 'semantic-ui-react'
import { useHistory, useParams } from 'react-router-dom'
import { useGetAuthorizedUserQuery } from 'redux/auth'
import TeacherSearchTab from './TeacherSearchTab'
import TeacherPage from './TeacherPage'
import TeacherStatistics from './TeacherStatistics'
import TeacherLeaderBoard from './TeacherLeaderBoard'
import { useTabs, useTitle } from '../../common/hooks'

const pane = (title, Content, icon) => ({
  menuItem: { key: title, content: title, icon },
  render: () => (
    <Tab.Pane style={{ borderWidth: '0' }}>
      <Content />
    </Tab.Pane>
  ),
})

const TeachersTabs = () => {
  const history = useHistory()
  const { isAdmin } = useGetAuthorizedUserQuery()
  const [tab, setTab] = useTabs('t_tab', 0, history)
  const panes = isAdmin
    ? [
        pane('Statistics', TeacherStatistics, 'table'),
        pane('Leaderboard', TeacherLeaderBoard, 'trophy'),
        pane('Search', TeacherSearchTab, 'user'),
      ]
    : [pane('Statistics', TeacherStatistics, 'table')]

  return (
    <Tab
      menu={{ attached: false, borderless: true, tabular: true }}
      panes={panes}
      activeIndex={tab}
      onTabChange={setTab}
    />
  )
}

const Teachers = () => {
  useTitle('Teachers')
  const { teacherid } = useParams()
  return (
    <div className="segmentContainer">
      <Header className="segmentTitle" size="large" content="Teacher statistics" />
      <Segment className="contentSegment">
        {teacherid ? <TeacherPage teacherid={teacherid} /> : <TeachersTabs />}
      </Segment>
    </div>
  )
}

export default Teachers
