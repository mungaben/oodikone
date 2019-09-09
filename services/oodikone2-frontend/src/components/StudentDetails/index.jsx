import React, { Component, Fragment } from 'react'
import { func, shape, string, arrayOf, integer, bool } from 'prop-types'
import { connect } from 'react-redux'
import { getActiveLanguage } from 'react-localize-redux'
import { Segment, Table, Icon, Label, Header } from 'semantic-ui-react'
import { isEmpty, sortBy, flattenDeep } from 'lodash'
import moment from 'moment'
import qs from 'query-string'
import { withRouter } from 'react-router-dom'
import { getStudent, removeStudentSelection, resetStudent } from '../../redux/students'
import { getSemesters } from '../../redux/semesters'
import StudentInfoCard from '../StudentInfoCard'
import CreditAccumulationGraphHighCharts from '../CreditAccumulationGraphHighCharts'
import SearchResultTable from '../SearchResultTable'
import { byDateDesc, reformatDate, getTextIn } from '../../common'
import { clearCourseStats } from '../../redux/coursestats'
import SortableTable from '../SortableTable'

class StudentDetails extends Component {
  componentDidMount() {
    this.props.getSemesters()
    this.unlistenHistory = this.props.history.listen((location, action) => {
      if (action === 'POP' || location.pathname === '/students' || location.pathname !== '/students' || this.props.error) {
        this.props.resetStudent()
        this.props.removeStudentSelection()
      }
    })
  }

  componentDidUpdate() {
    if (isEmpty(this.props.student) && this.props.studentNumber && !this.props.error) {
      this.props.getStudent(this.props.studentNumber)
    }
  }

  componentWillUnmount() {
    this.unlistenHistory()
  }

  getAbsentYears = () => {
    const { semesters, student: { semesterenrollments } } = this.props
    semesterenrollments.sort((a, b) => a.semestercode - b.semestercode)
    const mappedSemesters = Object.values(semesters.semesters).reduce((acc, { semestercode, startdate, enddate }) => ({ ...acc, [semestercode]: { startdate, enddate } }), {})

    // If a student has been absent for a long period, then the enrollments aren't marked in oodi...
    // Therefore we need to manually patch empty enrollment ranges with absences
    const now = new Date().getTime()
    const latestSemester = parseInt(Object.entries(mappedSemesters).find(([, { startdate, enddate }]) => now <= new Date(enddate).getTime() && now >= new Date(startdate).getTime())[0], 10)
    const mappedSemesterenrollments = semesterenrollments.reduce((res, curr) => ({ ...res, [curr.semestercode]: curr }), {})
    const patchedSemesterenrollments = []
    if (semesterenrollments.length) {
      let runningSemestercode = semesterenrollments[0].semestercode
      while (runningSemestercode <= latestSemester) {
        if (!mappedSemesterenrollments[runningSemestercode]) patchedSemesterenrollments.push({ semestercode: runningSemestercode, enrollmenttype: 2 })
        else patchedSemesterenrollments.push(mappedSemesterenrollments[runningSemestercode])
        runningSemestercode++
      }
    }

    const formatAbsence = ({ semestercode }) => {
      const { startdate, enddate } = mappedSemesters[semestercode]
      return {
        semestercode,
        startdate: new Date(startdate).getTime(),
        enddate: new Date(enddate).getTime()
      }
    }

    const mergeAbsences = (absences) => {
      const res = []
      let currentSemestercode = -1
      if (absences.length) {
        res.push(absences[0])
        currentSemestercode = absences[0].semestercode
      }
      absences.forEach((absence, i) => {
        if (i === 0) return
        if (absence.semestercode === currentSemestercode + 1) res[res.length - 1].enddate = absence.enddate
        else res.push(absence)
        currentSemestercode = absence.semestercode
      })
      return res
    }

    return mergeAbsences(patchedSemesterenrollments
      .filter(({ enrollmenttype }) => enrollmenttype !== 1) // 1 = present & 2 = absent
      .map(absence => formatAbsence(absence)))
  }

  pushQueryToUrl = (query) => {
    const { history } = this.props
    const { courseCodes, ...rest } = query
    const queryObject = { ...rest, courseCodes: JSON.stringify(courseCodes) }
    const searchString = qs.stringify(queryObject)
    this.props.clearCourseStats()
    history.push(`/coursestatistics?${searchString}`)
  }

  showPopulationStatistics = (studyprogramme, date) => {
    const { history } = this.props
    const year = moment(date).isBefore(moment(`${date.slice(0, 4)}-08-01`)) ? date.slice(0, 4) - 1 : date.slice(0, 4)
    const months = Math.ceil(moment.duration(moment().diff(`${year}-08-01`)).asMonths())
    history.push(`/populations?months=${months}&semesters=FALL&semesters=` +
      `SPRING&studyRights=%7B"programme"%3A"${studyprogramme}"%7D&startYear=${year}&endYear=${year}`)
  }

