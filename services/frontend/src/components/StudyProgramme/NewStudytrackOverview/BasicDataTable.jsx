import React from 'react'
import { Table } from 'semantic-ui-react'

const DataTable = ({ data, titles }) => {
  if (!data || !titles) return null

  return (
    <div className="table-container">
      <Table celled>
        <Table.Header>
          <Table.Row>
            {titles?.map(title => (
              <Table.HeaderCell key={title}>{title}</Table.HeaderCell>
            ))}
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {data?.map(year =>
            year.credits?.map(array => (
              <Table.Row key={`random-year-key-${Math.random()}`}>
                {array.map(value => (
                  <Table.Cell key={`random-key-${Math.random()}`}>{value === 'TOTAL' ? year.year : value}</Table.Cell>
                ))}
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table>
    </div>
  )
}

export default DataTable
