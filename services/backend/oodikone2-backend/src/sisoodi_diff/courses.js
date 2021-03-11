const SisCourse = require('../servicesV2/courses')
const OodiCourse = require('../services/courses')
const diff = require('../services/diff')

const CYAN = '\x1b[36m%s\x1b[0m'
const RED = '\x1b[41m%s\x1b[0m'

const getDiff = async () => {
  const codes = process.argv.slice(2)
  const separate = false
  const unifyOpenUniCourses = false

  const oodiResults = await OodiCourse.courseYearlyStats(codes, separate, unifyOpenUniCourses)
  const sisResults = await SisCourse.courseYearlyStats(codes, separate, unifyOpenUniCourses)
  const result = diff.getCourseYearlyStatsDiff(sisResults, oodiResults)
  return result
}

const calculateTotals = diff =>
  diff.reduce(
    (totals, course) => {
      return {
        totalMissingInSis: totals.totalMissingInSis + course.missingStudents.length,
        totalExtraInSis: totals.totalExtraInSis + course.extraStudents.length
      }
    },
    { totalMissingInSis: 0, totalExtraInSis: 0 }
  )

const printTotals = diff => {
  const { totalMissingInSis, totalExtraInSis } = calculateTotals(diff)
  console.log(CYAN, `Total missing from SIS: ${totalMissingInSis}, total extra in SIS: ${totalExtraInSis}`)
}

const printCourseSpecificTotals = diff => {
  diff.forEach(course =>
    console.log(
      CYAN,
      `${course.coursecode}: ${course.missingStudents.length} missing, ${course.extraStudents.length} extra`
    )
  )
}

const printDetailObject = detailObject => {
  detailObject.forEach(object => {
    console.log(`${object.studentnumber}\t${object.year}`)
  })
}

const printDetails = diff => {
  diff.forEach(course => {
    console.log(RED, `${course.coursecode} missing:`)
    printDetailObject(course.missingStudents)
    console.log(RED, `${course.coursecode} extra:`)
    printDetailObject(course.extraStudents)
  })
}

const main = async () => {
  const diff = await getDiff()

  printDetails(diff)
  printCourseSpecificTotals(diff)
  printTotals(diff)

  process.exit()
}

main()
