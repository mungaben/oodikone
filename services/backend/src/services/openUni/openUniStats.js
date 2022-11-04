const moment = require('moment')
const { getCredits, getStudyRights, getEnrollments, getStudentInfo } = require('./openUniSearches')

const uniq = objects => [...new Set(objects)]

const getCustomOpenUniCourses = async courseCodes => {
  const ayCourseCodes = courseCodes.map(courseCode => 'AY' + courseCode)
  const allCourseCodes = courseCodes.concat(ayCourseCodes)
  const allCredits = await getCredits(allCourseCodes)
  const allEnrollments = await getEnrollments(allCourseCodes)
  const students = uniq(allEnrollments.map(enrollment => enrollment.enrollmentStudentnumber))

  const allStudyrights = await getStudyRights(students)
  const studentInfo = await getStudentInfo(students)
  // Filter out current studyrights:
  // Case 1: Both startdate and enddate are outside of the given interval
  // Case 2: Startdate is inside of the given interval and enddate is outside
  // Case 3: Startdate is before the interval start and the enddate is within the interval
  const studentsWithCurrentStudyRight = allStudyrights
    .filter(
      right =>
        moment(right.startdate).isBetween('2017-08-01', moment()) ||
        (moment(right.startdate).isSameOrBefore('2017-08-01') && moment(right.enddate).isSameOrAfter(moment())) ||
        moment(right.enddate).isSameOrBefore(moment())
    )
    .map(right => right.studyrightStudentnumber)
  const uniqueStudentsWithCurrentStudyRight = uniq(studentsWithCurrentStudyRight)

  const studentStats = {}
  for (const { studentnumber, email, secondary_email } of studentInfo) {
    // Check if the student has existing studyright: if yes, then stop here
    if (!uniqueStudentsWithCurrentStudyRight.includes(studentnumber)) {
      if (!(studentnumber in studentStats)) {
        studentStats[studentnumber] = {
          courseInfo: {},
          email: email,
          secondaryEmail: secondary_email,
        }
      }
      for (const { course_code, attainment_date, student_studentnumber } of allCredits) {
        if (student_studentnumber === studentnumber) {
          let courseCode = course_code
          if (course_code.startsWith('AY')) courseCode = course_code.replace('AY', '')
          if (!(courseCode in studentStats[studentnumber].courseInfo)) {
            studentStats[studentnumber].courseInfo[courseCode] = {
              enrolledPassed: null,
              enrolledNotPassed: [],
              notEnrolled: false,
            }
          }
          studentStats[studentnumber].courseInfo[courseCode].enrolledPassed = attainment_date
        }
      }
      for (const { enrollmentStudentnumber, course_code, enrollment_date_time } of allEnrollments) {
        if (enrollmentStudentnumber === studentnumber) {
          let courseCode = course_code
          if (course_code.startsWith('AY')) courseCode = course_code.replace('AY', '')
          if (!(courseCode in studentStats[studentnumber].courseInfo)) {
            studentStats[studentnumber].courseInfo[courseCode] = {
              enrolledPassed: null,
              enrolledNotPassed: [],
              notEnrolled: false,
            }
          }
          if (!studentStats[studentnumber].courseInfo[courseCode].enrolledPassed && studentnumber === studentnumber) {
            // enrolledPassed, enrolledNotPassed, notEnrolled
            studentStats[studentnumber].courseInfo[courseCode].enrolledNotPassed.push(enrollment_date_time)
          }
          if (
            studentStats[studentnumber].courseInfo[courseCode].enrolledNotPassed.length === 0 &&
            !studentStats[studentnumber].courseInfo[courseCode].enrolledPassed &&
            studentnumber === studentnumber
          ) {
            studentStats[studentnumber].courseInfo[courseCode].notEnrolled = true
          }
        }
      }
    }
  }
  return studentStats
}

module.exports = { getCustomOpenUniCourses }
