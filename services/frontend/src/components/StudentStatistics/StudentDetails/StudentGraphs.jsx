import React, { useState } from 'react'
import { Menu, Tab, Input, Message } from 'semantic-ui-react'
import { flattenDeep } from 'lodash'
import Highcharts from 'highcharts/highstock'
import ReactHighcharts from 'react-highcharts'
import useLanguage from 'components/LanguagePicker/useLanguage'
import CreditAccumulationGraphHighCharts from '../../CreditAccumulationGraphHighCharts'
import { byDateDesc, reformatDate, getStudyRightElementTargetDates } from '../../../common'

const getEarliestAttainmentDate = ({ courses }) => {
  if (!courses) return null
  const sorted = courses
    .filter(({ credittypecode }) => credittypecode !== 10)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  if (!sorted.length) return null
  return sorted[0].date
}

const resolveGraphStartDate = (student, graphYearStart, selectedStudyRight, studyRightTargetStart) => {
  const earliestAttainmentDate = getEarliestAttainmentDate(student)
  if (!selectedStudyRight)
    return Math.min(new Date(earliestAttainmentDate).getTime(), new Date(graphYearStart || new Date()).getTime())

  const studyRightElement = selectedStudyRight.studyright_elements
    .filter(e => e.element_detail.type === 20)
    .sort((a, b) => new Date(b.startdate) - new Date(a.startdate))[0]
  const studyPlan = student.studyplans.find(p => p.programme_code === studyRightElement.code)
  const filteredCourses = studyPlan
    ? // eslint-disable-next-line camelcase
      student.courses.filter(({ course_code }) => studyPlan.included_courses.includes(course_code))
    : []

  return Math.min(
    ...flattenDeep(filteredCourses.map(c => c.date)).map(d => new Date(d).getTime()),
    new Date(studyRightTargetStart).getTime()
  )
}

const resolveGraphEndDate = (dates, selectedStudyRight, student, studyRightTargetEnd) => {
  if (!selectedStudyRight) return Math.max(...(dates || []), new Date().getTime())
  const studyRightElement = selectedStudyRight.studyright_elements.sort(
    (a, b) => new Date(b.startdate) - new Date(a.startdate)
  )[0]
  const studyPlan = student.studyplans.find(p => p.programme_code === studyRightElement.code)
  const filteredCourses = studyPlan
    ? // eslint-disable-next-line camelcase
      student.courses.filter(({ course_code }) => studyPlan.included_courses.includes(course_code))
    : []

  return Math.max(
    new Date(studyRightTargetEnd).getTime(),
    ...flattenDeep(filteredCourses.map(({ date }) => new Date(date).getTime()))
  )
}

const CreditsGraph = ({ graphYearStart, student, absences, studyRightId }) => {
  const selectedStudyRight = student.studyrights.find(({ studyrightid }) => studyrightid === studyRightId)
  const dates = flattenDeep(student.courses.map(c => c.date)).map(d => new Date(d).getTime())
  const [studyRightTargetStart, studyRightTargetEnd] = getStudyRightElementTargetDates(selectedStudyRight, absences)
  const selectedStart = new Date(
    resolveGraphStartDate(student, graphYearStart, selectedStudyRight, studyRightTargetStart)
  )
  const endDate = resolveGraphEndDate(dates, selectedStudyRight, student, studyRightTargetEnd)
  return (
    <CreditAccumulationGraphHighCharts
      singleStudent
      students={[student]}
      startDate={selectedStart}
      endDate={endDate}
      absences={absences}
      studyRightId={studyRightId}
    />
  )
}

const chunkifyArray = (array, size = 1) => {
  if (!array) return []
  const firstChunk = array.slice(0, size) // create the first chunk of the given array
  if (!firstChunk.length) {
    return array // this is the base case to terminal the recursive
  }
  return [firstChunk].concat(chunkifyArray(array.slice(size, array.length), size))
}

const semesterChunkify = (courses, semesterenrollments, semesters, getTextIn) => {
  const semesterChunks = semesterenrollments.reduce((acc, curr) => {
    const currSemester = semesters.semesters[curr.semestercode]
    const filteredcourses = courses.filter(
      c => new Date(currSemester.startdate) < new Date(c.date) && new Date(c.date) < new Date(currSemester.enddate)
    )
    const grades = { data: filteredcourses, semester: currSemester, numOfCourses: filteredcourses.length }
    acc.push(grades)
    return acc
  }, [])
  const semesterMeans = semesterChunks.reduce((acc, curr) => {
    const sum = curr.data.reduce((a, b) => a + b.grade, 0)
    if (curr.numOfCourses > 0)
      acc.push({
        name: getTextIn(curr.semester.name),
        y: sum / curr.numOfCourses,
        x: new Date(curr.data[curr.numOfCourses - 1].date).getTime(),
      })
    return acc
  }, [])

  return [{ name: 'Semester mean', data: semesterMeans, seriesThreshold: 150 }]
}

