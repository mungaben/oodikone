/// <reference types="Cypress" />

const deleteTag = name => {
  cy.contains(name).siblings().contains('Delete').click()
  cy.contains('Are you sure you want to delete tag')
  cy.contains('Confirm').click()
  cy.contains(name).should('not.exist')
}

describe('Studyprogramme overview', () => {
  // check is used by couple of tests
  const checkProgressAndProductivity = () => {
    // Graduation feature is shown for only for devs, these are the values for normal user
    const CSBachPopulationProgress2018 = [
      '160',
      '42 (26%)',
      '118 (73%)',
      '159 (99%)',
      '159',
      '11',
      '11',
      '1',
      '0',
      '150',
      '123',
      '76',
      '41',
      '16',
    ]
    cy.get('.attached > :nth-child(1)').click()
    cy.get('table').should('have.length', 3)
    cy.contains('Population progress')
    cy.contains('Yearly productivity')

    cy.contains('2018-2019')
      .siblings()
      .each((elem, index) => {
        cy.wrap(elem).contains(CSBachPopulationProgress2018[index])
      })
    const populationproductivity2019 = ['7388.0', '17', '7329.00', '59.00', '349.00']
    cy.get('table')
      .eq(1)
      .contains('2019')
      .siblings()
      .each((elem, index) => {
        cy.wrap(elem).contains(populationproductivity2019[index])
      })
  }

  describe('when opening programme page with admin user', () => {
    beforeEach(() => {
      cy.init('/study-programme/KH50_005', 'admin')
    })

    it('progress should not be recalculating when opened for the first time', () => {
      cy.contains('Recalculating').should('not.exist')
      cy.contains('Last updated').should('exist')
    })

    // Following vars are used to compare values before and after stats calculation
    // Taken from https://docs.cypress.io/api/commands/should#Compare-text-values-of-two-elements
    const normalizeText = s => s.replace(/\s/g, '').toLowerCase()
    let originalProgressCalculatedText
    let originalProductivityCalculatedText
    const doRecalculation = () => {
      // Wait for page to load before clicking to admin page, TODO: change to cy.intercept
      cy.wait(2000)
      cy.get('.attached').contains('Admin').click()
      cy.contains('recalculate productivity').click()
      cy.contains('recalculate throughput').click()
      cy.get('.attached').contains('Overview').click() // TODO: add data-cy tags for tabs
      // Wait to "recalculating" to disappear, TODO: change this to cy.intercept
      cy.wait(5000)
      cy.reload()
    }

    it('renders progress and productivity tables with calculated status', () => {
      doRecalculation()
      checkProgressAndProductivity()

      // Grab update dates to be compared later
      cy.cs('throughputUpdateStatus')
        .invoke('text')
        .then(text => {
          originalProgressCalculatedText = normalizeText(text)
          expect(originalProgressCalculatedText).not.to.contain('recalculating')
          expect(originalProgressCalculatedText).not.to.contain('refresh')
        })

      cy.cs('productivityUpdateStatus')
        .invoke('text')
        .then(text => {
          originalProductivityCalculatedText = normalizeText(text)
          expect(originalProductivityCalculatedText).not.to.contain('recalculating')
          expect(originalProgressCalculatedText).not.to.contain('refresh')
        })
    })

    it('renders progress and productivity tables with calculated status after recalculating stats again', () => {
      doRecalculation()
      checkProgressAndProductivity()

      // Check new calculation statuses are reported
      const newProgressCalculatedTextElement = cy.cs('throughputUpdateStatus').invoke('text')
      const newProductivityCalculatedTextElement = cy.cs('productivityUpdateStatus').invoke('text')

      newProgressCalculatedTextElement.should(text => {
        const newProgressCalculatedText = normalizeText(text)
        expect(newProgressCalculatedText).not.to.contain('recalculating')
        expect(newProgressCalculatedText).not.to.contain('refresh')
        expect(newProgressCalculatedText).not.to.contain(originalProgressCalculatedText)
      })

      newProductivityCalculatedTextElement.should(text => {
        const newProductivityCalculatedText = normalizeText(text)
        expect(newProductivityCalculatedText).not.to.contain('recalculating')
        expect(newProductivityCalculatedText).not.to.contain('refresh')
        expect(newProductivityCalculatedText).not.to.contain(originalProgressCalculatedText)
      })
    })
  })

  describe('when opening programme page with basic user', () => {
    beforeEach(() => {
      cy.init('/study-programme/KH50_005')
    })

    it('renders progress and productivity tables with previosly calculated values', () => {
      checkProgressAndProductivity()
    })

    it('can open Thesis page', () => {
      cy.contains('Tietojenkäsittelytieteen kandiohjelma').click()
      cy.contains('Thesis Courses').click()
      cy.contains('Add thesis course').click()
      cy.contains('No results')
    })

    it('can move to Population statistics page by clickin', () => {
      cy.get('i.level.up.alternate.icon').eq(0).click()
      cy.contains('Students (10)')
    })

    it('can create and delete tags for population', () => {
      const name = `tag-${new Date().getTime()}`
      cy.contains('Tietojenkäsittelytieteen kandiohjelma').click()
      cy.get('.attached').contains('Tags').click()
      cy.get('.tagNameSelectInput > .ui > input').type(name)
      cy.get('.yearSelectInput').type('2018')
      cy.contains('Create new tag').click()
      cy.contains(name)
      cy.contains('2018')
      deleteTag(name)
    })

    it('can create personal tags', () => {
      const name = `tag-${new Date().getTime()}`
      cy.contains('Tietojenkäsittelytieteen kandiohjelma').click()
      cy.get('.attached').contains('Tags').click()
      cy.get('.tagNameSelectInput > .ui > input').type(name)
      cy.get('.yearSelectInput').type('2018')

      cy.get('.ui > label').click()
      cy.contains('Create new tag').click()
      cy.get('.purple')
      cy.contains(name)
      deleteTag(name)
    })

    it('can add tags to students', () => {
      const name = `tag-${new Date().getTime()}`

      const student = '010113437'

      cy.contains('Tietojenkäsittelytieteen kandiohjelma').click()
      cy.get('.attached').contains('Tags').click()
      cy.get('.tagNameSelectInput > .ui > input').type(name)
      cy.get('.yearSelectInput').type('2018')
      cy.contains('Create new tag').click()
      cy.contains(name)

      cy.contains('Add tags to students').click()
      cy.get('.form > .field > .dropdown').click().get('.ui > .search').type(name).click()

      cy.get('.form > .field > .dropdown > .visible').contains(name).click()

      cy.get('textarea').type('010113437')
      cy.get('.positive').click()

      cy.contains('Student statistics').click()
      cy.get('.prompt').type(student)
      cy.contains(student).click()
      cy.contains(name)

      cy.go('back')
      cy.go('back')

      deleteTag(name)

      cy.contains('Student statistics').click()
      cy.get('.prompt').type(student)
      cy.contains(student).click()
      cy.contains(name).should('not.exist')
    })
  })
})
