const { Model, STRING, DATE, JSONB } = require('sequelize')
const { dbConnections } = require('../connection')

class Organization extends Model {}

Organization.init(
  {
    id: {
      type: STRING,
      primaryKey: true
    },
    code: {
      type: STRING
    },
    name: {
      type: JSONB
    },
    createdAt: {
      type: DATE
    },
    updatedAt: {
      type: DATE
    }
  },
  {
    underscored: true,
    sequelize: dbConnections.sequelize,
    modelName: 'organization',
    tableName: 'organization'
  }
)

module.exports = Organization
