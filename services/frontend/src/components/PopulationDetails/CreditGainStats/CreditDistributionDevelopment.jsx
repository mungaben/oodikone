import React, { useState, useMemo } from 'react'
import ReactHighcharts from 'react-highcharts'
import { Radio, Dropdown, Segment } from 'semantic-ui-react'
import moment from 'moment'
import _ from 'lodash'
import chroma from 'chroma-js'
import { useLocation } from 'react-router-dom'
import { useGetSemestersQuery } from 'redux/semesters'
import useLanguage from 'components/LanguagePicker/useLanguage'
import { getMonths } from '../../../common/query'

const StackOrdering = {
  ASCENDING: 'asc',
  DESCENDING: 'desc',
}

const TimeDivision = {
  ACADEMIC_YEAR: 'academic-year',
  CALENDAR_YEAR: 'calendar-year',
  SEMESTER: 'semester',
}

export const getStudentCredits = (student, start, end, cumulative, includeTransferredCredits = true) => {
  const predicate = cumulative ? c => moment(c.date).isBefore(end) : c => moment(c.date).isBetween(start, end)

  const passedCourses = includeTransferredCredits
    ? student.courses.filter(c => c.passed && !c.isStudyModuleCredit && predicate(c))
    : student.courses.filter(c => c.passed && !c.isStudyModuleCredit && predicate(c) && c.credittypecode !== 9)

  return _.sum(_.map(passedCourses, 'credits'))
}

export const splitStudentCredits = (student, timeSlots, cumulative) => {
  let timeSlotN = 0

  const results = new Array(timeSlots.length).fill(0)

  _.chain(student.courses)
    .filter(c => c.passed && !c.isStudyModuleCredit && moment(c.date).isAfter(timeSlots[0].start))
    .orderBy(c => moment(c.date), ['asc'])
    .forEach(course => {
      while (timeSlotN < timeSlots.length && moment(course.date).isAfter(timeSlots[timeSlotN].end)) {
        timeSlotN++
      }

      if (timeSlotN >= timeSlots.length) {
        return
      }

      results[timeSlotN] += course.credits

      if (cumulative) {
        for (let i = timeSlotN + 1; i < timeSlots.length; i++) {
          results[i] += course.credits
        }
      }
    })
    .value()

  return results
}

const LIMITS_NON_CUMULATIVE = [15, 30, 45, 60]
const LIMITS_CUMULATIVE = [30, 60, 90, 120, 150, 180]

const hasGraduatedBefore = (student, programme, date) => {
  const sr = student.studyrights
    .filter(sr => sr.studyright_elements.findIndex(sre => sre.code === programme) > -1)
    .pop()

  if (sr === undefined) {
    return false
  }

  return sr.graduated && moment(date).isAfter(sr.enddate)
}

const getChartData = (students, timeSlots, order, programme, limitScale, cumulative) => {
  const limitBreaks = (cumulative ? LIMITS_CUMULATIVE : LIMITS_NON_CUMULATIVE).map(lb => lb * limitScale)

  let limits = _.range(0, limitBreaks.length + 1).map(i => [limitBreaks[i - 1], limitBreaks[i]])

  let colors = chroma.scale(['#f8696b', '#f5e984', '#63be7a']).colors(limits.length)

  if (order === StackOrdering.ASCENDING) {
    limits = _.reverse(limits)
    colors = _.reverse(colors)
  }

  const data = new Array(limits.length).fill().map(() => new Array(timeSlots.length).fill(0))

  const studentCredits = students.map(s => splitStudentCredits(s, timeSlots, cumulative))

  timeSlots.forEach((slot, timeSlotIndex) => {
    students
      .map((student, i) => [student, i])
      .filter(([student]) => !programme || !hasGraduatedBefore(student, programme, slot.start))
      .forEach(([, studentIndex]) => {
        const credits = studentCredits[studentIndex][timeSlotIndex]
        const rangeIndex = limits.findIndex(
          ([min, max]) => (min === undefined || credits > min) && (max === undefined || credits <= max)
        )
        data[rangeIndex][timeSlotIndex] += 1
      })
  })

  const series = data.map((slots, limitN) => {
    const [min, max] = limits[limitN]
    const color = colors[limitN]

    return {
      name: `${min ?? '0'} - ${max ?? '∞'}`,
      data: slots,
      color,
    }
  })

  return series
}

function tooltipFormatter() {
  // eslint-disable-next-line
  return `<div style="text-align: center; width: 100%"><b>${this.x}</b>, ${this.series.name}<br/>${this.y}/${this.total} students (${Math.round(this.percentage)}%)</div>`;
}