  renderCreditsGraph = () => {
    const { translate, student } = this.props
    const sample = [student]
    const dates = flattenDeep(student.courses.map(c => c.date)).map(d => new Date(d).getTime())
    sample.maxCredits = student.credits
    sample.maxDate = dates.length > 0 ? Math.max(...dates) : new Date().getTime()
    sample.minDate = new Date(student.started).getTime()
    return (
      <CreditAccumulationGraphHighCharts
        students={sample}
        selectedStudents={[student.studentNumber]}
        title={translate('studentStatistics.chartTitle')}
        translate={translate}
        maxCredits={sample.maxCredits}
        absences={this.getAbsentYears()}
      />
    )
  }

  renderCourseParticipation = () => {
    const { translate, student, language } = this.props

    const courseHeaders = [
      translate('common.date'),
      translate('common.course'),
      translate('common.grade'),
      translate('common.credits'),
      ''
    ]
    const courseRows = student.courses.sort(byDateDesc).map((c) => {
      const {
        date, grade, credits, course, isStudyModuleCredit, passed
      } = c
      let icon = null
      if (isStudyModuleCredit) {
        icon = <Icon name="certificate" color="purple" />
      } else if (passed) {
        icon = <Icon name="check circle outline" color="green" />
      } else {
        icon = <Icon name="circle outline" color="red" />
      }
      const year = (moment(new Date(date)).diff(new Date('1950-1-1'), 'years'))

      return [
        reformatDate(date, 'DD.MM.YYYY'),
        `${isStudyModuleCredit ? `${getTextIn(course.name, language)} [Study Module]` : getTextIn(course.name, language)} (${course.code})`,
        <div>{icon}{grade}</div>,
        credits,
        <Icon style={{ cursor: 'pointer' }} name="level up" onClick={() => this.pushQueryToUrl({ courseCodes: [course.code], separate: false, fromYear: year - 1, toYear: year + 1 })} />
      ]
    })
    return (
      <Fragment>
        <Header content="Courses" />
        <SearchResultTable
          headers={courseHeaders}
          rows={courseRows}
          noResultText="Student has courses marked"
        />
      </Fragment>
    )
  }

  renderTags = () => {
    const { student, language } = this.props
    const data = Object.values(student.tags.reduce((acc, t) => {
      if (!acc[t.programme.code]) acc[t.programme.code] = { programme: t.programme, tags: [] }
      acc[t.tag.studytrack].tags.push(t)
      return acc
    }, {}))
    if (data.length === 0) return null
    return (
      <Fragment>
        <Header content="Tags" />
        <SortableTable
          data={data}
          getRowKey={t => t.programme.code}
          columns={[
            {
              key: 'PROGRAMME',
              title: 'Programme',
              getRowVal: t => getTextIn(t.programme.name, language),
              cellProps: { collapsing: true }
            },
            {
              key: 'CODE',
              title: 'Code',
              getRowVal: t => t.programme.code,
              cellProps: { collapsing: true }
            },
            {
              key: 'TAGS',
              title: 'Tags',
              getRowVal: t => sortBy(t.tags.map(tt => tt.tag.tagname)).join(':'),
              getRowContent: t => sortBy(t.tags, t => t.tag.tagname).map(t => <Label key={t.tag.tag_id} content={t.tag.tagname} />)
            }
          ]}
        />
      </Fragment>
    )
  }

