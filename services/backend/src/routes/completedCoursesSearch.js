const router = require('express').Router()
const { getCompletedCourses } = require('../services/completedCoursesSearch')
const _ = require('lodash')
const {
  getOpenUniSearches,
  createNewSearch,
  deleteSearch,
  updateSearch,
} = require('../services/openUni/openUniManageSearches')

router.get('/', async (req, res) => {
  const studentNumbers = JSON.parse(req.query?.studentlist) || []
  const courseCodes = JSON.parse(req.query?.courselist) || []
  const {
    user: { isAdmin, studentsUserCanAccess },
  } = req
  if (!Array.isArray(studentNumbers)) return res.status(400).json({ error: 'Student numbers must be of type array' })
  if (!Array.isArray(courseCodes)) return res.status(400).json({ error: 'Courses must be of type array' })

  const filteredStudentNumbers = isAdmin ? studentNumbers : _.intersection(studentNumbers, studentsUserCanAccess)
  const completedCourses = await getCompletedCourses(filteredStudentNumbers, courseCodes)
  const forbiddenStudents = studentNumbers.filter(num => !filteredStudentNumbers.includes(num))
  return res.json({ forbiddenStudents, ...completedCourses })
})

router.get('/searches', async (req, res) => {
  const userId = req.user.id
  const foundSearches = await getOpenUniSearches(userId)
  return res.json(foundSearches)
})

router.post('/searches', async (req, res) => {
  const courseCodes = req.body?.courselist || []
  const userId = req.user.id
  const name = req.body?.name

  if (!name) return res.status(400).json({ error: 'Name missing' })
  if (courseCodes && !Array.isArray(courseCodes))
    return res.status(400).json({ error: 'Course codes must be type of array' })

  const createdSearch = await createNewSearch(userId, name, courseCodes)
  if (!createdSearch) return res.status(400).json({ error: '' })
  return res.status(201).json({
    id: createdSearch.id,
    userId: createdSearch.userId,
    name: createdSearch.name,
    courseList: createdSearch.courseCodes,
    updatedAt: createdSearch.updatedAt,
  })
})

router.put('/searches/:id', async (req, res) => {
  const id = req.params?.id
  const courseCodes = req.body?.courselist || []
  const userId = req.user.id
  if (!id || !userId) return res.status(422).end()
  const updatedSearch = await updateSearch(userId, id, courseCodes)

  if (!updatedSearch) return res.status(404).json({ error: `Courselist search could not be found` })
  return res.json({
    id: updatedSearch.id,
    userId: updatedSearch.userId,
    name: updatedSearch.name,
    courseList: updatedSearch.courseCodes,
    updatedAt: updatedSearch.updatedAt,
  })
})

router.delete('/searches/:id', async (req, res) => {
  const id = req.params?.id
  const userId = req.user.id
  if (!id || !userId) return res.status(422).end()

  const deletedSearch = await deleteSearch(userId, id)
  if (!deletedSearch) return res.status(404).json({ error: `Courselist search could not be found` })
  return res.json(id)
})

module.exports = router
