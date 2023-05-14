import React, { useCallback, useEffect, useState } from 'react'
import { useHistory, withRouter } from 'react-router-dom'
import { connect, useDispatch, useSelector } from 'react-redux'
import { Header, Segment, Tab, Menu } from 'semantic-ui-react'
import { useGetAuthorizedUserQuery } from 'redux/auth'
import { useGetProgressCriteriaQuery } from 'redux/programmeProgressCriteria'
import DegreeCoursesTable from './DegreeCourses'
import StudyProgrammeSelector from './StudyProgrammeSelector'
import BasicOverview from './BasicOverview'
import StudytrackOverview from './StudytrackOverview'
import ProgrammeCoursesOverview from './programmeCoursesOverview'
import UpdateView from './UpdateView'
import '../PopulationQueryCard/populationQueryCard.css'
import { getCombinedProgrammeId, getUnifiedProgrammeName } from '../../common'
import { useTabs, useTitle } from '../../common/hooks'
import TSA from '../../common/tsa'
import Tags from './Tags'

import { getProgrammes } from '../../redux/populationProgrammes'

import useLanguage from '../LanguagePicker/useLanguage'

const createName = (studyProgrammeId, combibedProgrammeId, programmes, language, getTextIn) => {
  if (combibedProgrammeId && programmes?.[studyProgrammeId] && programmes?.[combibedProgrammeId])
    return getUnifiedProgrammeName(
      getTextIn(programmes?.[studyProgrammeId].name),
      getTextIn(programmes?.[combibedProgrammeId].name),
      language
    )
  return programmes?.[studyProgrammeId] && getTextIn(programmes?.[studyProgrammeId].name)
}

const StudyProgramme = props => {
  const dispatch = useDispatch()
  const history = useHistory()
  const programmes = useSelector(state => state.populationProgrammes?.data?.programmes)
  const progressCriteria = useGetProgressCriteriaQuery({ programmeCode: props.match.params.studyProgrammeId })
  const { language, getTextIn } = useLanguage()
  const { isAdmin, rights } = useGetAuthorizedUserQuery()
  const [tab, setTab] = useTabs('p_tab', 0, history)
  const [academicYear, setAcademicYear] = useState(false)
  const [specialGroups, setSpecialGroups] = useState(false)
  const [graduated, setGraduated] = useState(false)
  const emptyCriteria = {
    courses: { yearOne: [], yearTwo: [], yearThree: [] },
    credits: { yearOne: 0, yearTwo: 0, yearThree: 0 },
  }
  const [criteria, setCriteria] = useState(progressCriteria?.data ? progressCriteria.data : emptyCriteria)
  useTitle('Study programmes')

  useEffect(() => {
    dispatch(getProgrammes())
  }, [])

  useEffect(() => {
    if (progressCriteria.data) {
      setCriteria(progressCriteria.data)
    }
  }, [progressCriteria.data])

  const { match } = props
  const { studyProgrammeId } = match.params
  const secondProgrammeId = getCombinedProgrammeId(studyProgrammeId)

  const getPanes = () => {
    const panes = []
    panes.push({
      menuItem: 'Basic information',
      render: () => (
        <BasicOverview
          studyprogramme={studyProgrammeId}
          history={history}
          specialGroups={specialGroups}
          setSpecialGroups={setSpecialGroups}
          academicYear={academicYear}
          setAcademicYear={setAcademicYear}
          combinedProgramme={secondProgrammeId}
        />
      ),
    })
    panes.push({
      menuItem: 'Studytracks and class statistics',
      render: () => (
        <StudytrackOverview
          studyprogramme={studyProgrammeId}
          history={history}
          specialGroups={specialGroups}
          setSpecialGroups={setSpecialGroups}
          graduated={graduated}
          setGraduated={setGraduated}
          combinedProgramme={secondProgrammeId}
        />
      ),
    })

    if (isAdmin || rights.includes(studyProgrammeId)) {
      panes.push({
        menuItem: <Menu.Item key="Programme courses">Programme courses</Menu.Item>,
        render: () => (
          <ProgrammeCoursesOverview
            academicYear={academicYear}
            studyProgramme={studyProgrammeId}
            setAcademicYear={setAcademicYear}
            combinedProgramme={secondProgrammeId}
          />
        ),
      })
      panes.push({
        menuItem: 'Degree Courses',
        render: () => (
          <DegreeCoursesTable
            studyProgramme={studyProgrammeId}
            combinedProgramme={secondProgrammeId}
            criteria={criteria}
            setCriteria={setCriteria}
          />
        ),
      })
      panes.push({
        menuItem: 'Tags',
        render: () => <Tags studyprogramme={studyProgrammeId} combinedProgramme={secondProgrammeId} />,
      })
    }
    if (isAdmin) {
      panes.push({
        menuItem: 'Update statistics',
        render: () => <UpdateView studyprogramme={studyProgrammeId} />,
      })
    }
    return panes
  }

  const handleSelect = useCallback(
    programme => {
      history.push(`/study-programme/${programme}`, { selected: programme })
    },
    [history]
  )

  const programmeName = createName(studyProgrammeId, secondProgrammeId, programmes, language, getTextIn)
  const programmeLetterId = programmes?.[studyProgrammeId]?.progId
  const secondProgrammeLetterId = programmes?.[secondProgrammeId]?.progId
  const panes = getPanes()

  useEffect(() => {
    if (!programmeName) {
      return
    }

    TSA.Matomo.sendEvent('Programme Usage', 'study programme overview', programmeName)
    TSA.Influx.sendEvent({
      group: 'Programme Usage',
      name: 'study programme overview',
      label: programmeName,
      value: 1,
    })
  }, [programmeName])

  if (!studyProgrammeId)
    return (
      <div className="segmentContainer">
        <Header className="segmentTitle" size="large">
          Study Programme
        </Header>
        <Segment className="contentSegment">
          <StudyProgrammeSelector handleSelect={handleSelect} selected={studyProgrammeId !== undefined} />
        </Segment>
      </div>
    )
  return (
    <div className="segmentContainer">
      <Segment className="contentSegment">
        <div align="center" style={{ padding: '30px' }}>
          <Header textAlign="center">{programmeName}</Header>
          <span>
            {programmeLetterId ? `${programmeLetterId} - ` : ''} {studyProgrammeId}
          </span>
          <br />
          {secondProgrammeId && (
            <span>
              {secondProgrammeLetterId ? `${secondProgrammeLetterId} - ` : ''} {secondProgrammeId}
            </span>
          )}
        </div>
        <Tab panes={panes} activeIndex={tab} onTabChange={setTab} />
      </Segment>
    </div>
  )
}

export default connect()(withRouter(StudyProgramme))
