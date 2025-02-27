const moment = require('moment')
const { graduatedStudyrights, studyrightsByRightStartYear, hasMasterRight } = require('./faculty')
const { findRightProgramme, isNewProgramme } = require('./facultyHelpers')
const { getYearsArray, getYearsObject, getMedian, defineYear } = require('../studyprogrammeHelpers')
const { codes } = require('../../../config/programmeCodes')
const { bachelorStudyright, countTimeCategories, getStatutoryAbsences } = require('../graduationHelpers')
const { getProgrammes } = require('./facultyService')

const sortProgrammes = data => {
  const check = name => {
    if (isNaN(name[0])) return -1
    return 1
  }
  data.sort((a, b) => {
    if (check(a.name) === check(b.name)) return a.name.localeCompare(b.name)
    return check(a.name) - check(b.name)
  })
}

const getSortedProgIds = progs => {
  let programmes = []

  for (const prog of progs) {
    if (Object.keys(codes).includes(prog)) {
      const name = prog === 'T923103' ? codes[prog].toUpperCase() + '-DP' : codes[prog].toUpperCase()
      programmes = [...programmes, { name: name, code: prog }]
    } else {
      programmes = [...programmes, { name: prog, code: prog }]
    }
  }
  sortProgrammes(programmes)
  return programmes
}

const findBachelorStartdate = async id => {
  const studyright = await bachelorStudyright(id)
  if (studyright) return studyright.startdate
  return null
}

const getProgrammeObjectBasis = (years, levels, emptyObject = true) => {
  return levels.reduce(
    (acc, level) => ({ ...acc, [level]: years.reduce((acc, year) => ({ ...acc, [year]: emptyObject ? {} : 0 }), {}) }),
    {}
  )
}

const hasMS = async (programme, elements, studyrightid) => {
  // Only bachelor studyright: socCom, kasvatustiede - varhaiskasvatus track, farmasia - applied only to Bc = farmaseutti,
  if (['KH74_001', '620050-ba', '620030-ba', '520091-ba'].includes(programme)) {
    return false
  }
  if (programme === 'KH60_001') {
    return !elements.some(el => ['EDUK-VO', '0371', '620050-ba', '620030-ba'].includes(el.dataValues.code))
  }
  if (programme === 'KH55_001') {
    const result = await hasMasterRight(studyrightid.replace(/-1$/, '-2'))
    if (!result) {
      return false
    }
  }
  return true
}

const addGraduation = async (
  extentcode,
  startdate,
  studyrightid,
  enddate,
  studentnumber,
  graduationAmounts,
  graduationTimes,
  year,
  programmes,
  programme
) => {
  let actualStartdate = startdate
  let level = null

  if (programme === 'MH30_001' || programme === 'MH30_003') {
    level = 'bcMsCombo'
  } else if (extentcode === 1) {
    level = 'bachelor'
  } else if (extentcode === 2) {
    if (studyrightid.slice(-2) === '-2') {
      level = 'bcMsCombo'
      actualStartdate = await findBachelorStartdate(studyrightid.replace(/-2$/, '-1'))
    } else {
      level = 'master'
    }
  } else if (extentcode === 4) {
    level = 'doctor'
  } else if (extentcode === 3) {
    level = 'licentiate'
  } else {
    return
  }

  const absoluteTimeToGraduation = moment(enddate).diff(moment(actualStartdate), 'months')
  const statutoryAbsences = await getStatutoryAbsences(studentnumber, actualStartdate, enddate)
  const timeToGraduation = absoluteTimeToGraduation - statutoryAbsences

  graduationAmounts[level][year] += 1
  graduationTimes[level][year] = [...graduationTimes[level][year], timeToGraduation]

  if (!(programme in programmes[level][year]))
    programmes[level][year][programme] = { graduationTimes: [], graduationAmounts: 0 }

  programmes[level][year][programme].graduationAmounts += 1
  programmes[level][year][programme].graduationTimes = [
    ...programmes[level][year][programme].graduationTimes,
    timeToGraduation,
  ]
}

