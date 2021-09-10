const { CronJob } = require('cron')
const moment = require('moment')
const {
  refreshProtoC,
  refreshStatus,
  refreshStatusGraduated,
  refreshUber,
  refreshProtoCProgramme,
  getStartYears,
} = require('./services/trends')
const { refreshAssociationsInRedis } = require('./services/studyrights')
const { getAllProgrammes, nonGraduatedStudentsOfElementDetail } = require('./services/studyrights')
const { productivityStatsForStudytrack, throughputStatsForStudytrack } = require('./services/studyprogramme')
const { findAndSaveTeachers } = require('./services/topteachers')
const {
  setProductivity,
  setThroughput,
  patchProductivity,
  patchThroughput,
  patchNonGraduatedStudents,
} = require('./services/analyticsService')
const { isNewHYStudyProgramme } = require('./util')
const { isProduction } = require('./conf-backend')
const logger = require('./util/logger')

const schedule = (cronTime, func) => new CronJob({ cronTime, onTick: func, start: true, timeZone: 'Europe/Helsinki' })

const refreshStudyrightAssociations = async () => {
  await refreshAssociationsInRedis()
  logger.info('Studyright associations refreshed!')
}

const refreshOverview = async () => {
  logger.info('Refreshing throughput and productivity for programmes...')
  const codes = (await getAllProgrammes()).map(p => p.code)
  let ready = 0
  for (const code of codes) {
    let programmeStatsSince = new Date('2017-07-31')
    if (code.includes('MH') || code.includes('KH')) {
      programmeStatsSince = new Date('2017-07-31')
    } else {
      programmeStatsSince = new Date('2000-07-31')
    }
    try {
      await patchThroughput({ [code]: { status: 'RECALCULATING' } })
      const data = await throughputStatsForStudytrack(code, programmeStatsSince.getFullYear())
      await setThroughput(data)
    } catch (e) {
      logger.error({ message: `failed to recalculate throughput for ${code}`, meta: e })
      try {
        await patchThroughput({ [code]: { status: 'RECALCULATION ERRORED' } })
      } catch (e) {
        logger.error({ message: 'failed to update throughtput status to error', meta: e })
      }
    }
    try {
      await patchProductivity({ [code]: { status: 'RECALCULATING' } })
      const data = await productivityStatsForStudytrack(code, programmeStatsSince)
      await setProductivity(data)
    } catch (e) {
      logger.error({ message: `failed to recalculate productivity for ${code}`, meta: e })
      try {
        await patchProductivity({
          [code]: { status: 'RECALCULATION ERRORED' },
        })
      } catch (e) {
        logger.error({ message: 'failed to update productivity status to error', meta: e })
      }
    }
    ready += 1
    logger.info(`${ready}/${codes.length} programmes done`)
  }
  logger.info('Throughput and productivity for programmes refreshed')
}

const refreshTeacherLeaderboard = async () => {
  const startyearcode = new Date().getFullYear() - 1950
  const endyearcode = startyearcode + 1
  await findAndSaveTeachers(startyearcode, endyearcode)
  logger.info('Teacher leaderboard refreshed')
}

const refreshNonGraduatedStudentsOfOldProgrammes = async () => {
  const oldProgrammeCodes = (await getAllProgrammes()).map(p => p.code).filter(c => !isNewHYStudyProgramme(c))
  let i = 0
  logger.info('Refreshing non-graduated students of old programmes...')
  await Promise.all(
    oldProgrammeCodes.map(
      c =>
        new Promise(async res => {
          try {
            const [nonGraduatedStudents, studentnumbers] = await nonGraduatedStudentsOfElementDetail(c)
            await patchNonGraduatedStudents({ [c]: { formattedData: nonGraduatedStudents, studentnumbers } })
            logger.info(`${++i}/${oldProgrammeCodes.length} of old programmes done`)
          } catch (e) {
            logger.error(`Failed refreshing non-graduated students of programme ${c}!`)
          }
          res()
        })
    )
  )
}

const refreshProtoCtoRedis = async () => {
  const defaultQuery = { include_old_attainments: 'false', exclude_non_enrolled: 'false' }
  const onlyOld = { include_old_attainments: 'true', exclude_non_enrolled: 'false' }
  const onlyEnr = { include_old_attainments: 'false', exclude_non_enrolled: 'true' }
  const bothToggles = { include_old_attainments: 'true', exclude_non_enrolled: 'true' }
  logger.info('Refreshing CDS ProtoC')
  await refreshProtoC(defaultQuery)
  await refreshProtoC(onlyOld)
  await refreshProtoC(onlyEnr)
  await refreshProtoC(bothToggles)
}

const refreshStatusToRedis = async () => {
  const unixMillis = moment().valueOf()
  const date = new Date(Number(unixMillis))

  date.setHours(23, 59, 59, 999)
  const showByYearOff = 'false'
  const showByYear = 'true'
  logger.info('Refreshing CDS Status')
  await refreshStatus(date.getTime(), showByYearOff)
  await refreshStatus(date.getTime(), showByYear)

  logger.info('Refreshing CDS Graduated')
  await refreshStatusGraduated(date.getTime(), showByYearOff)
  await refreshStatusGraduated(date.getTime(), showByYear)
}

const refreshUberToRedis = async () => {
  const years = await getStartYears()
  const mappedYears = years.map(({ studystartdate }) => studystartdate)
  mappedYears.forEach(async year => {
    logger.info(`Refreshing CDS Uber data for date ${year}`)
    const defaultQuery = { include_old_attainments: 'false', start_date: year }
    const oldAttainmentsQuery = { include_old_attainments: 'true', start_date: year }
    await refreshUber(defaultQuery)
    await refreshUber(oldAttainmentsQuery)
  })
}

const refreshProtoCProgrammeToRedis = async () => {
  const codes = (await getAllProgrammes()).map(p => p.code).filter(code => code.includes('KH'))
  codes.forEach(async code => {
    logger.info(`Refreshing protocprogramme code ${code}`)
    const defaultQuery = { include_old_attainments: 'false', exclude_non_enrolled: 'false', code }
    const onlyOld = { include_old_attainments: 'true', exclude_non_enrolled: 'false', code }
    const onlyEnr = { include_old_attainments: 'false', exclude_non_enrolled: 'true', code }
    const bothToggles = { include_old_attainments: 'true', exclude_non_enrolled: 'true', code }
    await refreshProtoCProgramme(defaultQuery)
    await refreshProtoCProgramme(onlyOld)
    await refreshProtoCProgramme(onlyEnr)
    await refreshProtoCProgramme(bothToggles)
  })
}

const refreshStatistics = async () => {
  try {
    await refreshStudyrightAssociations()
    await refreshOverview()
    await refreshNonGraduatedStudentsOfOldProgrammes()
    await refreshTeacherLeaderboard()
  } catch (e) {
    logger.error({ message: 'Error happened while refreshing', meta: e })
  }
  logger.info('Statistics refreshed!')
}

const refreshTrends = async () => {
  try {
    await refreshProtoCtoRedis()
    await refreshStatusToRedis()
    await refreshUberToRedis()
    await refreshProtoCProgrammeToRedis()
  } catch (e) {
    logger.error({ message: 'Error happened while refreshing', meta: e })
  }
  logger.info('Trends refreshed!')
}

const startCron = () => {
  if (isProduction) {
    schedule('0 6 * * *', async () => {
      await refreshStatistics()
      await refreshTrends()
    })
  }
}

module.exports = {
  startCron,
  refreshStatistics,
}
