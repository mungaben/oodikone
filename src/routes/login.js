const router = require('express').Router()
const User = require('../services/users')
const jwt = require('jsonwebtoken')
const conf = require('../conf-backend')

const generateToken = async (uid, res) => {
  const model = await User.byUsername(uid)
  const user = model.dataValues
  if (user.is_enabled) {
    const payload = { userId: uid, name: user.full_name }
    const token = jwt.sign(payload, conf.TOKEN_SECRET, {
      expiresIn: '24h'
    })

    // return the information including token as JSON
    res.status(200).json({
      token: token
    })
  } else {
    res.status(401).end()
  }
}

router.get('/login', async (req, res) => {
  try {
    const uid = req.headers['uid']
    if (req.headers['shib-session-id'] && uid) {
      const user = await User.byUsername(uid)
      const fullname = req.headers.displayname || 'Shib Valmis'
      if (!user) {
        await User.createUser(uid, fullname)
      } else {
        await User.updateUser(user, { full_name: fullname })
      }
      generateToken(uid, res)
    } else {
      res.status(401).json({ message: 'Not enough headers login' }).end()
    }
  } catch (err) {
    res.status(401).json({ message: 'problem with login', err })
  }
})


module.exports = router
