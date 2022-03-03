import React from 'react'
import { Link } from 'react-router-dom'
import { Button, Icon, Label } from 'semantic-ui-react'
import { useShowAsUser } from 'redux/auth'
import { getTextIn, reformatDate } from '../../common'
import useLanguage from '../LanguagePicker/useLanguage'
import SortableTable from '../SortableTable'

const UserSearchList = ({ enabledOnly, users, error, elementdetails }) => {
  const { language } = useLanguage()

  const usersToRender = enabledOnly ? users.filter(u => u.is_enabled) : users
  const showAsUser = useShowAsUser()

  return error ? null : (
    <div>
      <SortableTable
        singleLine={false}
        figure={false}
        getRowKey={user => user.id}
        tableProps={{ celled: true, structured: true }}
        columns={[
          {
            key: 'NAME',
            title: 'Name',
            getRowVal: user => {
              const nameparts = user.full_name.split(' ')
              return nameparts[nameparts.length - 1]
            },
            getRowContent: user => user.full_name,
          },
          {
            key: 'USERNAME',
            title: 'Username',
            getRowVal: user => user.username,
          },
          {
            key: 'ROLE',
            title: 'Role',
            getRowContent: user => (
              <Label.Group>
                {user.accessgroup
                  .map(ag => ag.group_code)
                  .sort()
                  .map(code => (
                    <Label key={code} content={code} />
                  ))}
              </Label.Group>
            ),
            getRowVal: user => user.accessgroup.map(ag => ag.group_code).sort(),
          },
          {
            key: 'PROGRAMMES',
            title: 'Programmes',
            getRowVal: user => {
              if (!user.elementdetails || user.elementdetails.length === 0) {
                return []
              }

              const nameInLanguage = code => {
                const elem = elementdetails.find(e => e.code === code)
                if (!elem) return null
                return getTextIn(elem.name, language)
              }

              return user.elementdetails.map(element => nameInLanguage(element))
            },
            getRowContent: user => {
              const nameInLanguage = code => {
                const elem = elementdetails.find(e => e.code === code)
                if (!elem) return null
                return getTextIn(elem.name, language)
              }

              if (!user.elementdetails || user.elementdetails.length === 0) return null
              const name = nameInLanguage(user.elementdetails[0])
              if (!name) return `${user.elementdetails.length} programmes`
              if (user.elementdetails.length >= 2) {
                return `${nameInLanguage(user.elementdetails[0])} +${user.elementdetails.length - 1} others`
              }
              return name
            },
          },
          {
            key: 'OODIACCESS',
            title: 'Has access',
            getRowVal: user => user.is_enabled,
            formatValue: value => (value ? 'Has access' : 'No access'),
            getRowContent: user => (
              <Icon
                style={{ margin: 'auto' }}
                color={user.is_enabled ? 'green' : 'red'}
                name={user.is_enabled ? 'check' : 'remove'}
              />
            ),
          },
          {
            key: 'LASTLOGIN',
            title: 'Last login',
            getRowVal: user => (user.last_login ? user.last_login : 'Not saved'),
            getRowContent: user =>
              user.last_login ? (
                <p>{reformatDate(user.last_login, 'DD.MM.YYYY')}</p>
              ) : (
                <p style={{ color: 'gray' }}>Not saved</p>
              ),
          },
          {
            key: 'SHOWAS',
            title: 'Show as user',
            filterable: false,
            sortable: false,
            getRowVal: user => (
              <Button circular size="tiny" basic icon="spy" onClick={() => showAsUser(user.username)} />
            ),
            headerProps: { onClick: null, sorted: null },
          },
          {
            key: 'EDIT',
            title: '',
            filterable: false,
            sortable: false,
            getRowVal: user => (
              <Button.Group compact widths={2}>
                <Button basic size="mini" as={Link} to={`users/${user.id}`}>
                  Edit
                </Button>
              </Button.Group>
            ),
            headerProps: { onClick: null, sorted: null },
          },
        ]}
        data={usersToRender}
      />
    </div>
  )
}

export default UserSearchList