const CreditDistributionDevelopment = ({ students, query }) => {
  const [cumulative, setCumulative] = useState(false)
  const [timeDivision, setTimeDivision] = useState(TimeDivision.ACADEMIC_YEAR)
  const [stackOrdering, setStackOrdering] = useState(StackOrdering.ASCENDING)
  const months = getMonths(useLocation())
  const semestersQuery = useGetSemestersQuery()
  const { getTextIn } = useLanguage()

  const programme = query?.studyRights?.programme

  const timeSlots = useMemo(() => {
    const startDate = moment().subtract({ months }).endOf('year')
    const semesters = semestersQuery.data?.semesters ?? []

    if (timeDivision === TimeDivision.CALENDAR_YEAR) {
      return _.range(moment().year() - Math.ceil(months / 12), moment().year() + 1).map(year => ({
        start: moment({ year }),
        end: moment({ year }).endOf('year'),
        label: year,
      }))
    }

    if (timeDivision === TimeDivision.ACADEMIC_YEAR) {
      return _.chain(semesters)
        .groupBy('yearcode')
        .values()
        .map(([a, b]) => {
          const s = _.sortBy([moment(a.startdate), moment(a.enddate), moment(b.startdate), moment(b.enddate)])
          return [s[0], s[s.length - 1]]
        })
        .filter(([a, b]) => startDate.isBefore(b) && moment().isAfter(a))
        .map(([start, end]) => ({
          start,
          end,
          label: `${start.year()}-${end.year()}`,
        }))
        .value()
    }

    if (timeDivision === TimeDivision.SEMESTER) {
      return Object.values(semesters)
        .filter(s => startDate.isBefore(s.enddate) && moment().isAfter(s.startdate))
        .map(s => ({
          start: s.startdate,
          end: s.enddate,
          label: getTextIn(s.name),
        }))
    }

    return []
  }, [timeDivision, months, semestersQuery, getTextIn])

  const seriesList = useMemo(() => {
    const limitScale = timeDivision === TimeDivision.SEMESTER ? 0.5 : 1.0

    return [
      getChartData(students, timeSlots, stackOrdering, programme, limitScale, false),
      getChartData(students, timeSlots, stackOrdering, programme, limitScale, true),
    ]
  }, [students, timeSlots, stackOrdering, programme])

  const labels = timeSlots.map(ts => ts.label)
  const series = seriesList[0 + cumulative]

  const config = {
    series,
    title: { text: '' },
    credits: {
      text: 'oodikone | TOSKA',
    },
    tooltip: {
      formatter: tooltipFormatter,
    },
    xAxis: {
      categories: labels,
    },
    yAxis: {
      allowDecimals: false,
      min: 0,
      max: students.length,
      endOnTick: false,
      reversed: false,
      title: { text: 'Students' },
    },
    chart: {
      type: 'column',
      height: '450px',
    },
    plotOptions: {
      column: {
        stacking: 'normal',
        dataLabels: {
          enabled: true,
        },
      },
    },
  }

  return (
    <div>
      <div style={{ textAlign: 'right' }}>
        <Segment.Group horizontal compact style={{ display: 'inline-flex', margin: '0 0 2em 0' }}>
          <Segment>
            <Radio toggle label="Cumulative" checked={cumulative} onChange={() => setCumulative(!cumulative)} />
          </Segment>
          <Segment>
            <label style={{ marginRight: '0.5em' }}>Divide by:</label>
            <Dropdown
              inline
              value={timeDivision}
              onChange={(_evt, { value }) => setTimeDivision(value)}
              label="Divide by"
              options={[
                { value: TimeDivision.CALENDAR_YEAR, text: 'Calendar year' },
                { value: TimeDivision.ACADEMIC_YEAR, text: 'Academic year' },
                { value: TimeDivision.SEMESTER, text: 'Semester' },
              ]}
            />
          </Segment>
          <Segment>
            <label style={{ marginRight: '0.5em' }}>Stack ordering:</label>
            <Dropdown
              inline
              value={stackOrdering}
              onChange={(_evt, { value }) => setStackOrdering(value)}
              options={[
                { value: StackOrdering.ASCENDING, text: 'Ascending' },
                { value: StackOrdering.DESCENDING, text: 'Descending' },
              ]}
            />
          </Segment>
        </Segment.Group>
      </div>
      <ReactHighcharts config={config} />
    </div>
  )
}

export default CreditDistributionDevelopment