// probably needs some fixing to be done
const gradeMeanSeries = (student, chunksize, semesters, getTextIn) => {
  const sortedCourses = student.courses.sort(byDateDesc).reverse()
  const filterCourses = sortedCourses.filter(c => Number(c.grade) && !c.isStudyModuleCredit && c.passed)
  const data = filterCourses.reduce(
    (acc, curr) => {
      acc.grades.push({ grade: Number(curr.grade), date: curr.date, code: curr.course_code })
      acc.dates.push(reformatDate(curr.date, 'DD.MM.YYYY'))
      const sum = acc.grades.reduce((a, b) => a + b.grade, 0)
      acc.mean.push({ y: sum / acc.grades.length, x: new Date(curr.date).getTime() })
      if (!acc.minDate) {
        acc.minDate = curr.date
        acc.maxDate = curr.date
      }
      if (acc.minDate > curr.date) acc.minDate = curr.date
      if (acc.maxDate < curr.date) acc.maxDate = curr.date
      return acc
    },
    { grades: [], dates: [], mean: [], minDate: null, maxDate: null }
  )
  const size = Number(chunksize) ? chunksize : 3
  const chunks = chunkifyArray(data.grades, size)
  data.semesterMeans = semesterChunkify(data.grades, student.semesterenrollments, semesters, getTextIn)
  const chunkMeans = chunks.reduce((acc, curr) => {
    const sum = curr.reduce((a, b) => a + b.grade, 0)
    if (curr.length > 0)
      acc.push({
        name: `${curr.length} courses`,
        y: sum / curr.length,
        x: new Date(curr[curr.length - 1].date).getTime(),
      })
    return acc
  }, [])
  data.chunkMeans = [{ name: 'Group mean', data: chunkMeans, seriesThreshold: 150 }]
  return data
}

const GradeGraph = ({ student, semesters }) => {
  const [chunky, setChunky] = useState(false)
  const { getTextIn } = useLanguage()
  const [chunksize, setChunkSize] = useState(5)
  const [semester, setSemester] = useState(false)
  const series = gradeMeanSeries(student, chunksize, semesters, getTextIn)
  const { mean, chunkMeans, semesterMeans } = series

  const defaultOptions = {
    chart: {
      type: 'spline',
    },
    title: {
      text: 'Grade plot',
    },
    xAxis: {
      type: 'datetime',
      min: new Date(series.minDate).getTime(),
      max: new Date(series.maxDate).getTime(),
    },
    yAxis: {
      min: 1,
      max: 5,
    },
  }

  const totalMeanOptions = {
    ...defaultOptions,
    series: [{ data: mean, name: 'Total mean', seriesThreshold: 150 }],
  }
  const chunkMeanOptions = {
    ...defaultOptions,
    series: chunkMeans,
  }
  const semesterMeanOptions = {
    ...defaultOptions,
    series: semesterMeans,
  }
  return (
    <div align="center">
      <Message style={{ maxWidth: '600px' }}>
        <Message.Header>Grade graph</Message.Header>
        <p>
          Total mean näyttää kuinka keskiarvo on kehittynyt koko opintojen ajan. Group mean ottaa ryhmittää kurssit
          valitun koon mukaan ja ottaa niiden keskiarvot. Semester mean laskee jokaisen lukukauden keskiarvon.
        </p>
      </Message>
      <Menu compact align="center">
        <Menu.Item
          active={!chunky && !semester}
          name="Show total mean"
          onClick={() => {
            setChunky(false)
            setSemester(false)
          }}
        />
        <Menu.Item
          active={chunky && !semester}
          name="Show group mean"
          onClick={() => {
            setChunky(true)
            setSemester(false)
          }}
        />
        <Menu.Item
          active={!chunky && semester}
          name="Show semester mean"
          onClick={() => {
            setChunky(false)
            setSemester(true)
          }}
        />
      </Menu>
      {chunky && (
        <div>
          <Input label="Group size" defaultValue={chunksize} onChange={e => setChunkSize(Number(e.target.value))} />
        </div>
      )}
      {!chunky && !semester && <ReactHighcharts highcharts={Highcharts} config={totalMeanOptions} />}
      {chunky && !semester && <ReactHighcharts highcharts={Highcharts} config={chunkMeanOptions} />}
      {!chunky && semester && <ReactHighcharts highcharts={Highcharts} config={semesterMeanOptions} />}
    </div>
  )
}

const StudentGraphs = ({ student, absences, graphYearStart, semesters, studyRightId }) => {
  const panes = [
    {
      menuItem: 'Credit graph',
      render: () => (
        <Tab.Pane>
          <CreditsGraph
            absences={absences}
            student={student}
            graphYearStart={graphYearStart}
            studyRightId={studyRightId}
          />
        </Tab.Pane>
      ),
    },
    {
      menuItem: 'Grade graph',
      render: () => (
        <Tab.Pane>
          <GradeGraph student={student} semesters={semesters} />
        </Tab.Pane>
      ),
    },
  ]
  return <Tab panes={panes} />
}

export default StudentGraphs
