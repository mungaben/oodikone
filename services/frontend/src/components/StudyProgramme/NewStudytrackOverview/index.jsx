import React, { useState } from 'react'
import { Divider, Loader } from 'semantic-ui-react'
import { useGetStudytrackStatsQuery } from 'redux/studyProgramme'
import InfoBox from '../../Info/InfoBox'
import BarChart from './BarChart'
import BasicDataTable from './BasicDataTable'
import StudytrackDataTable from './StudytrackDataTable'
import StudytrackSelector from './StudytrackSelector'

import InfotoolTips from '../../../common/InfoToolTips'
import '../studyprogramme.css'

const populationTitles = ['', 'All started', 'Men', 'Women', 'Finnish', 'Graduated']
const creditTableTitles = [
  '',
  'All started',
  'Under 30 credits',
  '30-59 credits',
  '60-89 credits',
  '90-119 credits',
  '120-149 credits',
  '150 or more credits',
]

const StudytrackOverview = ({ studyprogramme }) => {
  const toolTips = InfotoolTips.Studyprogramme
  const stats = useGetStudytrackStatsQuery({ id: studyprogramme })
  const [track, setTrack] = useState('KH20_001')

  const getDivider = (title, toolTipText) => (
    <>
      <div className="divider">
        <Divider horizontal>{title}</Divider>
      </div>
      <InfoBox content={toolTips[toolTipText]} />
    </>
  )

  return (
    <div className="studytrack-overview">
      <div style={{ display: 'flex', justifyContent: 'center', margin: '10px' }}>
        <p style={{ color: 'red' }}>
          Please note that this view is still very much a work in progress. This view is only visible to some admins.
        </p>
      </div>
      {stats.isLoading ? (
        <Loader active={stats.isLoading} />
      ) : (
        <>
          <StudytrackSelector track={track} setTrack={setTrack} studytracks={stats?.data?.studytrackNames} />
          {getDivider(
            `Students of ${
              track === '' || track === 'studyprogramme'
                ? 'the studyprogramme by starting year'
                : `the studytrack ${track} by starting year`
            }`,
            'StudytrackOverview'
          )}
          <StudytrackDataTable
            track={track || studyprogramme}
            titles={populationTitles}
            data={stats?.data?.mainStatsByYear}
          />
          {getDivider(
            `Progress of students of ${
              track === '' || track === 'studyprogramme'
                ? 'the studyprogramme by starting year'
                : `the studytrack ${track} by starting year`
            }`,
            'StudytrackProgress'
          )}
          <div className="section-container">
            <BarChart data={stats?.data} track={track || studyprogramme} />
            <BasicDataTable
              data={stats?.data?.creditTableStats}
              track={track || studyprogramme}
              titles={creditTableTitles}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default StudytrackOverview
