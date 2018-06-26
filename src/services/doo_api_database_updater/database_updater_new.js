const Oodi = require('./oodi_interface_new')
const OrganisationService = require('../organisations')
const logger = require('../../util/logger')
const mapper = require('./oodi_data_mapper')
const { Student, Studyright, ElementDetails, StudyrightElement, Credit, Course, CourseInstance, Teacher } = require('../../../src/models/index')
const TeacherService = require('../teachers') 

const DEFAULT_TEACHER_ROLE = 'Teacher'

process.on('unhandledRejection', (reason) => {
  console.log(reason)
})

const getAllStudentInformationFromApi = async studentnumber => {
  const [ student, studyrights, studyattainments ] = await Promise.all([
    Oodi.getStudent(studentnumber),
    Oodi.getStudentStudyRights(studentnumber),
    Oodi.getStudyAttainments(studentnumber),
  ])
  return {
    student,
    studyrights, 
    studyattainments
  }
}

const updateStudyrights = async api => {
  for (let data of api.studyrights) {
    const [ studyright, updated ] = await Studyright.upsert(mapper.getStudyRightFromData(data), { returning: true })
    logger.verbose(`Studyright ${studyright.studyrightid} updated or created: ${updated}`)
    for (let element of data.elements) {
      await ElementDetails.upsert(mapper.elementDetailFromData(element))
      await StudyrightElement.upsert(mapper.studyrightElementFromData(element, studyright.studyrightid))
    }
  }
}

const getTeachers = teachers => Promise.all(teachers.map(t => Oodi.getTeacherInfo(t.teacher_id)))

const createTeachers = async (attainment, courseinstance) => {
  const teachers = await getTeachers(attainment.teachers)
  await Promise.all(teachers.map(teacher => Teacher.upsert(mapper.getTeacherFromData(teacher))))
  for (let teacher of teachers) {
    await TeacherService.createCourseTeacher(DEFAULT_TEACHER_ROLE, teacher, courseinstance)
  }
}

const updateStudyattainments = async api => {
  for (let attainment of api.studyattainments) {
    await Course.upsert(mapper.attainmentDataToCourse(attainment))
    const [ courseinstance ] = await CourseInstance.upsert(
      mapper.attainmentDataToCourseInstance(attainment),
      { returning: true }
    )
    await Credit.upsert(mapper.attainmentDataToCredit(attainment, courseinstance.id))
    await createTeachers(attainment, courseinstance)
  }
} 

const updateStudentInformation = async (studentNumberList, startindex) => {
  let index = startindex
  for (let studentnumber of studentNumberList) {
    const api = await getAllStudentInformationFromApi(studentnumber)
    if (api.student === null || api.student === undefined) {
      logger.verbose(`API returned ${api.student} for studentnumber ${studentnumber}`)
    } else {
      await Student.upsert(mapper.getStudentFromData(api.student, api.studyrights))
      await Promise.all([
        updateStudyrights(api),
        updateStudyattainments(api)
      ])
      index = index + 1
      logger.verbose(`Students updated: ${index}/${studentNumberList.length + startindex}.`)
    }
  }
}

const getFaculties = () => {
  return Promise.all([OrganisationService.all(), Oodi.getFaculties()])
}

const saveFacultyToDb = async faculty => {
  try {
    await OrganisationService.createOrganisation(faculty)
    logger.verbose(`Faculty ${faculty.code} created.`)
  } catch (error) {
    logger.verbose(`Error creating faculty ${faculty.code}, error: ${error.message}`)
  }
}

const updateFaculties = async () => {
  const [dbFacultiesArray, apiFacultiesArray] = await getFaculties()
  const dbFacultyCodes = new Set(dbFacultiesArray.map(faculty => faculty.code))
  await Promise.all(apiFacultiesArray.map(async faculty => {
    if (dbFacultyCodes.has(faculty.code)) {
      logger.verbose(`Faculty ${faculty.code} already in in db.`)
      return
    }
    logger.verbose(`Faculty ${faculty.code} missing from db.`)
    await saveFacultyToDb(faculty)
  }))
}

const updateStudents = async (studentnumbers, startindex = 0) => {
  await updateStudentInformation(studentnumbers.splice(startindex), startindex)
}

const updateDatabase = async (studentnumbers) => {
  await updateFaculties()
  await updateStudents(studentnumbers, startindex=560)
  // await updateStudents(['014028638', '014028638', '014441008', '014687309', '014808340'])
}

module.exports = { updateDatabase, updateFaculties, updateStudents }