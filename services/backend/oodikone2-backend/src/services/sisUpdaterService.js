const axios = require('axios')
const { optimizedStatisticsOf: sisOptimized } = require('../servicesV2/populations')
const { optimizedStatisticsOf: oodiOptimized } = require('../services/populations')
const { SIS_UPDATER_URL, SECRET_TOKEN } = require('../conf-backend')

const client = axios.create({ baseURL: SIS_UPDATER_URL })

const updateSISStudents = async () => {
  const response = await client.get('/v1/students', { params: { token: SECRET_TOKEN } })
  return response.data
}

const updateStudentsByStudentNumber = async studentnumbers => {
  const data = { studentnumbers }
  const response = await client.post('/v1/students', data, { params: { token: SECRET_TOKEN } })
  return response.data
}

const updateSISStudentsByProgramme = async details => {
  const getStudentsForOneYear = async year => {
    const query = {
      semesters: ['FALL', 'SPRING'],
      studyRights: { programme },
      year: Number(year),
      studentStatuses: ['CANCELLED', 'EXCHANGE', 'NONDEGREE', 'TRANSFERRED']
    }
    const sisResult = await sisOptimized(query)
    const oodiResult = await oodiOptimized(query)
    const sisStudentnumbers = sisResult.students.map(s => s.studentNumber)
    const oodiStudentnumbers = oodiResult.students.map(s => s.studentNumber)
    return [...new Set([...sisStudentnumbers, ...oodiStudentnumbers])]
  }
  const { programme, year } = details
  if (year) {
    return await updateStudentsByStudentNumber(getStudentsForOneYear(year))
  } else {
    console.log("year not spesified")
    return []
  }
}

const updateCoursesByCourseCode = async coursecodes => {
  const data = { coursecodes }
  const response = await client.post('/v1/courses', data, { params: { token: SECRET_TOKEN } })
  return response.data
}

const updateSISMetadata = async () => {
  const response = await client.get('/v1/meta', { params: { token: SECRET_TOKEN } })
  return response.data
}

const updateSISProgrammes = async () => {
  const response = await client.get('/v1/programmes', { params: { token: SECRET_TOKEN } })
  return response.data
}

const updateSISRedisCache = async () => {
  const response = await client.get('/v1/rediscache', { params: { token: SECRET_TOKEN } })
  return response.data
}

const abort = async () => {
  const response = await client.get('/v1/abort', { params: { token: SECRET_TOKEN } })
  return response.data
}

module.exports = {
  updateSISMetadata,
  updateSISStudents,
  updateSISStudentsByProgramme,
  updateSISProgrammes,
  updateStudentsByStudentNumber,
  updateSISRedisCache,
  abort,
  updateCoursesByCourseCode
}
