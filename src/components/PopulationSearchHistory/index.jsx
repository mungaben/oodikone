import React, { Component } from 'react';
import { connect } from 'react-redux';
import { func, shape, arrayOf, object } from 'prop-types';
import { getTranslate } from 'react-localize-redux';

import PopulationQueryCard from '../PopulationQueryCard';
import { removePopulation } from '../../redux/populations';

import styles from './populationSearchHistory.css';

class PopulationSearchHistory extends Component {
  static propTypes = {
    translate: func.isRequired,
    removePopulation: func.isRequired,
    populations: shape({
      queries: arrayOf(object),
      samples: object
    }).isRequired
  };

  removePopulation = uuid => this.props.removePopulation(uuid);

  renderQueryCards = () => {
    const { populations, translate } = this.props;
    return populations.map((population, i) => (
      <PopulationQueryCard
        key={`population-${population.query.uuid}`}
        translate={translate}
        population={population.data}
        query={population.query}
        queryId={i}
        removeSampleFn={this.removePopulation}
      />));
  };

  render() {
    return (
      <div className={styles.historyContainer} >
        {this.renderQueryCards()}
      </div>
    );
  }
}

const mapStateToProps = ({ newReducers, locale }) => ({
  populations: newReducers.populations,
  translate: getTranslate(locale)
});

const mapDispatchToProps = dispatch => ({
  removePopulation: uuid =>
    dispatch(removePopulation(uuid))
});


export default connect(mapStateToProps, mapDispatchToProps)(PopulationSearchHistory);
