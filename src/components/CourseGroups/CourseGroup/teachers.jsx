import React, { Fragment, Component } from 'react'
import { bool, func, shape, string, number } from 'prop-types'
import { Header, List, Button, Radio } from 'semantic-ui-react'

import styles from './courseGroup.css'

const TeacherItem = ({ teacher, onFilterClickFn }) => {
  const { name, code, id, isActive, courses, credits } = teacher

  const getStatisticItem = (label, value) => (
    <div className={styles.statisticItem}>
      <div className={styles.statisticLabel}>{label}</div>
      <div className={styles.statisticNumber}>{value}</div>
    </div>
  )

  return (
    <List.Item className={`${isActive ? styles.teacherActiveItem : ''}`}>
      <List.Content className={styles.teacherItemStatistics}>
        <div className={styles.teacherItemBasicInfo}>
          <div className={styles.teacherName}>{name}</div>
          <div className={styles.teacherCode}>{`(${code})`}</div>
        </div>
        {getStatisticItem('Total courses', courses)}
        {getStatisticItem('Total credits', credits)}
        <div className={styles.statisticControlItem}>
          <Button
            icon="filter"
            className={`${isActive ? styles.activeIconButton : styles.iconButton}`}
            onClick={() => onFilterClickFn(id)}
            circular
          />
        </div>
      </List.Content>
    </List.Item>
  )
}

TeacherItem.propTypes = {
  onFilterClickFn: func.isRequired,
  teacher: shape({
    name: string,
    code: string,
    id: string,
    isActive: bool,
    courses: string,
    credits: number
  }).isRequired
}

class Teachers extends Component {
  state = {
    showOnlyActive: false,
    activeTeacherCount: 0,
    teacherCount: 0,
    viewableTeachers: []
  }

  static getDerivedStateFromProps(props, state) {
    const { teachers } = props
    const { showOnlyActive } = state
    const activeTeachers = teachers.filter(t => t.isActive)
    const activeTeacherCount = activeTeachers.length
    const teacherCount = teachers.length
    const resetShowOnlyActive = showOnlyActive && activeTeacherCount === 0
    if (!showOnlyActive || resetShowOnlyActive) {
      return {
        showOnlyActive: false,
        activeTeacherCount,
        teacherCount,
        viewableTeachers: teachers
      }
    }

    return {
      activeTeacherCount,
      teacherCount,
      viewableTeachers: activeTeachers
    }
  }

  onActiveToggleChange = () => {
    const { showOnlyActive } = this.state
    this.setState({ showOnlyActive: !showOnlyActive })
  }

  render() {
    const { onFilterClickFn } = this.props
    const { viewableTeachers, activeTeacherCount, teacherCount, showOnlyActive } = this.state
    const toggleId = 'toggle'

    return (
      <Fragment>
        <Header size="medium" className={styles.headerWithControl}>
          <span>Teachers<span className={styles.teacherCount}>{teacherCount}</span></span>
          <div className={styles.activeToggleContainer}>
            <label htmlFor={toggleId}>Show only active</label>
            <Radio
              id={toggleId}
              toggle
              checked={showOnlyActive}
              onChange={this.onActiveToggleChange}
              disabled={activeTeacherCount === 0}
            />
          </div>
        </Header>
        <List celled>
          {viewableTeachers.map(t =>
            <TeacherItem key={t.id} teacher={t} onFilterClickFn={onFilterClickFn} />)
          }
        </List>
      </Fragment>
    )
  }
}


Teachers.propTypes = {
  onFilterClickFn: func.isRequired
}

export default Teachers
