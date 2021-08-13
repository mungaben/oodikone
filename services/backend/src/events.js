const { CronJob } = require('cron')
const moment = require('moment')

const {
  refreshProtoC: refreshProtoCV2,
  refreshStatus: refreshStatusV2,
  refreshStatusGraduated: refreshStatusGraduatedV2,
  refreshUber: refreshUberV2,
  refreshProtoCProgramme: refreshProtoCProgrammeV2,
  getStartYears: getStartYearsV2,
} = require('./servicesV2/trends')

const { refreshAssociationsInRedis: refreshAssociationsInRedisV2 } = require('./servicesV2/studyrights')
const {
  getAllProgrammes: getAllProgrammesV2,
  nonGraduatedStudentsOfElementDetail: nonGraduatedStudentsOfElementDetailV2,
} = require('./servicesV2/studyrights')

const {
  productivityStatsForStudytrack: productivityStatsForStudytrackV2,
  throughputStatsForStudytrack: throughputStatsForStudytrackV2,
} = require('./servicesV2/studyprogramme')

const topteachersV2 = require('./servicesV2/topteachers')

const { isNewHYStudyProgramme } = require('./util')
const { calculateFacultyYearlyStats } = require('./services/faculties')
const { patchFacultyYearlyStats } = require('./servicesV2/analyticsService')

const {
  setProductivity: setProductivityV2,
  setThroughput: setThroughputV2,
  patchProductivity: patchProductivityV2,
  patchThroughput: patchThroughputV2,
  patchNonGraduatedStudents: patchNonGraduatedStudentsV2,
} = require('./servicesV2/analyticsService')

const schedule = (cronTime, func) => new CronJob({ cronTime, onTick: func, start: true, timeZone: 'Europe/Helsinki' })

// This is currently done with old data, update to use sis db
const refreshFacultyYearlyStats = async () => {
  try {
    console.log('Refreshing faculty yearly stats...')
    const data = await calculateFacultyYearlyStats()
    await patchFacultyYearlyStats(data)
  } catch (e) {
    console.error(e)
  }
}

const refreshStudyrightAssociationsV2 = async () => {
  try {
    console.log('Refreshing studyright associations...')
    await refreshAssociationsInRedisV2()
  } catch (e) {
    console.error(e)
  }
}

const refreshOverviewV2 = async () => {
  try {
    console.log('Refreshing throughput and productivity for programmes...')
    const codes = (await getAllProgrammesV2()).map(p => p.code)
    let ready = 0
    for (const code of codes) {
      let programmeStatsSince = new Date('2017-07-31')
      if (code.includes('MH') || code.includes('KH')) {
        programmeStatsSince = new Date('2017-07-31')
      } else {
        programmeStatsSince = new Date('2000-07-31')
      }
      try {
        await patchThroughputV2({ [code]: { status: 'RECALCULATING' } })
        const data = await throughputStatsForStudytrackV2(code, programmeStatsSince.getFullYear())
        await setThroughputV2(data)
      } catch (e) {
        try {
          await patchThroughputV2({ [code]: { status: 'RECALCULATION ERRORED' } })
        } catch (e) {
          console.error(e)
        }
        console.error(e)
        console.log(`Failed to update throughput stats for code: ${code}, reason: ${e.message}`)
      }
      try {
        await patchProductivityV2({ [code]: { status: 'RECALCULATING' } })
        const data = await productivityStatsForStudytrackV2(code, programmeStatsSince)
        await setProductivityV2(data)
      } catch (e) {
        try {
          await patchProductivityV2({
            [code]: { status: 'RECALCULATION ERRORED' },
          })
        } catch (e) {
          console.error(e)
        }
        console.error(e)
        console.log(`Failed to update productivity stats for code: ${code}, reason: ${e.message}`)
      }
      ready += 1
      console.log(`${ready}/${codes.length} programmes done`)
    }
  } catch (e) {
    console.error(e)
  }
}

const refreshTeacherLeaderboardV2 = async () => {
  try {
    const startyearcode = new Date().getFullYear() - 1950
    const endyearcode = startyearcode + 1
    console.log('Refreshing teacher leaderboard...')
    await topteachersV2.findAndSaveTeachers(startyearcode, endyearcode)
  } catch (e) {
    console.log(e)
  }
}

