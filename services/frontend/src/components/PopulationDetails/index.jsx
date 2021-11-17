import React, { useRef } from 'react'
import { connect } from 'react-redux'
import { object, arrayOf, bool, shape, node } from 'prop-types'
import { Message, Accordion } from 'semantic-ui-react'
import { useLocalStorage } from '../../common/hooks'

import CreditAccumulationGraphHighCharts from '../CreditAccumulationGraphHighCharts'
import PopulationStudents from '../PopulationStudents'
import PopulationCourses from '../PopulationCourses'
import InfoBox from '../InfoBox'
import CreditGainStats from './CreditGainStats'
import AgeStats from './AgeStats'
import useFilters from '../FilterTray/useFilters'
import useFilterTray from '../FilterTray/useFilterTray'
import useLanguage from '../LanguagePicker/useLanguage'
import sendEvent from '../../common/sendEvent'
import infotooltips from '../../common/InfoToolTips'

const sendAnalytics = sendEvent.populationStatistics

const PopulationDetails = ({ samples, queryIsSet, isLoading, query, dataExport }) => {
  const { allStudents, filteredStudents } = useFilters()
  const [trayOpen] = useFilterTray('filterTray')
  const { language } = useLanguage()
  // TODO: Refactor this away from children:
  const selectedStudents = filteredStudents.map(stu => stu.studentNumber)

  const [activeIndex, setActiveIndex] = useLocalStorage('populationActiveIndex', [])
  const creditGraphRef = useRef()
  const creditGainRef = useRef()
  const courseTableRef = useRef()
  const studentTableRef = useRef()

  const handleClick = index => {
    const indexes = [...activeIndex].sort()
    if (indexes.includes(index)) {
      indexes.splice(
        indexes.findIndex(ind => ind === index),
        1
      )
    } else {
      indexes.push(index)
    }
    setActiveIndex(indexes)
    sendAnalytics(
      'Population statistics tab clicked',
      ['Credit accumulation', 'Credit statistics', 'Age distribution', 'Courses of population', 'Students'][index]
    )
    /**
     * Here used to be a :tunkki: that scrolled to the component that was opened. However,
     * it does not work with the way this view is now rendered. This is left here just as a
     * reminder in case we want to reimplement auto-scrolling once this component is refactored.
     */
  }

  const renderCreditGainGraphs = () => {
    const { CreditAccumulation } = infotooltips.PopulationStatistics

    const graphs = (
      <CreditAccumulationGraphHighCharts
        students={filteredStudents}
        title="Id"
        label={samples.label}
        trayOpen={trayOpen}
        language={language}
      />
    )
    return (
      <>
        <InfoBox content={CreditAccumulation} />
        {samples.length > 0 && graphs}
      </>
    )
  }

  if (isLoading || !queryIsSet) {
    return null
  }

  if (samples.length === 0) {
    return <Message negative content="No statistics found for the given query." />
  }

  const panels = [
    {
      key: 0,
      title: {
        content: (
          <span style={{ paddingTop: '1vh', paddingBottom: '1vh', color: 'black', fontSize: 'large' }}>
            Credit accumulation (for {filteredStudents.length} students)
          </span>
        ),
      },
      onTitleClick: () => handleClick(0),
      content: {
        content: <div ref={creditGraphRef}>{renderCreditGainGraphs()}</div>,
      },
    },
    {
      key: 1,
      title: {
        content: (
          <span
            style={{ paddingTop: '1vh', paddingBottom: '1vh', color: 'black', fontSize: 'large' }}
            data-cy="credit-statistics"
          >
            Credit statistics
          </span>
        ),
      },
      onTitleClick: () => handleClick(1),
      content: {
        content: !query.years ? (
          <div ref={creditGainRef}>
            <CreditGainStats query={query} filteredStudents={filteredStudents} />
          </div>
        ) : (
          <div>This table is omitted when searching population of multiple years</div>
        ),
      },
    },
    {
      key: 2,
      title: {
        content: (
          <span style={{ paddingTop: '1vh', paddingBottom: '1vh', color: 'black', fontSize: 'large' }}>
            Age distribution
          </span>
        ),
      },
      onTitleClick: () => handleClick(2),
      content: {
        content: <AgeStats filteredStudents={filteredStudents} query={query} />,
      },
    },
    {
      key: 3,
      title: {
        content: (
          <span style={{ paddingTop: '1vh', paddingBottom: '1vh', color: 'black', fontSize: 'large' }}>
            Courses of population
          </span>
        ),
      },
      onTitleClick: () => handleClick(3),
      content: {
        content: (
          <div ref={courseTableRef}>
            <PopulationCourses
              selectedStudents={selectedStudents}
              query={query}
              allStudents={allStudents}
              filteredStudents={filteredStudents}
            />
          </div>
        ),
      },
    },
    {
      key: 4,
      title: {
        content: (
          <span style={{ paddingTop: '1vh', paddingBottom: '1vh', color: 'black', fontSize: 'large' }}>
            Students ({filteredStudents.length})
          </span>
        ),
      },
      onTitleClick: () => handleClick(4),
      content: {
        content: (
          <div ref={studentTableRef}>
            <PopulationStudents
              variant="population"
              language={language}
              filteredStudents={filteredStudents}
              dataExport={dataExport}
            />
          </div>
        ),
      },
    },
  ]

  return (
    <>
      <Accordion activeIndex={activeIndex} exclusive={false} styled fluid panels={panels} />
    </>
  )
}

PopulationDetails.propTypes = {
  samples: arrayOf(object).isRequired,
  queryIsSet: bool.isRequired,
  isLoading: bool.isRequired,
  query: shape({}).isRequired,
  dataExport: node,
}

PopulationDetails.defaultProps = {
  dataExport: null,
}

export default connect(null)(PopulationDetails)
