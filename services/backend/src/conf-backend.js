const isTest = process.env.NODE_ENV === 'test'
const DB_URL_KONE = process.env.DB_URL_KONE

let DB_MAX_CONNECTIONS = parseInt(process.env.DB_MAX_CONNECTIONS, 10)
if (isNaN(DB_MAX_CONNECTIONS)) {
  DB_MAX_CONNECTIONS = 5 // sequelize's default
}
let DB_MAX_CRON_CONNECTIONS = DB_MAX_CONNECTIONS - 5
if (DB_MAX_CRON_CONNECTIONS < 1) {
  DB_MAX_CRON_CONNECTIONS = 1
}

const frontend_addr = process.env.FRONT_URL
const redis = process.env.REDIS
const TOKEN_SECRET = process.env.TOKEN_SECRET
const SECRET_TOKEN = process.env.SECRET_TOKEN
const DB_SCHEMA_KONE = process.env.DB_SCHEMA_KONE || 'public'
const USERSERVICE_URL = process.env.USERSERVICE_URL
const SIS_UPDATER_URL = process.env.SIS_UPDATER_URL
const PORT = isTest ? 8079 : 8080
const ANALYTICS_INFLUXDB_URL = process.env.ANALYTICS_INFLUXDB_URL
const ANALYTICS_INFLUXDB_USER = process.env.ANALYTICS_INFLUXDB_USER
const ANALYTICS_INFLUXDB_PASSWORD = process.env.ANALYTICS_INFLUXDB_PASSWORD
const ANALYTICS_INFLUXDB_DB = process.env.ANALYTICS_INFLUXDB_DB
const MATOMO_SITE_ID = process.env.MATOMO_SITE_ID
const MATOMO_URL = process.env.MATOMO_URL

const formatURL = url => {
  return !!url && !url.startsWith('http') ? `http://${url}` : url
}

const addSlashToEnd = url => (url.endsWith('/') ? url : url + '/')

const ACCESS_TOKEN_HEADER_KEY = 'x-access-token'

const isStaging = process.env.NODE_ENV === 'staging'

const runningInCI = process.env.CI === 'true'

const requiredGroup = isStaging
  ? ['grp-oodikone-staging-users', 'grp-oodikone-basic-staging-users']
  : ['grp-oodikone-users', 'grp-oodikone-basic-users']

module.exports = {
  frontend_addr,
  DB_URL_KONE,
  DB_MAX_CONNECTIONS,
  DB_MAX_CRON_CONNECTIONS,
  redis,
  TOKEN_SECRET,
  SECRET_TOKEN,
  DB_SCHEMA_KONE,
  USERSERVICE_URL: formatURL(USERSERVICE_URL),
  ACCESS_TOKEN_HEADER_KEY,
  PORT,
  requiredGroup,
  isTest,
  SIS_UPDATER_URL,
  ANALYTICS_INFLUXDB_URL: formatURL(ANALYTICS_INFLUXDB_URL),
  ANALYTICS_INFLUXDB_USER,
  ANALYTICS_INFLUXDB_PASSWORD,
  ANALYTICS_INFLUXDB_DB,
  MATOMO_SITE_ID,
  MATOMO_URL: MATOMO_URL && addSlashToEnd(MATOMO_URL),
  runningInCI,
}
