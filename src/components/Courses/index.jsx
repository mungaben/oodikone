import React, { Component } from 'react';
import { connect } from 'react-redux';
import { getActiveLanguage, getTranslate } from 'react-localize-redux';
import PropTypes from 'prop-types';
import { Search, Dropdown } from 'semantic-ui-react';
import CourseStatistics from './statistics';

import { addError, findCoursesAction, findInstancesAction } from '../../actions';

import styles from './courses.css';

const { func, string } = PropTypes;

const CourseListRenderer = ({ name, code }) => <span>{`${name} ( ${code} )`}</span>;

CourseListRenderer.propTypes = {
  name: string.isRequired,
  code: string.isRequired
};

class Courses extends Component {
  constructor(props) {
    super(props);

    this.resetComponent = this.resetComponent.bind(this);
    this.handleResultSelect = this.handleResultSelect.bind(this);
    this.handleSearchChange = this.handleSearchChange.bind(this);
    this.fetchCoursesList = this.fetchCoursesList.bind(this);
    this.fetchCourseInstances = this.fetchCourseInstances.bind(this);

    this.state = {};
  }

  componentDidMount() {
    this.resetComponent();
  }

  resetComponent() {
    this.setState({
      courseList: [],
      isLoading: false,
      searchStr: ''
    });
  }

  handleResultSelect(e, { result }) {
    this.setState({ selectedCourse: result }, () => {
      this.fetchCourseInstances();
    });
  }


  handleSearchChange(e, { value }) {
    this.setState({ searchStr: value });
    this.fetchCoursesList();
  }

  fetchCoursesList() {
    const { searchStr } = this.state;
    this.setState({ isLoading: true });
    this.props.dispatchFindCoursesList(searchStr)
      .then(
        json => this.setState({ courseList: json.value, isLoading: false }),
        err => this.props.dispatchAddError(err)
      );
  }

  fetchCourseInstances() {
    const courseCode = this.state.selectedCourse.code;
    this.props.dispatchFindCourseInstances(courseCode)
      .then(
        json => this.setState({ courseInstances: json.value }),
        err => this.props.dispatchAddError(err)
      );
  }

  render() {
    const { isLoading, courseList, searchStr, courseInstances, selectedCourse } = this.state;
    const instanceList = [];
    if (courseInstances !== undefined) {
      courseInstances.forEach(i => instanceList.push({ text: `${i.date} (${i.students} students)`, value: i.id }));
    }
    const t = this.props.translate;
    return (
      <div className={styles.container}>
        <Search
          className={styles.courseSearch}
          input={{ fluid: true }}
          loading={isLoading}
          onResultSelect={this.handleResultSelect}
          onSearchChange={this.handleSearchChange}
          results={courseList}
          resultRenderer={CourseListRenderer}
          value={searchStr}
        />
        <div>{`Courses: ${t('common.example')}`}</div>
        {isLoading}
        <pre>{JSON.stringify(courseList)}</pre>
        <Dropdown placeholder="Select course instance" fluid selection options={instanceList} />
        <CourseStatistics
          selectedCourse={selectedCourse}
        />
      </div>
    );
  }
}

Courses.propTypes = {
  dispatchFindCoursesList: func.isRequired,
  dispatchFindCourseInstances: func.isRequired,
  dispatchAddError: func.isRequired,
  translate: func.isRequired
};

const mapStateToProps = ({ locale }) => ({
  translate: getTranslate(locale),
  currentLanguage: getActiveLanguage(locale).value
});

const mapDispatchToProps = dispatch => ({
  dispatchFindCoursesList: queryStr =>
    dispatch(findCoursesAction(queryStr)),
  dispatchFindCourseInstances: queryStr =>
    dispatch(findInstancesAction(queryStr)),
  dispatchAddError: err => dispatch(addError(err))
});

export default connect(mapStateToProps, mapDispatchToProps)(Courses);
