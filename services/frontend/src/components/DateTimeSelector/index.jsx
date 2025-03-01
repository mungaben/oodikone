import React, { useRef } from 'react'
import Datetime from 'react-datetime'
import { Icon, Button } from 'semantic-ui-react'
import moment from 'moment'
import 'moment/locale/fi'
import { useGetSemestersQuery } from 'redux/semesters'
import './style.css'
import useLanguage from 'components/LanguagePicker/useLanguage'

const semesterListStyles = {
  maxHeight: '10em',
  overflowY: 'auto',
  padding: 0,
  margin: '0px -4px -4px -4px',
  borderTop: '1px solid #f9f9f9',
}

const DateTime = ({ value, onChange, before, after, showSemesters }) => {
  const datetimeRef = useRef()
  const semesterRequest = useGetSemestersQuery()
  const allSemesters = semesterRequest.data?.semesters ?? []
  const today = moment().endOf('day')
  const { getTextIn } = useLanguage()
  // Do not allow to select dates after today. At least some cases program just crashed.
  const startdate = before || today
  return (
    <Datetime
      ref={datetimeRef}
      value={value}
      onChange={onChange}
      timeFormat={false}
      locale="fi"
      closeOnSelect
      isValidDate={date => {
        return date.isBefore(moment(startdate)) && (!after || date.isAfter(moment(after)))
      }}
      renderView={(mode, renderDefault) => {
        const createDateButton = (date, label) => (
          <button
            type="button"
            key={label}
            onClick={() => {
              datetimeRef.current.setViewDate(moment(date))
              onChange(moment(date))
            }}
            style={{
              height: '1.75em',
              background: value && value.isSame(date, 'day') ? '#428bca' : 'white',
              color: value && value.isSame(date, 'day') ? 'white' : 'inherit',
            }}
            className="date-picker-semester-button"
          >
            {label}
          </button>
        )

        return (
          <>
            {renderDefault()}
            {showSemesters && (
              <>
                <div
                  style={{
                    ...semesterListStyles,
                    height: '1.75em',
                    lineHeight: '1.75em',
                    marginBottom: 0,
                    paddingLeft: '0.3em',
                    fontWeight: 'bold',
                  }}
                >
                  Semesters:
                </div>
                <ul style={semesterListStyles}>
                  {allSemesters &&
                    Object.values(allSemesters)
                      .filter(({ startdate, enddate }) => {
                        const start = moment(startdate)
                        const end = moment(enddate)

                        return start.isBefore() && (!before || start.isBefore(before)) && (!after || end.isAfter(after))
                      })
                      .sort((a, b) => new Date(b.startdate) - new Date(a.startdate))
                      .map(({ name, startdate, enddate }) => (
                        <li
                          key={`${getTextIn(name)}-${Math.random()}`}
                          style={{ padding: '0.2em 0.3em 0.2em', display: 'flex', alignItems: 'center' }}
                        >
                          <span key={getTextIn(name)} style={{ flexGrow: 1 }}>
                            {getTextIn(name)}
                          </span>
                          {createDateButton(moment(startdate), 'Start')}
                          {createDateButton(moment(enddate).subtract(1, 'days'), 'End')}
                        </li>
                      ))}
                </ul>
              </>
            )}
          </>
        )
      }}
      renderInput={(_, open) => (
        <Button
          icon={value !== null}
          onClick={open}
          className="credit-date-filter-input"
          size="mini"
          style={{
            whiteSpace: 'nowrap',
            paddingRight: value ? '3.5em !important' : undefined,
            paddingLeft: value ? '1em !important' : undefined,
          }}
        >
          {value === null ? 'Select Date' : moment(value).format('DD.MM.YYYY')}
          {value !== null && (
            <Icon
              name="x"
              onClick={evt => {
                evt.stopPropagation()
                onChange(null)
              }}
            />
          )}
        </Button>
      )}
    />
  )
}

export default DateTime