const refreshNonGraduatedStudentsOfOldProgrammesV2 = async () => {
  try {
    const oldProgrammeCodes = (await getAllProgrammesV2()).map(p => p.code).filter(c => !isNewHYStudyProgramme(c))
    let i = 0
    console.log('Refreshing non-graduated students of old programmes...')
    await Promise.all(
      oldProgrammeCodes.map(
        c =>
          new Promise(async res => {
            try {
              const [nonGraduatedStudents, studentnumbers] = await nonGraduatedStudentsOfElementDetailV2(c)
              await patchNonGraduatedStudentsV2({ [c]: { formattedData: nonGraduatedStudents, studentnumbers } })
              console.log(`${++i}/${oldProgrammeCodes.length}`)
            } catch (e) {
              console.log(`Failed refreshing non-graduated students of programme ${c}!`)
            }
            res()
          })
      )
    )
  } catch (e) {
    console.log(e)
  }
}

const refreshProtoCtoRedisV2 = async () => {
  try {
    const defaultQuery = { include_old_attainments: 'false', exclude_non_enrolled: 'false' }
    const onlyOld = { include_old_attainments: 'true', exclude_non_enrolled: 'false' }
    const onlyEnr = { include_old_attainments: 'false', exclude_non_enrolled: 'true' }
    const bothToggles = { include_old_attainments: 'true', exclude_non_enrolled: 'true' }
    console.log('Refreshing CDS ProtoC')
    await refreshProtoCV2(defaultQuery)
    await refreshProtoCV2(onlyOld)
    await refreshProtoCV2(onlyEnr)
    await refreshProtoCV2(bothToggles)
  } catch (e) {
    console.log(e)
  }
}

const refreshStatusToRedisV2 = async () => {
  try {
    const unixMillis = moment().valueOf()
    const date = new Date(Number(unixMillis))

    date.setHours(23, 59, 59, 999)
    const showByYearOff = 'false'
    const showByYear = 'true'
    console.log('Refreshing CDS Status')
    await refreshStatusV2(date.getTime(), showByYearOff)
    await refreshStatusV2(date.getTime(), showByYear)

    console.log('Refreshing CDS Graduated')
    await refreshStatusGraduatedV2(date.getTime(), showByYearOff)
    await refreshStatusGraduatedV2(date.getTime(), showByYear)
  } catch (e) {
    console.log(e)
  }
}

const refreshUberToRedisV2 = async () => {
  try {
    const years = await getStartYearsV2()
    const mappedYears = years.map(({ studystartdate }) => studystartdate)
    mappedYears.forEach(async year => {
      console.log('Refreshing CDS Uber data for date', year)
      const defaultQuery = { include_old_attainments: 'false', start_date: year }
      const oldAttainmentsQuery = { include_old_attainments: 'true', start_date: year }
      await refreshUberV2(defaultQuery)
      await refreshUberV2(oldAttainmentsQuery)
    })
  } catch (e) {
    console.log(e)
  }
}

const refreshProtoCProgrammeToRedisV2 = async () => {
  try {
    const codes = (await getAllProgrammesV2()).map(p => p.code).filter(code => code.includes('KH'))
    codes.forEach(async code => {
      console.log('refreshing code', code)
      const defaultQuery = { include_old_attainments: 'false', exclude_non_enrolled: 'false', code }
      const onlyOld = { include_old_attainments: 'true', exclude_non_enrolled: 'false', code }
      const onlyEnr = { include_old_attainments: 'false', exclude_non_enrolled: 'true', code }
      const bothToggles = { include_old_attainments: 'true', exclude_non_enrolled: 'true', code }
      console.log('Refreshing CDS ProtoCProgramme for code ', code)
      await refreshProtoCProgrammeV2(defaultQuery)
      await refreshProtoCProgrammeV2(onlyOld)
      await refreshProtoCProgrammeV2(onlyEnr)
      await refreshProtoCProgrammeV2(bothToggles)
    })
  } catch (e) {
    console.log(e)
  }
}

const refreshStatisticsV2 = async () => {
  await refreshStudyrightAssociationsV2()
  await refreshOverviewV2()
  await refreshNonGraduatedStudentsOfOldProgrammesV2()
  await refreshTeacherLeaderboardV2()
  await refreshFacultyYearlyStats() // using old data
}

const refreshTrendsV2 = async () => {
  await refreshProtoCtoRedisV2()
  await refreshStatusToRedisV2()
  await refreshUberToRedisV2()
  await refreshProtoCProgrammeToRedisV2()
}

const startCron = () => {
  if (process.env.NODE_ENV === 'production') {
    schedule('0 6 * * *', async () => {
      await refreshStatisticsV2()
      await refreshTrendsV2()
    })
  }
}

module.exports = {
  startCron,
  refreshStatisticsV2,
}