const getClassSizes = async (faculty, programmeCodes, since, classSizes, programmeFilter, years) => {
  for (const code of programmeCodes) {
    const studyrights = await studyrightsByRightStartYear(faculty, code, since, [0, 1])

    // get all received studyrights for each year
    // a transferred student is counted into new programmes class size i.e.
    // students who received studyright on year X and graduated/will be graduating from programme Y
    // if we only counted those who started fresh in the new programme we could get a bigger number of graduates
    // than the class size, as the graduatation time count only looks at a degree as whole studyright
    for (const right of studyrights) {
      const { startdate, studyrightid, extentcode, studyrightElements } = right
      if (programmeFilter === 'NEW_STUDY_PROGRAMMES' && !isNewProgramme(code)) continue

      let actualStartdate = startdate
      let level = null

      if (code === 'MH30_001' || code === 'MH30_003') {
        level = 'bcMsCombo'
      } else if (extentcode === 1) {
        level = 'bachelor'
      } else if (extentcode === 2) {
        if (studyrightid.slice(-2) === '-2') {
          level = 'bcMsCombo'
          actualStartdate = await findBachelorStartdate(studyrightid.replace(/-2$/, '-1'))
        } else {
          if (code.includes('KH')) {
            level = 'bachelor' // Some rare faculties have one/two outliers with extent 2 for bachelor
          } else {
            level = 'master'
          }
        }
      } else if (extentcode === 4) {
        level = 'doctor'
      } else if (extentcode === 3) {
        level = 'licentiate'
      } else {
        continue
      }
      const startYear = defineYear(actualStartdate, false)

      // On faculty level, count started bachelor rights to BcMsCombo as well  --> useful class size even if master studies have yet not started
      // On programme level BcMsCombo sizes are iffy as many students haven't started masters yet --> no Ms programme element to count
      if (level !== 'bcMsCombo') {
        classSizes[level][startYear] += 1
        if (level === 'bachelor' && (await hasMS(code, studyrightElements, studyrightid))) {
          classSizes['bcMsCombo'][startYear] += 1
        }
      }

      if (!(code in classSizes.programmes)) {
        if (extentcode === 2) {
          classSizes.programmes[code] = {}
          classSizes.programmes[code]['bcMsCombo'] = getYearsObject({ years, emptyArrays: false })
          classSizes.programmes[code]['master'] = getYearsObject({ years, emptyArrays: false })
        } else {
          classSizes.programmes[code] = getYearsObject({ years, emptyArrays: false })
        }
      }

      if (extentcode === 2 && ['master', 'bcMsCombo'].includes(level)) {
        classSizes.programmes[code][level][startYear] += 1
      } else {
        classSizes.programmes[code][startYear] += 1
      }
    }
  }
}

