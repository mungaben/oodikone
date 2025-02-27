import React from 'react'
import DateRangeSelector from 'components/common/DateRangeSelector'
import moment from 'moment'
import { getColumnValue } from '../common'

const DateColumnFilterComponent = ({ options, dispatch }) => {
  return (
    <div className="sortable-table-date-picker" style={{ padding: '0.5em 0.75em' }}>
      <DateRangeSelector
        showSemesters
        value={options?.range}
        onChange={range =>
          dispatch({
            type: 'SET_RANGE',
            payload: { range },
          })
        }
      />
    </div>
  )
}

export default {
  component: DateColumnFilterComponent,

  isActive: options => options?.range?.[0] || options?.range?.[1],

  initialOptions: () => ({
    range: [null, null],
  }),

  reduce: (options, { type, payload }) => {
    if (type === 'SET_RANGE') {
      options.range = payload.range
    }
  },

  filter: (ctx, column, options) => {
    const value = getColumnValue(ctx, column)

    if (options?.range?.[0] && !moment(value).isSameOrAfter(options?.range?.[0])) {
      return false
    }

    if (options?.range?.[1] && !moment(value).isSameOrBefore(options?.range?.[1])) {
      return false
    }

    return true
  },
}
