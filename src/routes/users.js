const router = require('express').Router()
const User = require('../services/users')

router.get('/users', async function (req, res) {
  const results = await User.findAll()
  res.json(results)
})

router.post('/users/enable', async function (req, res) {
  console.log(req.body)
  const id = req.body.id
  const user = await User.byId(id)
  if (!user) res.status(400).end()
  else {
    const result = await User.updateUser(user, { is_enabled: !user.is_enabled })
    const status = result.error === undefined ? 201 : 400
    res.status(status).json(result)
  }
})

module.exports = router