const count = async (
  faculty,
  programmeCodes,
  since,
  years,
  yearsList,
  levels,
  programmeFilter,
  programmeNames,
  goals,
  mode
) => {
  let graduationAmounts = {}
  let graduationTimes = {}
  let programmes = getProgrammeObjectBasis(yearsList, levels)
  let data = {
    medians: {},
    programmes: {
      medians: getProgrammeObjectBasis(yearsList, levels),
    },
  }

  levels.forEach(level => {
    graduationAmounts[level] = getYearsObject({ years: yearsList })
    graduationTimes[level] = getYearsObject({ years: yearsList, emptyArrays: true })
    data.medians[level] = []
  })
  for (const code of programmeCodes) {
    let studyrights = null
    if (mode === 'gradYear') {
      studyrights = await graduatedStudyrights(faculty, code, since)
    } else {
      studyrights = await studyrightsByRightStartYear(faculty, code, since)
    }
    for (const right of studyrights) {
      const { enddate, startdate, studyrightid, extentcode, studyrightElements, studentnumber } = right
      const { programme, programmeName } = findRightProgramme(studyrightElements, code)
      if (programmeFilter === 'NEW_STUDY_PROGRAMMES' && !isNewProgramme(programme)) continue

      if (!(programme in programmeNames)) {
        programmeNames[programme] = programmeName
      }

      let year = null
      if (mode === 'gradYear') {
        year = defineYear(enddate, false)
      } else {
        year = defineYear(startdate, false)
      }

      await addGraduation(
        extentcode,
        startdate,
        studyrightid,
        enddate,
        studentnumber,
        graduationAmounts,
        graduationTimes,
        year,
        programmes,
        programme
      )
    }
  }
  years.forEach(year => {
    levels.forEach(level => {
      const median = getMedian(graduationTimes[level][year])
      const statistics = { onTime: 0, yearOver: 0, wayOver: 0 }

      // Programme level breakdown
      data.programmes.medians[level][year] = { programmes: [], data: [] }
      const programmeCodes = Object.keys(programmes[level][year])
      const programmeIds = getSortedProgIds(programmeCodes)

      if (programmeIds.length > 0) {
        for (const prog of programmeIds) {
          const progMedian = getMedian(programmes[level][year][prog.code].graduationTimes)

          let goal = goals[level]
          if (faculty === 'H30' && Object.keys(goals.exceptions).includes(prog.code)) {
            goal += goals.exceptions[prog.code]
          }

          const progStatistics = countTimeCategories(programmes[level][year][prog.code].graduationTimes, goal)
          Object.keys(progStatistics).forEach(key => (statistics[key] += progStatistics[key]))

          data.programmes.medians[level][year].programmes = [
            ...data.programmes.medians[level][year].programmes,
            prog.code,
          ]
          data.programmes.medians[level][year].data = [
            ...data.programmes.medians[level][year].data,
            {
              y: progMedian,
              amount: programmes[level][year][prog.code].graduationAmounts,
              statistics: progStatistics,
              name: prog.name,
              code: prog.code,
            },
          ]
        }
      }
      data.medians[level] = [
        ...data.medians[level],
        { y: median, amount: graduationAmounts[level][year], statistics, name: year },
      ]
    })
  })

  return data
}

const countGraduationTimes = async (faculty, programmeFilter) => {
  const programmes = (await getProgrammes(faculty, programmeFilter)).data
  const isAcademicYear = false
  const since = isAcademicYear ? new Date('2017-08-01') : new Date('2017-01-01')
  const yearsList = getYearsArray(since.getFullYear(), isAcademicYear)
  const levels = ['bachelor', 'bcMsCombo', 'master', 'doctor', 'licentiate']
  const programmeNames = {}

  const years = [...yearsList].reverse()
  const goals = {
    bachelor: 36,
    bcMsCombo: 60,
    master: 24,
    doctor: 48,
    licentiate: 78,
    exceptions: {
      MH30_004: 6, //months more
      '420420-ma': 6,
      MH30_001: 12,
      '320011-ma': 12,
      '320001-ma': 12,
      MH30_003: 6,
      '320002-ma': 12,
    },
  }

  if (faculty === 'H90') {
    goals.bcMsCombo += 12
  }

  // We count studyrights (vs. studyright_elements)
  // This way we get the whole time for a degree, even if the student was transferred to a new programme
  // E.g. started 8/2016 in old Bc, transferred to new 10/2020, graduated from new 1/2021 --> total 53 months (not 3)
  const programmeCodes = programmes.map(prog => prog.code)
  const byGradYear = await count(
    faculty,
    programmeCodes,
    since,
    years,
    yearsList,
    levels,
    programmeFilter,
    programmeNames,
    goals,
    'gradYear'
  )

  const byStartYear = await count(
    faculty,
    programmeCodes,
    since,
    years,
    yearsList,
    levels,
    programmeFilter,
    programmeNames,
    goals,
    'startYear'
  )

  const classSizes = getProgrammeObjectBasis(yearsList, levels, false)
  classSizes['programmes'] = {}
  await getClassSizes(faculty, programmeCodes, since, classSizes, programmeFilter, years)

  return { id: faculty, goals, byGradYear, byStartYear, programmeNames, classSizes }
}

module.exports = { countGraduationTimes }