  renderStudyRights = () => {
    const { student, language } = this.props
    const studyRightHeaders = ['Degree', 'Programme', 'Study Track', 'Graduated']
    const studyRightRows = student.studyrights.map((studyright) => {
      const degrees = sortBy(studyright.studyrightElements, 'enddate').filter(e => e.element_detail.type === 10)
        .map(degree => ({
          startdate: degree.startdate,
          enddate: degree.enddate,
          name: getTextIn(degree.element_detail.name, language),
          graduateionDate: degree.graduationDate,
          canceldate: degree.canceldate
        }))
      const programmes = sortBy(studyright.studyrightElements, 'enddate').filter(e => e.element_detail.type === 20)
        .map(programme => ({
          code: programme.code,
          startdate: programme.startdate,
          enddate: programme.enddate,
          name: getTextIn(programme.element_detail.name, language)
        }))
      const studytracks = sortBy(studyright.studyrightElements, 'enddate').filter(e => e.element_detail.type === 30)
        .map(studytrack => ({
          startdate: studytrack.startdate,
          enddate: studytrack.enddate,
          name: getTextIn(studytrack.element_detail.name, language)
        }))
      return {
        studyrightid: studyright.studyrightid,
        graduated: studyright.graduated,
        canceldate: studyright.canceldate,
        enddate: studyright.enddate,
        elements: { degrees, programmes, studytracks }
      }
    })

    const filterDuplicates = (elem1, index, array) => {
      for (let i = 0; i < array.length; i++) {
        const elem2 = array[i]
        if (elem1.name === elem2.name &&
          ((elem1.startdate > elem2.startdate && elem1.enddate <= elem2.enddate) ||
            (elem1.enddate < elem2.enddate && elem1.startdate >= elem2.startdate))) {
          return false
        }
      }
      return true
    }

    return (
      <Fragment>
        <Header content="Studyrights" />
        <Table className="fixed-header">
          <Table.Header>
            <Table.Row>
              {studyRightHeaders.map(header => (
                <Table.HeaderCell key={header}>
                  {header}
                </Table.HeaderCell>
              ))
              }
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {studyRightRows.map((c) => {
              if (c.elements.programmes.length > 0 || c.elements.degrees.length > 0) {
                return (
                  <Table.Row key={c.studyrightid}>
                    <Table.Cell verticalAlign="middle">
                      {c.elements.degrees.filter(filterDuplicates).map(degree => (
                        <p key={degree.name}>{`${degree.name} (${reformatDate(degree.startdate, 'DD.MM.YYYY')} - ${reformatDate(degree.enddate, 'DD.MM.YYYY')})`} <br /> </p>
                      ))}
                    </Table.Cell>
                    <Table.Cell>
                      {c.elements.programmes.filter(filterDuplicates).map(programme => (
                        <p key={programme.name}>{`${programme.name} (${reformatDate(programme.startdate, 'DD.MM.YYYY')} - ${reformatDate(programme.enddate, 'DD.MM.YYYY')})`}
                          <Icon name="level up alternate" onClick={() => this.showPopulationStatistics(programme.code, programme.startdate)} /> <br />
                        </p>
                      ))}
                    </Table.Cell>
                    <Table.Cell>
                      {c.elements.studytracks.filter(filterDuplicates).map(studytrack => (
                        <p key={studytrack.name}>{`${studytrack.name} (${reformatDate(studytrack.startdate, 'DD.MM.YYYY')} - ${reformatDate(studytrack.enddate, 'DD.MM.YYYY')})`}<br /> </p>
                      ))}
                    </Table.Cell>
                    <Table.Cell>
                      {c.canceldate ? // eslint-disable-line
                        <div><p style={{ color: 'red', fontWeight: 'bold' }}>CANCELED</p></div>
                        :
                        c.graduated ?
                          <div><Icon name="check circle outline" color="green" /><p>{reformatDate(c.enddate, 'DD.MM.YYYY')}</p></div>
                          :
                          <div><Icon name="circle outline" color="red" /><p>{reformatDate(c.enddate, 'DD.MM.YYYY')}</p></div>
                      }

                    </Table.Cell>
                  </Table.Row>
                )
              }
              return null
            })}
          </Table.Body>
        </Table>
      </Fragment>
    )
  }

  render() {
    const { translate, student, studentNumber, pending, error, semesters } = this.props
    if ((pending || !studentNumber || isEmpty(student) || !semesters) && !error) return null
    if (error) {
      return (
        <Segment textAlign="center">
          <p>Student not found or no sufficient permissions</p>
        </Segment>
      )
    }
    return (
      <Segment className="contentSegment" >
        <StudentInfoCard
          student={student}
          translate={translate}
        />
        {this.renderCreditsGraph()}
        {this.renderTags()}
        {this.renderStudyRights()}
        {this.renderCourseParticipation()}
      </Segment>
    )
  }
}

StudentDetails.propTypes = {
  language: string.isRequired,
  getStudent: func.isRequired,
  history: shape({}).isRequired,
  resetStudent: func.isRequired,
  removeStudentSelection: func.isRequired,
  studentNumber: string,
  translate: func.isRequired,
  clearCourseStats: func.isRequired,
  student: shape({
    courses: arrayOf(shape({
      course: shape({
        code: string,
        name: Object
      }),
      credits: integer,
      date: string,
      grade: string,
      passed: bool
    })),
    credits: integer,
    fetched: bool,
    started: string,
    studentNumber: string,
    tags: arrayOf(shape({
      programme: shape({ code: string, name: shape({}) }),
      studentnumber: string,
      tag: shape({ studytrack: string, tagname: string })
    }))
  }),
  pending: bool.isRequired,
  error: bool.isRequired,
  getSemesters: func.isRequired,
  semesters: shape({
    semesters: shape({}),
    years: shape({})
  }).isRequired
}

StudentDetails.defaultProps = {
  student: {},
  studentNumber: ''
}

const mapStateToProps = ({ students, localize, semesters }) => ({
  language: getActiveLanguage(localize).code,
  student: students.data.find(student =>
    student.studentNumber === students.selected),
  pending: students.pending,
  error: students.error,
  semesters: semesters.data
})

const mapDispatchToProps = {
  removeStudentSelection,
  clearCourseStats,
  resetStudent,
  getStudent,
  getSemesters
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(StudentDetails))
