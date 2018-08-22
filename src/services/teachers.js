const { Teacher, Credit, Course, Semester, Provider } = require('../models/index')
const { Op } = require('sequelize')

const splitByEmptySpace = str => str.replace(/\s\s+/g, ' ').split(' ')

const likefy = term => `%${term}%`

const nameLike = terms => ({
  name: {
    [Op.and]: terms.map(term => ({ [Op.iLike]: likefy(term) }))
  }
})

const codeLike = terms => {
  if (terms.length !== 1) {
    return undefined
  }
  return {
    code: {
      [Op.iLike]: likefy(terms[0])
    }
  }
}

const invalidTerm = searchTerm => !searchTerm.trim()

const bySearchTerm = async searchTerm => {
  if (invalidTerm(searchTerm)) {
    return []
  }
  const terms = splitByEmptySpace(searchTerm)
  return Teacher.findAll({
    attributes: {
      exclude: ['createdAt', 'updatedAt']
    },
    where: {
      [Op.or]: [
        nameLike(terms),
        codeLike(terms)
      ]
    }
  })
}

const findTeacherCredits = teacherid => Teacher.findByPrimary(teacherid, {
  attributes: ['name', 'code', 'id'],
  include: {
    model: Credit,
    attributes: ['credits', 'grade', 'id', 'student_studentnumber', 'credittypecode'],
    include: [
      {
        model: Course,
        attributes: ['name', 'code'],
        required: true
      },
      {
        model: Semester,
        attributes: ['semestercode', 'name', 'yearname', 'yearcode']
      }
    ]
  }
})

const parseCreditInfo = credit => ({
  studentnumber: credit.student_studentnumber,
  credits: credit.credits,
  grade: credit.grade,
  passed: Credit.passed(credit) || Credit.improved(credit),
  failed: Credit.failed(credit),
  course: credit.course,
  semester: credit.semester
})

const markCredit = (stats, passed, failed, credits) => {
  if (!stats) {
    stats = {
      passed: 0,
      failed: 0,
      credits: 0
    }
  }
  if (passed) {
    return {
      ...stats,
      credits: stats.credits + credits,
      passed: stats.passed + 1
    }
  } else if (failed) {
    return {
      ...stats,
      failed: stats.failed + 1
    }
  } else {
    return stats
  }
}

const markCreditForSemester = (semesters, credit) => {
  const { passed, failed, credits, semester } = parseCreditInfo(credit)
  const { semestercode, name } = semester
  const { stats, ...rest } = semesters[semestercode] || { id: semestercode, name }
  return {
    ...semesters,
    [semestercode]: {
      ...rest,
      stats: markCredit(stats, passed, failed, credits)
    }
  }
}

const markCreditForYear = (years, credit) => {
  const { passed, failed, credits, semester } = parseCreditInfo(credit)
  const { yearcode, yearname } = semester
  const { stats, ...rest } = years[yearcode] || { id: yearcode, name: yearname }
  return {
    ...years,
    [yearcode]: {
      ...rest,
      stats: markCredit(stats, passed, failed, credits)
    }
  }
}

const markCreditForCourse = (courses, credit) => {
  const { passed, failed, credits, course } = parseCreditInfo(credit)
  const { code, name } = course
  const { stats, ...rest } = courses[code] || { id: code, name }
  return {
    ...courses,
    [code]: {
      ...rest,
      stats: markCredit(stats, passed, failed, credits)
    }
  }
}

const teacherStats = async teacherid => {
  const teacher = await findTeacherCredits(teacherid)
  const statistics = teacher.credits.reduce(({ semesters, years, courses, ...rest }, credit) => {
    return {
      ...rest,
      semesters: markCreditForSemester(semesters, credit),
      years: markCreditForYear(years, credit),
      courses: markCreditForCourse(courses, credit)
    }
  }, {
    semesters: {},
    courses: {},
    years: {}
  })
  return {
    name: teacher.name,
    code: teacher.code,
    id: teacher.id,
    statistics
  }
}

const activeTeachers = async (providers, yearcodeStart, yearcodeEnd) => {
  const teachers = Teacher.findAll({
    attributes: ['id'],
    include: {
      model: Credit,
      attributes: [],
      required: true,
      include: [
        {
          model: Course,
          attributes: [],
          required: true,
          include: {
            model: Provider,
            attributes: [],
            required: true,
            where: {
              providercode: {
                [Op.in]: providers
              }
            }
          }
        },
        {
          model: Semester,
          required: true,
          attributes: [],
          where: {
            yearcode: {
              [Op.between]: [yearcodeStart, yearcodeEnd]
            }
          }
        }
      ]
    }
  })
  return teachers.map(({ id }) => id)
}

const getCredits = (teacherIds, yearcodeStart, yearcodeEnd) => Teacher.findAll({
  attributes: ['name', 'code', 'id'],
  include: {
    model: Credit,
    attributes: ['credits', 'grade', 'id', 'student_studentnumber', 'credittypecode'],
    include: [
      {
        model: Course,
        required: true
      },
      {
        model: Semester,
        required: true,
        attributes: ['semestercode', 'name', 'yearname', 'yearcode'],
        where: {
          yearcode: {
            [Op.between]: [yearcodeStart, yearcodeEnd]
          }
        }
      }
    ]
  },
  where: {
    id: {
      [Op.in]: teacherIds
    }
  }
})

const calculateCreditStatistics = credits => credits.reduce((stats, credit) => {
  const { passed, failed, credits } = parseCreditInfo(credit)
  return markCredit(stats, passed, failed, credits)
}, undefined)

const yearlyStatistics = async (providers, yearcodeStart, yearcodeEnd) => {
  const ids = await activeTeachers(providers, yearcodeStart, yearcodeEnd)
  const teachers = await getCredits(ids, yearcodeStart, yearcodeEnd)
  const statistics = teachers.reduce((acc, teacher) => {
    return {
      ...acc,
      [teacher.id]: {
        name: teacher.name,
        code: teacher.code,
        id: teacher.id,
        stats: calculateCreditStatistics(teacher.credits)
      }
    }
  }, {})
  return statistics
}

module.exports = {
  bySearchTerm,
  teacherStats,
  yearlyStatistics
}