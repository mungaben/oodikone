const teachers = require('../servicesV2/teachers')
const topteachers = require('../servicesV2/topteachers')
const router = require('express').Router()
const { mapToProviders } = require('../util/utils')

router.get('/', async (req, res) => {
  const { searchTerm } = req.query
  if (!searchTerm) return res.status(400).json({ error: 'searchTerm missing' })

  const trimmedSearchTerm = searchTerm.trim()
  if (
    !teachers.splitByEmptySpace(trimmedSearchTerm).find(t => t.length >= 4) ||
    (Number(trimmedSearchTerm) && trimmedSearchTerm.length < 6)
  ) {
    return res.status(400).json({ error: 'invalid searchTerm' })
  }

  const result = await teachers.bySearchTerm(trimmedSearchTerm)
  res.json(result)
})

router.get('/top', async (req, res) => {
  const { yearcode, category = topteachers.ID.ALL } = req.query
  if (!yearcode) {
    return res.status(422).send('Missing required yearcode query param')
  }
  const result = await topteachers.getTeacherStats(category, yearcode)
  res.json(result)
})

router.post('/top', async (req, res) => {
  const { startyearcode, endyearcode } = req.body
  res.status(200).end()
  await topteachers.findAndSaveTeachers(startyearcode, endyearcode)
})

router.get('/top/categories', async (req, res) => {
  const result = await topteachers.getCategoriesAndYears()
  res.json(result)
})

router.get('/stats', async (req, res) => {
  const { rights, roles } = req

  const { providers, semesterStart, semesterEnd } = req.query
  if (!providers || !semesterStart) {
    return res.status(422).send('Missing required query parameters.')
  }
  const providerRights = mapToProviders(rights)

  if (!(providers.every(p => providerRights.includes(p)) || roles.includes('admin'))) {
    return res.status(403).send('You do not have rights to see this data')
  }
  const result = await teachers.yearlyStatistics(providers, semesterStart, semesterEnd || semesterStart + 1)
  res.json(result)
})

router.get('/:id', async (req, res) => {
  const { id } = req.params
  const result = await teachers.teacherStats(id)
  if (!result) {
    return res.status(404).send()
  }
  res.json(result)
})

router.use('*', (req, res, next) => next())

module.exports = router
